# android-monitoring-

Monitoring aplikasi Android yang berjalan di background dan mengirim log ke laptop/PC melalui server real-time.

## Fitur utama

- foreground service Android
- auto-start setelah boot
- aplikasi tidak menampilkan launcher icon
- monitoring app usage
- realtime dashboard di browser
- log dikirim ke server Node.js
- support beda jaringan via ngrok/VPS

## Struktur proyek

```text
.
├── README.md
├── .gitignore
├── server/
│   ├── .env.example
│   ├── index.html
│   ├── logs.json
│   ├── package.json
│   └── server.js
├── android/
│   ├── build.gradle
│   ├── gradle.properties
│   ├── settings.gradle
│   └── app/
│       ├── build.gradle
│       ├── proguard-rules.pro
│       └── src/main/
│           ├── AndroidManifest.xml
│           ├── java/com/example/appmonitor/
│           │   ├── AppMonitorService.kt
│           │   ├── BootReceiver.kt
│           │   └── MainActivity.kt
│           └── res/
│               ├── layout/activity_main.xml
│               ├── values/colors.xml
│               ├── values/strings.xml
│               └── values/themes.xml
```

## Cara jalankan server di laptop

1. Masuk ke folder `server`
2. Jalankan:

```bash
npm install
node server.js
```

3. Buka browser:

```text
http://localhost:3000
```

## Cara akses dari Android beda jaringan

Gunakan ngrok:

```bash
ngrok http 3000
```

Ambil URL seperti:

```text
https://abcd-1234.ngrok-free.app
```

Update file:

```kotlin
private val serverUrl = "https://YOUR_NGROK_URL/api/log"
```

di `android/app/src/main/java/com/example/appmonitor/AppMonitorService.kt`.

## Fitur hidden app

Aplikasi tidak menampilkan ikon launcher, tetapi tetap menjalankan service di background. Auto-start setelah boot juga sudah diaktifkan melalui `BootReceiver`.

Catatan penting: Android modern tetap bisa menampilkan aplikasi di Settings > Apps / App info, jadi yang bisa dicapai adalah “tidak tampil di launcher”, bukan 100% sepenuhnya tersembunyi.

## Izin yang diperlukan di Android

User harus aktifkan:

- Settings > Apps > Special app access > Usage access
- Battery optimization di non-restrict

## Build APK

1. Buka folder `android` di Android Studio
2. Sync Gradle
3. Pilih Build > Build APK
4. Install file APK ke perangkat user

## Catatan keamanan

Untuk produksi, gunakan HTTPS dan token API:

- server Node.js sudah mendukung Authorization header
- ganti `apiToken` di `AppMonitorService.kt`
- di server, aktifkan variabel `API_TOKEN` pada `server.js` atau `.env`

## Penting

Untuk penggunaan realistis, semua perangkat Android modern biasanya membatasi auto-start dan background task. Jadi, aplikasi ini paling cocok untuk:

- monitoring internal
- alat pengawasan pribadi di jaringan lokal
- penggunaan di perangkat yang dikelola dengan izin khusus
