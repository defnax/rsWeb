plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "org.retroshare.rsweb"
    compileSdk = 36

    defaultConfig {
        applicationId = "org.retroshare.rsweb"
        minSdk = 28
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        
        ndk {
            abiFilters.addAll(setOf("arm64-v8a", "x86_64"))
        }
    }

    buildTypes {
        debug {
            isDebuggable = true
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    
    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets {
        getByName("main") {
            assets.srcDirs("src/main/assets")
        }
    }

    packaging {
        jniLibs {
            useLegacyPackaging = true
        }
    }
}

dependencies {
    implementation("org.retroshare.service:libretroshare-MinApiLevel24-debug:46e37897")
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")

    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
}

// Automatically ensure rsweb/auth.js and auth.css are injected into assets/webui/index.html before build
tasks.register("patchIndexHtml") {
    doLast {
        val indexHtmlFile = file("src/main/assets/webui/index.html")
        if (indexHtmlFile.exists()) {
            var content = indexHtmlFile.readText()
            if (!content.contains("rsweb/auth.js")) {
                val injection = """
    <link rel="stylesheet" href="../rsweb/auth.css" />
    <script src="../rsweb/auth.js"></script>
    <script src="app.js"></script>""".trimIndent()
                content = content.replace("<script src=\"app.js\"></script>", injection)
                indexHtmlFile.writeText(content)
                logger.lifecycle("[RSWeb] Automatically patched webui/index.html with custom auth portal")
            }
        }
    }
}

tasks.named("preBuild") {
    dependsOn("patchIndexHtml")
}

