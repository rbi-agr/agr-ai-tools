AUTHORIZATION="$1"
TASK="$2"
SERVICE_ID="$3"
URL="$4"
CONFIG="$5"
INPUT_DATA="$6"
MAX_RETRIES=4
RETRY_INTERVAL=0
RETRY_COUNT=0
TIMEOUT=40


while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # Execute curl command with timeout
    response=$(curl -k -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: $AUTHORIZATION" \
        -d '{
          "pipelineTasks": [
            {
              "taskType": "'"$TASK"'",
              "config": '"$CONFIG"'
            }
          ],
          "inputData": '"$INPUT_DATA"'
        }' \
        --max-time $TIMEOUT \
        "$URL")

    # Check response status
    if [ $? -eq 0 ]; then
        echo $response
        exit 0
    else
        sleep $RETRY_INTERVAL
        RETRY_COUNT=$((RETRY_COUNT+1))
    fi
done

exit 1