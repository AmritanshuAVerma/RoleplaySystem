# Sets up Stable Diffusion WebUI Forge under vendor/sd-webui-forge.
# Clones the repo if missing. Forge auto-installs its own Python venv on first launch
# (via webui-user.bat), so this script only handles the git clone step.
$ErrorActionPreference = "Stop"
$target = Join-Path $PSScriptRoot "..\vendor\sd-webui-forge"
$target = (Resolve-Path -LiteralPath (Split-Path $target -Parent)).Path | Join-Path -ChildPath (Split-Path $target -Leaf)

if (Test-Path (Join-Path $target ".git")) {
    Write-Host "[=] Forge already cloned at $target"
} else {
    Write-Host "[+] Cloning SD WebUI Forge into $target ..."
    $vendorDir = Split-Path $target -Parent
    if (!(Test-Path $vendorDir)) { New-Item -ItemType Directory -Force $vendorDir | Out-Null }
    git clone --depth 1 https://github.com/lllyasviel/stable-diffusion-webui-forge.git $target
}

# Sanity: make sure the models folders exist so the user can drop files in immediately.
$ckptDir = Join-Path $target "models\Stable-diffusion"
$loraDir = Join-Path $target "models\Lora"
foreach ($d in @($ckptDir, $loraDir)) {
    if (!(Test-Path $d)) { New-Item -ItemType Directory -Force $d | Out-Null }
}

# Install identity-injection extensions (ReActor face swap + ADetailer face inpaint).
& (Join-Path $PSScriptRoot "setup-forge-extensions.ps1")

# Forge's torch 2.3.1 has no wheels for Python 3.12+. Pin webui-user.bat to a
# 3.10/3.11 interpreter if one is available via the `py` launcher.
$webuiUser = Join-Path $target "webui-user.bat"
if (Test-Path $webuiUser) {
    $pyExe = $null
    foreach ($ver in @("3.10", "3.11")) {
        try {
            $candidate = & py "-$ver" -c "import sys; print(sys.executable)" 2>$null
            if ($LASTEXITCODE -eq 0 -and $candidate -and (Test-Path $candidate.Trim())) {
                $pyExe = $candidate.Trim()
                break
            }
        } catch { }
    }
    $content = Get-Content $webuiUser -Raw
    if ($pyExe -and $content -match "(?m)^set PYTHON=\s*$") {
        $newLine = "set PYTHON=`"$pyExe`""
        $patched = $content -replace "(?m)^set PYTHON=\s*$", [System.Text.RegularExpressions.Regex]::Escape($newLine).Replace("\","\\")
        # Simpler: do a direct string replace.
        $patched = $content.Replace("set PYTHON=`r`n", "set PYTHON=`"$pyExe`"`r`n")
        if ($patched -ne $content) {
            Set-Content -LiteralPath $webuiUser -Value $patched -NoNewline
            Write-Host "[+] Pinned webui-user.bat PYTHON to $pyExe"
        }
    } elseif (-not $pyExe) {
        Write-Host "[!] Could not find Python 3.10 or 3.11 via 'py' launcher."
        Write-Host "    Install one from https://www.python.org/downloads/release/python-31011/"
        Write-Host "    then edit $webuiUser and set PYTHON=`"C:\path\to\python.exe`""
    }
}

Write-Host ""
Write-Host "Forge installed at: $target"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Drop your Pony Realism checkpoint into: $ckptDir"
Write-Host "  2. Drop your LoRAs into:                    $loraDir"
Write-Host "  3. Run 'pnpm sd' to launch Forge on http://127.0.0.1:7860"
Write-Host "     (first launch downloads its own Python venv + torch, ~5 GB)"
Write-Host ""
Write-Host "See USER_GUIDE.md section 9 for the exact Civitai URLs."
