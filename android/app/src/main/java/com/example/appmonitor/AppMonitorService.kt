package com.example.appmonitor

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.io.IOException

class AppMonitorService : Service() {

    private val client = OkHttpClient()
    private val handler = Handler(Looper.getMainLooper())
    private val pollingIntervalMs = 10_000L
    private val serverUrl = "https://YOUR_NGROK_URL/api/log"
    private val apiToken = "YOUR_API_TOKEN"

    private val pollRunnable = object : Runnable {
        override fun run() {
            val payload = buildAppLogPayload()
            sendToServer(payload)
            handler.postDelayed(this, pollingIntervalMs)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(1, buildNotification())
        handler.post(pollRunnable)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(pollRunnable)
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildAppLogPayload(): JSONObject {
        val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager
        if (usageStatsManager == null) {
            return JSONObject().apply {
                put("event", "usage_access_missing")
                put("packageName", "unknown")
                put("device", Build.MODEL)
                put("timestamp", System.currentTimeMillis())
            }
        }

        val endTime = System.currentTimeMillis()
        val startTime = endTime - 60_000L

        val stats: List<UsageStats> = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            startTime,
            endTime
        ) ?: emptyList()

        val foregroundApp = stats
            .filter { it.lastTimeUsed > 0 }
            .maxByOrNull { it.lastTimeUsed }

        val packageName = foregroundApp?.packageName ?: "unknown"

        return JSONObject().apply {
            put("event", "foreground_app")
            put("packageName", packageName)
            put("device", Build.MODEL)
            put("timestamp", System.currentTimeMillis())
        }
    }

    private fun sendToServer(payload: JSONObject) {
        if (serverUrl.contains("YOUR_NGROK_URL") || serverUrl.contains("YOUR_API_TOKEN")) {
            Log.w("AppMonitorService", "Ganti server URL dan token API sebelum build produksi.")
            return
        }

        val requestBody = payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType())

        val requestBuilder = Request.Builder()
            .url(serverUrl)
            .post(requestBody)

        if (apiToken.isNotBlank() && apiToken != "YOUR_API_TOKEN") {
            requestBuilder.addHeader("Authorization", "Bearer $apiToken")
        }

        val request = requestBuilder.build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                Log.e("AppMonitorService", "Gagal kirim log: ${e.message}")
            }

            override fun onResponse(call: Call, response: Response) {
                val result = response.body?.string() ?: "empty"
                Log.d("AppMonitorService", "Server response: $result")
                response.close()
            }
        })
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "app_monitor_channel",
                "App Monitor",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, "app_monitor_channel")
            .setContentTitle("App Monitor")
            .setContentText("Monitoring aktif di background")
            .setSmallIcon(android.R.drawable.stat_sys_data_saver)
            .build()
    }
}
