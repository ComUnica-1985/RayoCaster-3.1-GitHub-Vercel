import { createOneTimeCode, verifyDesktopBootstrap } from "../server/lib/desktop-access.js";
import { json, methodNotAllowed, readJson, setSecurityHeaders } from "../server/lib/http.js";

function ownOrigin(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  const proto = String(req.headers["x-forwarded-proto"] || (process.env.NODE_ENV === "production" ? "https" : "http")).split(",")[0].trim();
  return host ? `${proto}://${host}` : "";
}

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  try {
    const auth = String(req.headers.authorization || "");
    const idToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const body = await readJson(req);
    const user = await verifyDesktopBootstrap(idToken, String(body.deviceId || "").trim());
    const code = await createOneTimeCode(user);
    const origin = ownOrigin(req);
    if (!origin) return json(res, 500, { ok: false, error: "No se pudo resolver el dominio de la consola." });
    return json(res, 200, { ok: true, launchUrl: `${origin}/#desktopCode=${encodeURIComponent(code)}`, expiresIn: Number(process.env.BOOTSTRAP_CODE_SECONDS || 90) });
  } catch (error) {
    console.error("desktop-bootstrap", error?.message || error);
    const known = {
      BOOTSTRAP_INVALID: [400, "Solicitud de escritorio invalida."],
      LEASE_INACTIVE: [403, "El equipo no tiene una lease activa."],
      USER_DISABLED: [403, "La cuenta esta deshabilitada."],
      PROFILE_INACTIVE: [403, "El perfil esta deshabilitado."],
    };
    const [status, message] = known[error?.message] || [401, "No fue posible validar la sesion del ejecutable."];
    return json(res, status, { ok: false, error: message });
  }
}
