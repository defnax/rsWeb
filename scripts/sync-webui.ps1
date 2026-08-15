# sync-webui.ps1
# Builds RSNewWebUI and synchronizes output files to Android assets folder

param(
    [string]$WebUiSourceDir = (Join-Path $PSScriptRoot "..\..\RSNewWebUI"),
    [string]$TargetAssetsDir = (Join-Path $PSScriptRoot "..\app\src\main\assets\webui")
)

$WebUiSourceDir = [System.IO.Path]::GetFullPath($WebUiSourceDir)
$TargetAssetsDir = [System.IO.Path]::GetFullPath($TargetAssetsDir)

Write-Host "Syncing RetroShare WebUI assets to Android app..." -ForegroundColor Cyan

# Locate npm without requiring a permanent system PATH change. Prefer npm.cmd
# on Windows so PowerShell does not try to execute the policy-blocked npm.ps1.
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
    $nodeBinCandidates = @(
        "C:\msys64\mingw64\bin",
        (Join-Path $env:ProgramFiles "nodejs")
    )
    foreach ($nodeBinDir in $nodeBinCandidates) {
        if (Test-Path (Join-Path $nodeBinDir "npm.cmd")) {
            $env:PATH = "$nodeBinDir;$env:PATH"
            $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
            break
        }
    }
}

if (-not $npmCommand) {
    Write-Host "Error: npm.cmd was not found. Add the Node.js bin directory to PATH." -ForegroundColor Red
    exit 1
}

$sourceWebUi = Join-Path $WebUiSourceDir "webui"

if (-not (Test-Path $sourceWebUi)) {
    Write-Host "Compiling RSNewWebUI using build script..." -ForegroundColor Yellow
    $webUiBuildDir = Join-Path $WebUiSourceDir "webui-src"
    if (-not (Test-Path $webUiBuildDir)) {
        Write-Host "Error: RSNewWebUI source directory not found at $webUiBuildDir" -ForegroundColor Red
        exit 1
    }

    $buildError = $null
    Push-Location $webUiBuildDir
    try {
        if (-not (Test-Path ".\node_modules\.bin\sass.cmd")) {
            Write-Host "Installing RSNewWebUI npm dependencies..." -ForegroundColor Yellow
            & $npmCommand.Source ci
            if ($LASTEXITCODE -ne 0) {
                $buildError = "npm ci failed with exit code $LASTEXITCODE."
            }
        }

        if (-not $buildError) {
            & $npmCommand.Source run build
            if ($LASTEXITCODE -ne 0) {
                $buildError = "npm build failed with exit code $LASTEXITCODE."
            }
        }
    } finally {
        Pop-Location
    }

    if ($buildError) {
        Write-Host "Error: $buildError" -ForegroundColor Red
        exit 1
    }
}

if (Test-Path $sourceWebUi) {
    if (-not (Test-Path $TargetAssetsDir)) {
        New-Item -ItemType Directory -Force -Path $TargetAssetsDir | Out-Null
    }
    
    Copy-Item -Path "$sourceWebUi\*" -Destination $TargetAssetsDir -Recurse -Force

    # Keep rsWeb's logout hook on generated mobile navigation markup. Upstream
    # WebUI builds may emit a plain button, which would otherwise bypass the
    # custom auth portal and reveal the built-in WebUI login screen.
    $appJsPath = Join-Path $TargetAssetsDir "app.js"
    if (Test-Path $appJsPath) {
        $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
        $appJs = [System.IO.File]::ReadAllText($appJsPath)
        $mobileLogoutPattern = "m\('button\[type=button\]', \{ onclick: \(\) => rs\.logout\(\) \}, \[m\('i\.fas\.fa-sign-out-alt'\), ' Logout'\]\)"
        $patchedAppJs = [System.Text.RegularExpressions.Regex]::Replace(
            $appJs,
            $mobileLogoutPattern,
            "m('button.logout-link[type=button]', { onclick: () => rs.logout() }, [m('i.fas.fa-sign-out-alt'), ' Logout'])"
        )
        if ($patchedAppJs -ne $appJs) {
            [System.IO.File]::WriteAllText($appJsPath, $patchedAppJs, $utf8NoBom)
            Write-Host "Patched mobile logout hook in app.js" -ForegroundColor Green
        } elseif ($appJs -notmatch "button\.logout-link\[type=button\].+rs\.logout") {
            Write-Warning "Mobile logout markup was not recognized; rsweb/auth.js fallback remains active."
        }
    }

    Write-Host "Successfully synced WebUI assets to: $TargetAssetsDir" -ForegroundColor Green
} else {
    Write-Host "Error: Compiled WebUI directory not found at $sourceWebUi" -ForegroundColor Red
    exit 1
}
