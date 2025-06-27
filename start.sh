#!/bin/bash
# Start script for Render deployment
# Uses PORT environment variable if available, otherwise defaults to 3001

PORT=${PORT:-3001}
echo "Starting Next.js on port $PORT"
exec next start -p $PORT
