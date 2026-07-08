import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "public");
const destination = path.join(root, "dist");
await fs.rm(destination, { recursive: true, force: true });
await fs.cp(source, destination, { recursive: true });
console.log(`Frontend generado en ${destination}`);
