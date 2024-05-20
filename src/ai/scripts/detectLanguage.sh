# #!/bin/bash

# text="$1"

# # Define your API endpoint and headers
# API_ENDPOINT="https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/compute"
# HEADERS="-H 'Content-Type: application/json'"

# # Define the request body
# BODY="{\"modelId\": \"${TEXT_LANG_DETECTION_MODEL}\", \"task\": \"txt-lang-detection\", \"input\": [{\"source\": \"${text//\"/\\\"}\"}], \"userId\": null}"

# # Execute the curl request and store the response
# response=$(curl -s -X POST -d "$BODY" $HEADERS $API_ENDPOINT)

# echo "$response"


# #!/bin/bash

# text="$1"

# # Define your API endpoint and headers
# API_ENDPOINT="https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/compute"
# HEADERS="-H 'Content-Type: application/json'"

# # Define the request body
# BODY="{\"modelId\": \"${TEXT_LANG_DETECTION_MODEL}\", \"task\": \"txt-lang-detection\", \"input\": [{\"source\": \"${text}\"}], \"userId\": null}"

# # Execute the curl request and store the response
# response=$(curl -s -X POST -d "$BODY" $HEADERS $API_ENDPOINT)

# echo "$response"










# # Extracting parameters
# text=$1
# modelId=$2

# # Making curl request
# curl -X POST \
#   https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/compute \
#   -H 'Content-Type: application/json' \
#   -d '{
#     "modelId": "'"$modelId"'",
#     "task": "txt-lang-detection",
#     "input": [{
#         "source": "'"$text"'"
#     }],
#     "userId": null
#   }'


text=$1
modelId=$2

# Making curl request and capturing output
response=$(curl -k -X POST \
  https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/compute \
  -H 'Content-Type: application/json' \
  -d '{
    "modelId": "'"$modelId"'",
    "task": "txt-lang-detection",
    "input": [{
        "source": "'"$text"'"
    }],
    "userId": null
  }')

# Returning the response
echo "$response"