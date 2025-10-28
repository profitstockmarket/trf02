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

> Replace `YOUR_BUCKET_NAME` and attach this to the role created above. Note the role ARN (e.g., `arn:aws:iam::123456789012:role/github-deploy-trf02`).

## 4) Configure GitHub Secrets and Variables

In your GitHub repo settings:

- Secrets
  - `AWS_ROLE_TO_ASSUME` → the IAM role ARN from step 3 (store as a Secret)
- Variables
  - `AWS_REGION` → e.g., `us-east-1`
  - `S3_BUCKET` → your bucket name
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
