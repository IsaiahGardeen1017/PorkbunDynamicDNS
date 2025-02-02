import "jsr:@std/dotenv/load";

const PORKBUN_HOSTNAME = "https://api.porkbun.com";
const PORKBUN_API_KEY = Deno.env.get("PORKBUN_API_KEY");
const PORKBUN_SECRET_KEY = Deno.env.get("PORKBUN_SECRET_KEY");

main();

async function main() {
  const domain = Deno.args[0];
  if (!domain) {
    console.log("host required");
    return;
  }

  const customIp = Deno.args[1];

  const targetIp = customIp || await pingPorkbun();
  if (targetIp) {
    const currentIp = await getCurrentSetIp(domain);
    if (currentIp !== targetIp) {
      editDNSRecord(domain, targetIp);
    } else {
      console.log(`A record for ${domain} is already ${targetIp}`);
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
    console.log(
      `Could not ping ${PORKBUN_HOSTNAME}, likely due to missing environment variables`,
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
    console.log(`Could not get DNS records`);
    return "";
  }
  const responseBody = await request.json();
  if (responseBody.records.length > 1) {
    return "";
  } else {
    return responseBody.records[0].content;
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
    console.log(`Could not set DNS: ${request.statusText}`);
    return;
  }
  console.log(
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
