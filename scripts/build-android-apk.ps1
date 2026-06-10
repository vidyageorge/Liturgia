# Builds a debug APK for Liturgia (Capacitor + Android).
# Requires: Node.js, Java 21+, Android SDK (ANDROID_HOME).
# The mobile app talks to the hosted API; change $ApiUrl if your server URL differs.

$ErrorActionPreference = "Stop"

$ApiUrl = if ($env:VITE_API_URL) { $env:VITE_API_URL } else { "https://liturgia-24z1.onrender.com/api" }
$Root = Split-Path -Parent $PSScriptRoot
$Client = Join-Path $Root "client"
$ApkOut = Join-Path $Root "Liturgia-debug.apk"

Write-Host "Building Liturgia Android APK..." -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl" -ForegroundColor Gray
Write-Host ""

function Test-AndroidSdk {
    if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) { return $true }
    if ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) { return $true }
    $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    if (Test-Path $defaultSdk) {
        $env:ANDROID_HOME = $defaultSdk
        $env:ANDROID_SDK_ROOT = $defaultSdk
        return $true
    }
    return $false
}

if (-not (Test-AndroidSdk)) {
    Write-Host "Android SDK not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Android Studio from https://developer.android.com/studio" -ForegroundColor Yellow
    Write-Host "Then open SDK Manager and install:" -ForegroundColor Yellow
    Write-Host "  - Android SDK Platform 35" -ForegroundColor White
    Write-Host "  - Android SDK Build-Tools" -ForegroundColor White
    Write-Host "  - Android SDK Platform-Tools" -ForegroundColor White
    Write-Host ""
    Write-Host "Set ANDROID_HOME to your SDK path (e.g. %LOCALAPPDATA%\Android\Sdk) and re-run:" -ForegroundColor Yellow
    Write-Host "  npm run build:apk" -ForegroundColor White
    exit 1
}

Write-Host "Using Android SDK: $env:ANDROID_HOME" -ForegroundColor Gray

$env:GRADLE_USER_HOME = Join-Path $env:LOCALAPPDATA "LiturgiaGradle"
New-Item -ItemType Directory -Force -Path $env:GRADLE_USER_HOME | Out-Null
Write-Host "Gradle cache: $env:GRADLE_USER_HOME" -ForegroundColor Gray

$sdkManager = Get-ChildItem -Path (Join-Path $env:ANDROID_HOME "cmdline-tools") -Recurse -Filter "sdkmanager.bat" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($sdkManager) {
    Write-Host ""
    Write-Host "Step 0: Accepting SDK licenses and installing packages..." -ForegroundColor Yellow
    $yes = ("y`n" * 50) -join ""
    $yes | & $sdkManager.FullName --sdk_root=$env:ANDROID_HOME --licenses | Out-Null
    & $sdkManager.FullName --sdk_root=$env:ANDROID_HOME "platform-tools" "platforms;android-35" "build-tools;34.0.0"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install Android SDK packages." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
Set-Location $Root
npm install
if ($LASTEXITCODE -ne 0) { exit 1 }

Set-Location $Client
npm install
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Step 2: Building web client for Android..." -ForegroundColor Yellow
$env:VITE_API_URL = $ApiUrl
$env:VITE_CAPACITOR_BUILD = "true"
npm run build:android
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Step 3: Syncing Capacitor Android project..." -ForegroundColor Yellow
if (-not (Test-Path (Join-Path $Client "android"))) {
    npx cap add android
    if ($LASTEXITCODE -ne 0) { exit 1 }
}
npx cap sync android
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Step 4: Building debug APK..." -ForegroundColor Yellow
$Gradle = Join-Path $Client "android\gradlew.bat"
if (-not (Test-Path $Gradle)) {
    Write-Host "Gradle wrapper not found at $Gradle" -ForegroundColor Red
    exit 1
}

Push-Location (Join-Path $Client "android")
& $Gradle assembleDebug --no-daemon
$gradleExit = $LASTEXITCODE
Pop-Location
if ($gradleExit -ne 0) {
    Write-Host ""
    Write-Host "Gradle build failed. On Windows this is often antivirus blocking the Gradle cache." -ForegroundColor Red
    Write-Host "Try: add an exclusion for $env:GRADLE_USER_HOME in Windows Security, then re-run npm run build:apk." -ForegroundColor Yellow
    Write-Host "Or: push to GitHub and use Actions workflow 'Build Android APK' (no local SDK needed)." -ForegroundColor Yellow
    exit 1
}

$BuiltApk = Join-Path $Client "android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $BuiltApk)) {
    Write-Host "APK was not produced at expected path: $BuiltApk" -ForegroundColor Red
    exit 1
}

Copy-Item -Path $BuiltApk -Destination $ApkOut -Force

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "APK build complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "APK location: $ApkOut" -ForegroundColor Cyan
Write-Host ""
Write-Host "Install on a device:" -ForegroundColor Gray
Write-Host "  adb install `"$ApkOut`"" -ForegroundColor White
Write-Host ""
Write-Host "Note: The app requires internet and connects to:" -ForegroundColor Gray
Write-Host "  $ApiUrl" -ForegroundColor White
Write-Host ""
