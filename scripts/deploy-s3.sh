#!/usr/bin/env bash
set -euo pipefail

# Deploy the built Angular SPA to S3 with correct cache headers.
# Requirements:
# - AWS CLI configured with permissions
# - Environment:
#     S3_BUCKET (required)
#     DIST_DIR (optional, default: dist/trf02/browser)
#     CLOUDFRONT_DISTRIBUTION_ID (optional)

: "${S3_BUCKET:?S3_BUCKET is required (target S3 bucket name)}"
DIST_DIR=${DIST_DIR:-dist/trf02/browser}

if [ ! -d "$DIST_DIR" ]; then
  echo "Build output not found at $DIST_DIR. Run 'npm run build' first." >&2
  exit 1
fi

echo "Syncing static assets (excluding index.html) to s3://$S3_BUCKET/ ..."
aws s3 sync "$DIST_DIR" "s3://$S3_BUCKET/" \
  --delete \
  --exclude "index.html" \
  --cache-control "public,max-age=31536000,immutable"

echo "Uploading index.html with short cache ..."
aws s3 cp "$DIST_DIR/index.html" "s3://$S3_BUCKET/index.html" \
  --cache-control "public,max-age=0,must-revalidate" \
  --content-type "text/html; charset=utf-8"

if [ "${CLOUDFRONT_DISTRIBUTION_ID:-}" != "" ]; then
  echo "Creating CloudFront invalidation ..."
  aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*"
fi

echo "Deploy complete."
