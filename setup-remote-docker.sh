#!/bin/bash

# ==============================================================================
# Oracle Cloud Free Tier - Remote Docker Setup Script (UNIX FIXED)
# ==============================================================================

set -e

echo "1. Cleaning up any previous attempts..."
sudo rm -rf ~/docker-certs

echo "2. Installing Docker..."
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

echo "3. Generating mTLS Certificates for secure remote access..."
CERT_DIR=~/docker-certs
mkdir -p "$CERT_DIR"
cd "$CERT_DIR"

# Get the public IP of the Oracle Instance
HOST_IP=$(curl -s ifconfig.me)

# Generate CA
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -days 3650 -key ca-key.pem -sha256 -out ca.pem -subj "/CN=$HOST_IP"

# Generate Server Certificate
openssl genrsa -out server-key.pem 4096
openssl req -subj "/CN=$HOST_IP" -sha256 -new -key server-key.pem -out server.csr
echo "subjectAltName = IP:$HOST_IP,IP:127.0.0.1" > extfile.cnf
echo "extendedKeyUsage = serverAuth" >> extfile.cnf
openssl x509 -req -days 3650 -sha256 -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem -extfile extfile.cnf

# Generate Client Certificate
openssl genrsa -out key.pem 4096
openssl req -subj '/CN=nextjs-client' -new -key key.pem -out client.csr
echo "extendedKeyUsage = clientAuth" > extfile-client.cnf
openssl x509 -req -days 3650 -sha256 -in client.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -out cert.pem -extfile extfile-client.cnf

echo "4. Securing Certificates..."
chmod -v 0400 ca-key.pem key.pem server-key.pem
chmod -v 0444 ca.pem server-cert.pem cert.pem

echo "5. Configuring Docker Daemon for TCP (Port 2376)..."
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

echo "6. Opening local firewall for Port 2376 and Container Port Range (32768-60999)..."
# Oracle instances often use iptables with a final REJECT rule. 
# We use -I (Insert) at the top to ensure these rules take precedence.
sudo iptables -I INPUT 1 -p tcp --dport 2376 -j ACCEPT || true
sudo iptables -I INPUT 1 -p tcp --dport 32768:60999 -j ACCEPT || true

# If using ufw, ensure it's also configured
if command -v ufw > /dev/null; then
    sudo ufw allow 2376/tcp || true
    sudo ufw allow 32768:60999/tcp || true
fi

# Save rules to persist after reboot
if command -v netfilter-persistent > /dev/null; then
    sudo netfilter-persistent save || true
fi

echo "=================================================================="
echo "✅ DOCKER SETUP COMPLETE!"
echo "=================================================================="
echo "IP: $HOST_IP"
echo "=================================================================="
echo "Copy the contents below into your .env variables:"
echo ""
echo "DOCKER_HOST_IP=$HOST_IP"
echo ""
echo "DOCKER_CA_CERT:"
cat ca.pem
echo ""
echo "DOCKER_CLIENT_CERT:"
cat cert.pem
echo ""
echo "DOCKER_CLIENT_KEY:"
cat key.pem
echo "=================================================================="
echo ""
echo "IMPORTANT: Don't forget to open port 2376 in the Oracle Cloud Console (Ingress Rules)!"