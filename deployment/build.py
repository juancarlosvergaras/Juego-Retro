"""Empaqueta el juego para publicarlo (Python 3 + Pillow).

Sustituye a build.cjs cuando se quiere el paquete optimizado:

* Incluye solo lo que el navegador necesita, igual que build.cjs.
* Convierte los PNG a WebP (los PNG fuente no se modifican).
* Da a imágenes, JS y CSS un nombre con el hash de su contenido, para que el
  servidor pueda servirlos como inmutables (ver install.py).
* Reescribe las referencias en HTML, CSS y JS.

Uso:  python deployment/build.py            -> deployment/packages/<id>/
      python deployment/build.py --check    -> solo lista dependencias
"""
import hashlib
import io
import json
import os
import re
import sys
import tarfile
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path(__file__).resolve().parent / 'cache'
ENTRY = 'index.html'
HTML_REF = re.compile(r'''(?:src|href)=["']([^"'?#]+\.(?:js|css|html|png|webp|jpg|webmanifest))(?:[?#][^"']*)?["']''')
ASSET_REF = re.compile(r'''["'](assets/[^"']+\.(?:png|webp|jpg|ogg|mp3|wav))["']''')
PAGE_REF = re.compile(r'''["']([a-z0-9-]+\.html)(?:[?#][^"']*)?["']''')
# Rutas que quimera.js construye en tiempo de ejecución (characterSprites).
DYNAMIC = ['assets/sprites/quimera-*.png', 'assets/sprites/quimera-pasos-*.webp']
# La obra y el convoy usan el color para construir máscaras durante el juego.
# Los panoramas y las hojas recortadas por alfa conservan resolución y alfa.
LOSSLESS = {'assets/worlds/mundo-01-edificio-v1.png', 'assets/sprites/jefe-convoy-v3.png'}
# Estas hojas siempre pasan por prepareWhiteDeath en sus consumidores.
CUTOUT = {f'assets/sprites/{name}.png' for name in (
    'transformacion-energia-v1', 'enemigos-estilo-soldado-v2', 'poder-alien-v1',
    'mini-tanque-submarino-v1', 'robot-movilidad-v2', 'ataques-jefes-v1', 'armamento-jefes-v1')}
KING_STRIPS = {f'assets/sprites/rey-zombi-{action}-v4.png'
               for action in ('marcha','plasma','salto','garras','derrota')}
QUALITY = 82


def sha(data):
    return hashlib.sha256(data).hexdigest()


def clean(ref):
    ref = ref[2:] if ref.startswith('./') else ref
    if '..' in ref or ref.startswith('/') or ':' in ref:
        raise SystemExit('Dependencia no segura: ' + ref)
    return ref


def crawl():
    files, pending = [ENTRY], [ENTRY]
    def add(ref):
        ref = clean(ref)
        if ref not in files:
            files.append(ref)
            if re.search(r'\.(?:js|css|html|webmanifest)$', ref):
                pending.append(ref)
    while pending:
        name = pending.pop(0)
        text = (ROOT / name).read_text(encoding='utf-8')
        if name.endswith('.html'):
            for match in HTML_REF.finditer(text):
                add(match.group(1))
        elif name.endswith('.webmanifest'):
            for icon in json.loads(text).get('icons', []):
                add(icon['src'])
        else:
            for match in ASSET_REF.finditer(text):
                add(match.group(1))
            # El menú único enlaza las misiones desde JS (menu-shell.js, mission-map.js).
            for match in PAGE_REF.finditer(text) if name.endswith('.js') else ():
                if (ROOT / match.group(1)).is_file():
                    add(match.group(1))
        if name == 'quimera.js':
            for pattern in DYNAMIC:
                for path in sorted(ROOT.glob(pattern)):
                    add(path.relative_to(ROOT).as_posix())
    return sorted(files)


def cache_path(name, data):
    lossless = name in LOSSLESS
    return CACHE / (sha(data) + ('-cutout' if name in CUTOUT else '') + ('-ll' if lossless else '-q%d' % QUALITY) + '.webp'), lossless


def convert(name):
    """Convierte un PNG a WebP en la caché (se ejecuta en varios procesos)."""
    data = (ROOT / name).read_bytes()
    cached, lossless = cache_path(name, data)
    if cached.exists():
        return name
    from PIL import Image
    image = Image.open(io.BytesIO(data))
    if image.mode not in ('RGB', 'RGBA'):
        image = image.convert('RGBA' if 'A' in image.getbands() or 'transparency' in image.info else 'RGB')
    if name in CUTOUT:
        image = image.convert('RGBA')
        image.putalpha(image.getchannel('A').point(lambda a: 255 if a >= 200 else 0))
    buffer = io.BytesIO()
    if lossless:
        image.save(buffer, 'WEBP', lossless=True, quality=80, method=4, exact=True)
    else:
        image.save(buffer, 'WEBP', quality=QUALITY, alpha_quality=100, method=4)
    CACHE.mkdir(parents=True, exist_ok=True)
    partial = cached.with_suffix('.tmp%d' % os.getpid())
    partial.write_bytes(buffer.getvalue())
    partial.replace(cached)
    return name


def to_webp(name, data):
    """PNG -> WebP. Devuelve (extensión, bytes); conserva el PNG si no mejora."""
    cached, _ = cache_path(name, data)
    if not cached.exists():
        convert(name)
    out = cached.read_bytes()
    return ('webp', out) if len(out) < len(data) or name in CUTOUT else ('png', data)


def hashed(name, data, ext=None):
    stem, _, old = name.rpartition('.')
    return '%s.%s.%s' % (stem, sha(data)[:16], ext or old)


def build(check=False):
    files = crawl()
    if check:
        print(json.dumps({'count': len(files)}))
        return
    from king_strips import pack_strip
    published, output, king_frames = {}, {}, {}
    # Las conversiones pendientes se reparten entre los núcleos disponibles.
    pngs = [n for n in files if n.startswith('assets/') and n.endswith('.png') and n not in KING_STRIPS]
    with ProcessPoolExecutor(max_workers=max(1, (os.cpu_count() or 2) - 1)) as pool:
        for done, _ in enumerate(pool.map(convert, pngs), 1):
            if done % 20 == 0 or done == len(pngs):
                print('WebP %d / %d' % (done, len(pngs)), file=sys.stderr, flush=True)
    # 1. Imágenes y audio: contenido final y nombre con hash.
    for name in files:
        if not name.startswith(('assets/', 'icons/')):
            continue
        data = (ROOT / name).read_bytes()
        ext = None
        if name in KING_STRIPS:
            data, frames = pack_strip(data, CACHE)
            ext = 'webp'
        elif name.startswith('assets/') and name.endswith('.png'):
            ext, data = to_webp(name, data)
        target = name if name.startswith('icons/') else hashed(name.replace('.png', '.cutout.png') if name in CUTOUT else name, data, ext)
        published[name], output[name] = target, data
        if name in KING_STRIPS:
            king_frames[Path(target).name] = frames
    assets = sorted((n for n in published if n.startswith('assets/')), key=len, reverse=True)
    quoted = re.compile('|'.join(re.escape(n) for n in assets)) if assets else None
    def rewrite_assets(text):
        return quoted.sub(lambda m: published[m.group(0)], text) if quoted else text
    # 2. JS y CSS: referencias a imágenes reescritas y nombre con hash.
    dynamic = {}
    for pattern in DYNAMIC:
        for path in sorted(ROOT.glob(pattern)):
            name = path.relative_to(ROOT).as_posix()
            if name in published:
                dynamic[name] = published[name]
    for name in files:
        if not name.endswith(('.js', '.css')):
            continue
        text = rewrite_assets((ROOT / name).read_text(encoding='utf-8'))
        if name == 'mausoleum-king.js':
            text = 'window.ArcadeKingStrips=%s;\n%s' % (json.dumps(king_frames, separators=(',', ':')), text)
        if name == 'quimera.js':
            # Las rutas dinámicas se resuelven con un mapa incrustado.
            text = 'window.ARCADE_ASSETS=Object.assign(window.ARCADE_ASSETS||{},%s);\n%s' % (json.dumps(dynamic, sort_keys=True), text)
        data = text.encode('utf-8')
        published[name], output[name] = hashed(name, data), data
    # 3. HTML y manifiesto: nombres estables que apuntan a los archivos con hash.
    def html_ref(match):
        prefix, ref, query, suffix = match.group(1), match.group(2), match.group(3) or '', match.group(4)
        key = ref[2:] if ref.startswith('./') else ref
        return prefix + published.get(key, ref) + query + suffix
    for name in files:
        if name.endswith('.html'):
            text = (ROOT / name).read_text(encoding='utf-8')
            text = re.sub(r'''((?:src|href)=["'])([^"'?#]+)([?#][^"']*)?(["'])''', html_ref, text)
            published[name], output[name] = name, rewrite_assets(text).encode('utf-8')
        elif name.endswith('.webmanifest'):
            published[name], output[name] = name, (ROOT / name).read_bytes()
    missing = [n for n in files if n not in published]
    if missing:
        raise SystemExit('Sin publicar: ' + ', '.join(missing))
    release = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    package = Path(__file__).resolve().parent / 'packages' / release
    public = package / 'public'
    manifest = {'id': release, 'domain': 'juego.proyectoia.org', 'files': []}
    for name in sorted(files):
        target = public / published[name]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(output[name])
        manifest['files'].append({'path': published[name], 'source': name, 'bytes': len(output[name]), 'sha256': sha(output[name])})
    (package / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    with tarfile.open(package / 'release.tar.gz', 'w:gz', compresslevel=1) as tar:
        tar.add(public, arcname='public')
        tar.add(package / 'manifest.json', arcname='manifest.json')
    source_bytes = sum((ROOT / n).stat().st_size for n in files)
    print(json.dumps({'id': release, 'output': str(package), 'count': len(files),
                      'bytes': sum(f['bytes'] for f in manifest['files']), 'source_bytes': source_bytes}))


if __name__ == '__main__':
    build(check='--check' in sys.argv)
