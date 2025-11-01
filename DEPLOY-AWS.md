# Deploy to AWS S3 + CloudFront via GitHub Actions (OIDC)

This repo is ready to deploy the Angular app to an Amazon S3 bucket behind a CloudFront distribution. The GitHub Actions workflow authenticates to AWS with OpenID Connect (no long‑lived AWS keys).

## What you’ll set up

- An S3 bucket for the site (origin)
- A CloudFront distribution in front of S3
- Route 53 DNS (optional) for your domain
- An IAM role trusted for GitHub OIDC with permissions to write to S3 and invalidate CloudFront
- GitHub Secrets/Variables the workflow uses

> Note: This deploys the static browser build (SPA). Your serverless media APIs remain on API Gateway + Lambda as before. If you later want true runtime SSR, see the notes at the end for App Runner/Lambda options.

---

## 1) Create the S3 bucket

- Pick a globally unique name (e.g., `trf02-prod-site-<unique>`)
- Block all public access (recommended). CloudFront will access the bucket.
- Enable bucket policy or OAC later per your CloudFront setup.

## 2) Create the CloudFront distribution

- Origin: your S3 bucket
- Use Origin Access Control (OAC) to keep the S3 bucket private
- Default root object: `index.html`
- Cache policy: you can use the default; the workflow sets cache headers
- SPA routing fallback (important): add a Custom Error Response for 404 (and optionally 403) that serves `/index.html` with HTTP status 200 so client-side routes work directly.
- If you have a custom domain
  - Add an ACM certificate in us-east-1 for that domain
  - Attach it to CloudFront
  - Later, add a Route 53 alias A record to the distribution

## 3) Create an IAM role for GitHub OIDC

Follow AWS Console or use the CLI. The role must trust GitHub’s OIDC provider and allow your repo to assume it.

### Trust policy (example)
Replace `OWNER` and `REPO` with your GitHub org/user and repo name (e.g., `profitstockmarket/trf-repo`), and adjust branch if needed.

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

### Permissions policy (example)
Grant minimal access to your bucket and CloudFront invalidation.

```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Write",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::YOUR_BUCKET_NAME",
        "arn:aws:s3:::YOUR_BUCKET_NAME/*"
      ]
    },
    {
      "Sid": "InvalidateCF",
      "Effect": "Allow",
      "Action": [ "cloudfront:CreateInvalidation" ],
      "Resource": "*"
    }
  ]
}
```

If you want to scope CloudFront invalidation to a single distribution instead of using `Resource: "*"`, replace the `InvalidateCF` statement with the following and plug in your account ID and distribution ID. Note that CloudFront is a global service (no region in the ARN):

```
{
  "Sid": "InvalidateSpecificCFDistribution",
  "Effect": "Allow",
  "Action": [
    "cloudfront:CreateInvalidation"
  ],
  "Resource": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
}
```

> Replace `YOUR_BUCKET_NAME` and attach this to the role created above. Note the role ARN (e.g., `arn:aws:iam::123456789012:role/github-deploy-trf02`).

## 4) Configure GitHub Secrets and Variables

In your GitHub repo settings:

- Secrets
  - `AWS_ROLE_TO_ASSUME` → the IAM role ARN from step 3 (store as a Secret)
- Variables
  - `AWS_REGION` → e.g., `us-east-1`
  - `S3_BUCKET` → your bucket name (e.g., `raghuvansh.org`)
  - `CLOUDFRONT_DISTRIBUTION_ID` → distribution ID (optional; skip if not using CloudFront)

The workflow file is at `.github/workflows/deploy.yml`. It will:

1. Build the Angular app
2. Sync all files (except `index.html`) to S3 with long-lived cache headers
3. Upload `index.html` with a short cache
4. Invalidate CloudFront (if configured)

You can run it on demand via the "Run workflow" button or by pushing to `main`.

## 5) Verification

- Push to `main` or run the workflow manually (`Run workflow` button)
- Check S3 for uploaded assets
- Verify CloudFront invalidation completed
- Open your CloudFront domain (or Route 53 alias) and confirm the app loads

## 6) Optional: Route 53

- In Route 53, create an A (alias) record pointing to your CloudFront distribution
- Make sure the ACM certificate covers the domain (in us-east-1)

## 6) Troubleshooting and tips

In Route 53, create an A (alias) record pointing to your CloudFront distribution
SPA fallbacks: Configure 404/403 custom error responses to serve `/index.html` with status 200.

### CORS for API Gateway (Media page)

If your Media page calls API Gateway endpoints (e.g., `/list-photos`, `/upload-photo`) and you see a browser error like:

> Access to fetch from origin 'https://www.raghuvansh.org' has been blocked by CORS policy: Response to preflight request doesn't pass access control check

Configure CORS on the API so the browser’s preflight (OPTIONS) succeeds and the actual response includes the correct headers.

For HTTP API (v2):
- API Gateway → your API → CORS
- Allow origins: `https://raghuvansh.org`, `https://www.raghuvansh.org`
- Allow methods: `GET, POST, OPTIONS`
- Allow headers: `x-api-key, content-type`
- Expose headers: optional (`etag`)
- Max age: `86400`
- Credentials: `false` (recommended unless you actually use cookies)
- Save and deploy

For REST API (v1):
- On each resource (e.g., `/list-photos`, `/upload-photo`), add an `OPTIONS` method with Mock integration returning status 200.
- Method Response (200): add headers `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`.
- Integration Response (200): map static values, e.g.:
  - `Access-Control-Allow-Origin` = `'https://www.raghuvansh.org'` (add apex domain if used)
  - `Access-Control-Allow-Methods` = `'GET,POST,OPTIONS'`
  - `Access-Control-Allow-Headers` = `'x-api-key,content-type'`
- Ensure `OPTIONS` does NOT require an API key or auth.
- Optionally add `Access-Control-Allow-Origin` to the GET/POST Integration Response as well.
- Deploy the API to your stage.

Lambda handlers should also include CORS headers in their actual responses, e.g.:

```
const cors = {
  'Access-Control-Allow-Origin': 'https://www.raghuvansh.org',
  'Access-Control-Allow-Headers': 'content-type,x-api-key',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  // ...your logic
  return { statusCode: 200, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify([]) };
};
```

Quick test (replace the URL):

```
curl -i -X OPTIONS 'https://w00lhezvrh.execute-api.us-east-2.amazonaws.com/list-photos' \
  -H 'Origin: https://www.raghuvansh.org' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: x-api-key,content-type'
```

You should see `Access-Control-Allow-Origin` and related headers in the response.

Tip (zsh/bash): when splitting a `curl` across lines, put a backslash (\) at the end of every continued line except the last. Otherwise the next `-H` line will run as a separate shell command (e.g., `zsh: command not found: -H`). Alternatively, run it on a single line:

```
curl -i -X OPTIONS 'https://w00lhezvrh.execute-api.us-east-2.amazonaws.com/list-photos' -H 'Origin: https://www.raghuvansh.org' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: x-api-key,content-type'
```

Expected preflight response (HTTP API v2):

```
HTTP/2 204
access-control-allow-origin: https://www.raghuvansh.org
access-control-allow-methods: GET,POST,OPTIONS
access-control-allow-headers: x-api-key,content-type
access-control-max-age: 86400
```

### Troubleshooting 404 Not Found (HTTP API v2)

If a direct GET returns `HTTP/2 404 {"message":"Not Found"}`:

- Verify routes: API Gateway → your HTTP API → Routes. Confirm `GET /list-photos` and `POST /upload-photo` exist and each has an Integration attached.
- Stage: Confirm the stage is `$default` with Auto-deploy ON. For `$default`, the URL has no stage segment (use `.../list-photos`, not `.../prod/list-photos`). If you changed routes recently, click Save/Deploy to ensure they’re live.
- Catch-all vs specific routes: If you rely on a `$default` catch-all route only, make sure it’s defined (e.g., `ANY $default`) so `GET /list-photos` is handled; otherwise API Gateway returns 404.
- CORS and OPTIONS: Remove any explicit `OPTIONS` route when using built-in CORS; let API Gateway inject the preflight response so the headers appear.
- API key: If you see `403 Forbidden`, check that your API key is valid and attached to a Usage plan that’s associated with this API and the `$default` stage. Also ensure the routes require the API key only if you intend to enforce it.

Quick GET test (with API key):

```
curl -i 'https://w00lhezvrh.execute-api.us-east-2.amazonaws.com/list-photos' \
  -H 'Origin: https://www.raghuvansh.org' \
  -H 'x-api-key: trf02-key-01-photos'
```

A successful response should be `HTTP/2 200` with JSON and include `access-control-allow-origin`.

### Common CORS pitfall: apex vs www

Browsers treat `https://raghuvansh.org` and `https://www.raghuvansh.org` as different origins. If your API CORS Allowed origins includes only one, calls from the other will fail the preflight with:

> Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present

Fix: In API Gateway HTTP API → CORS, list both origins:

- https://raghuvansh.org
- https://www.raghuvansh.org

Then Save (and Deploy if required). Verify both preflights:

```
curl -i -X OPTIONS 'https://w00lhezvrh.execute-api.us-east-2.amazonaws.com/list-photos' -H 'Origin: https://raghuvansh.org' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: x-api-key,content-type'
curl -i -X OPTIONS 'https://w00lhezvrh.execute-api.us-east-2.amazonaws.com/list-photos' -H 'Origin: https://www.raghuvansh.org' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: x-api-key,content-type'
```

Each should return `HTTP/2 204` and echo the respective `access-control-allow-origin` header.

### If CORS is configured but headers still don't appear

For HTTP APIs, built-in CORS only injects headers when API Gateway itself handles OPTIONS. If an OPTIONS request is routed to an integration, API Gateway won't add CORS headers.

Checks and fixes:

1) Look for an `ANY $default` route

- API Gateway → Your HTTP API → Routes
- If you see a route key `ANY $default`, it will also capture `OPTIONS` and forward it to your integration.
- Fix options:
  - Preferred: Remove `ANY $default` and keep only your explicit routes (e.g., `GET /list-photos`, `POST /upload-photo`). With no OPTIONS route, built-in CORS will respond with headers.
  - Or: Add explicit `OPTIONS /list-photos` and `OPTIONS /upload-photo` routes with an integration (typically Lambda) that returns a preflight response with the same CORS headers you configured.

2) Ensure you clicked Save (and Deploy if Auto-deploy is off)

- CORS changes require a Save on the CORS page. If your stage isn't auto-deploying, deploy the API to `$default`.

3) Verify with curl after each change

```
curl -i -X OPTIONS 'https://w00lhezvrh.execute-api.us-east-2.amazonaws.com/list-photos' \
  -H 'Origin: https://raghuvansh.org' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: x-api-key,content-type'
```

If routing still prevents built-in CORS or you want to avoid CORS entirely, consider proxying the API via CloudFront (next section).

### Eliminate CORS by proxying via CloudFront `/api/*` (recommended)

To avoid CORS and preflights altogether, serve your API under your site domain using CloudFront:

1) Add an Origin to your CloudFront distribution

- Origin domain: `w00lhezvrh.execute-api.us-east-2.amazonaws.com`
- Origin name: `api-gateway`

2) Add a Behavior for path pattern `/api/*`

- Origin: `api-gateway`
- Viewer protocol: Redirect HTTP to HTTPS
- Allowed methods: GET, HEAD, OPTIONS, POST
- Cache policy: `CachingDisabled` (or a custom minimal cache policy for dynamic API)
- Origin request policy: `AllViewerExceptHostHeader` (or include required headers/query/params)
- Add origin request header: `x-api-key` with your API key value (CloudFront → Behaviors → Edit → Origin request settings → Add header)

3) API mapping

- If your API routes are at root (e.g., `/list-photos`), add a path rewrite. In CloudFront, set Origin path to `/` and in your app call `/api/list-photos`. No additional rewrite is needed; CloudFront will forward `/api/list-photos` to `https://w00lhezvrh.execute-api.us-east-2.amazonaws.com/api/list-photos` unless you normalize:
  - Option A: Set Origin path to `/` and create a Function@Edge/CloudFront Function to strip the `/api` prefix before forwarding.
  - Option B (simpler): In the frontend, call the execute-api URL for now, and migrate to CloudFront `/api/*` once the behavior is live and a simple function strips `/api`.

4) Frontend change (once behavior is live)

- Update `src/index.html` runtime config to:

```
window.__TRF_MEDIA_CONFIG = {
  apiKey: undefined, // not needed client-side when CloudFront injects it
  listUrl: '/api/list-photos',
  uploadUrl: '/api/upload-photo'
};
```

Because the API is now same-origin, the browser won’t perform CORS checks or preflights for JSON requests.

## Notes on SSR

This pipeline deploys the browser build (SPA) suitable for S3 + CloudFront. If you want true server-side rendering at runtime, you’ll need a server (e.g., App Runner with a containerized Node SSR server, or Lambda/Lambda@Edge). Recommended next step if you want SSR later:

1. Add a Dockerfile that builds the Angular server bundle and runs `node dist/<project>/server/server.mjs`.
2. Push the container to ECR from the GitHub workflow, then update an App Runner service.
3. Configure CloudFront to route dynamic requests to App Runner and static assets to S3.

We can add an additional workflow `deploy-ssr.yml` to automate this when you’re ready.

---

## Quick local deploy (one-time or emergency)

If you want to go live immediately without waiting for CI, you can deploy locally using the helper script added to `package.json`:

1. Build the app

```bash
npm ci
npm run build
```

2. Deploy to S3 (+ optional CloudFront invalidation)

```bash
export S3_BUCKET="your-bucket-name"
# optional
export CLOUDFRONT_DISTRIBUTION_ID="E1ABCDEF..."

npm run deploy:s3
```

The script uploads immutable assets with a long cache and `index.html` with a short cache. If `CLOUDFRONT_DISTRIBUTION_ID` is set, it triggers an invalidation.
