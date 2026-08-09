# sync-webui.ps1
# Builds RSNewWebUI and synchronizes output files to Android assets folder

param(
    [string]$WebUiSourceDir = (Join-Path $PSScriptRoot "..\..\RSNewWebUI"),
    [string]$TargetAssetsDir = (Join-Path $PSScriptRoot "..\app\src\main\assets\webui")
)

$WebUiSourceDir = [System.IO.Path]::GetFullPath($WebUiSourceDir)
$TargetAssetsDir = [System.IO.Path]::GetFullPath($TargetAssetsDir)

Write-Host "Syncing RetroShare WebUI assets to Android app..." -ForegroundColor Cyan

$sourceWebUi = Join-Path $WebUiSourceDir "webui"

if (-not (Test-Path $sourceWebUi)) {
    Write-Host "Compiling RSNewWebUI using build script..." -ForegroundColor Yellow
    Push-Location (Join-Path $WebUiSourceDir "webui-src")
    try {
        & npm run build
    } finally {
        Pop-Location
    }
}

if (Test-Path $sourceWebUi) {
    if (-not (Test-Path $TargetAssetsDir)) {
        New-Item -ItemType Directory -Force -Path $TargetAssetsDir | Out-Null
    }
    
    Copy-Item -Path "$sourceWebUi\*" -Destination $TargetAssetsDir -Recurse -Force
    Write-Host "Successfully synced WebUI assets to: $TargetAssetsDir" -ForegroundColor Green
} else {
    Write-Host "Error: Compiled WebUI directory not found at $sourceWebUi" -ForegroundColor Red
    exit 1
}
