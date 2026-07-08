# Puesta en marcha RayoCaster 4.0

## 1. Preparar secretos sin depender de PowerShell/.NET

Desde la raíz del repositorio:

```powershell
npm ci
npm run prepare:deployment -- --service-account "C:\CredencialesFirebase\radio-unioc-firebase-adminsdk.json" --admin-email "prueba@unico.edu.co"
```

Se generan:

- `deployment-secrets.txt`: valores privados para Vercel.
- `desktop-public-config.txt`: únicamente la clave pública para el ejecutable.

Ambos están excluidos de Git. No publique el primero.

## 2. Validación local

```powershell
npm run verify
npm audit --omit=dev
```

## 3. Firebase

- Authentication: Email/Password habilitado y Anonymous deshabilitado.
- Publique `firebase/database.rules.json` en Realtime Database.

## 4. Vercel

Importe el repositorio privado y configure:

```text
Framework: Other
Install: npm ci
Build: npm run build
Output: dist
```

Variables normales:

```text
APP_NAME=RayoCaster
STATION_NAME=Radio Universitaria
ADMIN_EMAILS=prueba@unico.edu.co
FIREBASE_PROJECT_ID=radio-unioc
FIREBASE_DATABASE_URL=https://radio-unioc-default-rtdb.firebaseio.com
FIREBASE_DATA_ROOT=rayocaster
WEB_SESSION_HOURS=8
BOOTSTRAP_CODE_SECONDS=90
LEASE_GRACE_SECONDS=15
```

Variables privadas tomadas de `deployment-secrets.txt`:

```text
SESSION_SECRET
FIREBASE_SERVICE_ACCOUNT_BASE64
STREAM_TOKEN_PRIVATE_KEY_BASE64
```

Después del despliegue, `/api/health` debe devolver `ok: true`. Si falta una variable devuelve 503 y una lista `missing`, en lugar de colapsar la función.

## 5. Escritorio

1. Descomprima `RayoCaster-Desktop-Portable-4.0-Windows11.zip`.
2. Ejecute `PRUEBA-RAPIDA.cmd`.
3. Ejecute `INICIAR-RAYOCASTER.cmd`.
4. Inicie sesión.
5. Ejecute `ASISTENTE-CONFIGURACION.cmd` y proporcione la URL de Vercel y la clave pública de `desktop-public-config.txt`.
6. Abra nuevamente el EXE, inicie gateway + túnel y abra la consola web.

No ejecute ningún script de compilación. Go no es necesario para operar la aplicación.
