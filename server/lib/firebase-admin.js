import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

function parseBase64ServiceAccount(value) {
  const text = Buffer.from(String(value || ""), "base64").toString("utf8");
  const parsed = JSON.parse(text);
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 no contiene una cuenta de servicio valida.");
  }
  return { projectId: parsed.project_id, clientEmail: parsed.client_email, privateKey: parsed.private_key };
}

function inlineServiceAccount() {
  const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

const ADMIN_APP_NAME = "rayocaster-admin";

export function firebaseServerConfigured() {
  const hasDatabase = Boolean(String(process.env.FIREBASE_DATABASE_URL || "").trim());
  const hasBase64 = Boolean(String(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || "").trim());
  const hasInline = Boolean(inlineServiceAccount());
  const hasApplicationDefault = Boolean(String(process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim());
  return hasDatabase && (hasBase64 || hasInline || hasApplicationDefault);
}

export function getFirebaseAdminApp() {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) return existing;
  const databaseURL = String(process.env.FIREBASE_DATABASE_URL || "").trim();
  if (!databaseURL) throw new Error("FIREBASE_DATABASE_URL es obligatoria.");
  const base64 = String(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || "").trim();
  const inline = inlineServiceAccount();
  const credential = base64 ? cert(parseBase64ServiceAccount(base64)) : inline ? cert(inline) : applicationDefault();
  return initializeApp({ credential, databaseURL }, ADMIN_APP_NAME);
}

export function getFirebaseDatabase() { return getDatabase(getFirebaseAdminApp()); }
export function getFirebaseAuth() { return getAuth(getFirebaseAdminApp()); }
