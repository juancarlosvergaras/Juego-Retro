"""Read-only alpha component measurements for the boss animation strips."""
from PIL import Image
from collections import deque
from pathlib import Path
import json

for path in sorted(Path('assets/sprites').glob('rey-zombi-*-v4.png')):
    im = Image.open(path)
    w, h = im.size
    mask = bytearray(1 if a >= 200 else 0 for a in im.getchannel('A').getdata())
    parts = []
    for start in range(w*h):
        if not mask[start]:
            continue
        mask[start] = 0
        queue = deque([start])
        l = r = start % w
        t = b = start // w
        count = 0
        while queue:
            p = queue.popleft()
            x, y = p % w, p // w
            l, r, t, b = min(l,x), max(r,x), min(t,y), max(b,y)
            count += 1
            for q in (p-1 if x else -1, p+1 if x<w-1 else -1, p-w, p+w):
                if 0 <= q < w*h and mask[q]:
                    mask[q] = 0
                    queue.append(q)
        if count > 2000:
            parts.append([l,t,r-l+1,b-t+1,count])
    print(path.name, im.size, json.dumps(sorted(parts)))
