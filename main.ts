import "jsr:@std/dotenv/load";

const PORKBUN_HOSTNAME = "https://api.porkbun.com";
const PORKBUN_API_KEY = Deno.env.get("PORKBUN_API_KEY");
const PORKBUN_SECRET_KEY = Deno.env.get("PORKBUN_SECRET_KEY");

const HELP_TEXT =
  "Requires 1 argument domain, can optionally provide 2nd argument ip";
const applicationName = "porkbundyndns";

main();

async function main() {
  log(`Starting ${applicationName}`);
  const domain = Deno.args[0];
  if (!domain) {
    log(HELP_TEXT);
    return;
  }

  if (!PORKBUN_API_KEY || !PORKBUN_SECRET_KEY) {
    log(
      `Missing at least one environment variable: PORKBUN_API_KEY PORKBUN_SECRET_KEY`,
    );
    return;
  }

  const customIp = Deno.args[1];

  const targetIp = customIp || await pingPorkbun();
  if (targetIp) {
    const currentIp = await getCurrentSetIp(domain);
    if (currentIp !== targetIp) {
      editDNSRecord(domain, targetIp);
    } else {
      log(`'A' record for ${domain} is already ${targetIp}, no changes needed`);
    }
  }
}

async function pingPorkbun(): Promise<string | undefined> {
  const request = await fetch(
    PORKBUN_HOSTNAME + "/api/json/v3/ping",
    {
      method: "POST",
      body: JSON.stringify({
        apikey: PORKBUN_API_KEY,
        secretapikey: PORKBUN_SECRET_KEY,
      }),
    },
  );
  try {
    const responseBody = await request.json();
    const ipAddress = responseBody["yourIp"];
    if (ipAddress) {
      return ipAddress;
    } else {
      return undefined;
    }
  } catch (err) {
    log(
      `Could not ping ${PORKBUN_HOSTNAME},  || ${request.status}: ${
        (await request.json()).message
      }`,
    );
    return undefined;
  }
}

async function getCurrentSetIp(fullDomain: string): Promise<string> {
  const { domain, subDomain } = seperateDomain(fullDomain);
  const url =
    `${PORKBUN_HOSTNAME}/api/json/v3/dns/retrieveByNameType/${domain}/A/${subDomain}`;
  const requestOptions = {
    method: "POST",
    body: JSON.stringify({
      apikey: PORKBUN_API_KEY,
      secretapikey: PORKBUN_SECRET_KEY,
    }),
  };
  const request = await fetch(url, requestOptions);
  if (request.status !== 200) {
    log(
      `Could not get DNS records || ${request.status}: ${
        (await request.json()).message
      }`,
    );
    return "";
  }
  const responseBody = await request.json();
  if (responseBody.records.length > 1) {
    return "";
  } else {
    return responseBody.records[0]?.content;
  }
}

async function editDNSRecord(fullDomain: string, ip: string) {
  const { domain, subDomain } = seperateDomain(fullDomain);
  const url =
    `${PORKBUN_HOSTNAME}/api/json/v3/dns/editByNameType/${domain}/A/${subDomain}`;
  const requestOptions = {
    method: "POST",
    body: JSON.stringify({
      apikey: PORKBUN_API_KEY,
      secretapikey: PORKBUN_SECRET_KEY,
      "name": "",
      "content": ip,
      "ttl": "600",
    }),
  };
  const request = await fetch(url, requestOptions);
  if (request.status !== 200) {
    log(
      `Could not set DNS || ${request.status}: ${
        (await request.json()).message
      }`,
    );
    return;
  }
  log(
    `${
      subDomain ? subDomain + "." : ""
    }${domain} A record succesfully set to ${ip}`,
  );
}

function seperateDomain(domain: string) {
  const parts = domain.split(".");
  return {
    domain: parts.splice(parts.length - 2).join("."),
    subDomain: parts.join("."),
  };
}

function log(str: string) {
  const lines = str.split("\n");
  for (const line of lines) {
    console.log(`${Date.now()} ${applicationName}]| ${line}`);
  }
}
