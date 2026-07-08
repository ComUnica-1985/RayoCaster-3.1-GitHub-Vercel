import { createSignedToken, verifySignedToken } from "./crypto.js";

const COOKIE_NAME = "rayo_desktop_session";

function parseCookies(header) {
  return String(header || "").split(";").map((item) => item.trim()).filter(Boolean).reduce((acc, item) => {
    const index = item.indexOf("=");
    if (index > 0) acc[item.slice(0, index)] = decodeURIComponent(item.slice(index + 1));
    return acc;
  }, {});
}

export function issueDesktopSession(res, user) {
  const hours = Math.min(12, Math.max(1, Number(process.env.WEB_SESSION_HOURS || 8)));
  const ttl = hours * 60 * 60;
  const token = createSignedToken({
    purpose: "desktop-web-session",
    sub: user.uid,
    email: user.email,
    role: user.role,
    deviceId: user.deviceId,
  }, process.env.SESSION_SECRET, ttl);
  const attributes = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${ttl}`,
  ];
  if (process.env.NODE_ENV === "production") attributes.push("Secure");
  res.setHeader("Set-Cookie", attributes.join("; "));
}

export function clearSession(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

export function readDesktopSession(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  const payload = verifySignedToken(token, process.env.SESSION_SECRET);
  return payload?.purpose === "desktop-web-session" ? payload : null;
}
