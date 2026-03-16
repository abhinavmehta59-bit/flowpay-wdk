#!/bin/bash

# FlowPay Auto-Restart Script
# Keeps the server running even after crashes or Mac sleep

SERVER_DIR="/Users/theunknown/.openclaw/workspace/flowpay-wdk"
LOG_FILE="/tmp/flowpay-server.log"
PID_FILE="/tmp/flowpay.pid"

check_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            # Check if responding
            if curl -s http://localhost:3456/api/status > /dev/null 2>&1; then
                return 0  # Running and healthy
            fi
        fi
    fi
    return 1  # Not running or not responding
}

start_server() {
    echo "$(date): Starting FlowPay server..." >> "$LOG_FILE"
    cd "$SERVER_DIR" || exit 1
    nohup node server-enhanced.js >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 3
    if check_server; then
        echo "$(date): Server started successfully" >> "$LOG_FILE"
    else
        echo "$(date): Server failed to start" >> "$LOG_FILE"
    fi
}

# Main loop
while true; do
    if ! check_server; then
        start_server
    fi
    # Check every 30 seconds
    sleep 30
done
