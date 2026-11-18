# Publicación del juego

URL: https://juego.proyectoia.org/

Servidor: `juancarlosvergaraschmalbach@macmini` por Tailscale y SSH.
Carpeta: `/Users/juancarlosvergaraschmalbach/Servidor/apps/juego`.
Contenedor: `juego-web`, puerto privado `127.0.0.1:8120`.
Cloudflare: túnel independiente `juego`, mantenido por el agente
`org.proyectoia.juego-tunnel`. Sigue el esquema de `riesgosia`.
El agente arranca con la sesión del usuario y Docker mantiene el contenedor.

## Actualizar

1. Ejecutar `node deployment/build.cjs`; muestra el identificador de versión.
2. Comprimir `public` y `manifest.json` de esa versión con `tar -czf`.
3. Crear en el servidor `apps/juego/incoming/<id>` y subir el tar y `install.py`
   a `apps/juego/incoming/` usando SCP con verificación estricta del host.
4. Extraer el tar en `incoming/<id>` y ejecutar `python3 incoming/install.py <id>`
   desde `apps/juego`. Verifica las sumas SHA256 antes de activar la versión.
5. Ejecutar `node deployment/verify.cjs deployment/packages/<id>/manifest.json`.
   Compara todos los archivos públicos con la copia local y comprueba que los
   archivos de desarrollo y las credenciales no sean accesibles.
6. Probar una partida en el navegador.

`publish.py` se usó **solo para la primera instalación** del túnel y DNS;
no volver a ejecutarlo para actualizar el juego.

Las versiones se conservan en `site/releases/`; `site/current` apunta a la
activa. Para volver a una anterior, crear un enlace temporal a la versión
elegida y sustituir `site/current` atómicamente. No borrar las versiones.

El paquete público incluye solamente HTML, CSS, JavaScript y sprites usados.
No incluye pruebas, documentación, scripts del servidor ni credenciales.
Los cambios posteriores en `C:\Juego Arcade` necesitan una nueva publicación.
Las partidas y mejoras se guardan por navegador y dominio: el progreso de
localhost no se transfiere automáticamente al sitio público.
