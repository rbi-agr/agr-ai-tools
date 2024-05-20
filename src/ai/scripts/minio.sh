#!/bin/sh

if [ -z "$1" ]; then
  echo "You have NOT specified a MINIO URL!"
  exit 1
fi

if [ -z "$2" ]; then
  echo "You have NOT specified an ACCESS KEY!"
  exit 1
fi

if [ -z "$3" ]; then
  echo "You have NOT specified a SECRET KEY!"
  exit 1
fi

if [ -z "$4" ]; then
  echo "You have NOT specified a BUCKET!"
  exit 1
fi

if [ -z "$5" ]; then
  echo "You have NOT specified a MINIO FILE PATH!"
  exit 1
fi

# User Minio Vars
URL="$1"
ACCESS_KEY="$2"
SECRET_KEY="$3"
BUCKET="$4"
MINIO_PATH="/${BUCKET}/$5"

# Static Vars
DATE=$(date -u +"%a, %d %b %Y %H:%M:%S GMT")
CONTENT_TYPE='application/zstd'
SIG_STRING="GET\n\n${CONTENT_TYPE}\n${DATE}\n${MINIO_PATH}"
SIGNATURE=$(echo -en "$SIG_STRING" | openssl sha1 -hmac "$SECRET_KEY" -binary | base64)
PROTOCOL="https"

# Construct the presigned URL
URL="${PROTOCOL}://${URL}${MINIO_PATH}?AWSAccessKeyId=${ACCESS_KEY}&Expires=$(( $(date +%s) + 3600 ))&Signature=${SIGNATURE}"

echo "$URL"
