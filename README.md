# App Monitor Project

Monitoring aplikasi Android yang berjalan di background dan mengirim log ke laptop melalui server real-time.

## Struktur proyek

```text
.
├── README.md
├── .gitignore
├── server/
│   ├── package.json
│   ├── server.js
│   ├── index.html
│   ├── logs.json
│   └── .env.example
└── android/
    ├── settings.gradle
    ├── build.gradle
    ├── gradle.properties
    └── app/
        ├── build.gradle
        ├── proguard-rules.pro
        └── src/main/
            ├── AndroidManifest.xml
            ├── java/com/example/appmonitor/
            │   ├── MainActivity.kt
            │   └── AppMonitorService.kt
            └── res/
                ├── layout/activity_main.xml
                ├── values/colors.xml
                ├── values/strings.xml
                └── values/themes.xml
```

## Arsitektur

- Android: `ForegroundService` berjalan di background.
- Service mengambil aplikasi yang sedang aktif menggunakan `UsageStatsManager`.
- Log dikirim ke server Node.js melalui HTTP POST.
- Server menampilkan log secara real-time di browser menggunakan Socket.IO.
- Laptop dapat menerima log meski Android dan laptop beda jaringan dengan `ngrok` atau VPS.

## Cara menjalankan server di laptop

```bash
cd server
npm install
node server.js
```

Lalu buka browser ke:

```text
http://localhost:3000
```

## Agar Android dapat terhubung dari luar jaringan lokal

Jalankan tunnel:

```bash
ngrok http 3000
```

Salin URL dari ngrok, misalnya:

```text
https://abcd-12-34-56-78.ngrok-free.app
```

Setelah itu, paste ke file `android/app/src/main/java/com/example/appmonitor/AppMonitorService.kt` pada variabel:

```kotlin
private val serverUrl = "https://YOUR_NGROK_URL/api/log"
```

## Menjalankan Android App

1. Buka folder `android` di Android Studio.
2. Sync project.
3. Hubungkan device Android.
4. Jalankan aplikasi.
5. Pastikan izinkan `Usage Access`:
   - Settings > Apps > Special app access > Usage access
   - aktifkan untuk aplikasi Anda
6. Aplikasi akan berjalan di background dan mengirim log.

## Log yang dikirim

Contoh payload:

```json
{
  "event": "foreground_app",
  "packageName": "com.instagram.android",
  "device": "Pixel 8",
  "timestamp": 1720000000000
}
```

## Catatan keamanan

Gunakan `Authorization` header untuk validasi API jika Anda deploy ke server publik. Contoh:

```kotlin
.addHeader("Authorization", "Bearer your-secret-token")
```

Di server Node.js kita sudah menyediakan `Authorization` validation optional. Silakan sesuaikan jika diperlukan.

## Fitur yang sudah termasuk

- Real-time monitoring lewat browser
- background service Android
- log aplikasi aktif
- koneksi antar jaringan lewat ngrok
- penyimpanan log ke file JSON
- server live dashboard

## Cek status server

```bash
curl http://localhost:3000/health
```

## Lisensi

Project ini dibuat untuk kebutuhan monitoring/logging aplikasi Android di laptop. Silakan sesuaikan sesuai kebutuhan proyek Anda.
