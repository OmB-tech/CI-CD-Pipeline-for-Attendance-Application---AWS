#!/bin/bash

# Stop the application if it is currently running in PM2
echo "Stopping application..."
pm2 stop "attendance-system" || true
