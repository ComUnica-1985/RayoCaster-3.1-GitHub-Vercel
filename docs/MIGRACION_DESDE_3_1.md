# Migración de RayoCaster 3.1 a 4.0

## Qué se conserva

- El proyecto Firebase `radio-unioc`.
- Los usuarios de Firebase Authentication.
- Los datos existentes de Realtime Database.
- Las variables de entorno ya registradas en Vercel.
- La carpeta local del usuario actual: `%USERPROFILE%\Documents\enLocal`.
- Las credenciales Icecast existentes en `appsettings.json`.

## Reemplazo del repositorio existente

1. Cierre RayoCaster Desktop.
2. Haga una copia de la carpeta actual del repositorio.
3. Extraiga el ZIP 4.0 en una carpeta temporal.
4. Copie el contenido del repositorio web 4.0 sobre el repositorio Git existente, sin borrar la carpeta `.git`.
5. Ejecute:

```powershell
cd "C:\Users\Rayo\Documents\GitHub\RayoCaster-3.1-GitHub-Vercel"
Remove-Item -Recurse -Force node_modules,dist -ErrorAction SilentlyContinue
npm ci
npm run verify
npm audit --omit=dev
git add .
git commit -m "Migra RayoCaster a version 4.0"
git push
```

Vercel desplegará el nuevo commit. Si no lo hace, ejecute un redeploy sin caché.

## Secretos

No es obligatorio regenerar secretos si las variables actuales de Vercel funcionan y conserva la clave pública correspondiente en el escritorio. Regenerarlos cambia la pareja Ed25519 y obliga a actualizar también el ejecutable.

Para una instalación nueva:

```powershell
npm run prepare:deployment -- --service-account "C:\CredencialesFirebase\radio-unioc-firebase-adminsdk.json" --admin-email "prueba@unico.edu.co"
```
