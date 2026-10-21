# android-monitoring-

Monitoring aplikasi Android yang berjalan di background dan mengirim log serta live screen stream ke server real-time.

## Fitur utama

- foreground service Android
- auto-start setelah boot
- aplikasi tidak menampilkan launcher icon
- monitoring app usage
- realtime dashboard di browser
- log dikirim ke server Node.js
- live screen stream ke browser melalui Socket.IO
- screenshot dapat dikirim ke server melalui endpoint upload
- support beda jaringan via ngrok, VPS, Docker, atau Cloudflare

## Arsitektur final

- Android client: menangkap layar menggunakan MediaProjection
- Server Node.js: menerima stream layar dan log menggunakan Socket.IO
- SQLite: menyimpan log dan metadata screenshot
- File uploads: menyimpan screenshot di `server/uploads`
- Browser: menampilkan stream melalui `/stream.html`

## Struktur proyek

```text
.
├── README.md
├── .gitignore
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── nginx/
│   └── default.conf
├── server/
│   ├── .env.example
│   ├── database.js
│   ├── index.html
│   ├── logs.json
│   ├── monitor.db
│   ├── package.json
│   ├── server.js
│   ├── stream.html
│   └── uploads/
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
│           │   ├── MainActivity.kt
│           │   └── ScreenStreamService.kt
│           └── res/
│               ├── layout/activity_main.xml
│               ├── values/colors.xml
│               ├── values/strings.xml
│               └── values/themes.xml
```

## Teknologi utama

- Android: Kotlin + MediaProjection + Socket.IO client
- Server: Node.js + Express + Socket.IO + SQLite + Multer
- Browser: HTML + JavaScript + Socket.IO client

## Jalankan server lokal

```bash
cd server
npm install
node server.js
```

Buka browser:

```text
http://localhost:3000/stream.html
```

## Endpoint utama

- `/health` -> health check
- `/stream.html` -> viewer live screen
- `/api/logs` -> log yang tersimpan di SQLite
- `/api/log` -> kirim log dari Android
- `/api/screenshot` -> upload screenshot dari Android
- `/uploads/<file>.png` -> akses screenshot yang disimpan

## Jalankan dengan Docker Compose

```bash
docker compose up --build -d
```

Cek:

```bash
curl http://localhost/health
```

## Deployment dengan Cloudflare / Ngrok

Untuk beda jaringan, pakai Cloudflare Tunnel atau Ngrok ke port 3000.

Contoh:

```bash
ngrok http 3000
```

atau:

```bash
cloudflared tunnel --url http://localhost:3000
```

## Android live stream

Android akan meminta izin capture layar dengan `MediaProjection`, lalu mengirim frame layar ke server lewat WebSocket. Browser menampilkan frame terbaru di `/stream.html`.

## Environment

```env
PORT=3000
API_TOKEN=token-rahasia-anda
```

## Keamanan

- Gunakan HTTPS di production
- Pakai token API untuk log dan upload screenshot
- Jangan pakai token di repo publik
- Batasi akses dari firewall

## Catatan penting

Capturing layar penuh di Android memerlukan MediaProjection dan izin user. Ini adalah pendekatan yang paling realistis untuk melihat layar HP dari PC/server lain.

## Troubleshooting

### Server tidak hidup

```bash
cd server
npm install
node server.js
```

### Port 3000 tidak bisa diakses

```bash
ss -tulpn | grep 3000
```

### Docker gagal build

```bash
docker compose build --no-cache
```

### Browser tidak menampilkan stream

- Pastikan Android sudah memulai `ScreenStreamService`
- Pastikan URL Socket.IO sudah benar
- Cek log server dan log Android

## Credit

Project ini dibuat untuk monitoring Android secara real-time, termasuk log aplikasi, screenshot, dan stream layar ke server.
