import { getFirebaseAuth, getFirebaseDatabase } from "../server/lib/firebase-admin.js";
import { requireAdmin } from "../server/lib/auth.js";
import { rootPath, roleForEmail } from "../server/lib/desktop-access.js";
import { assertAllowedOrigin, json, methodNotAllowed, readJson, setSecurityHeaders } from "../server/lib/http.js";

function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim()); }
function validPassword(value) { const text = String(value || ""); return text.length >= 8 && text.length <= 72 && /[A-Za-z]/.test(text) && /\d/.test(text); }

async function listUsers() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDatabase();
  const result = [];
  let token;
  do {
    const page = await auth.listUsers(1000, token);
    for (const record of page.users) {
      if (!record.email) continue;
      const profile = (await db.ref(`${rootPath()}/profiles/${record.uid}`).get()).val() || {};
      const role = roleForEmail(record.email);
      result.push({
        uid: record.uid,
        email: record.email,
        role,
        disabled: record.disabled || profile.active === false,
        protectedAccount: role === "admin",
        mustChangePassword: Boolean(profile.mustChangePassword),
        createdAt: record.metadata.creationTime,
      });
    }
    token = page.pageToken;
  } while (token);
  return result.sort((a, b) => a.email.localeCompare(b.email, "es"));
}

export default async function handler(req, res) {
  setSecurityHeaders(res);
  try {
    const admin = await requireAdmin(req);
    if (!admin) return json(res, 403, { ok: false, error: "Acceso exclusivo para administracion." });
    if (req.method === "GET") return json(res, 200, { ok: true, users: await listUsers() });
    if (!["POST", "DELETE"].includes(req.method)) return methodNotAllowed(res, ["GET", "POST", "DELETE"]);
    if (!assertAllowedOrigin(req)) return json(res, 403, { ok: false, error: "Origen no autorizado." });
    const body = await readJson(req);

    if (req.method === "POST") {
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");
      if (!validEmail(email)) return json(res, 400, { ok: false, error: "Ingrese un correo electronico valido." });
      if (roleForEmail(email) === "admin") return json(res, 400, { ok: false, error: "No es posible crear otros administradores desde la consola." });
      if (!validPassword(password)) return json(res, 400, { ok: false, error: "La contrasena temporal debe tener entre 8 y 72 caracteres, con letras y numeros." });
      let created;
      try {
        created = await getFirebaseAuth().createUser({ email, password, emailVerified: false, disabled: false });
      } catch (error) {
        if (error?.code === "auth/email-already-exists") return json(res, 409, { ok: false, error: "Ese correo ya existe." });
        throw error;
      }
      await getFirebaseDatabase().ref(`${rootPath()}/profiles/${created.uid}`).set({
        email,
        role: "broadcaster",
        active: true,
        protectedAccount: false,
        mustChangePassword: true,
        createdBy: admin.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return json(res, 201, { ok: true, users: await listUsers() });
    }

    const uid = String(body.uid || "").trim();
    if (!uid) return json(res, 400, { ok: false, error: "Usuario invalido." });
    if (uid === admin.uid) return json(res, 400, { ok: false, error: "No puede eliminar su propia cuenta." });
    const target = await getFirebaseAuth().getUser(uid);
    if (roleForEmail(target.email) === "admin") return json(res, 400, { ok: false, error: "La cuenta administrativa esta protegida." });
    await getFirebaseAuth().deleteUser(uid);
    await getFirebaseDatabase().ref(`${rootPath()}/profiles/${uid}`).remove();
    await getFirebaseDatabase().ref(`${rootPath()}/desktopLeases/${uid}`).remove();
    return json(res, 200, { ok: true, users: await listUsers() });
  } catch (error) {
    console.error(error);
    if (error?.code === "auth/user-not-found") return json(res, 404, { ok: false, error: "El usuario no existe." });
    return json(res, 500, { ok: false, error: "Error interno en la administracion de usuarios." });
  }
}
