param(
  [Parameter(Mandatory=$true)][string]$ServiceAccountJson,
  [string]$AdminEmail = "prueba@unico.edu.co"
)
$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js no está disponible en PATH." }
& node "$PSScriptRoot\prepare-deployment.js" --service-account $ServiceAccountJson --admin-email $AdminEmail
if ($LASTEXITCODE -ne 0) { throw "La preparación del despliegue falló." }
