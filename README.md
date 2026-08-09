# rsWeb - RetroShare Android WebUI Application

A lightweight, native Android application for running the **RetroShare C++ P2P Core** and **RSNewWebUI** directly on Android devices.

## Features

- **Foreground Background Daemon (`RetroShareService`)**: Runs the native RetroShare C++ P2P core in an Android foreground service, exposing the local JSON API on `127.0.0.1:9092`.
- **Embedded HTTP Asset Server (`LocalAssetServer`)**: Serves compiled WebUI assets on port `9090` and handles local resource routing.
- **Embedded Web View (`WebUIActivity`)**: Fullscreen Android WebView hosting `RSNewWebUI` for seamless node management.
- **Dashboard UI (`MainActivity`)**: Control panel for monitoring node status, starting/stopping the background service, and opening the WebUI interface internally or in an external browser.
- **WebUI Asset Sync (`sync-webui.ps1`)**: PowerShell utility script to automatically compile and synchronize `RSNewWebUI` build artifacts into the app's assets directory.

## Architecture

1. **`MainActivity.kt`**: Controls service lifecycle, displays real-time connection status (`Active (127.0.0.1:9092)` / `Stopped`), and provides navigation buttons.
2. **`RetroShareService.kt`**: Inherits from `org.retroshare.service.RetroShareServiceAndroid` (from the `libretroshare` AAR package) to manage the C++ core lifecycle, notification channel, partial wake-lock, and local asset server.
3. **`LocalAssetServer.kt`**: Embedded NanoHTTPD server serving WebUI static assets from `app/src/main/assets/webui/`.
4. **`WebUIActivity.kt`**: Configures Android `WebView` settings (DOM storage, JavaScript execution) to render `RSNewWebUI` with support for fallback asset loading.

## Project Structure

```
rsWeb/
├── app/
│   ├── src/main/
│   │   ├── java/org/retroshare/rsweb/
│   │   │   ├── MainActivity.kt        # Main Dashboard UI & status control panel
│   │   │   ├── WebUIActivity.kt       # Fullscreen WebView hosting RSNewWebUI
│   │   │   ├── RetroShareService.kt   # Android Foreground Service for C++ core daemon
│   │   │   └── LocalAssetServer.kt    # Embedded HTTP server for WebUI assets & proxy
│   │   ├── assets/
│   │   │   ├── rsweb/                 # Auth overlay styles and scripts
│   │   │   └── webui/                 # Compiled RSNewWebUI assets
│   │   ├── res/                       # Layout XMLs, themes, colors, launcher icons
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── scripts/
│   └── sync-webui.ps1                 # PowerShell script to build & sync RSNewWebUI assets
├── build.gradle.kts
├── settings.gradle.kts
├── .gitignore
└── README.md
```

## Quick Start Guide

### 1. Sync WebUI Assets
To build and synchronize the latest `RSNewWebUI` files into the Android app assets:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\sync-webui.ps1
```
*(Optionally specify custom paths with `-WebUiSourceDir` or `-TargetAssetsDir`)*

### 2. Native C++ Core (`libretroshare`)
The native RetroShare C++ daemon and shared libraries are included via GitLab Maven dependency in [`app/build.gradle.kts`]:
```kotlin
implementation("org.retroshare.service:libretroshare-MinApiLevel24-debug:46e37897")
```
`RetroShareService.kt` extends `RetroShareServiceAndroid` from this dependency to manage native C++ initialization and start the JSON API daemon on `127.0.0.1:9092`.

*(Optional: If building custom `.so` binaries locally, place them in `app/src/main/jniLibs/<abi>/`)*

### 3. Open & Build in Android Studio
1. Open **Android Studio**.
2. Select **Open** and choose the `rsWeb` project folder.
3. Click **Run 'app'** (or `Shift + F10`) to deploy to an Android device or emulator.

### 4. Running the App
- Upon launching `rsWeb`, the background foreground service initializes RetroShare's JSON API on `127.0.0.1:9092` and the local asset server on `127.0.0.1:9090`.
- Tap **"OPEN RETROSHARE WEBUI"** to launch the embedded WebView.
- Tap **"OPEN IN EXTERNAL BROWSER"** to open `http://127.0.0.1:9090/index.html` in your device's default web browser.
