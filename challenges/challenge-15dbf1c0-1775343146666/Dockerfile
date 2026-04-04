# Start with the linuxserver WebTop base (Ubuntu XFCE)
FROM lscr.io/linuxserver/webtop:ubuntu-xfce

# Set environment variables for the user/password (optional, can also be done at runtime)
# ENV CUSTOM_USER=admin
# ENV PASSWORD=password

# Set noninteractive to prevent prompts blocking the build
ENV DEBIAN_FRONTEND=noninteractive

# Install custom software and Visual Studio Code
RUN apt-get update && apt-get install -y \
    python3 \
    git \
    nano \
    curl \
    wget \
    firefox \
    gpg \
    sudo \
    # Dynamically detect architecture for VS Code download
    && ARCH=$(dpkg --print-architecture) \
    && if [ "$ARCH" = "arm64" ]; then VSCODE_ARCH="linux-deb-arm64"; else VSCODE_ARCH="linux-deb-x64"; fi \
    && wget -qO vscode.deb "https://code.visualstudio.com/sha/download?build=stable&os=${VSCODE_ARCH}" \
    && apt-get install -y ./vscode.deb \
    && rm vscode.deb \
    && rm -rf /var/lib/apt/lists/*

# Clone repo into /workspace (Do not use /config during build, as it is a Volume and will be wiped at runtime)
WORKDIR /workspace
RUN git clone https://github.com/ChristopherTrumpet/birthday_pinata.git . || echo "Clone failed"

# Change ownership of the cloned repo to 'abc', which is the default user running the WebTop UI
RUN chown -R abc:abc /workspace

# Setup VS Code to automatically open the workspace on boot
# We do this by dropping a .desktop file into the global XFCE autostart directory
RUN mkdir -p /etc/xdg/autostart && \
    echo "[Desktop Entry]\n\
Type=Application\n\
Name=VS Code Autostart\n\
Exec=code /workspace --no-sandbox --disable-gpu\n\
Terminal=false" > /etc/xdg/autostart/vscode.desktop

# (Optional) Run any setup scripts for your software
# RUN pip3 install -r /workspace/requirements.txt --break-system-packages

# Setup entrypoint (if you still need a custom one)
# COPY entrypoint.sh /entrypoint.sh
# RUN chmod +x /entrypoint.sh
# ENTRYPOINT ["/entrypoint.sh"]