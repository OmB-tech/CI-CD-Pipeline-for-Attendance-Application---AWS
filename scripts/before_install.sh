#!/bin/bash

# Update package lists
apt-get update -y

# Install Node.js if not present
if ! type node > /dev/null 2>&1; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install pm2 globally if not present
if ! type pm2 > /dev/null 2>&1; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Install Nginx if not present
if ! type nginx > /dev/null 2>&1; then
    echo "Installing Nginx..."
    apt-get install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi

# Clean up target directory to prevent conflicts during deployment
rm -rf /home/ubuntu/attendance-system
mkdir -p /home/ubuntu/attendance-system
chown -R ubuntu:ubuntu /home/ubuntu/attendance-system
