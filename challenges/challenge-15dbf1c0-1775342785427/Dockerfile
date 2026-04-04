
FROM kasmweb/vs-code:1.15.0
USER root

# Install common tools and browsers (Heaviest layer, highly cacheable)
RUN apt-get update && apt-get install -y git curl firefox && rm -rf /var/lib/apt/lists/*

# Environment setup (Still cacheable if same template/lang used)


# Prepare seeded workspace via default profile
RUN mkdir -p /home/kasm-default-profile/project &&     mkdir -p /home/kasm-default-profile/.config/Code/User &&     echo '{"workbench.startupEditor": "none", "terminal.integrated.cwd": "/home/kasm-user/project"}' > /home/kasm-default-profile/.config/Code/User/settings.json

# Clone repo into the default profile (Least cacheable, occurs at end)
WORKDIR /home/kasm-default-profile/project
RUN git clone https://github.com/ChristopherTrumpet/birthday_pinata.git . || echo "Clone failed"

# If web template, inject auto-start browser script into the startup directory

COPY start_browser.sh /dockerstartup/start_browser.sh
RUN chmod +x /dockerstartup/start_browser.sh



RUN echo '#!/bin/bash\ncd /home/kasm-user/project && python3 -m http.server 8080 &\n' > /dockerstartup/run_server.sh && \
chmod +x /dockerstartup/run_server.sh


# Final permission fix for the default profile
RUN chown -R 1000:1000 /home/kasm-default-profile

USER 1000
WORKDIR /home/kasm-user/project
