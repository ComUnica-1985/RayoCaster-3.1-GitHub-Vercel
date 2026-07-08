# Arquitectura 3.1

## Flujo de acceso

1. El EXE autentica Email/Password contra Firebase.
2. El EXE mantiene `desktopLeases/{uid}/{deviceId}` cada veinte segundos.
3. El EXE inicia gateway local y Cloudflare Quick Tunnel.
4. El EXE publica `gatewayUrl` y `gatewayOnline` en su lease.
5. El EXE envía su ID token a `/api/desktop-bootstrap`.
6. Vercel verifica el ID token con Firebase Admin, comprueba la lease y almacena solo el hash de un código de un solo uso.
7. El navegador canjea el código; Vercel crea una cookie HttpOnly, Secure y SameSite=Strict.
8. Cada API protegida vuelve a comprobar usuario, perfil, dispositivo y vigencia de la lease.
9. Vercel firma un token Ed25519 de dos minutos para el gateway.
10. El gateway valida con la clave pública antes de iniciar FFmpeg.

## Separación de secretos

- Vercel: cuenta de servicio, secreto de sesión y clave privada Ed25519.
- Windows: credenciales Icecast y clave pública Ed25519.
- Navegador: cookie HttpOnly y token efímero de transmisión.
- Firebase cliente: únicamente lease propia.
