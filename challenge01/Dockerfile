# Start with the linuxserver WebTop base (Ubuntu XFCE)
FROM lscr.io/linuxserver/webtop:ubuntu-xfce

# Set environment variables for the user/password (optional, can also be done at runtime)
# ENV CUSTOM_USER=admin
# ENV PASSWORD=password

# Install your custom software
# Note: webtop uses apt, just like normal Ubuntu
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    python3 \
    git \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Copy your custom files into the container
# Format: COPY [local-path] [container-path]
COPY ./files /config/Desktop/my_project_files

# (Optional) Run any setup scripts for your software
# RUN pip3 install -r /config/Desktop/my_project_files/requirements.txt