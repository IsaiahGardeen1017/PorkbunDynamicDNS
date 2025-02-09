#!/bin/bash

# Check if the required argument (repo directory) is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <repo_directory> [branch_name] [build_command]"
    exit 1
fi

# Configuration
REPO_DIR="$1"                     # Path to your git repository
BRANCH_NAME="${2:-main}"          # Branch to check, default is "main"
BUILD_COMMAND="${3:-deno run build}"  # Build command, default is "deno run build"

# Navigate to the repository directory
cd "$REPO_DIR" || exit

# Fetch the latest changes from the remote
git fetch origin "$BRANCH_NAME"

# Check for changes
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/$BRANCH_NAME)" ]; then
    echo "Changes detected. Pulling latest changes..."
    git pull origin "$BRANCH_NAME"

    # Run the build command
    echo "Running build command: $BUILD_COMMAND"
    pwd
    eval cd "$REPO_DIR" && "$BUILD_COMMAND"
    pwd
else
    echo "No changes detected."
fi