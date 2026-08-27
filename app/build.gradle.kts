import java.io.ByteArrayOutputStream
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

fun fetchGitHash(): String {
    return try {
        val stdout = ByteArrayOutputStream()
        exec {
            commandLine("git", "rev-parse", "--short", "HEAD")
            standardOutput = stdout
        }
        stdout.toString().trim().ifEmpty { "unknown" }
    } catch (e: Exception) {
        "unknown"
    }
}

fun fetchGitCommitCount(): Int {
    return try {
        val stdout = ByteArrayOutputStream()
        exec {
            commandLine("git", "rev-list", "--count", "HEAD")
            standardOutput = stdout
        }
        stdout.toString().trim().toIntOrNull() ?: 1
    } catch (e: Exception) {
        1
    }
}

val gitHash = fetchGitHash()
val gitCommitCount = fetchGitCommitCount()
val baseVersionName = "0.0.1"
val buildDate = LocalDate.now(ZoneOffset.UTC).format(DateTimeFormatter.BASIC_ISO_DATE)

android {
    namespace = "org.retroshare.rsweb"
    compileSdk = 36

    defaultConfig {
        applicationId = "org.retroshare.rsweb"
        minSdk = 28
        targetSdk = 36
        versionCode = gitCommitCount
        versionName = "$baseVersionName-g$gitHash"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        
        ndk {
            abiFilters.addAll(setOf("arm64-v8a", "x86_64"))
        }

        buildConfigField("String", "GIT_HASH", "\"$gitHash\"")
        buildConfigField("String", "BUILD_VERSION", "\"$baseVersionName-g$gitHash\"")
        buildConfigField("String", "BUILD_DATE", "\"$buildDate\"")
    }

    buildFeatures {
        buildConfig = true
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

    applicationVariants.all {
        val variant = this
        variant.outputs.all {
            val output = this as com.android.build.gradle.internal.api.BaseVariantOutputImpl
            output.outputFileName = "retroshare-web-v${variant.versionName}-${variant.name}.apk"
        }
    }
}

dependencies {
    implementation("org.retroshare.service:libretroshare-MinApiLevel24-debug:ebbc30e3")
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

