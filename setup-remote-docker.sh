#!/bin/bash

# ==============================================================================
# Oracle Cloud Free Tier - Centralized Storage & Registry Setup
# ==============================================================================

set -e

echo "1. Installing Docker..."
sudo apt-get update || true
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key:
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the repository:
. /etc/os-release
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $VERSION_CODENAME stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update || true
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "2. Setting up Docker Registry (Port 5000) for image storage..."
# Start a local registry on the Oracle VM
sudo docker run -d \
  -p 5000:5000 \
  --restart always \
  --name registry \
  registry:2 || echo "Registry already running"

echo "3. Generating mTLS Certificates for secure remote access (DAEMON)..."
CERT_DIR=~/docker-certs
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"
HOST_IP=$(curl -s ifconfig.me)

if [ ! -f ca.pem ]; then
    openssl genrsa -out ca-key.pem 4096
    openssl req -new -x509 -days 3650 -key ca-key.pem -sha256 -out ca.pem -subj "/CN=$HOST_IP"
    openssl genrsa -out server-key.pem 4096
    openssl req -subj "/CN=$HOST_IP" -sha256 -new -key server-key.pem -out server.csr
    echo "subjectAltName = IP:$HOST_IP,IP:127.0.0.1" > extfile.cnf
    echo "extendedKeyUsage = serverAuth" >> extfile.cnf
    openssl x509 -req -days 3650 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem -extfile extfile.cnf
    openssl genrsa -out key.pem 4096
    openssl req -subj '/CN=nextjs-client' -new -key key.pem -out client.csr
    echo "extendedKeyUsage = clientAuth" > extfile-client.cnf
    openssl x509 -req -days 3650 -sha256 -in client.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out cert.pem -extfile extfile-client.cnf
    chmod -v 0400 ca-key.pem key.pem server-key.pem
    chmod -v 0444 ca.pem server-cert.pem cert.pem
fi

echo "4. Configuring Docker Daemon for TCP (Port 2376)..."
sudo mkdir -p /etc/docker/certs
sudo cp ca.pem server-cert.pem server-key.pem /etc/docker/certs/
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo bash -c "cat > /etc/systemd/system/docker.service.d/override.conf <<EOF
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:2376 --tlsverify --tlscacert=/etc/docker/certs/ca.pem --tlscert=/etc/docker/certs/server-cert.pem --tlskey=/etc/docker/certs/server-key.pem
EOF"

sudo systemctl daemon-reload
sudo systemctl restart docker

echo "5. Configuring Firewall..."
sudo iptables -I INPUT 1 -p tcp --dport 2376 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 5000 -j ACCEPT
if command -v netfilter-persistent > /dev/null; then
    sudo netfilter-persistent save || true
fi

echo "=================================================================="
echo "✅ CENTRAL STORAGE SETUP COMPLETE!"
echo "=================================================================="
echo "Oracle IP: $HOST_IP"
echo "Registry: $HOST_IP:5000 (Store this in DOCKER_HOST_IP in .env)"
echo "=================================================================="
echo "IMPORTANT:"
echo "1. On your LOCAL computer, add this to /etc/docker/daemon.json (or Docker Desktop settings):"
echo "   { \"insecure-registries\": [\"$HOST_IP:5000\"] }"
echo "2. Restart local Docker."
echo "=================================================================="
