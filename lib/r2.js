// lib/r2.js
import { S3Client } from "@aws-sdk/client-s3";
import crypto from "crypto";

let _client = null;

function must(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing env var: ${name}`);
  }
  return String(v).trim();
}

function normalizeEndpoint(raw) {
  let e = String(raw || "").trim();

  // If they provided just an account id by mistake, build the endpoint.
  // (Account id is 32 hex chars; this is a convenience, not a requirement)
  if (/^[a-f0-9]{32}$/i.test(e)) {
    e = `https://${e}.r2.cloudflarestorage.com`;
  }

  // If no scheme, assume https
  if (e && !/^https?:\/\//i.test(e)) {
    e = `https://${e}`;
  }

  // Remove any trailing slash
  e = e.replace(/\/+$/, "");

  return e;
}

export function getR2() {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const envEndpoint = process.env.R2_ENDPOINT?.trim();

  // Prefer explicit endpoint, otherwise build from account id
  const endpoint = normalizeEndpoint(
    envEndpoint || (accountId ? `${accountId}.r2.cloudflarestorage.com` : "")
  );

  // Hard fail early if endpoint still looks wrong
  if (!endpoint || !/^https:\/\//i.test(endpoint)) {
    throw new Error(
      `R2 endpoint is missing/invalid. Set R2_ENDPOINT to: https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
    );
  }
  if (!endpoint.includes(".r2.cloudflarestorage.com")) {
    throw new Error(
      `R2_ENDPOINT must be the account endpoint, not a bucket URL. Expected: https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
    );
  }

  const accessKeyId = must("R2_ACCESS_KEY_ID");
  const secretAccessKey = must("R2_SECRET_ACCESS_KEY");

  _client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },

    // Helps compatibility with S3-like providers (including R2)
    forcePathStyle: true,
  });

  return _client;
}

export function getR2Bucket() {
  return must("R2_BUCKET_NAME");
}

// Put uploads under drafts/ with a random key
export function makeObjectKey({ folder = "drafts", ext = "jpg" } = {}) {
  const safeFolder = String(folder || "drafts").replace(/[^a-z0-9/_-]/gi, "");
  const safeExt = String(ext || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
  const id = crypto.randomUUID();
  return `${safeFolder}/${id}.${safeExt}`;
}

export function guessExt(filename, mimetype) {
  const name = String(filename || "");
  const lower = name.toLowerCase();
  const m = String(mimetype || "").toLowerCase();

  if (lower.endsWith(".png") || m === "image/png") return "png";
  if (lower.endsWith(".webp") || m === "image/webp") return "webp";
  if (lower.endsWith(".gif") || m === "image/gif") return "gif";
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg") || m === "image/jpeg") return "jpg";
  return "jpg";
}
