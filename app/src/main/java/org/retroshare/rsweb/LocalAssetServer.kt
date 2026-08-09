package org.retroshare.rsweb

import android.content.Context
import android.util.Log
import java.io.BufferedOutputStream
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.ServerSocket
import java.net.Socket
import java.net.URL

/**
 * Embedded Lightweight Local Asset Web Server for Android.
 * Serves static WebUI assets from APK assets and proxies API calls to RetroShare C++ JSON-RPC engine at 127.0.0.1:9092.
 * Allows opening RetroShare WebUI in external mobile browsers (Chrome, Samsung Internet, Firefox, etc.) on http://127.0.0.1:9090/index.html.
 */
class LocalAssetServer(
    private val context: Context,
    private val port: Int = 9090,
    private val apiPort: Int = 9092
) {

    private var serverSocket: ServerSocket? = null

    @Volatile
    private var isRunning = false

    fun start() {
        if (isRunning) return
        isRunning = true
        Thread {
            try {
                serverSocket = ServerSocket(port)
                Log.i("LocalAssetServer", "Local WebUI Asset Server running at http://127.0.0.1:$port")
                while (isRunning) {
                    val socket = serverSocket?.accept() ?: break
                    Thread { handleSocket(socket) }.start()
                }
            } catch (e: Exception) {
                if (isRunning) {
                    Log.e("LocalAssetServer", "Error in asset server", e)
                }
            }
        }.start()
    }

    fun stop() {
        isRunning = false
        try {
            serverSocket?.close()
        } catch (e: Exception) {
            Log.e("LocalAssetServer", "Error closing asset server socket", e)
        }
    }

    private fun handleSocket(socket: Socket) {
        try {
            socket.use { s ->
                val input = BufferedReader(InputStreamReader(s.getInputStream()))
                val output = BufferedOutputStream(s.getOutputStream())

                val requestLine = input.readLine() ?: return
                val parts = requestLine.split(" ")
                if (parts.size < 2) return

                val method = parts[0]
                var path = parts[1]

                val headers = mutableMapOf<String, String>()
                var line: String?
                var contentLength = 0
                while (input.readLine().also { line = it } != null && line!!.isNotEmpty()) {
                    val headerParts = line!!.split(":", limit = 2)
                    if (headerParts.size == 2) {
                        val key = headerParts[0].trim()
                        val value = headerParts[1].trim()
                        headers[key] = value
                        if (key.equals("Content-Length", ignoreCase = true)) {
                            contentLength = value.toIntOrNull() ?: 0
                        }
                    }
                }

                if (method.equals("POST", ignoreCase = true) && (path.startsWith("/rsLoginHelper") || path.startsWith("/rsApi"))) {
                    val bodyChars = CharArray(contentLength)
                    if (contentLength > 0) {
                        var read = 0
                        while (read < contentLength) {
                            val r = input.read(bodyChars, read, contentLength - read)
                            if (r <= 0) break
                            read += r
                        }
                    }
                    val bodyString = String(bodyChars)
                    proxyApiRequest(path, bodyString, headers, output)
                    return
                }

                if (path == "/" || path == "/index.html" || path.isEmpty()) {
                    path = "/webui/index.html"
                } else if (!path.startsWith("/webui/") && !path.startsWith("/rsweb/")) {
                    path = "/webui" + path
                }

                val assetPath = path.removePrefix("/")
                try {
                    val inputStream = context.assets.open(assetPath)
                    val mimeType = getMimeType(assetPath)
                    var bytes = inputStream.readBytes()
                    inputStream.close()

                    if (assetPath == "webui/index.html") {
                        val rawHtml = String(bytes, Charsets.UTF_8)
                        val injectedHtml = rawHtml.replace(
                            "</head>",
                            "<link rel=\"stylesheet\" href=\"/rsweb/auth.css\" /><script src=\"/rsweb/auth.js\"></script></head>"
                        )
                        bytes = injectedHtml.toByteArray(Charsets.UTF_8)
                    }

                    val header = "HTTP/1.1 200 OK\r\n" +
                            "Content-Type: $mimeType\r\n" +
                            "Content-Length: ${bytes.size}\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Connection: close\r\n\r\n"
                    output.write(header.toByteArray())
                    output.write(bytes)
                    output.flush()
                } catch (e: Exception) {
                    val notFound = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\nContent-Length: 9\r\n\r\nNot Found"
                    output.write(notFound.toByteArray())
                    output.flush()
                }
            }
        } catch (e: Exception) {
            // Connection reset or socket closed
        }
    }

    private fun proxyApiRequest(path: String, body: String, reqHeaders: Map<String, String>, clientOutput: BufferedOutputStream) {
        try {
            val url = URL("http://127.0.0.1:$apiPort$path")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.doOutput = true
            conn.connectTimeout = 3000
            conn.readTimeout = 5000

            reqHeaders.forEach { (k, v) ->
                if (!k.equals("Host", ignoreCase = true) && !k.equals("Content-Length", ignoreCase = true)) {
                    conn.setRequestProperty(k, v)
                }
            }

            val bodyBytes = body.toByteArray()
            conn.setRequestProperty("Content-Length", bodyBytes.size.toString())
            conn.outputStream.write(bodyBytes)

            val status = conn.responseCode
            val responseStream = if (status in 200..299) conn.inputStream else conn.errorStream
            val respBytes = responseStream?.readBytes() ?: ByteArray(0)

            val header = "HTTP/1.1 $status ${conn.responseMessage ?: "OK"}\r\n" +
                    "Content-Type: ${conn.contentType ?: "application/json"}\r\n" +
                    "Content-Length: ${respBytes.size}\r\n" +
                    "Access-Control-Allow-Origin: *\r\n" +
                    "Connection: close\r\n\r\n"

            clientOutput.write(header.toByteArray())
            clientOutput.write(respBytes)
            clientOutput.flush()
        } catch (e: Exception) {
            val errResp = "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\n\r\n"
            clientOutput.write(errResp.toByteArray())
            clientOutput.flush()
        }
    }

    private fun getMimeType(path: String): String {
        return when {
            path.endsWith(".html", ignoreCase = true) -> "text/html; charset=utf-8"
            path.endsWith(".css", ignoreCase = true) -> "text/css; charset=utf-8"
            path.endsWith(".js", ignoreCase = true) -> "application/javascript; charset=utf-8"
            path.endsWith(".svg", ignoreCase = true) -> "image/svg+xml"
            path.endsWith(".png", ignoreCase = true) -> "image/png"
            path.endsWith(".jpg", ignoreCase = true) || path.endsWith(".jpeg", ignoreCase = true) -> "image/jpeg"
            path.endsWith(".json", ignoreCase = true) -> "application/json"
            path.endsWith(".woff2", ignoreCase = true) -> "font/woff2"
            path.endsWith(".ttf", ignoreCase = true) -> "font/ttf"
            else -> "application/octet-stream"
        }
    }
}
