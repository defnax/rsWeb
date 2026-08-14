# rsWeb - RetroShare Android WebUI Application

A lightweight, native Android application for running the **RetroShare C++ P2P Core** and **RSNewWebUI** directly on Android devices.

## Features

- **Foreground Service (`RetroShareService`)**: Runs the native RetroShare C++ P2P core, exposing the local JSON API on `127.0.0.1:9092`.
- **Embedded HTTP Asset Server (`LocalAssetServer`)**: Serves compiled WebUI assets on `127.0.0.1:9090` and proxies RetroShare JSON API requests to the core.
- **Embedded WebView (`WebUIActivity`)**: The app's entry point, hosting the authentication portal and `RSNewWebUI` interface.
- **Legacy Dashboard (`MainActivity`)**: Retained as a non-launcher activity for service status and lifecycle controls, but not used in the normal app flow.
- **WebUI Asset Sync (`sync-webui.ps1`)**: PowerShell utility script to automatically compile and synchronize `RSNewWebUI` build artifacts into the app's assets directory.

## Architecture

1. **`WebUIActivity.kt`**: Launcher activity that starts the service and renders the authentication portal and `RSNewWebUI` in an Android `WebView`.
2. **`RetroShareService.kt`**: Inherits from `org.retroshare.service.RetroShareServiceAndroid` (from the `libretroshare` AAR package) to manage the C++ core lifecycle, notification channel, partial wake-lock, and local asset server.
3. **`LocalAssetServer.kt`**: Lightweight `ServerSocket`-based HTTP server that serves assets from `app/src/main/assets/webui/` and proxies `/rs*` API requests to port `9092`.
4. **`MainActivity.kt`**: Legacy dashboard for controlling the service; it is not part of the normal launcher flow.

## Project Structure

```
rsWeb/
├── app/
│   ├── src/main/
│   │   ├── java/org/retroshare/rsweb/
│   │   │   ├── MainActivity.kt        # Legacy service dashboard
│   │   │   ├── WebUIActivity.kt       # Launcher, auth portal, and embedded WebUI
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

### Requirements

- Android Studio with Android SDK 36
- Java 17
- Android 9 (API 28) or newer
- An `arm64-v8a` device or an `x86_64` emulator

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
- Launching `rsWeb` opens `WebUIActivity`, requests notification permission when required, and starts the RetroShare foreground service.
- The embedded WebView first presents the authentication portal and then loads `RSNewWebUI`.
- The RetroShare JSON API runs on `127.0.0.1:9092`; the local asset server runs on `127.0.0.1:9090`.
