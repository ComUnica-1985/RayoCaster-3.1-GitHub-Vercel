# RayoCaster 4.0 — GitHub y Vercel

Plano de control serverless condicionado por RayoCaster Desktop 4.0.

## Correcciones estructurales

- `firebase-admin` fijado en `12.7.0` para evitar la incompatibilidad ESM observada con `jwks-rsa 4`.
- `/api/health` no importa Firebase Admin al arrancar y devuelve variables faltantes sin derribar la función.
- Preparación de secretos implementada en Node.js con `crypto.randomBytes`; no depende de `RandomNumberGenerator.Fill` ni de la versión de .NET.
- Verificación automática de runtime y dependencias.
- La web continúa sin login independiente y exige una lease activa del ejecutable.

## Inicio

```powershell
npm ci
npm run prepare:deployment -- --service-account "C:\CredencialesFirebase\radio-unioc-firebase-adminsdk.json" --admin-email "prueba@unico.edu.co"
npm run verify
```

Siga `docs/PUESTA_EN_MARCHA_4_0.md`.
