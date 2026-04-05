
FROM lscr.io/linuxserver/webtop:ubuntu-xfce

ENV DEBIAN_FRONTEND=noninteractive

# Install common tools and VS Code
RUN apt-get update && apt-get install -y \
    git curl wget gpg sudo \
     \
    && ARCH=$(dpkg --print-architecture) \
    && if [ "$ARCH" = "arm64" ]; then VSCODE_ARCH="linux-deb-arm64"; else VSCODE_ARCH="linux-deb-x64"; fi \
    && wget -qO vscode.deb "https://code.visualstudio.com/sha/download?build=stable&os=${VSCODE_ARCH}" \
    && apt-get install -y ./vscode.deb \
    && rm vscode.deb \
    && rm -rf /var/lib/apt/lists/*

# Template specific setup
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt-get install -y nodejs

# Clone repo into /workspace (Avoiding /config volume issues)
WORKDIR /workspace
RUN git clone https://github.com/ChristopherTrumpet/birthday_pinata.git . || echo "Clone failed"
RUN chown -R abc:abc /workspace

# Setup Autostart for VS Code and Firefox
RUN mkdir -p /etc/xdg/autostart && \
    echo "[Desktop Entry]\n\
Type=Application\n\
Name=VS Code\n\
Exec=code /workspace --no-sandbox --disable-gpu\n\
Terminal=false" > /etc/xdg/autostart/vscode.desktop && \
    echo "[Desktop Entry]\n\
Type=Application\n\
Name=Firefox\n\
Exec=bash /dockerstartup/start_browser.sh\n\
Terminal=false" > /etc/xdg/autostart/firefox.desktop


COPY start_browser.sh /dockerstartup/start_browser.sh
RUN chmod +x /dockerstartup/start_browser.sh



RUN echo '#!/bin/bash\ncd /workspace && python3 -m http.server 8080 &\n' > /dockerstartup/run_server.sh && \
chmod +x /dockerstartup/run_server.sh


# Final permission ensure
RUN chown -R abc:abc /workspace && chmod -R 777 /workspace
