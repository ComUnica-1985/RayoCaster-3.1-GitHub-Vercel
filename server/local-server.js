import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import desktopBootstrap from "../api/desktop-bootstrap.js";
import desktopExchange from "../api/desktop-exchange.js";
import authLogout from "../api/auth-logout.js";
import authMe from "../api/auth-me.js";
import authChangePassword from "../api/auth-change-password.js";
import users from "../api/users.js";
import runtimeConfig from "../api/runtime-config.js";
import streamToken from "../api/stream-token.js";
import health from "../api/health.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const app = express();
const port = Number(process.env.PORT || 3000);
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
const routes = {
  "/api/desktop-bootstrap": desktopBootstrap,
  "/api/desktop-exchange": desktopExchange,
  "/api/auth-logout": authLogout,
  "/api/auth-me": authMe,
  "/api/auth-change-password": authChangePassword,
  "/api/users": users,
  "/api/runtime-config": runtimeConfig,
  "/api/stream-token": streamToken,
  "/api/health": health,
};
for (const [route, handler] of Object.entries(routes)) app.all(route, (req, res) => handler(req, res));
app.use(express.static(path.join(root, "public"), { etag: true, maxAge: "1h" }));
app.get("*", (_req, res) => res.sendFile(path.join(root, "public/index.html")));
app.listen(port, "0.0.0.0", () => console.log(`RayoCaster control 4.0: http://localhost:${port}`));
