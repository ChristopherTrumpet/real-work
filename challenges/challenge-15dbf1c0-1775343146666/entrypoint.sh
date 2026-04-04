#!/bin/bash
export DISPLAY=:1
rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1
vncserver :1 -geometry 1280x800 -depth 24 -SecurityTypes None

# Wait for X
sleep 2

# Start Window Manager
startxfce4 &

# Launch VS Code with the project folder
# --user-data-dir is required to run as root or in certain container envs
code --no-sandbox --user-data-dir /root/.vscode-data /root/project &

# Launch Firefox
firefox &

# Start noVNC proxy (vnc is on 5901, proxy to 6080)
/usr/share/novnc/utils/launch.sh --vnc localhost:5901 --listen 6080
