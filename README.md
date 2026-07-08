# RayoCaster 3.1 — control web condicionado por escritorio

RayoCaster separa la consola web serverless del gateway persistente de audio:

- **Vercel Hobby:** interfaz, canje de acceso, sesiones, administración y tokens Ed25519.
- **Firebase Authentication:** correo y contraseña.
- **Firebase Realtime Database:** perfiles, leases del ejecutable y códigos de un solo uso.
- **RayoCaster Desktop 3.1:** gateway WebSocket, Cloudflare Quick Tunnel, FFmpeg, Icecast y archivos locales.

La web no contiene login independiente. Un acceso directo muestra una pantalla bloqueada. El ejecutable autenticado solicita un enlace de un solo uso; la cookie web sigue siendo válida únicamente mientras la lease del mismo equipo permanezca activa.

## Inicio

Siga `docs/PUESTA_EN_MARCHA_3_1.md` en orden. No despliegue antes de publicar las reglas nuevas y generar los secretos.

## Seguridad

- No suba `.env`, `deployment-secrets.txt`, cuentas de servicio ni contraseñas Icecast.
- `prueba@unico.edu.co` se configura como administrador mediante `ADMIN_EMAILS`.
- El administrador puede crear únicamente operadores Email/Password y no puede eliminarse ni crear otros administradores.
- Los tokens de transmisión se firman en Vercel con Ed25519; el EXE almacena solamente la clave pública.
- La URL temporal del túnel se obtiene desde la lease y no requiere redeploy.

## Validación incluida

```powershell
npm ci
npm test
npm run build
node scripts/verify-package.js
```
