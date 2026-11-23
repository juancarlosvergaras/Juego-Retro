"""Prepara las seis siluetas de cada tira del rey usando la conectividad del juego."""
import hashlib
import io
import json
import re

from PIL import Image, ImageDraw


def pack_strip(source, cache):
    digest = hashlib.sha256(source).hexdigest()
    art = cache / (digest + '-king-v1.webp')
    layout = art.with_suffix('.json')
    if art.exists() and layout.exists():
        return art.read_bytes(), json.loads(layout.read_text())

    image = Image.open(io.BytesIO(source)).convert('RGBA')
    alpha = image.getchannel('A').point(lambda a: 255 if a >= 200 else 0).tobytes()
    width, height = image.size
    # Une las carreras horizontales que se tocan en dos filas consecutivas.
    parents, runs, previous = [], [], []

    def group(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i

    for y in range(height):
        current = []
        j = 0
        for match in re.finditer(b'\xff+', alpha[y*width:(y+1)*width]):
            left, right = match.span()
            i = len(parents)
            parents.append(i)
            runs.append((left, right, y))
            while j < len(previous) and runs[previous[j]][1] <= left:
                j += 1
            k = j
            while k < len(previous) and runs[previous[k]][0] < right:
                parents[group(previous[k])] = group(i)
                k += 1
            current.append(i)
        previous = current

    components = {}
    for i, run in enumerate(runs):
        components.setdefault(group(i), []).append(run)
    masks = []
    for spans in components.values():
        if sum(right-left for left,right,_ in spans) < 2000:
            continue
        left = min(s[0] for s in spans)
        right = max(s[1] for s in spans)
        top, bottom = spans[0][2], spans[-1][2]+1
        crop = image.crop((left, top, right, bottom))
        mask = Image.new('1', crop.size)
        draw = ImageDraw.Draw(mask)
        for x1,x2,y in spans:
            draw.line((x1-left,y-top,x2-left-1,y-top),fill=1)
        masks.append((left, top, crop, mask))
    if len(masks) != 6:
        raise ValueError(f'El rey necesita seis poses por tira, se encontraron {len(masks)}')
    masks.sort(key=lambda item: item[0])
    packed = Image.new('RGBA', (sum(c.width for _,_,c,_ in masks), max(c.height for _,_,c,_ in masks)))
    frames, x = [], 0
    for left,top,crop,mask in masks:
        packed.paste(crop, (x,0), mask)
        frames.append([x,left,top,crop.width,crop.height])
        x += crop.width
    data = io.BytesIO()
    packed.save(data, 'WEBP', lossless=True, method=4)
    info = {'width': width, 'frames': frames}
    cache.mkdir(parents=True, exist_ok=True)
    # Ambos archivos son deterministas; evita reutilizar una pareja incompleta.
    import os
    for target, payload in ((art,data.getvalue()),(layout,json.dumps(info).encode())):
        partial = target.with_suffix('.tmp'+str(os.getpid()))
        partial.write_bytes(payload)
        partial.replace(target)
    return data.getvalue(), info
