"""Install an uploaded, checksummed static release on the Mac mini (no sudo)."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

base = Path.home() / 'Servidor/apps/juego'
incoming = base / 'incoming' / sys.argv[1]
manifest = json.loads((incoming / 'manifest.json').read_text())
assert manifest['id'] == sys.argv[1]
for item in manifest['files']:
    file = incoming / 'public' / item['path']
    assert file.resolve().is_relative_to((incoming / 'public').resolve())
    assert hashlib.sha256(file.read_bytes()).hexdigest() == item['sha256'], item['path']

site = base / 'site'
(site / 'releases').mkdir(parents=True, exist_ok=True)
release = site / 'releases' / manifest['id']
assert not release.exists(), 'Release already installed'
(incoming / 'public').rename(release)
(base / 'manifests').mkdir(exist_ok=True)
(base / 'manifests' / (manifest['id'] + '.json')).write_text(json.dumps(manifest, indent=2) + '\n')
current = site / 'current'
if current.is_symlink():
    (base / 'previous-release.txt').write_text(str(current.readlink()) + '\n')
pending = site / ('next-' + manifest['id'])
pending.symlink_to(Path('releases') / manifest['id'])
pending.replace(current)

(base / 'nginx.conf').write_text('''server {
    listen 80;
    server_name juego.proyectoia.org;
    root /srv/game/current;
    index index.html;
    charset utf-8;
    server_tokens off;
    add_header Cache-Control "no-cache" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    gzip on;
    gzip_types text/css application/javascript application/json application/manifest+json image/svg+xml;
    location / { try_files $uri $uri/ =404; }
    # Los archivos con hash en el nombre no cambian nunca: el navegador no
    # vuelve a pedirlos. HTML y manifiesto siguen revalidandose.
    location ~* "\\.[0-9a-f]{16}\\.(?:js|css|png|webp|jpg|ogg|mp3|wav)$" {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        try_files $uri =404;
    }
    location = /game.webmanifest { default_type application/manifest+json; add_header Cache-Control "no-cache" always; }
    location ~ /\\. { deny all; }
}
''')
(base / 'docker-compose.servidor.yml').write_text('''name: juego
services:
  web:
    image: sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752
    pull_policy: never
    container_name: juego-web
    restart: unless-stopped
    ports:
      - "127.0.0.1:8120:80"
    volumes:
      - ./site:/srv/game:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://127.0.0.1/"]
      interval: 30s
      timeout: 5s
      retries: 3
''')
subprocess.run([str(Path.home() / '.orbstack/bin/docker'), 'compose', '-f', str(base / 'docker-compose.servidor.yml'), 'up', '-d'], cwd=base, check=True)
# El contenedor ya en marcha no relee nginx.conf por si solo: se valida y se recarga.
docker = str(Path.home() / '.orbstack/bin/docker')
subprocess.run([docker, 'exec', 'juego-web', 'nginx', '-t'], check=True)
subprocess.run([docker, 'exec', 'juego-web', 'nginx', '-s', 'reload'], check=True)
print('Installed release', manifest['id'], 'with', len(manifest['files']), 'verified files')
