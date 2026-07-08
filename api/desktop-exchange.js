import { consumeOneTimeCode } from "../server/lib/desktop-access.js";
import { issueDesktopSession } from "../server/lib/session.js";
import { methodNotAllowed, setSecurityHeaders } from "../server/lib/http.js";

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  const requestUrl = new URL(req.url, "http://local");
  const code = String(requestUrl.searchParams.get("code") || "");
  const user = code ? await consumeOneTimeCode(code) : null;
  if (!user) {
    res.statusCode = 302;
    res.setHeader("Location", "/?access=expired");
    return res.end();
  }
  issueDesktopSession(res, user);
  res.statusCode = 302;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Location", "/");
  return res.end();
}
