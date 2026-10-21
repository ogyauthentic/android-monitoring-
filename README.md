# android-monitoring-

Monitoring aplikasi Android yang berjalan di background dan mengirim log serta screenshot ke server real-time.

## Fitur utama

- foreground service Android
- auto-start setelah boot
- aplikasi tidak menampilkan launcher icon
- monitoring app usage
- realtime dashboard di browser
- log dikirim ke server Node.js
- screenshot dapat dikirim ke server melalui endpoint upload
- bisa digunakan lewat ngrok, VPS, Docker, atau Cloudflare

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
│   ├── index.html
│   ├── logs.json
│   ├── package.json
│   ├── server.js
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
│           │   └── MainActivity.kt
│           └── res/
│               ├── layout/activity_main.xml
│               ├── values/colors.xml
│               ├── values/strings.xml
│               └── values/themes.xml
```

## Persyaratan

### Untuk menjalankan server lokal

- Node.js 18+
- npm

### Untuk deployment produksi

- VPS atau server Linux
- Docker + Docker Compose
- Nginx (opsional)
- Cloudflare (opsional)

## Menjalankan server di laptop/PC

Masuk ke folder `server` lalu jalankan:

```bash
cd server
npm install
node server.js
```

Setelah server hidup, buka browser:

```text
http://localhost:3000
```

Server menyediakan endpoint berikut:

- `/` -> dashboard HTML
- `/health` -> health check
- `/api/logs` -> daftar log
- `/api/log` -> endpoint upload log dari Android
- `/api/screenshot` -> upload screenshot dari Android
- `/uploads/<file>.png` -> akses screenshot yang sudah disimpan

## Menjalankan dengan Docker Compose

### 1. Copy file environment

```bash
cp .env.example .env
```

Edit `.env` sesuai environment Anda:

```env
PORT=3000
API_TOKEN=token-rahasia-anda
```

### 2. Jalankan container

```bash
docker compose up --build -d
```

### 3. Cek status container

```bash
docker compose ps
```

### 4. Cek health check

```bash
curl http://localhost/health
```

Kalau berhasil, outputnya seperti:

```json
{"ok":true,"status":"server-running"}
```

## Deployment di VPS dengan Nginx + Cloudflare

### 1. Clone repo

```bash
git clone https://github.com/ogyauthentic/android-monitoring-.git
cd android-monitoring-
```

### 2. Jalankan app dengan Docker

```bash
docker compose up --build -d
```

### 3. Konfigurasi Nginx reverse proxy

Buat file `/etc/nginx/conf.d/android-monitoring.conf`:

```nginx
server {
    listen 80;
    server_name monitoring.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Lalu cek dan reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Konfigurasi domain di Cloudflare

Di Cloudflare:

- Tambahkan DNS record `A` untuk `monitoring.example.com`
- Arahkan ke IP VPS Anda
- Aktifkan proxy (orange cloud)

Setelah itu, akses:

```text
https://monitoring.example.com
```

### 5. HTTPS via LetsEncrypt (opsional)

Untuk Nginx langsung menangani SSL:

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d monitoring.example.com
```

## Screenshot upload dari Android

Android dapat mengirim screenshot ke server melalui endpoint berikut:

```text
POST /api/screenshot
```

### Contoh request dengan curl

```bash
curl -X POST \
  -H "Authorization: Bearer token-rahasia-anda" \
  -F "file=@/path/to/test.png" \
  http://localhost:3000/api/screenshot
```

### Contoh response

```json
{
  "ok": true,
  "message": "screenshot uploaded",
  "fileUrl": "/uploads/1712345678901-abcd.png",
  "url": "http://localhost:3000/uploads/1712345678901-abcd.png"
}
```

### Akses screenshot dari browser

```text
http://localhost:3000/uploads/<nama-file>.png
```

## Variabel environment

File `.env` mendukung:

```env
PORT=3000
API_TOKEN=token-rahasia-anda
```

`API_TOKEN` dipakai agar request dari Android hanya bisa diterima jika Authorization header sesuai.

## Pengaturan Android

Di aplikasi Android, ubah URL server ke domain atau IP publik Anda, contoh:

```kotlin
private val screenshotUrl = "https://monitoring.example.com/api/screenshot"
private val authToken = "token-rahasia-anda"
```

Contoh header:

```kotlin
.header("Authorization", "Bearer $authToken")
```

## Akses dari Android beda jaringan

Gunakan ngrok atau VPS publik:

```bash
ngrok http 3000
```

Lalu update URL server dari Android menjadi URL ngrok yang diberikan.

## Keamanan produksi

Untuk produksi, disarankan:

- pakai HTTPS
- pakai token API
- gunakan domain publik yang aman
- batasi akses ke port server dari firewall
- jangan simpan token di source control umum
- batasi ukuran upload gambar (sudah dibatasi 10 MB pada server)

## Catatan penting

Aplikasi Android modern bisa membatasi background task dan auto-start. Jadi ini paling cocok untuk:

- monitoring internal
- penggunaan di jaringan lokal
- perangkat yang dikelola dengan izin khusus
- screenshot manual / event-triggered bukan screenshot layar penuh otomatis

Untuk screenshot full-screen otomatis di background, diperlukan teknologi tambahan seperti `MediaProjection` API, dan itu tidak cocok untuk setup paling sederhana.

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

### Endpoint tidak bisa dipanggil

Periksa apakah app container berjalan:

```bash
docker compose logs app
```

### Nginx error

```bash
sudo nginx -t
sudo systemctl status nginx
```

## Referensi cepat

### Jalankan lokal

```bash
cd server
npm install
node server.js
```

### Jalankan dengan Docker

```bash
docker compose up --build -d
```

### Cek status

```bash
curl http://localhost/health
```

### Upload screenshot manual

```bash
curl -X POST \
  -H "Authorization: Bearer token-rahasia-anda" \
  -F "file=@/path/to/test.png" \
  http://localhost:3000/api/screenshot
```

## Credit

Project ini dibuat untuk monitoring aplikasi Android yang berjalan di background dan mengirim log serta screenshot secara real-time.

---

Untuk deploy ke server publik, file Docker dan Nginx yang tersedia di repo ini sudah dibuat agar bisa langsung digunakan.
