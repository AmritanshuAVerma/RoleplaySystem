# Bootstraps / updates the vendored SillyTavern install used as the LLM backend.
# Run from the repo root:  pwsh -File scripts/setup-sillytavern.ps1
#
# Idempotent: clones if missing, otherwise pulls latest on the 'release' branch.

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$vendor = Join-Path $root "vendor"
$stDir  = Join-Path $vendor "SillyTavern"

if (-not (Test-Path $vendor)) {
    New-Item -ItemType Directory $vendor | Out-Null
}

if (-not (Test-Path $stDir)) {
    Write-Host "Cloning SillyTavern (release branch)..." -ForegroundColor Cyan
    git clone --depth=1 --branch release https://github.com/SillyTavern/SillyTavern.git $stDir
} else {
    Write-Host "Updating SillyTavern..." -ForegroundColor Cyan
    Push-Location $stDir
    try {
        git fetch --depth=1 origin release
        git reset --hard origin/release
    } finally {
        Pop-Location
    }
}

Write-Host "Installing SillyTavern npm dependencies..." -ForegroundColor Cyan
Push-Location $stDir
try {
    npm install --no-audit --no-fund
} finally {
    Pop-Location
}

Write-Host "`nSillyTavern ready at: $stDir" -ForegroundColor Green
Write-Host "Start it with:  pnpm st"
