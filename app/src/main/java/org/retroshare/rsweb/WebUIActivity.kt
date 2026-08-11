package org.retroshare.rsweb

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * Fullscreen WebView Activity hosting the RSNewWebUI interface.
 * Connects directly to the local RetroShare HTTP JSON API at http://127.0.0.1:9092/index.html.
 */
class WebUIActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar

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

        setupWebViewSettings()
        setupWebViewClient()

        loadWebInterface()
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
}
