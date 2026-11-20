# Publicación del juego

URL: https://juego.proyectoia.org/

Servidor: `juancarlosvergaraschmalbach@macmini` por Tailscale y SSH.
Carpeta: `/Users/juancarlosvergaraschmalbach/Servidor/apps/juego`.
Contenedor: `juego-web`, puerto privado `127.0.0.1:8120`.
Cloudflare: túnel independiente `juego`, mantenido por el agente
`org.proyectoia.juego-tunnel`. Sigue el esquema de `riesgosia`.
El agente arranca con la sesión del usuario y Docker mantiene el contenedor.

## Actualizar

1. Ejecutar `python deployment/build.py` (Python 3 con Pillow); muestra el
   identificador de versión. Convierte los PNG a WebP, da a imágenes, JS y CSS
   un nombre con el hash de su contenido y deja `release.tar.gz` listo en
   `deployment/packages/<id>/`. Los PNG fuente no se modifican; las
   conversiones se guardan en `deployment/cache/` para los siguientes paquetes.
   `node deployment/build.cjs` sigue disponible como alternativa sin
   conversión de imágenes (requiere el paso 2).
2. Solo con build.cjs: comprimir `public` y `manifest.json` con `tar -czf`.
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

`install.py` escribe la configuración de nginx: los archivos con hash en el
nombre se sirven como inmutables (un año de caché) y el HTML y el manifiesto
se revalidan siempre. Si cambia `install.py`, hay que volver a subirlo.

Las pruebas necesitan Node (`node --test tests/*.test.cjs`). El Mac mini lo
tiene; en un PC sin Node se puede sincronizar la copia de trabajo por SSH y
ejecutarlas allí.

El paquete público incluye solamente HTML, CSS, JavaScript y sprites usados.
No incluye pruebas, documentación, scripts del servidor ni credenciales.
Los cambios posteriores en `C:\Juego Arcade` necesitan una nueva publicación.
Las partidas y mejoras se guardan por navegador y dominio: el progreso de
localhost no se transfiere automáticamente al sitio público.
