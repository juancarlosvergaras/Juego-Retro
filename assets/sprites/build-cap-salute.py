"""Articula el saludo de Cap Dollar desde el fotograma de saludo de soldado-v2."""
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


HERE = Path(__file__).resolve().parent
atlas = (HERE.parent.parent / "soldier-v2-atlas.js").read_text(encoding="utf-8")
frames = json.loads(atlas.split("=", 1)[1].split(";", 1)[0])
x, y, w, h = frames[0][3]
source = Image.open(HERE / "soldado-v2.png").convert("RGBA")
salute = source.crop((x, y, x+w, y+h))
salute.putalpha(salute.getchannel("A").point(lambda v: 255 if v >= 200 else 0))
left_boot = salute.getchannel("A").crop((0, h-7, w, h)).getbbox()[0]
pose = Image.new("RGBA", (144, 160))
pose.paste(salute, (31-left_boot, 154-h))


def cut(outline):
    mask = Image.new("L", pose.size)
    ImageDraw.Draw(mask).polygon(outline, fill=255)
    part = pose.copy()
    part.putalpha(ImageChops.multiply(mask, pose.getchannel("A")))
    return part, mask


def rotate_joint(part, angle, pivot, target):
    cosine, sine = math.cos(angle), math.sin(angle)
    px, py = pivot
    tx, ty = target
    inverse = (cosine, sine, px-cosine*tx-sine*ty, -sine, cosine, py+sine*tx-cosine*ty)
    return part.transform(part.size, Image.Transform.AFFINE, inverse, Image.Resampling.NEAREST)


# El puño, el antebrazo y la manga son los píxeles originales del brazo lejano.
upper, sleeve = cut([(81,62),(88,56),(97,56),(103,60),(106,66),(103,72),(87,78),(82,78),(81,69)])
forearm, glove = cut([(94,24),(119,24),(119,74),(102,74),(96,69),(92,61),(93,47),(89,43),(90,38),(93,33)])
body = pose.copy()
body.putalpha(ImageChops.subtract(body.getchannel("A"), ImageChops.lighter(sleeve, glove)))
shoulder, elbow = (83, 69), (103, 64)
strip = Image.new("RGBA", (12*pose.width, pose.height))
for i in range(12):
    u = i / 11
    rest = 1-u*u*(3-2*u)
    angle = math.radians(97)*rest
    ex = shoulder[0]+20*math.cos(angle)+5*math.sin(angle)
    ey = shoulder[1]+20*math.sin(angle)-5*math.cos(angle)
    cell = rotate_joint(upper, angle, shoulder, shoulder)
    cell.alpha_composite(rotate_joint(forearm, math.radians(159)*rest**1.7, elbow, (ex, ey)))
    cell.alpha_composite(body)
    strip.paste(cell if i < 11 else pose, (i*pose.width, 0))
strip.save(HERE / "cine-cap-saludo-12.webp", lossless=True, method=6)
