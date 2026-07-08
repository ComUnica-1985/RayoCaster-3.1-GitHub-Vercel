import fs from "node:fs";
import path from "node:path";
const forbidden = ["node_modules", ".data", "service-account", "firebase-adminsdk", "gateway/server.js"];
const root = process.cwd();
const files = [];
function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { if (["node_modules", ".git", "dist"].includes(item.name)) continue; const full = path.join(dir, item.name); if (item.isDirectory()) walk(full); else files.push(path.relative(root, full).replaceAll("\\", "/")); } }
walk(root);
const bad = files.filter((file) => (file === ".env" || file.startsWith(".env.")) && file !== ".env.example" || forbidden.some((term) => file.toLowerCase().includes(term.toLowerCase())));
if (bad.length) { console.error("Archivos prohibidos:", bad); process.exit(1); }
console.log(`Paquete limpio: ${files.length} archivos.`);
