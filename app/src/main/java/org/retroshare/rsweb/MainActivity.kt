package org.retroshare.rsweb

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * Main Android dashboard control panel.
 * Controls the RetroShare C++ background service and launches the embedded WebUI interface.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var statusIndicator: View
    private lateinit var txtStatus: TextView
    private lateinit var btnOpenWebUI: Button
    private lateinit var btnToggleService: Button
    private lateinit var btnOpenBrowser: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        statusIndicator = findViewById(R.id.statusIndicator)
        txtStatus = findViewById(R.id.txtStatus)
        btnOpenWebUI = findViewById(R.id.btnOpenWebUI)
        btnToggleService = findViewById(R.id.btnToggleService)
        btnOpenBrowser = findViewById(R.id.btnOpenBrowser)

        requestNotificationPermission()
        startRetroShareService()

        setupListeners()
        updateStatusUI()
    }

    override fun onResume() {
        super.onResume()
        updateStatusUI()
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.POST_NOTIFICATIONS)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                androidx.core.app.ActivityCompat.requestPermissions(
                    this,
                    arrayOf(android.Manifest.permission.POST_NOTIFICATIONS),
                    101
                )
            }
        }
    }

    private fun setupListeners() {
        // Open WebUI in embedded WebView
        btnOpenWebUI.setOnClickListener {
            if (!RetroShareService.isRunning) {
                RetroShareService.start(this)
            }
            val intent = Intent(this, WebUIActivity::class.java)
            startActivity(intent)
        }

        // Toggle background RetroShare service
        btnToggleService.setOnClickListener {
            if (RetroShareService.isRunning) {
                RetroShareService.stop(this)
            } else {
                RetroShareService.start(this)
            }
            updateStatusUI()
        }

        // Open in external browser
        btnOpenBrowser.setOnClickListener {
            if (!RetroShareService.isRunning) {
                RetroShareService.start(this)
            }
            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("http://127.0.0.1:9090/index.html"))
            startActivity(browserIntent)
        }
    }

    private fun startRetroShareService() {
        RetroShareService.start(this)
    }

    private fun stopRetroShareService() {
        RetroShareService.stop(this)
    }

    private fun updateStatusUI() {
        if (RetroShareService.isRunning) {
            txtStatus.text = "Node Service: Active (127.0.0.1:9092)"
            statusIndicator.setBackgroundColor(ContextCompat.getColor(this, R.color.status_green))
            btnToggleService.text = "Stop Background Node"
        } else {
            txtStatus.text = "Node Service: Stopped"
            statusIndicator.setBackgroundColor(ContextCompat.getColor(this, R.color.status_red))
            btnToggleService.text = "Start Background Node"
        }
    }
}
