# Installs the ReActor (face swap) and ADetailer (face inpaint) extensions into the
# vendored SD WebUI Forge. Safe to re-run.
$ErrorActionPreference = "Stop"
$forge = Join-Path $PSScriptRoot "..\vendor\sd-webui-forge"
$forge = (Resolve-Path -LiteralPath $forge).Path
$ext = Join-Path $forge "extensions"
if (!(Test-Path $ext)) { New-Item -ItemType Directory -Force $ext | Out-Null }

$repos = @(
    # ReActor's GitHub repo was disabled by GitHub staff; Codeberg is the
    # author-maintained mirror.
    @{ Name = "sd-webui-reactor"; Url = "https://codeberg.org/Gourieff/sd-webui-reactor.git" },
    @{ Name = "adetailer";        Url = "https://github.com/Bing-su/adetailer.git" }
)

foreach ($r in $repos) {
    $dest = Join-Path $ext $r.Name
    if (Test-Path (Join-Path $dest ".git")) {
        Write-Host "[=] $($r.Name) already installed"
    } else {
        Write-Host "[+] Cloning $($r.Name)..."
        git clone --depth 1 $r.Url $dest
    }
}

Write-Host ""
Write-Host "Extensions installed. Restart Forge (close the window and re-run 'pnpm sd' or start.bat)."
Write-Host "On first launch Forge will pip-install onnxruntime-gpu + insightface (~2 min) and download inswapper_128.onnx (~530 MB)."
