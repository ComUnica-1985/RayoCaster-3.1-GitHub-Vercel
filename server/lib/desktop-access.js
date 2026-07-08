import crypto from "node:crypto";
import { getFirebaseAuth, getFirebaseDatabase } from "./firebase-admin.js";
import { readDesktopSession } from "./session.js";

export function rootPath() { return String(process.env.FIREBASE_DATA_ROOT || "rayocaster").replace(/^\/+|\/+$/g, ""); }
function adminEmails() {
  return new Set(String(process.env.ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean));
}
export function roleForEmail(email) { return adminEmails().has(String(email || "").toLowerCase()) ? "admin" : "broadcaster"; }
export function codeHash(code) { return crypto.createHash("sha256").update(String(code)).digest("base64url"); }
export function leaseIsActive(lease, now = Date.now()) {
  const grace = Math.max(0, Number(process.env.LEASE_GRACE_SECONDS || 15)) * 1000;
  const lastSeen = Number(lease?.lastSeen || 0);
  const heartbeatFresh = lastSeen > 0 && lastSeen + 100000 + grace > now;
  return Boolean(lease?.online && heartbeatFresh && Number(lease?.expiresAt || 0) + grace > now);
}
export function normalizeGatewayUrl(value) {
  const raw = String(value || "").trim().replace(/\/$/, "");
  if (!raw.startsWith("https://")) return "";
  return `wss://${raw.slice("https://".length)}/ws`;
}

export async function ensureProfile(decoded) {
  const db = getFirebaseDatabase();
  const path = `${rootPath()}/profiles/${decoded.uid}`;
  const ref = db.ref(path);
  const snapshot = await ref.get();
  const expectedRole = roleForEmail(decoded.email);
  const existing = snapshot.val() || {};
  const profile = {
    email: decoded.email || existing.email || "",
    role: expectedRole,
    active: existing.active !== false,
    protectedAccount: expectedRole === "admin",
    mustChangePassword: Boolean(existing.mustChangePassword),
    createdAt: existing.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  await ref.set(profile);
  return profile;
}

export async function getLease(uid, deviceId) {
  if (!uid || !deviceId) return null;
  const snapshot = await getFirebaseDatabase().ref(`${rootPath()}/desktopLeases/${uid}/${deviceId}`).get();
  return snapshot.val() || null;
}

export async function verifyDesktopBootstrap(idToken, deviceId) {
  if (!idToken || !deviceId || String(deviceId).length > 128) throw new Error("BOOTSTRAP_INVALID");
  const decoded = await getFirebaseAuth().verifyIdToken(idToken, true);
  const userRecord = await getFirebaseAuth().getUser(decoded.uid);
  if (userRecord.disabled || !userRecord.email) throw new Error("USER_DISABLED");
  const lease = await getLease(decoded.uid, deviceId);
  if (!leaseIsActive(lease)) throw new Error("LEASE_INACTIVE");
  const profile = await ensureProfile({ uid: decoded.uid, email: userRecord.email });
  if (!profile.active) throw new Error("PROFILE_INACTIVE");
  return { uid: decoded.uid, email: userRecord.email, role: profile.role, deviceId, lease, profile };
}

export async function createOneTimeCode(user) {
  const code = crypto.randomBytes(32).toString("base64url");
  const hash = codeHash(code);
  const ttl = Math.min(180, Math.max(30, Number(process.env.BOOTSTRAP_CODE_SECONDS || 90))) * 1000;
  await getFirebaseDatabase().ref(`${rootPath()}/webAccessCodes/${hash}`).set({
    uid: user.uid,
    email: user.email,
    role: user.role,
    deviceId: user.deviceId,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttl,
    used: false,
  });
  return code;
}

export async function consumeOneTimeCode(code) {
  const hash = codeHash(code);
  const ref = getFirebaseDatabase().ref(`${rootPath()}/webAccessCodes/${hash}`);
  let consumed = null;
  const result = await ref.transaction((current) => {
    if (!current || current.used || Number(current.expiresAt || 0) <= Date.now()) return;
    consumed = { ...current };
    return { ...current, used: true, usedAt: Date.now() };
  }, undefined, false);
  if (!result.committed || !consumed) return null;
  const lease = await getLease(consumed.uid, consumed.deviceId);
  if (!leaseIsActive(lease)) return null;
  return { uid: consumed.uid, email: consumed.email, role: consumed.role, deviceId: consumed.deviceId };
}

export async function requireDesktopUser(req) {
  const session = readDesktopSession(req);
  if (!session) return null;
  const lease = await getLease(session.sub, session.deviceId);
  if (!leaseIsActive(lease)) return null;
  const [profileSnapshot, authUser] = await Promise.all([
    getFirebaseDatabase().ref(`${rootPath()}/profiles/${session.sub}`).get(),
    getFirebaseAuth().getUser(session.sub),
  ]);
  const profile = profileSnapshot.val();
  if (!profile || profile.active === false || authUser.disabled || !authUser.email) return null;
  if (authUser.email.toLowerCase() !== String(session.email || "").toLowerCase()) return null;
  return {
    uid: session.sub,
    email: authUser.email,
    role: roleForEmail(authUser.email),
    deviceId: session.deviceId,
    lease,
    mustChangePassword: Boolean(profile.mustChangePassword),
  };
}

export async function requireAdmin(req) {
  const user = await requireDesktopUser(req);
  return user?.role === "admin" ? user : null;
}
