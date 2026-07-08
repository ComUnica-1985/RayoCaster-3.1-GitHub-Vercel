export function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export async function readJson(req, maxBytes = 16 * 1024) {
  if (req.body && typeof req.body === "object") return req.body;
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function methodNotAllowed(res, allowed) {
  res.setHeader("Allow", allowed.join(", "));
  return json(res, 405, { ok: false, error: "Metodo no permitido." });
}

export function getRequestOrigin(req) {
  return String(req.headers.origin || "").trim();
}

function requestOwnOrigin(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  const proto = String(req.headers["x-forwarded-proto"] || (process.env.NODE_ENV === "production" ? "https" : "http"))
    .split(",")[0]
    .trim();
  return host ? `${proto}://${host}` : "";
}

export function assertAllowedOrigin(req) {
  const origin = getRequestOrigin(req);
  if (!origin) return true;
  if (origin === requestOwnOrigin(req)) return true;
  const configured = String(process.env.APP_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.includes(origin);
}

export function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
}
