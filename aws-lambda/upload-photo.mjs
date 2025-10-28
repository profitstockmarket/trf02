// Node.js 18.x Lambda (ESM). Uses AWS SDK v2 preinstalled in the Lambda runtime.
// Accepts JSON body: { filename, filetype, data(base64), prefix? }
// Stores to S3 under optional prefix and returns { key, url } with a presigned GET URL.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AWS = require('aws-sdk');

const s3 = new AWS.S3({ region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1' });
const BUCKET = process.env.BUCKET_NAME;
const URL_EXPIRES_SECONDS = parseInt(process.env.URL_EXPIRES_SECONDS || '600', 10);
const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES || `${10 * 1024 * 1024}`, 10); // 10MB default
const ALLOWED_TYPES = (process.env.ALLOWED_MIME || 'image/jpeg,image/png,image/webp,image/gif,image/avif').split(',');

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
  'Access-Control-Allow-Methods': 'OPTIONS,POST',
};

const response = (statusCode, bodyObj) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', ...corsHeaders },
  body: JSON.stringify(bodyObj),
});

const badRequest = (message) => response(400, { error: message });

function sanitizeFileName(name = '') {
  const base = name.split(/[/\\]/).pop() || 'file';
  return base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 128);
}

function sanitizePrefix(prefix) {
  if (!prefix) return '';
  let p = String(prefix).trim();
  if (!p) return '';
  // Remove leading/trailing slashes and collapse repeats
  p = p.replace(/^\/+|\/+$/g, '').replace(/\/+/, '/');
  // No path traversal
  p = p.replace(/\.\./g, '');
  return p;
}

export async function handler(event) {
  try {
    if (event?.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    if (!BUCKET) {
      console.error('Missing BUCKET_NAME env');
      return response(500, { error: 'Server not configured' });
    }

    if (!event || !event.body) return badRequest('Missing body');

    let payload;
    try {
      payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      return badRequest('Invalid JSON body');
    }

    const filename = sanitizeFileName(payload?.filename);
    const filetype = String(payload?.filetype || '').trim();
    const base64 = String(payload?.data || '');
    const prefix = sanitizePrefix(payload?.prefix);

    if (!filename) return badRequest('filename required');
    if (!filetype) return badRequest('filetype required');
    if (!ALLOWED_TYPES.includes(filetype)) return badRequest('Unsupported filetype');
    if (!base64) return badRequest('data required');

    let buffer;
    try {
      buffer = Buffer.from(base64, 'base64');
    } catch {
      return badRequest('data must be base64');
    }

    if (!buffer?.length) return badRequest('empty data');
    if (buffer.length > MAX_BYTES) return badRequest(`file too large (>${MAX_BYTES} bytes)`);

    const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14); // YYYYMMDDhhmmss
    const key = (prefix ? `${prefix}/` : '') + `${ts}_${filename}`;

    await s3
      .putObject({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: filetype,
        ACL: 'private',
        Metadata: {
          originalfilename: filename,
          uploadedat: new Date().toISOString(),
        },
      })
      .promise();

    const url = s3.getSignedUrl('getObject', {
      Bucket: BUCKET,
      Key: key,
      Expires: URL_EXPIRES_SECONDS,
      ResponseContentType: filetype,
    });

    return response(200, { key, url, contentType: filetype, size: buffer.length });
  } catch (err) {
    console.error('upload-photo error', err);
    return response(500, { error: 'Upload failed' });
  }
}
