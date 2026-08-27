#!/bin/bash
# Watchdog: keeps the Next.js dev server alive
cd /home/z/my-project

while true; do
  if ! ss -tlnp | grep -q ':3000 '; then
    echo "$(date): Server not running, starting..."
    pkill -f 'next' 2>/dev/null
    rm -f dev.log
    npx next dev -p 3000 > dev.log 2>&1 &
    sleep 20
  else
    sleep 3
  fi
done
