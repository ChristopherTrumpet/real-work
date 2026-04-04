#!/bin/bash
# Wait for the web server to be ready (port 3000 for node, port 80 for static/python simple server)
TARGET_PORT=8080
while ! curl -s http://localhost:$TARGET_PORT > /dev/null; do
  sleep 2
done
firefox http://localhost:$TARGET_PORT &
