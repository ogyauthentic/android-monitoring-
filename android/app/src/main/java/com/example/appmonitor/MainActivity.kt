package com.example.appmonitor

import android.graphics.Bitmap
import android.graphics.Canvas
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val screenshotUrl = "https://monitoring.example.com/api/screenshot"
    private val authToken = "token-rahasia-anda"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val serviceIntent = android.content.Intent(this, AppMonitorService::class.java)
        ContextCompat.startForegroundService(this, serviceIntent)

        val sendScreenshotButton = findViewById<Button>(R.id.btnSendScreenshot)
        sendScreenshotButton.setOnClickListener {
            val rootView = window.decorView.rootView
            val screenshot = captureView(rootView)
            uploadScreenshot(screenshot)
        }
    }

    private fun captureView(view: View): Bitmap {
        val bitmap = Bitmap.createBitmap(
            view.width,
            view.height,
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(bitmap)
        view.draw(canvas)
        return bitmap
    }

    private fun uploadScreenshot(bitmap: Bitmap) {
        val stream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
        val bytes = stream.toByteArray()

        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "file",
                "screenshot_${System.currentTimeMillis()}.png",
                bytes.toRequestBody("image/png".toMediaTypeOrNull())
            )
            .addFormDataPart("device", Build.MODEL)
            .addFormDataPart("source", "app")
            .build()

        val request = Request.Builder()
            .url(screenshotUrl)
            .header("Authorization", "Bearer $authToken")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Gagal kirim screenshot: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string() ?: ""
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Screenshot terkirim", Toast.LENGTH_SHORT).show()
                }
                response.close()
            }
        })
    }
}
