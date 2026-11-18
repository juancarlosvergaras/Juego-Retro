"""Register the dedicated juego tunnel and install its launchd agent."""
from pathlib import Path
import os
import plistlib
import subprocess
import sys
import uuid

tunnel = str(uuid.UUID(sys.argv[1]))
base = Path.home() / 'Servidor/apps/juego'
cloudflared = '/opt/homebrew/bin/cloudflared'
credentials = base / 'private/tunnel.json'
credentials.chmod(0o600)
config = base / 'cloudflared.yml'
config.write_text(f'''tunnel: {tunnel}
credentials-file: {credentials}
ingress:
  - hostname: juego.proyectoia.org
    service: http://127.0.0.1:8120
  - service: http_status:404
''')
subprocess.run([cloudflared, '--config', str(config), 'tunnel', 'ingress', 'validate'], check=True)
subprocess.run([cloudflared, 'tunnel', 'route', 'dns', tunnel, 'juego.proyectoia.org'], check=True)
label = 'org.proyectoia.juego-tunnel'
agent = Path.home() / 'Library/LaunchAgents' / (label + '.plist')
assert not agent.exists(), 'Agent already exists; review before replacing'
with agent.open('wb') as out:
    plistlib.dump({
        'Label': label,
        'ProgramArguments': [cloudflared, '--config', str(config), '--no-autoupdate', 'tunnel', 'run'],
        'RunAtLoad': True, 'KeepAlive': True, 'ThrottleInterval': 10,
        'WorkingDirectory': str(base),
        'StandardOutPath': str(base / 'logs/tunnel.out.log'),
        'StandardErrorPath': str(base / 'logs/tunnel.err.log'),
    }, out)
subprocess.run(['launchctl', 'bootstrap', f'gui/{os.getuid()}', str(agent)], check=True)
routes = Path.home() / 'Servidor/rutas.conf'
note = '# juego.proyectoia.org: 8120 publico; tunel independiente juego; apps/juego/cloudflared.yml'
if note not in routes.read_text():
    with routes.open('a') as out:
        out.write('\n' + note + '\n')
(base / 'README.md').write_text(f'''# OBRA 10 — juego.proyectoia.org

Juego estatico publicado desde C:\\Juego Arcade. Puerto local: 127.0.0.1:8120.
Nginx: contenedor juego-web, compose docker-compose.servidor.yml.
Tunel independiente: juego ({tunnel}), como riesgosia y simulacion.
No agregar una ruta activa al tunel compartido macmini para este dominio.
Agente: ~/Library/LaunchAgents/org.proyectoia.juego-tunnel.plist.
El contenedor se reinicia automaticamente con Docker/OrbStack; launchd mantiene
el tunel activo al iniciar la sesion del usuario, igual que las otras apps.

## Actualizaciones
La fuente esta en el PC. deployment/build.cjs incluye solo las dependencias
del navegador. Subir el tar a incoming/<id>, extraerlo y ejecutar
python3 incoming/install.py <id>. No volver a crear el tunel ni el DNS.
Cada version queda en site/releases; site/current es un enlace atomico.
Los manifiestos SHA256 estan en manifests/. No modificar las versiones
publicadas: subir una nueva para poder volver a la anterior.

## Verificacion
curl -I http://127.0.0.1:8120/
curl -I https://juego.proyectoia.org/
~/.orbstack/bin/docker compose -f docker-compose.servidor.yml ps
launchctl print gui/{os.getuid()}/org.proyectoia.juego-tunnel

Credenciales solo en private/tunnel.json (600), fuera de lo servido por nginx.
Los guardados del jugador son locales a cada navegador y dominio.
''')
print('Published juego tunnel; launchd agent installed')
