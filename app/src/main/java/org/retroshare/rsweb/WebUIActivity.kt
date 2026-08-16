package org.retroshare.rsweb

import android.annotation.SuppressLint
import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.JavascriptInterface
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * Fullscreen WebView Activity hosting the RSNewWebUI interface.
 * Connects directly to the local RetroShare HTTP JSON API at http://127.0.0.1:9092/index.html.
 */
class WebUIActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var lastServiceRestartAt = 0L
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val selectedFiles = WebChromeClient.FileChooserParams.parseResult(
            result.resultCode,
            result.data
        )
        fileChooserCallback?.onReceiveValue(selectedFiles)
        fileChooserCallback = null
    }

    companion object {
        const val WEBUI_LOCAL_URL = "http://127.0.0.1:9092/index.html"
        const val WEBUI_ASSET_URL = "file:///android_asset/webui/index.html"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_webui)

        val rootView = findViewById<View>(R.id.rootView)
        ViewCompat.setOnApplyWindowInsetsListener(rootView) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        requestNotificationPermission()
        RetroShareService.start(this)
        setupWebViewSettings()
        setupWebViewClient()
        setupFileChooser()

        loadWebInterface()
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                101
            )
        }
    }

    private fun setupWebViewSettings() {
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        @Suppress("DEPRECATION")
        settings.allowFileAccessFromFileURLs = true
        @Suppress("DEPRECATION")
        settings.allowUniversalAccessFromFileURLs = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.useWideViewPort = false
        settings.loadWithOverviewMode = false
        webView.addJavascriptInterface(ServiceBridge(), "RSWebAndroid")
    }

    private inner class ServiceBridge {
        @JavascriptInterface
        fun restartRetroShareService() {
            runOnUiThread {
                val now = android.os.SystemClock.elapsedRealtime()
                if (now - lastServiceRestartAt < 10_000L) return@runOnUiThread
                lastServiceRestartAt = now
                android.util.Log.i("WebUIActivity", "WebUI requested RetroShare service restart")
                RetroShareService.restart(this@WebUIActivity)
            }
        }
    }

    private fun setupWebViewClient() {
        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                if (request?.isForMainFrame == true && request.url.toString() != WEBUI_ASSET_URL) {
                    webView.loadUrl(WEBUI_ASSET_URL)
                }
            }

            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): android.webkit.WebResourceResponse? {
                val url = request?.url?.toString() ?: ""
                if (url.endsWith("/index.html") || url == WEBUI_ASSET_URL) {
                    try {
                        val inputStream = assets.open("webui/index.html")
                        var html = inputStream.bufferedReader().use { it.readText() }
                        if (!html.contains("rsweb/auth.js")) {
                            val injection = """
    <link rel="stylesheet" href="../rsweb/auth.css" />
    <script src="../rsweb/auth.js"></script>
    <script src="app.js"></script>""".trimIndent()
                            html = html.replace("<script src=\"app.js\"></script>", injection)
                        }
                        return android.webkit.WebResourceResponse(
                            "text/html",
                            "UTF-8",
                            html.byteInputStream()
                        )
                    } catch (e: Exception) {
                        android.util.Log.e("WebUIActivity", "Error loading index.html", e)
                    }
                }
                return super.shouldInterceptRequest(view, request)
            }
        }
    }

    /**
     * Android WebView does not open a picker for HTML file inputs by itself.
     * Forward WebUI file requests to Android's document picker and return the
     * selected content URI(s) to the page.
     */
    private fun setupFileChooser() {
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                fileChooserCallback?.onReceiveValue(null)
                fileChooserCallback = filePathCallback

                return try {
                    val pickerIntent = fileChooserParams?.createIntent()
                        ?: Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = "*/*"
                        }
                    fileChooserLauncher.launch(pickerIntent)
                    true
                } catch (error: ActivityNotFoundException) {
                    fileChooserCallback?.onReceiveValue(null)
                    fileChooserCallback = null
                    Toast.makeText(
                        this@WebUIActivity,
                        "No file picker is available on this device",
                        Toast.LENGTH_LONG
                    ).show()
                    true
                }
            }
        }
    }

    private fun loadWebInterface() {
        webView.loadUrl(WEBUI_ASSET_URL)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = null
        super.onDestroy()
    }
}
