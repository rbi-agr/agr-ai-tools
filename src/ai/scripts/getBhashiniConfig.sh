ULCA_USER_ID=$1
ULCA_API_KEY=$2
ULCA_CONFIG_URL=$3
TASK=$4
CONFIG=$5

# Set headers
HEADERS="Content-Type: application/json"

# Construct request body
BODY=$(cat <<EOF
{
    "pipelineTasks": [
        {
            "taskType": "${TASK}",
            "config": ${CONFIG}
        }
    ],
    "pipelineRequestConfig": {
        "pipelineId": "64392f96daac500b55c543cd"
    }
}
EOF
)

# Make the curl request
curl -k -X POST "${ULCA_CONFIG_URL}" \
    -H "userID: ${ULCA_USER_ID}" \
    -H "ulcaApiKey: ${ULCA_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "${BODY}"