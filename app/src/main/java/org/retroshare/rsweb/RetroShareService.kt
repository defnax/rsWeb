package org.retroshare.rsweb

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import org.retroshare.service.RetroShareServiceAndroid as RsService

/**
 * Background Foreground Service inheriting from org.retroshare.service.RetroShareServiceAndroid (AAR).
 * Manages the native RetroShare C++ core daemon & JSON API on http://127.0.0.1:9092.
 */
class RetroShareService : RsService() {

    companion object {
        private const val TAG = "RetroShareService"
        private const val CHANNEL_ID = "org.retroshare.rsweb.channel"
        private const val NOTIFICATION_ID = 1
        private const val WAKELOCK_TAG = "RetroShareService:Wakelock"

        const val ACTION_SHUTDOWN = "SHUTDOWN"
        const val ACTION_START = "START"

        private val JSON_API_PORT_KEY = (RsService::class.java.canonicalName ?: "org.retroshare.service.RetroShareServiceAndroid") + "/JSON_API_PORT_KEY"
        private val JSON_API_BIND_ADDRESS_KEY = (RsService::class.java.canonicalName ?: "org.retroshare.service.RetroShareServiceAndroid") + "/JSON_API_BIND_ADDRESS_KEY"

        const val DEFAULT_JSON_API_PORT = 9092
        const val DEFAULT_JSON_API_BINDING_ADDRESS = "127.0.0.1"

        private var rsInitialized = false

        val isRunning: Boolean
            get() = rsInitialized

        fun start(
            ctx: Context,
            jsonApiPort: Int = DEFAULT_JSON_API_PORT,
            jsonApiBindAddress: String = DEFAULT_JSON_API_BINDING_ADDRESS
        ) {
            try {
                val intent = Intent(ctx, RetroShareService::class.java).apply {
                    action = ACTION_START
                    putExtra(JSON_API_PORT_KEY, jsonApiPort)
                    putExtra(JSON_API_BIND_ADDRESS_KEY, jsonApiBindAddress)
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    ctx.startForegroundService(intent)
                } else {
                    ctx.startService(intent)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start service", e)
            }
        }

        fun stop(ctx: Context) {
            try {
                val intent = Intent(ctx, RetroShareService::class.java).apply {
                    action = ACTION_SHUTDOWN
                    putExtra(JSON_API_PORT_KEY, DEFAULT_JSON_API_PORT)
                    putExtra(JSON_API_BIND_ADDRESS_KEY, DEFAULT_JSON_API_BINDING_ADDRESS)
                }
                ctx.startService(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop service", e)
            }
        }
    }

    private var assetServer: LocalAssetServer? = null

    override fun onCreate() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "RetroShare Service Channel",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(channel)
        }

        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("RetroShare Web")
            .setContentText("JSON API & WebUI running at http://127.0.0.1:9090")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()

        (getSystemService(Context.POWER_SERVICE) as PowerManager)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKELOCK_TAG)
            .apply {
                setReferenceCounted(false)
                acquire(10 * 60 * 1000L)
            }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        super.onCreate()

        assetServer = LocalAssetServer(applicationContext, port = 9090, apiPort = DEFAULT_JSON_API_PORT)
        assetServer?.start()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_SHUTDOWN) {
            rsInitialized = false
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        } else if (!rsInitialized) {
            rsInitialized = true
            val safeIntent = intent ?: Intent().apply {
                putExtra(JSON_API_PORT_KEY, DEFAULT_JSON_API_PORT)
                putExtra(JSON_API_BIND_ADDRESS_KEY, DEFAULT_JSON_API_BINDING_ADDRESS)
            }
            if (safeIntent.extras == null) {
                safeIntent.putExtra(JSON_API_PORT_KEY, DEFAULT_JSON_API_PORT)
                safeIntent.putExtra(JSON_API_BIND_ADDRESS_KEY, DEFAULT_JSON_API_BINDING_ADDRESS)
            }
            super.onStartCommand(safeIntent, flags, startId)
        }
        return START_STICKY
    }

    override fun onDestroy() {
        rsInitialized = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = super.onBind(intent)
}
