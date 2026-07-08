# Puesta en marcha RayoCaster 3.1

## 1. Archivos necesarios

Use conjuntamente:

- `RayoCaster-3.1-GitHub-Vercel.zip` para GitHub y Vercel.
- `RayoCaster-Desktop-Portable-3.1-Windows11.zip` en el computador de la oficina.

No use el EXE 3.0 para la integración web. La versión 3.1 añade el túnel, la URL dinámica y el enlace de un solo uso.

## 2. Firebase Authentication

En Firebase Console, proyecto `radio-unioc`:

1. Abra **Build > Authentication > Sign-in method**.
2. Mantenga **Email/Password** habilitado.
3. Mantenga **Anonymous** deshabilitado.
4. Verifique que exista `prueba@unico.edu.co`.

La contraseña de prueba compartida debe cambiarse después de terminar la validación.

## 3. Publicar las reglas nuevas

Abra **Build > Realtime Database > Rules** y sustituya todo por el contenido de:

```text
firebase/database.rules.json
```

Pulse **Publish**. Estas reglas permiten que cada usuario mantenga solo su propia lease y bloquean desde clientes los códigos web y la administración.

## 4. Crear cuenta de servicio

En **Project settings > Service accounts > Firebase Admin SDK**:

1. Pulse **Generate new private key**.
2. Guarde el JSON fuera del repositorio.
3. No lo copie a la carpeta del proyecto.

## 5. Generar secretos y par Ed25519

Abra PowerShell dentro de la carpeta web y ejecute:

```powershell
npm ci
powershell -ExecutionPolicy Bypass -File ".\scripts\prepare-deployment.ps1" -ServiceAccountJson "C:\RUTA\radio-unioc-firebase-adminsdk.json"
```

Se crea `deployment-secrets.txt`. Contiene:

- `SESSION_SECRET`;
- cuenta de servicio en Base64;
- clave privada Ed25519 para Vercel;
- clave pública Ed25519 para el ejecutable.

No agregue ese archivo a Git.

## 6. Crear repositorio privado GitHub

Cree un repositorio vacío y privado. No agregue README ni licencia desde GitHub.

En PowerShell:

```powershell
cd "C:\RUTA\RayoCaster-3.1-GitHub-Vercel"
git init
git branch -M main
git add .
git status
git commit -m "RayoCaster 3.1 control web condicionado por escritorio"
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

`git status` no debe mostrar `deployment-secrets.txt`, `.env`, cuentas de servicio, `node_modules` ni `dist`.

## 7. Importar en Vercel Hobby

En Vercel:

1. **Add New > Project**.
2. Importe el repositorio privado.
3. Framework Preset: **Other**.
4. Root Directory: raíz.
5. Install Command: `npm ci`.
6. Build Command: `npm run build`.
7. Output Directory: `dist`.

## 8. Variables de Vercel

Agregue:

```text
APP_NAME=RayoCaster
STATION_NAME=Radio Universitaria
SESSION_SECRET=<deployment-secrets.txt>
ADMIN_EMAILS=prueba@unico.edu.co
FIREBASE_PROJECT_ID=radio-unioc
FIREBASE_DATABASE_URL=https://radio-unioc-default-rtdb.firebaseio.com
FIREBASE_DATA_ROOT=rayocaster
FIREBASE_SERVICE_ACCOUNT_BASE64=<deployment-secrets.txt>
STREAM_TOKEN_PRIVATE_KEY_BASE64=<deployment-secrets.txt>
WEB_SESSION_HOURS=8
BOOTSTRAP_CODE_SECONDS=90
LEASE_GRACE_SECONDS=15
```

No agregue a Vercel credenciales Icecast, archivos JSON ni la clave pública.

Pulse **Deploy**. Después abra:

```text
https://SU-PROYECTO.vercel.app/api/health
```

Debe indicar `ok: true`, `desktopGate: true` y `firebaseConfigured: true`.

Al abrir directamente la raíz debe aparecer una pantalla bloqueada. Esto es correcto.

## 9. Preparar RayoCaster Desktop 3.1

Descomprima el ZIP de escritorio y ejecute:

```powershell
powershell -ExecutionPolicy Bypass -File ".\ACTUALIZAR-ARCHIVOS-ENLOCAL.ps1"
```

Abra una vez `RayoCaster-Desktop.exe` y ciérrelo. Esto conserva la configuración previa y agrega valores predeterminados faltantes.

Copie de `deployment-secrets.txt` únicamente la línea:

```text
streamTokenPublicKeyBase64=...
```

Ejecute:

```powershell
powershell -ExecutionPolicy Bypass -File ".\CONFIGURAR-DESPUES-DE-VERCEL.ps1" -VercelUrl "https://SU-PROYECTO.vercel.app" -StreamPublicKeyBase64 "CLAVE_PUBLICA"
```

No use la clave privada en el ejecutable.

## 10. Primer acceso web condicionado

1. Abra RayoCaster Desktop 3.1.
2. Inicie sesión con el usuario Firebase.
3. Pulse **Iniciar gateway + túnel**.
4. La primera vez, el EXE descarga `cloudflared.exe` desde el release oficial de Cloudflare hacia:

```text
C:\Users\user\Documents\enLocal\bin\cloudflared.exe
```

5. Espere estas líneas:

```text
OK prueba de salud del gateway
OK túnel WSS https://....trycloudflare.com
```

6. Pulse **Abrir consola web**.
7. El EXE pide a Vercel un código de un solo uso y abre el navegador.
8. La web debe mostrar la consola y el correo autenticado.

No copie manualmente la URL temporal de Cloudflare en Vercel. La lease la actualiza automáticamente.

## 11. Comportamiento de seguridad esperado

- Abrir Vercel directamente: consola bloqueada.
- Abrir mediante el EXE: consola habilitada.
- Reutilizar el enlace de un solo uso: rechazado.
- Cerrar el EXE o cerrar sesión: la lease vence y las API dejan de responder.
- Detener gateway: la sesión puede seguir visible, pero no entrega configuración de transmisión.
- Un operador no ve administración.
- El administrador no puede eliminarse ni crear otros administradores.

## 12. Configurar RadioBOSS/Icecast

Edite:

```text
C:\Users\user\Documents\enLocal\config\appsettings.json
```

Complete únicamente con los datos reales entregados por RadioBOSS Cloud:

```json
{
  "icecastHost": "HOST_REAL",
  "icecastPort": 8000,
  "icecastUser": "source",
  "icecastPassword": "CONTRASENA_SOURCE_REAL",
  "icecastMount": "/MOUNT_REAL",
  "icecastTls": true,
  "audioProfile": "opus",
  "audioBitrate": "64k"
}
```

No reemplace el archivo completo: modifique los campos dentro del JSON existente. Confirme con RadioBOSS si el mount acepta Ogg/Opus. Si solo acepta MP3, use `"audioProfile": "mp3"`.

## 13. Prueba de transmisión

1. EXE abierto y autenticado.
2. Gateway y túnel activos.
3. Consola abierta desde el EXE.
4. Pulse **Preparar consola**.
5. Autorice el micrófono.
6. Pulse **Iniciar emisión**.
7. Confirme en el EXE:

```text
WebSocket conectado
FFmpeg iniciado y conectando con Icecast
```

8. Confirme la fuente en RadioBOSS Cloud.
9. Mida la latencia desde un reproductor independiente.

## 14. Consideraciones del plan gratuito

Vercel solo ejecuta solicitudes breves. El WebSocket, FFmpeg y el túnel permanecen en Windows. Cloudflare Quick Tunnel no exige servidor adicional, pero su URL cambia al reiniciarse y no ofrece el mismo compromiso operativo que un túnel nombrado. La aplicación resuelve el cambio publicando la URL nueva en Firebase.

El computador debe permanecer encendido, con internet y sin suspensión durante la transmisión.
