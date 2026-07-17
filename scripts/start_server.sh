#!/bin/bash

# Navigate to application directory
cd /home/ubuntu/attendance-system

# Start or restart application with PM2
echo "Starting application with PM2..."
pm2 start server.js --name "attendance-system" || pm2 restart "attendance-system"

# Save the PM2 list to resurrect on system boot
pm2 save
