import { normalizeGatewayUrl } from "../server/lib/desktop-access.js";
import { requireUser } from "../server/lib/auth.js";
import { json, methodNotAllowed, setSecurityHeaders } from "../server/lib/http.js";

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  const user = await requireUser(req);
  if (!user) return json(res, 401, { ok: false, error: "Sesion de escritorio no valida." });
  const gatewayUrl = normalizeGatewayUrl(user.lease?.gatewayUrl);
  if (!gatewayUrl || user.lease?.gatewayOnline !== true) {
    return json(res, 409, { ok: false, error: "El gateway o el tunel seguro no estan activos en el computador de la oficina." });
  }
  return json(res, 200, {
    ok: true,
    appName: process.env.APP_NAME || "RayoCaster",
    stationName: process.env.STATION_NAME || "Radio Universitaria",
    gatewayUrl,
    deviceId: user.deviceId,
    audio: { format: "s16le", sampleRate: 48000, channels: 1, frameMs: 10 },
  });
}
