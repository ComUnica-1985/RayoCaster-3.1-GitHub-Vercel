const required = ["SESSION_SECRET", "ADMIN_EMAILS", "FIREBASE_PROJECT_ID", "FIREBASE_DATABASE_URL", "FIREBASE_SERVICE_ACCOUNT_BASE64", "STREAM_TOKEN_PRIVATE_KEY_BASE64"];
const missing = required.filter((name) => !String(process.env[name] || "").trim());
if (missing.length) { console.error("Variables faltantes: " + missing.join(", ")); process.exit(1); }
if (String(process.env.SESSION_SECRET).length < 32) { console.error("SESSION_SECRET debe tener al menos 32 caracteres."); process.exit(1); }
console.log("Variables del plano de control: OK");
