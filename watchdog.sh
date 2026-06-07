#!/bin/bash
# Watchdog: auto-restart gen_all_images.mjs if stuck, auto-deploy when done

LOG=/tmp/gen_log.txt
STALE_SEC=120  # restart if no log update for 2 minutes

start_gen() {
  node /c/Users/note/Desktop/memoir/gen_all_images.mjs > "$LOG" 2>&1 &
  echo $!
}

get_img_count() {
  ls /c/Users/note/Desktop/memoir/nostalgia/img/ 2>/dev/null | wc -l
}

echo "[watchdog] Starting gen_all_images.mjs"
PID=$(start_gen)
echo "[watchdog] PID=$PID"

while true; do
  sleep 30

  # Check if process is still running
  if ! kill -0 "$PID" 2>/dev/null; then
    # Process exited — check if done
    LAST=$(tail -3 "$LOG" 2>/dev/null)
    IMG_COUNT=$(get_img_count)
    if echo "$LAST" | grep -q "Done!"; then
      echo "[watchdog] Generation complete! Images: $IMG_COUNT"
      echo "[watchdog] Deploying to Firebase..."
      cd /c/Users/note/Desktop/memoir && firebase deploy --only hosting >> /tmp/deploy_log.txt 2>&1
      if [ $? -eq 0 ]; then
        echo "[watchdog] DEPLOY SUCCESS"
      else
        echo "[watchdog] DEPLOY FAILED — check /tmp/deploy_log.txt"
      fi
      exit 0
    else
      echo "[watchdog] Process died unexpectedly (imgs=$IMG_COUNT). Restarting..."
      PID=$(start_gen)
      echo "[watchdog] New PID=$PID"
    fi
    continue
  fi

  # Check for stale log (process hung)
  if [ -f "$LOG" ]; then
    LAST_MOD=$(date -r "$LOG" +%s 2>/dev/null || stat -c %Y "$LOG" 2>/dev/null)
    NOW=$(date +%s)
    AGE=$((NOW - LAST_MOD))
    if [ "$AGE" -gt "$STALE_SEC" ]; then
      IMG_COUNT=$(get_img_count)
      echo "[watchdog] Log stale for ${AGE}s (imgs=$IMG_COUNT). Killing and restarting..."
      kill "$PID" 2>/dev/null
      sleep 3
      PID=$(start_gen)
      echo "[watchdog] New PID=$PID"
    fi
  fi
done
