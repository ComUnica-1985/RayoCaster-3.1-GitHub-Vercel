<<<<<<< HEAD
param(
=======
﻿param(
>>>>>>> dba596d41223502bc642be675fb4b0ce4d0b9ae5
  [Parameter(Mandatory=$true)][string]$ServiceAccountJson,
  [string]$AdminEmail = "prueba@unico.edu.co"
)
$ErrorActionPreference = "Stop"
<<<<<<< HEAD
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js no está disponible en PATH." }
& node "$PSScriptRoot\prepare-deployment.js" --service-account $ServiceAccountJson --admin-email $AdminEmail
if ($LASTEXITCODE -ne 0) { throw "La preparación del despliegue falló." }
=======
if (-not (Test-Path -LiteralPath $ServiceAccountJson)) { throw "No existe el JSON de cuenta de servicio: $ServiceAccountJson" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js no estÃ¡ disponible en PATH." }
$bytes = New-Object byte[] 48
$rng = [Security.Cryptography.RandomNumberGenerator]::Create(); $rng.GetBytes($bytes); $rng.Dispose()
$sessionSecret = [Convert]::ToBase64String($bytes)
$keyLines = & node "$PSScriptRoot\generate-stream-keys.js"
if ($LASTEXITCODE -ne 0) { throw "No fue posible generar el par Ed25519." }
$privateLine = $keyLines | Where-Object { $_ -like "STREAM_TOKEN_PRIVATE_KEY_BASE64=*" }
$publicLine = $keyLines | Where-Object { $_ -like "streamTokenPublicKeyBase64=*" }
$serviceBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $ServiceAccountJson)))
$content = @(
  "SESSION_SECRET=$sessionSecret",
  "ADMIN_EMAILS=$AdminEmail",
  "FIREBASE_PROJECT_ID=radio-unioc",
  "FIREBASE_DATABASE_URL=https://radio-unioc-default-rtdb.firebaseio.com",
  "FIREBASE_DATA_ROOT=rayocaster",
  "FIREBASE_SERVICE_ACCOUNT_BASE64=$serviceBase64",
  $privateLine,
  $publicLine
)
$output = Join-Path (Split-Path $PSScriptRoot -Parent) "deployment-secrets.txt"
$content | Set-Content -LiteralPath $output -Encoding utf8
Write-Host "Archivo privado creado: $output" -ForegroundColor Green
Write-Host "No lo agregue a Git ni lo comparta." -ForegroundColor Yellow


>>>>>>> dba596d41223502bc642be675fb4b0ce4d0b9ae5
