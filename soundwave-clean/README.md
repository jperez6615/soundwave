# 🎵 SoundWave — Guía Completa de Despliegue en Railway

> Reproductor de música tipo Spotify, completamente desplegado en Railway.
> Streaming desde YouTube sin anuncios, PWA instalable en iPhone.

---

## 📁 Estructura del proyecto

```
soundwave/
├── backend/                  # Express API + yt-dlp streaming
│   ├── src/
│   │   ├── index.js          # Entry point del servidor
│   │   ├── routes/
│   │   │   ├── stream.js     # 🎵 Streaming de audio (CORE)
│   │   │   ├── search.js     # Búsqueda en YouTube
│   │   │   ├── playlists.js  # CRUD playlists
│   │   │   ├── spotify.js    # Import desde Spotify
│   │   │   ├── lyrics.js     # Letras de canciones
│   │   │   ├── history.js    # Historial
│   │   │   └── users.js      # Usuarios y likes
│   │   ├── services/
│   │   │   ├── ytdlp.js      # Motor de streaming yt-dlp
│   │   │   └── youtube.js    # Búsqueda YouTube
│   │   └── lib/logger.js
│   ├── prisma/
│   │   ├── schema.prisma     # Modelos de BD
│   │   └── migrations/       # Migraciones SQL
│   ├── Dockerfile            # Con yt-dlp + ffmpeg instalados
│   └── railway.json
│
├── frontend/                 # Next.js PWA
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.js     # Layout global + fonts
│   │   │   ├── page.js       # App principal
│   │   │   └── globals.css   # Sistema de diseño
│   │   ├── components/
│   │   │   ├── player/
│   │   │   │   ├── Player.js      # Barra de reproducción
│   │   │   │   └── LyricsPanel.js # Panel de letras
│   │   │   ├── sidebar/
│   │   │   │   ├── Sidebar.js     # Sidebar desktop
│   │   │   │   └── MobileNav.js   # Nav bottom móvil
│   │   │   ├── views/
│   │   │   │   ├── HomeView.js
│   │   │   │   ├── SearchView.js
│   │   │   │   ├── PlaylistView.js
│   │   │   │   ├── LikedView.js
│   │   │   │   └── HistoryView.js
│   │   │   ├── ui/
│   │   │   │   └── Notification.js
│   │   │   └── TrackCard.js  # Card reutilizable de canción
│   │   ├── hooks/
│   │   │   └── useAudioPlayer.js # Hook de audio HTML5
│   │   ├── store/
│   │   │   └── index.js      # Zustand state global
│   │   └── lib/
│   │       └── api.js        # Cliente HTTP
│   ├── public/
│   │   └── manifest.json     # PWA manifest
│   ├── Dockerfile
│   └── railway.json
```

---

## 🚀 PASO A PASO: Deploy en Railway

### PASO 1 — Preparar el repositorio en GitHub

```bash
# 1. Crear repositorio en GitHub (soundwave o el nombre que prefieras)
# 2. Subir el código:

git init
git add .
git commit -m "feat: initial SoundWave app"
git remote add origin https://github.com/TU_USUARIO/soundwave.git
git push -u origin main
```

---

### PASO 2 — Crear proyecto en Railway

1. Ve a **[railway.app](https://railway.app)** → Sign in con GitHub
2. Click **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Conecta tu repositorio `soundwave`
5. Railway detectará el monorepo → **NO** hagas deploy todavía

---

### PASO 3 — Añadir PostgreSQL

En tu proyecto de Railway:

1. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway provisiona la BD automáticamente
3. Guarda la variable `DATABASE_URL` que aparece (la necesitarás)
   - Va a `soundwave-postgres` → **Variables** → copia `DATABASE_URL`

---

### PASO 4 — Configurar el servicio Backend

1. Click **"+ New"** → **"GitHub Repo"** → selecciona `soundwave`
2. En **Settings** → **Root Directory**: escribe `backend`
3. En **Settings** → **Builder**: selecciona **Dockerfile**
4. Ve a **Variables** y añade:

```env
# OBLIGATORIAS
DATABASE_URL=           # Pega aquí el valor de PostgreSQL (Railway lo puede referenciar automáticamente)
NODE_ENV=production
PORT=3001
FRONTEND_URL=           # URL del frontend (la obtienes después del deploy del frontend)

# OPCIONALES (más funcionalidades)
YOUTUBE_API_KEY=        # API key de Google Cloud Console
SPOTIFY_CLIENT_ID=      # De developer.spotify.com
SPOTIFY_CLIENT_SECRET=  # De developer.spotify.com
SPOTIFY_REDIRECT_URI=   # https://TU-BACKEND.railway.app/api/spotify/callback
GENIUS_API_KEY=         # De genius.com/api-clients
```

> **Tip Railway:** Para referenciar el DATABASE_URL de PostgreSQL directamente,
> en Variables escribe `${{Postgres.DATABASE_URL}}` y Railway lo resuelve solo.

5. En **Networking** → **Generate Domain** → copia la URL (ej: `soundwave-backend.up.railway.app`)

---

### PASO 5 — Configurar el servicio Frontend

1. Click **"+ New"** → **"GitHub Repo"** → selecciona `soundwave`
2. En **Settings** → **Root Directory**: escribe `frontend`
3. En **Settings** → **Builder**: selecciona **Dockerfile**
4. Ve a **Variables** y añade:

```env
NEXT_PUBLIC_API_URL=https://soundwave-backend.up.railway.app
NODE_ENV=production
```

5. En **Networking** → **Generate Domain** → copia la URL del frontend

---

### PASO 6 — Actualizar FRONTEND_URL en el backend

1. Ve al servicio **Backend** → **Variables**
2. Actualiza `FRONTEND_URL` con la URL del frontend:
   ```
   FRONTEND_URL=https://soundwave-frontend.up.railway.app
   ```
3. Railway hará redeploy automático

---

### PASO 7 — Verificar el deploy

```bash
# Health check del backend
curl https://tu-backend.railway.app/health

# Respuesta esperada:
# {"status":"ok","timestamp":"2024-...","version":"1.0.0"}

# Test de búsqueda
curl "https://tu-backend.railway.app/api/search?q=radiohead"

# Test de stream (debe devolver audio/mpeg)
curl -I "https://tu-backend.railway.app/api/stream/dQw4w9WgXcQ"
```

---

### PASO 8 — Deploy automático desde GitHub

Railway hace deploy automático en cada `git push` a `main`.

```bash
# Para hacer cambios y desplegar:
git add .
git commit -m "fix: algún cambio"
git push origin main
# Railway detecta el push y redeploya automáticamente ✅
```

---

## 📱 Instalar como app en iPhone (PWA)

1. Abre Safari en iPhone (debe ser Safari, no Chrome)
2. Ve a tu URL: `https://soundwave-frontend.up.railway.app`
3. Toca el botón **Compartir** (cuadrado con flecha ↑)
4. Scroll hacia abajo → **"Añadir a pantalla de inicio"**
5. Ponle el nombre "SoundWave" → **"Añadir"**
6. ¡Aparecerá en tu pantalla de inicio como app nativa! 🎉

**Características de la PWA en iPhone:**
- Pantalla completa sin barra de Safari
- Controles de audio en pantalla de bloqueo
- Funciona con AirPods y auriculares
- Integración con Siri (voz)

---

## 🔧 Variables de entorno — Referencia completa

### Backend

| Variable | Obligatoria | Descripción |
|----------|------------|-------------|
| `DATABASE_URL` | ✅ Sí | PostgreSQL connection string (Railway lo da) |
| `PORT` | ✅ Sí | Puerto del servidor (Railway usa 3001) |
| `NODE_ENV` | ✅ Sí | `production` |
| `FRONTEND_URL` | ✅ Sí | URL del frontend para CORS |
| `YOUTUBE_API_KEY` | ⚪ No | YouTube Data API v3 (sin ella usa yt-dlp) |
| `SPOTIFY_CLIENT_ID` | ⚪ No | Para importar playlists de Spotify |
| `SPOTIFY_CLIENT_SECRET` | ⚪ No | Para importar playlists de Spotify |
| `SPOTIFY_REDIRECT_URI` | ⚪ No | `https://backend.railway.app/api/spotify/callback` |
| `GENIUS_API_KEY` | ⚪ No | Para letras de canciones (Genius) |
| `YTDLP_PATH` | ⚪ No | Path de yt-dlp (default: `yt-dlp`) |
| `FFMPEG_PATH` | ⚪ No | Path de ffmpeg (default: `ffmpeg`) |

### Frontend

| Variable | Obligatoria | Descripción |
|----------|------------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ Sí | URL del backend Railway |
| `NODE_ENV` | ✅ Sí | `production` |

---

## 🗄️ Base de datos

El esquema tiene 6 tablas:

```
users          → Usuarios (guest o Spotify OAuth)
playlists      → Playlists de usuario
tracks         → Canciones (cacheadas con youtubeId)
playlist_tracks → Relación playlist-canción (con posición)
history        → Historial de reproducciones
liked_tracks   → Canciones con like
```

Las migraciones corren automáticamente al iniciar el backend
(`npx prisma migrate deploy` en el CMD del Dockerfile).

---

## ⚡ Cómo funciona el streaming

```
Usuario hace click en canción
       ↓
Frontend: GET /api/stream/{youtubeId}
       ↓
Backend: spawn yt-dlp --format bestaudio -o - {youtube_url}
       ↓
yt-dlp stdout → pipe → ffmpeg stdin
       ↓
ffmpeg: convierte a MP3 128k en tiempo real
       ↓
ffmpeg stdout → pipe → HTTP response
       ↓
Browser: <audio> recibe stream MP3 en chunks
       ↓
🎵 Música sin descargar nada
```

El audio **nunca se almacena** en el servidor. Es un pipe puro:
YouTube → yt-dlp → ffmpeg → cliente.

---

## 🔍 Obtener API Keys (opcionales pero recomendadas)

### YouTube Data API v3 (mejora la búsqueda)
1. Ve a [console.cloud.google.com](https://console.cloud.google.com)
2. Crea proyecto → **APIs & Services** → **Enable APIs**
3. Busca "YouTube Data API v3" → Enable
4. **Credentials** → **Create API Key**
5. Copia la key → `YOUTUBE_API_KEY` en Railway

### Spotify (importar playlists)
1. Ve a [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. **Create App** → rellena los datos
3. En **Redirect URIs** añade: `https://tu-backend.railway.app/api/spotify/callback`
4. Copia **Client ID** y **Client Secret**

### Genius (letras)
1. Ve a [genius.com/api-clients](https://genius.com/api-clients)
2. **New API Client** → rellena los datos
3. Copia el **Client Access Token** → `GENIUS_API_KEY`

---

## 🐛 Solución de problemas

### "yt-dlp not found" en Railway
El Dockerfile ya instala yt-dlp. Si hay error:
```bash
# En el Dockerfile está:
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp
```
Verifica los logs del build en Railway.

### Stream falla / no hay audio
- yt-dlp puede necesitar actualización. Añade al Dockerfile:
  ```dockerfile
  RUN yt-dlp -U  # Actualiza yt-dlp
  ```
- YouTube cambia sus APIs frecuentemente. Mantén yt-dlp actualizado.

### CORS errors en el frontend
- Verifica que `FRONTEND_URL` en backend sea exactamente la URL del frontend Railway
- Sin trailing slash: `https://soundwave-frontend.up.railway.app` ✅
- No: `https://soundwave-frontend.up.railway.app/` ❌

### Base de datos no conecta
- Asegúrate de referenciar `${{Postgres.DATABASE_URL}}` en las variables del backend
- O copia la `DATABASE_URL` directamente del plugin de PostgreSQL

### PWA no instala en iPhone
- Debe abrirse con **Safari** (no Chrome, no Firefox)
- El dominio debe ser HTTPS (Railway lo da automáticamente)
- Verifica que `manifest.json` esté en `/public/`

---

## 💰 Costos en Railway

| Plan | Precio | Suficiente para |
|------|--------|-----------------|
| Hobby | $5/mes | Uso personal, hasta ~1000 streams/mes |
| Pro | $20/mes | Uso intensivo, múltiples usuarios |

Con el plan **Hobby ($5/mes)** tienes:
- 500h de CPU/mes
- 1GB RAM por servicio
- Suficiente para uso personal diario

---

## 🔄 Actualizar la app

```bash
# Hacer cambios en el código local
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main

# Railway detecta el push y redeploya en ~2-3 minutos
# Puedes ver el progreso en el dashboard de Railway
```

Para actualizar yt-dlp sin redeploy completo, puedes añadir
un endpoint admin en el backend que ejecute `yt-dlp -U`.

---

## 📊 Monitoreo

Railway tiene dashboard de métricas integrado:
- **CPU usage** (el streaming consume CPU para ffmpeg)
- **Memory** 
- **Network** (el streaming genera mucho tráfico de red)
- **Logs** en tiempo real

Accede desde tu proyecto Railway → selecciona el servicio → **Metrics**.
