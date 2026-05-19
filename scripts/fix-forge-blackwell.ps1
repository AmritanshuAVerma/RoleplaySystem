<#
.SYNOPSIS
    Fix SD-WebUI-Forge for NVIDIA Blackwell GPUs (RTX 5060 / sm_120)
    and NumPy 2.x binary incompatibility.

.DESCRIPTION
    Two problems addressed:
      1. PyTorch 2.3.x does not list sm_120 (Blackwell) in its compiled arch list.
         We upgrade to PyTorch 2.7.0+cu128 which adds sm_120 support.
      2. NumPy 2.x breaks onnxruntime, scikit-image, and other packages whose
         C extensions were compiled against the NumPy 1.x ABI.
         We downgrade to numpy 1.26.4 and reinstall compatible wheels.
#>

$ErrorActionPreference = "Stop"
$VenvPip = "D:\Projects\RoleplaySystem\vendor\sd-webui-forge\venv\Scripts\pip.exe"
$VenvPy  = "D:\Projects\RoleplaySystem\vendor\sd-webui-forge\venv\Scripts\python.exe"

if (-not (Test-Path $VenvPip)) {
    Write-Error "Venv not found at expected path. Run webui-user.bat once so Forge creates the venv first."
    exit 1
}

Write-Host "=== Step 1: Downgrade NumPy to 1.26.4 ===" -ForegroundColor Cyan
& $VenvPip install "numpy==1.26.4" --force-reinstall

Write-Host ""
Write-Host "=== Step 2: Reinstall compatible onnxruntime ===" -ForegroundColor Cyan
# onnxruntime 1.18.x ships wheels pre-built against NumPy 1.x ABI
& $VenvPip install "onnxruntime==1.18.1" --force-reinstall

Write-Host ""
Write-Host "=== Step 3: Reinstall scikit-image against NumPy 1.x ===" -ForegroundColor Cyan
& $VenvPip install "scikit-image" --force-reinstall

Write-Host ""
Write-Host "=== Step 4: Upgrade PyTorch to 2.7.0+cu128 (adds sm_120 / Blackwell support) ===" -ForegroundColor Cyan
Write-Host "This download is ~2-3 GB - please wait..." -ForegroundColor Yellow
& $VenvPip install `
    "torch==2.7.0+cu128" `
    "torchvision==0.22.0+cu128" `
    "torchaudio==2.7.0+cu128" `
    --index-url https://download.pytorch.org/whl/cu128 `
    --force-reinstall `
    --no-deps

Write-Host ""
Write-Host "=== Step 5: Reinstall bitsandbytes (Windows CUDA build) ===" -ForegroundColor Cyan
# bitsandbytes 0.45.x supports Windows CUDA; reinstall after torch upgrade
& $VenvPip install "bitsandbytes>=0.45.3" --force-reinstall

Write-Host ""
Write-Host "=== Step 6: Verify ===" -ForegroundColor Cyan
& $VenvPy -c @"
import torch, numpy
print(f'torch  : {torch.__version__}')
print(f'CUDA   : {torch.version.cuda}')
print(f'device : {torch.cuda.get_device_name(0) if torch.cuda.is_available() else "NO CUDA"}')
print(f'sm     : sm_{torch.cuda.get_device_capability(0)[0]}{torch.cuda.get_device_capability(0)[1]} (need sm_120 for RTX 5060)')
print(f'numpy  : {numpy.__version__}')
"@

Write-Host ""
Write-Host "=== Done! Re-run webui-user.bat to start Forge. ===" -ForegroundColor Green
