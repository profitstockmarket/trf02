Upload Lambda

Overview
- Runtime: Node.js 18.x (ESM)
- File: upload-photo.mjs exports handler(event)
- Dependencies: Uses AWS SDK v2 preinstalled in Lambda (no bundling required)

Behavior
- Expects JSON body: { filename, filetype, data (base64), prefix? }
- Sanitizes filename and optional prefix (folder) and stores to S3 under `${prefix}/${timestamp}_${filename}`
- Returns { key, url, contentType, size } with a presigned GET URL
- CORS: Handles OPTIONS and returns permissive headers; adjust CORS_ORIGIN if needed

Environment variables
- BUCKET_NAME: S3 bucket to write to (required)
- AWS_REGION: AWS region (defaults to us-east-1)
- URL_EXPIRES_SECONDS: Presigned URL TTL (default 600)
- MAX_UPLOAD_BYTES: Max upload size (default 10485760 = 10MB)
- ALLOWED_MIME: Comma-separated whitelist (default image/jpeg,image/png,image/webp,image/gif,image/avif)
- CORS_ORIGIN: Access-Control-Allow-Origin (default *)

API Gateway
- Integration: Lambda proxy
- Methods: POST, OPTIONS
- Ensure binary media types are not needed (payload is JSON with base64 string)
- Protect the route with an API key and/or authorizer for admin-only uploads

Deploy (with AWS CLI)
1) Zip and upload
   - Set FUNCTION_NAME to your Lambda function name.
   - From this folder:
     zip upload-photo.zip upload-photo.mjs
     aws lambda update-function-code --function-name "$FUNCTION_NAME" --zip-file fileb://upload-photo.zip

2) Set environment variables (once)
     aws lambda update-function-configuration \
       --function-name "$FUNCTION_NAME" \
       --environment "Variables={BUCKET_NAME=your-bucket,AWS_REGION=us-east-1,URL_EXPIRES_SECONDS=600,MAX_UPLOAD_BYTES=10485760}"

3) Test
   - Invoke from API Gateway or the Lambda console with a sample event body.

Notes
- Frontend passes an optional `prefix` to control the target folder; ensure your IAM role has s3:PutObject permissions on the bucket (and prefix if using a restricted policy).
- For a stricter setup, validate file extension in addition to MIME, and consider scanning or image processing via an async pipeline.
