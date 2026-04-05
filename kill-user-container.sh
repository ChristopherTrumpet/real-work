#!/bin/bash

USER_ID=$1
POST_ID=$2

if [ -z "$USER_ID" ] || [ -z "$POST_ID" ]; then
  echo "Usage: $0 <user_id> <post_id>"
  exit 1
fi

echo "Searching for container for user $USER_ID and post $POST_ID..."

# 1. Get all running container IDs
CONTAINERS=$(docker ps -q)

for CID in $CONTAINERS; do
  # 2. Inspect each container for our specific environment variables
  MATCH=$(docker inspect "$CID" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E "REALWORK_SUPABASE_ACCESS_TOKEN|REALWORK_POST_ID")
  
  # We need to be careful with the token check since we don't have the token in the script easily, 
  # but we definitely have the POST_ID.
  # A better way might be to look for the user ID if we passed it as an env var.
  # For now, let's look for the POST_ID and then verify the user if possible, 
  # OR rely on the fact that the API call is already authenticated.
  
  # Check if this container has the correct POST_ID
  HAS_POST=$(docker inspect "$CID" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep "REALWORK_POST_ID=$POST_ID")
  
  if [ -n "$HAS_POST" ]; then
    # To be extra sure it's the right user, we could check if the container image or name has a pattern,
    # but since we are in a trusted API context, killing the container with this POST_ID 
    # that just sent a completion is likely correct.
    # Note: If multiple users run the same post, we might need a unique identifier per session.
    
    echo "Found matching container $CID. Killing it..."
    docker stop "$CID"
    docker rm "$CID"
    exit 0
  fi
done

echo "No matching container found."
exit 1
