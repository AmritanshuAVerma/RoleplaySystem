<#
.SYNOPSIS
    Phase 2 cleanup: After fix-forge-blackwell.ps1, bitsandbytes pulled torch 2.12
    and numpy 2.x. This script locks everything to correct versions.
#>

$ErrorActionPreference = "Stop"
$Pip = "D:\Projects\RoleplaySystem\vendor\sd-webui-forge\venv\Scripts\pip.exe"
$Py  = "D:\Projects\RoleplaySystem\vendor\sd-webui-forge\venv\Scripts\python.exe"

# PIP_CONSTRAINT prevents any dep from upgrading numpy above 1.x during installs
$env:PIP_CONSTRAINT = "D:\Projects\RoleplaySystem\vendor\sd-webui-forge\pip-constraints.txt"

Write-Host "=== A: Restore torch 2.7.0+cu128 (bitsandbytes pulled 2.12 earlier) ===" -ForegroundColor Cyan
& $Pip install "torch==2.7.0+cu128" "torchvision==0.22.0+cu128" "torchaudio==2.7.0+cu128" `
    --index-url https://download.pytorch.org/whl/cu128 `
    --force-reinstall --no-deps

Write-Host ""
Write-Host "=== B: Lock numpy==1.26.4 ===" -ForegroundColor Cyan
& $Pip install "numpy==1.26.4" --force-reinstall

Write-Host ""
Write-Host "=== C: scikit-image 0.21.0 (binary compiled against NumPy 1.x) ===" -ForegroundColor Cyan
& $Pip install "scikit-image==0.21.0" --force-reinstall --no-deps

Write-Host ""
Write-Host "=== D: Pillow 9.5.0 (blendmodes requires <10, gradio requires <11) ===" -ForegroundColor Cyan
& $Pip install "Pillow==9.5.0" --force-reinstall --no-deps

Write-Host ""
Write-Host "=== E: onnxruntime 1.18.1 (--no-deps, numpy already pinned) ===" -ForegroundColor Cyan
& $Pip install "onnxruntime==1.18.1" --force-reinstall --no-deps

Write-Host ""
Write-Host "=== F: bitsandbytes 0.45.3 --no-deps (avoid pulling torch 2.12 again) ===" -ForegroundColor Cyan
& $Pip install "bitsandbytes==0.45.3" --force-reinstall --no-deps

Write-Host ""
Write-Host "=== G: Final verify ===" -ForegroundColor Cyan
& $Py -c @"
import torch, numpy, skimage, onnxruntime, PIL
print(f'torch         : {torch.__version__}')
cuda_ok = torch.cuda.is_available()
print(f'cuda available: {cuda_ok}')
if cuda_ok:
    dev = torch.cuda.get_device_properties(0)
    print(f'device        : {dev.name}  sm_{dev.major}{dev.minor}')
    print(f'sm_120 support: {dev.major >= 12}')
print(f'numpy         : {numpy.__version__}')
print(f'scikit-image  : {skimage.__version__}')
print(f'onnxruntime   : {onnxruntime.__version__}')
print(f'Pillow        : {PIL.__version__}')
print('ALL OK - run webui-user.bat')
"@

Write-Host ""
Write-Host "=== Done! Run webui-user.bat to start Forge. ===" -ForegroundColor Green
