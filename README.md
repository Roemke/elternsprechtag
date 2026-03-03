# Elternsprechtag – Buchungssystem

Ein webbasiertes Buchungssystem für Elternsprechtage. Eltern können ohne Login Termine bei Lehrern buchen. Lehrer und Admins verwalten Sprechtage, Zeitrahmen und Buchungen über eine geschützte Oberfläche.

Getestet unter Ubuntu 24. Sollte auf anderen Linux-Distributionen ebenfalls funktionieren.

## Technischer Stack

- **Frontend:** Vue 3, PrimeVue, Vite
- **Backend:** Node.js, Express, Socket.io
- **Datenbank:** MariaDB
- **Webserver:** Apache mit Reverse Proxy

---

## Voraussetzungen

- Node.js 20 oder höher
- MariaDB 10.6 oder höher
- Apache2 mit `mod_proxy` und `mod_proxy_http`

---

## Installation

### 1. Repository klonen

```bash
git clone git@github.com:Roemke/elternsprechtag.git
cd elternsprechtag
```

### 2. Datenbank anlegen

```bash
mysql -u root -p < schema.sql
```

Das Schema enthält bereits `CREATE DATABASE` und `USE` – keine weiteren Schritte nötig.

Datenbankbenutzer anlegen:

```sql
CREATE USER 'elternsprechtag'@'localhost' IDENTIFIED BY 'sicheresPasswort';
GRANT ALL PRIVILEGES ON elternsprechtag.* TO 'elternsprechtag'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Server einrichten

```bash
cd server
npm install
cp .env.example .env
```

`.env` anpassen:

```
DB_HOST=localhost
DB_USER=elternsprechtag
DB_PASSWORD=sicheresPasswort
DB_NAME=elternsprechtag
JWT_SECRET=<langer zufälliger String>
PORT=3000
```

JWT Secret generieren:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Client bauen

```bash
cd client
npm install
npm run build
```

Die gebauten Dateien liegen danach in `client/dist`.

### 5. Apache konfigurieren

`mod_proxy` aktivieren:

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite
sudo systemctl restart apache2
```

Virtual Host Konfiguration (z.B. `/etc/apache2/sites-available/elternsprechtag.conf`):

```apache
<VirtualHost *:80>
    ServerName ihre-domain.de

    # Frontend (statische Dateien)
    DocumentRoot /var/www/html/elternsprechtag/client/dist

    # API Anfragen an Node weiterleiten
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api

    # WebSocket weiterleiten
    ProxyPass /socket.io http://localhost:3000/socket.io
    ProxyPassReverse /socket.io http://localhost:3000/socket.io
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/socket.io/(.*) ws://localhost:3000/socket.io/$1 [P,L]

    # Vue Router – alle Anfragen auf index.html umleiten
    <Directory /var/www/html/elternsprechtag/client/dist>
        Options -Indexes
        AllowOverride All
        Require all granted
        FallbackResource /index.html
    </Directory>
</VirtualHost>
```

Site aktivieren:

```bash
sudo a2ensite elternsprechtag
sudo systemctl reload apache2
```

### 6. Systemd Service einrichten

Service-Datei anlegen `/etc/systemd/system/elternsprechtag.service`:

```ini
[Unit]
Description=Elternsprechtag Node.js Server
After=network.target mariadb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/html/elternsprechtag/server
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=elternsprechtag

[Install]
WantedBy=multi-user.target
```

Service aktivieren und starten:

```bash
sudo systemctl daemon-reload
sudo systemctl enable elternsprechtag
sudo systemctl start elternsprechtag
```

Status prüfen:

```bash
sudo systemctl status elternsprechtag
```

Logs anzeigen:

```bash
sudo journalctl -u elternsprechtag -f
```

---

## Erster Start

### Globalen Admin anlegen

Nach der Installation direkt in der Datenbank:

```sql
INSERT INTO users (first_name, last_name, email, password_hash, role, auth_method)
VALUES ('Admin', 'Name', 'admin@schule.de', '<bcrypt-hash>', 'global_admin', 'internal');
```

Hash generieren:

```bash
node -e "const b = require('bcrypt'); b.hash('IhrPasswort', 10).then(console.log)"
```

### Rollen

| Rolle | Berechtigungen |
|-------|----------------|
| `global_admin` | Alles – Schulen, Lehrer, Sprechtage aller Schulen |
| `school_admin` | Lehrer und Sprechtage der eigenen Schule |
| `teacher` | Eigene Termine und Verfügbarkeit |

---

## Entwicklung

Server mit automatischem Neustart:

```bash
cd server
npm run dev
```

Frontend mit Hot Reload:

```bash
cd client
npm run dev
```

Vite Dev Server läuft auf `http://localhost:5173` und leitet API-Anfragen an Port 3000 weiter.

---

## Lizenz

MIT License – (c) Roemke
