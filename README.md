# guns.lol local replica

> File-based, database-free clone of [guns.lol](https://guns.lol) optimized for self-hosting.

## Features

- **Zero database** – every profile is a JSON document in `GUNS_DATA_ROOT/users`.
- **Local assets** – uploads stored under `GUNS_DATA_ROOT/uploads/<username>` with automatic image compression.
- **File-based auth** – bcrypt password hashes written beside user JSON.
- **Admin dashboard & REST API** – manage users, badges, and quotas from the UI or Express endpoints.
- **Seed & backup scripts** – generate hundreds of demo pages and archive the data directory in seconds.
- **Docker-ready** – `docker-compose` mounts `./data` into `/data/guns` for persistence.

## Getting started

### Prerequisites

- Node.js 20+
- npm
- (optional) Docker & Docker Compose v2

### Install dependencies

```bash
npm install
```

### Configure environment

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

Key variables:

- `GUNS_DATA_ROOT` – base directory for JSON + uploads (defaults to `/data/guns`).
- `SESSION_SECRET` – session cookie secret.
- `PORT` – HTTP port (defaults to 3000).
- `DISABLE_CSRF` – set to `true` for API testing without CSRF tokens.

### Seed demo users

Generate N demo accounts (default 20) with avatars and placeholder data:

```bash
npm run seed -- --count=50
```

The script writes JSON to `${GUNS_DATA_ROOT}/users` and assets to `${GUNS_DATA_ROOT}/uploads`.

### Run the app

```bash
npm start
```

Visit `http://localhost:3000` and sign in with the default admin (`admin / admin123`).

### Docker workflow

```bash
docker compose up --build
```

Profiles, uploads, and session files are persisted to `./data`.

### Backup data

Create a timestamped archive of the data directory:

```bash
npm run backup
```

Archives are saved to `${GUNS_DATA_ROOT}/backups`.

## API reference

All endpoints require an authenticated session. Admin-only routes are noted.

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/login` | Authenticate a user (form encoded). |
| `POST` | `/logout` | Destroy session. |
| `GET` | `/api/users` | List all users (admin). |
| `POST` | `/api/users` | Create user (admin). |
| `GET` | `/api/users/:username` | Fetch user JSON (admin or self). |
| `PUT` | `/api/users/:username` | Update user JSON (admin or self). |
| `DELETE` | `/api/users/:username` | Delete user (admin). |
| `POST` | `/api/users/:username/upload` | Upload media to `/uploads/:username` (admin or self). |

All modifying requests require a CSRF token unless `DISABLE_CSRF=true`.

## JSON structure

Example user document located at `GUNS_DATA_ROOT/users/demo.json`:

```json
{
  "id": "clrq1vo10",
  "username": "demo",
  "displayName": "Demo",
  "description": "Generated via seed script.",
  "role": "user",
  "badges": ["verified"],
  "socials": [
    { "label": "Discord", "url": "https://discord.gg/guns" }
  ],
  "media": {
    "avatar": "/uploads/demo/avatar.png",
    "music": "/uploads/demo/music.mp3"
  },
  "settings": {
    "theme": {
      "accentColor": "#8f5afc",
      "textColor": "#ffffff",
      "backgroundColor": "#1b102b",
      "blur": 18,
      "opacity": 0.9
    },
    "layout": "default"
  },
  "createdAt": "2024-03-01T12:00:00.000Z",
  "updatedAt": "2024-03-01T12:00:00.000Z",
  "passwordHash": "<bcrypt hash>"
}
```

> ⚠️ `passwordHash` stays in the JSON file but is removed automatically before responses/UI rendering.

## Upload validation

- Images: PNG/JPEG/WebP ≤ 10 MB (resized + compressed to WebP).
- Audio: MP3/WAV/OGG ≤ 20 MB.
- Video: MP4/WebM/OGG ≤ 100 MB.

Uploads are stored in `/uploads/<username>` and metadata is written to the corresponding JSON file under the `media` key.

## File layout

```
/public
  /uploads (mounted to data root at runtime)
  player.js
  style.css
/views
  dashboard.ejs
  index.ejs
  login.ejs
  paneladmin.ejs
  profile.ejs
/lib
  authMiddleware.js
  fileStorage.js
  userService.js
/scripts
  backup.js
  seed.js
server.js
Dockerfile
docker-compose.yml
```

## Contributing

1. Fork / clone.
2. `npm install`
3. Create feature branch.
4. Add or update seed JSON/assets as needed.
5. Submit PR.

Enjoy building your own guns.lol universe! ✨
