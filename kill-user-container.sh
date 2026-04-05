#!/bin/bash

USER_ID=$1
POST_ID=$2

if [ -z "$USER_ID" ] || [ -z "$POST_ID" ]; then
  echo "[kill-script] Error: Missing arguments. Usage: $0 <user_id> <post_id>"
  exit 1
fi

echo "[kill-script] Searching for container for user $USER_ID and post $POST_ID..."

# 1. Get all running container IDs
CONTAINERS=$(docker ps -q)

if [ -z "$CONTAINERS" ]; then
  echo "[kill-script] No running containers found."
  exit 0
fi

FOUND=0
for CID in $CONTAINERS; do
  # 2. Inspect each container for our specific environment variables
  # Use a more specific grep to avoid partial matches
  ENV_VARS=$(docker inspect "$CID" --format '{{range .Config.Env}}{{println .}}{{end}}')
  
  HAS_POST=$(echo "$ENV_VARS" | grep "^REALWORK_POST_ID=$POST_ID$")
  
  if [ -n "$HAS_POST" ]; then
    echo "[kill-script] Found matching container $CID for post $POST_ID. Killing immediately..."
    # Use kill instead of stop for immediate exit
    docker kill "$CID" > /dev/null 2>&1
    docker rm "$CID" > /dev/null 2>&1
    echo "[kill-script] Container $CID terminated."
    FOUND=1
    # Note: We don't exit here in case there are multiple containers (e.g. leaked ones) 
    # but normally there should be only one.
  fi
done

if [ $FOUND -eq 0 ]; then
  echo "[kill-script] No matching container found for post $POST_ID."
  exit 1
else
  exit 0
fi
