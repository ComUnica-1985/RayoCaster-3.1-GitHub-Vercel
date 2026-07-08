import { getFirebaseAuth, getFirebaseDatabase } from "../server/lib/firebase-admin.js";
import { requireUser } from "../server/lib/auth.js";
import { rootPath } from "../server/lib/desktop-access.js";
import { assertAllowedOrigin, json, methodNotAllowed, readJson, setSecurityHeaders } from "../server/lib/http.js";

function passwordValid(value) {
  const text = String(value || "");
  return text.length >= 8 && text.length <= 72 && /[A-Za-z]/.test(text) && /\d/.test(text);
}

export default async function handler(req, res) {
  setSecurityHeaders(res);
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  if (!assertAllowedOrigin(req)) return json(res, 403, { ok: false, error: "Origen no autorizado." });
  try {
    const user = await requireUser(req);
    if (!user) return json(res, 401, { ok: false, error: "Sesion de escritorio no valida." });
    const body = await readJson(req);
    if (!passwordValid(body.newPassword)) return json(res, 400, { ok: false, error: "La nueva contrasena debe tener entre 8 y 72 caracteres, con letras y numeros." });
    await getFirebaseAuth().updateUser(user.uid, { password: String(body.newPassword) });
    await getFirebaseDatabase().ref(`${rootPath()}/profiles/${user.uid}`).update({ mustChangePassword: false, passwordChangedAt: Date.now(), updatedAt: Date.now() });
    return json(res, 200, { ok: true, user: { uid: user.uid, email: user.email, role: user.role, deviceId: user.deviceId, mustChangePassword: false } });
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok: false, error: "No fue posible cambiar la contrasena." });
  }
}
