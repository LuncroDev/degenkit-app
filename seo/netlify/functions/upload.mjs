// Server-side upload to Cloudflare R2 (S3-compatible). Keeps the R2 secret OUT of the browser.
// Env vars (Netlify → Site settings → Environment variables):
//   R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL
// POST /api/upload   header x-kind: image | json   body: raw bytes
import { createHash, createHmac, randomUUID } from "node:crypto";

const ALLOWED_ORIGINS = ["https://degenkit.app", "https://www.degenkit.app"];
const MAX_IMAGE = 2 * 1024 * 1024;   // 2 MB
const MAX_JSON = 20 * 1024;          // 20 KB
const hits = new Map();              // best-effort in-memory rate limit per instance

const sha256 = (d) => createHash("sha256").update(d).digest("hex");
const hmac = (k, d) => createHmac("sha256", k).update(d).digest();

function sniffImage(b) {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return ["image/png", "png"];
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ["image/jpeg", "jpg"];
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return ["image/gif", "gif"];
  if (b.length > 12 && b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP") return ["image/webp", "webp"];
  return null;
}

export function signedPut({ accountId, bucket, accessKey, secretKey, key, body, contentType, now = new Date() }) {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const uri = `/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const amzdate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzdate.slice(0, 8);
  const payloadHash = sha256(body);
  const headers = { "content-type": contentType, host, "x-amz-content-sha256": payloadHash, "x-amz-date": amzdate };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map((h) => `${h}:${headers[h]}\n`).join("");
  const canonical = ["PUT", uri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${date}/auto/s3/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzdate, scope, sha256(canonical)].join("\n");
  const kSigning = hmac(hmac(hmac(hmac("AWS4" + secretKey, date), "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(toSign).digest("hex");
  return {
    url: `https://${host}${uri}`,
    headers: {
      "Content-Type": contentType, "x-amz-content-sha256": payloadHash, "x-amz-date": amzdate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

const json = (obj, status = 200, origin = "") => new Response(JSON.stringify(obj), {
  status, headers: { "Content-Type": "application/json", ...(origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {}) },
});

export default async (req) => {
  const origin = req.headers.get("origin") || "";
  const okOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: okOrigin ? {
      "Access-Control-Allow-Origin": okOrigin, "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "content-type,x-kind", Vary: "Origin" } : {} });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (origin && !okOrigin) return json({ error: "Origin not allowed" }, 403);

  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "unknown";
  const t = Date.now();
  const recent = (hits.get(ip) || []).filter((x) => t - x < 10 * 60 * 1000);
  if (recent.length >= 20) return json({ error: "Too many uploads, try again in a few minutes." }, 429, okOrigin);
  recent.push(t); hits.set(ip, recent);

  const env = process.env;
  for (const k of ["R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_URL"]) {
    if (!env[k]) return json({ error: "Upload service is not configured." }, 500, okOrigin);
  }

  const kind = req.headers.get("x-kind");
  const body = Buffer.from(await req.arrayBuffer());
  let key, contentType;
  if (kind === "image") {
    if (!body.length || body.length > MAX_IMAGE) return json({ error: "Image must be under 2 MB." }, 413, okOrigin);
    const sniff = sniffImage(body);
    if (!sniff) return json({ error: "Unsupported image type (use PNG, JPG, GIF or WebP)." }, 415, okOrigin);
    [contentType] = sniff; key = `images/${randomUUID()}.${sniff[1]}`;
  } else if (kind === "json") {
    if (!body.length || body.length > MAX_JSON) return json({ error: "Metadata too large." }, 413, okOrigin);
    let obj; try { obj = JSON.parse(body.toString("utf8")); } catch { return json({ error: "Invalid JSON." }, 400, okOrigin); }
    if (!obj || typeof obj !== "object" || Array.isArray(obj) || typeof obj.name !== "string" || typeof obj.symbol !== "string")
      return json({ error: "Metadata must include name and symbol." }, 400, okOrigin);
    contentType = "application/json"; key = `metadata/${randomUUID()}.json`;
  } else return json({ error: "Unknown kind." }, 400, okOrigin);

  const req2 = signedPut({ accountId: env.R2_ACCOUNT_ID, bucket: env.R2_BUCKET, accessKey: env.R2_ACCESS_KEY_ID, secretKey: env.R2_SECRET_ACCESS_KEY, key, body, contentType });
  const res = await fetch(req2.url, { method: "PUT", headers: req2.headers, body });
  if (!res.ok) return json({ error: "Storage upload failed." }, 502, okOrigin);
  return json({ url: `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}` }, 200, okOrigin);
};

export const config = { path: "/api/upload" };
