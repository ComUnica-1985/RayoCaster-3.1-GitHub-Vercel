import { consumeOneTimeCode } from "../server/lib/desktop-access.js";
import { issueDesktopSession } from "../server/lib/session.js";
import { json, methodNotAllowed, readJson, setSecurityHeaders } from "../server/lib/http.js";

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  try {
    const body = await readJson(req);
    const code = String(body.code || "").trim();
    const user = code ? await consumeOneTimeCode(code) : null;
    if (!user) return json(res, 401, { ok: false, error: "El acceso de un solo uso vencio o ya fue utilizado." });
    issueDesktopSession(res, user);
    return json(res, 200, { ok: true });
  } catch (error) {
    console.error("desktop-exchange", error?.message || error);
    return json(res, 400, { ok: false, error: "No fue posible canjear el acceso del ejecutable." });
  }
}
