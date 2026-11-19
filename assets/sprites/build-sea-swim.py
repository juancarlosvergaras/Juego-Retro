"""Bake and check eight alternating flutter kicks from the registered swimming artwork."""
import argparse
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT, FRAMES = 192, 128, 8
Y, X = np.mgrid[:HEIGHT, :WIDTH]
GRID = np.stack((X, Y), axis=-1)
# Hip on the body, then hip, knee, ankle and fin/boot tip on the isolated leg.
RIGS = [
    ("Soldado", (77, 77), [(71, 62), (52, 69), (31, 70), (10, 79)]),
    ("Lobo", (81, 77), [(71, 62), (52, 70), (31, 70), (10, 80)]),
    ("Zombi", (80, 81), [(70, 62), (51, 70), (31, 70), (10, 79)]),
    ("Robot", (84, 83), [(67, 62), (48, 68), (27, 71), (10, 80)]),
    ("Luchador", (80, 81), [(68, 62), (51, 70), (28, 71), (10, 80)]),
    ("Buzo enemigo", (78, 78), [(70, 62), (51, 70), (31, 70), (10, 80)]),
]


def pose_joints(hip, rest, frame, rear):
    # The far hip leads the near hip by half a cycle. The knee flexes towards the
    # swimmer's back; the ankle and the flexible fin follow the shin with a lag.
    phase = 2 * math.pi * (frame / FRAMES + (0.5 if rear else 0) + 0.10)
    thigh = 0.23 + 0.43 * math.sin(phase)
    flexion = 0.12 + 0.66 * (1 + math.cos(phase - 0.28)) / 2
    shin = thigh - flexion
    fin = shin + 0.16 + 0.27 * math.sin(phase - 0.92)
    joints = [np.asarray(hip, float) + ((4, -4) if rear else (0, 0))]
    lengths = np.linalg.norm(np.diff(rest, axis=0), axis=1)
    for length, angle in zip(lengths, (thigh, shin, fin)):
        direction = np.array([-math.cos(angle), math.sin(angle)])
        joints.append(joints[-1] + direction * length * (0.91 if rear else 1))
    return joints


def warp_leg(texture, rest, joints):
    # Map each posed bone back to the neutral drawing. Blend only around joints,
    # so the cloth, armor and boot stay on the same physical leg throughout.
    distances, maps = [], []
    for a, b, p, q in zip(rest, rest[1:], joints, joints[1:]):
        bone, source = q - p, b - a
        relative = GRID - p
        u = (relative @ bone) / (bone @ bone)
        normal = np.array([-bone[1], bone[0]])
        v = (relative @ normal) / (bone @ bone)
        near = relative - np.clip(u, 0, 1)[:, :, None] * bone
        distances.append(np.sum(near * near, axis=2))
        maps.append(a + u[:, :, None] * source +
                    v[:, :, None] * np.array([-source[1], source[0]]))
    dist = np.array(distances)
    weights = np.exp(-(dist - dist.min(axis=0)) / 16)
    uv = np.sum(np.array(maps) * weights[:, :, :, None], axis=0) / weights.sum(axis=0)[:, :, None]
    x, y = uv[:, :, 0].clip(0, WIDTH - 1.001), uv[:, :, 1].clip(0, HEIGHT - 1.001)
    ix, iy = x.astype(int), y.astype(int)
    dx, dy = (x - ix)[:, :, None], (y - iy)[:, :, None]
    rgba = ((1 - dy) * ((1 - dx) * texture[iy, ix] + dx * texture[iy, ix + 1]) +
            dy * ((1 - dx) * texture[iy + 1, ix] + dx * texture[iy + 1, ix + 1]))
    layer = Image.fromarray(rgba.round().clip(0, 255).astype('uint8'), 'RGBa').convert('RGBA')
    # Track actual opaque pixels of the same fin tip, independently of painter's order.
    tip = (rgba[:, :, 3] >= 128) & (np.linalg.norm(uv - rest[-1], axis=2) < 9)
    return layer, tip


def wolf_tail(body):
    # The tail emerges above the hips, behind both legs. Preserve a two-pixel
    # overlap at the root so the raised heel can pass in front of the fur.
    tail = body.copy()
    tail.paste((0, 0, 0, 0), (75, 0, WIDTH, HEIGHT))
    body.paste((0, 0, 0, 0), (0, 0, 73, HEIGHT))
    return tail


def tail_pose(tail, frame):
    result = Image.new('RGBA', (WIDTH, HEIGHT))
    lift = 5 + 2.5 * math.sin(frame * math.tau / FRAMES)
    for x in range(75):
        offset = round(lift * min(1, (75 - x) / 46) ** 1.3)
        result.paste(tail.crop((x, 0, x + 1, HEIGHT)), (x, -offset))
    return result


def near_leg_texture(leg, ankle):
    # A lit ankle fastening follows the near boot. It identifies that leg even
    # in side view when the two otherwise similar black fins trade places.
    pixels = np.array(leg, dtype=np.float32)
    pixels[:, :, :3] = np.minimum(255, pixels[:, :, :3] * 1.18)
    x, y = map(int, ankle)
    cuff = Image.new('L', leg.size)
    draw = ImageDraw.Draw(cuff)
    draw.polygon([(x-4,y-5),(x-1,y-6),(x+3,y+3),(x,y+5)], fill=175)
    draw.line([(x-1,y-5),(x+2,y+2)], fill=235, width=2)
    mask = np.array(cuff, dtype=float)[:, :, None] / 255
    pixels[:, :, :3] = pixels[:, :, :3]*(1-mask) + np.array([158, 151, 110])*mask
    return np.array(Image.fromarray(pixels.astype('uint8'), 'RGBA').convert('RGBa'), dtype=float)


def opaque(layer):
    return np.array(layer.getchannel('A')) >= 128


def connected(mask):
    ys, xs = np.where(mask)
    binary = Image.fromarray(np.where(mask, 255, 0).astype('uint8')).copy()
    # The middle row of material avoids selecting a one-pixel antialiasing fleck.
    ImageDraw.floodfill(binary, (int(xs[len(xs)//2]), int(ys[len(ys)//2])), 127)
    return np.count_nonzero(np.array(binary) == 127) / mask.sum()


def build():
    parts = Image.open(ROOT / 'piezas-patada-abismo.webp').convert('RGBA')
    sheet = Image.new('RGBA', (WIDTH * FRAMES, HEIGHT * len(RIGS)))
    review = []
    for row, (name, hip, coords) in enumerate(RIGS):
        y = row * HEIGHT
        torso = parts.crop((0, y, WIDTH, y + HEIGHT))
        tail = wolf_tail(torso) if name == 'Lobo' else None
        leg = parts.crop((WIDTH, y, WIDTH * 2, y + HEIGHT))
        front = near_leg_texture(leg, coords[2])
        back = np.array(leg.convert('RGBa'), dtype=float)
        back[:, :, :3] *= [0.50, 0.62, 0.72]
        rest = np.array(coords, dtype=float)
        tracks, poses = [[], []], []
        for frame in range(FRAMES):
            layers, tips = [], []
            for rear, texture in enumerate((front, back)):
                joints = pose_joints(hip, rest, frame, rear)
                layer, tip = warp_leg(texture, rest, joints)
                assert tip.sum() > 14 and connected(opaque(layer)) > .985, (name, frame, 'leg')
                tracks[rear].append(np.where(tip)[0].mean())
                layers.append(layer)
                tips.append(tip)
            near, far = layers
            backdrop = tail_pose(tail, frame) if tail else Image.new('RGBA', (WIDTH, HEIGHT))
            final = backdrop.copy()
            final.alpha_composite(far)
            final.alpha_composite(near)
            final.alpha_composite(torso)
            silhouette = opaque(final)
            assert connected(silhouette) > .97, (name, frame, 'detached limb')
            assert not (silhouette[0].any() or silhouette[-1].any() or
                        silhouette[:, 0].any() or silhouette[:, -1].any()), (name, frame, 'clipped')
            # At separated kick extremes, both feet must survive final compositing.
            if abs(tracks[0][-1] - tracks[1][-1]) > 16:
                assert (tips[1] & ~opaque(near) & ~opaque(torso)).sum() > tips[1].sum() * .65
                assert (tips[0] & ~opaque(torso)).sum() > tips[0].sum() * .8
            sheet.paste(final, (frame * WIDTH, y))
            backdrop.alpha_composite(torso)
            poses.append((final, near, far, backdrop))
        for track in tracks:
            heights = np.array(track)
            assert np.ptp(heights) > 34, (name, 'stationary fin', track)
            steps = abs(np.roll(heights, -1) - heights)
            assert steps.min() > 3 and steps.max() < .49 * np.ptp(heights), (name, 'seam', steps)
        assert np.corrcoef(*tracks)[0, 1] < -.96, (name, 'in-phase kick')
        assert len({p[0].tobytes() for p in poses}) == FRAMES
        print(f'{name}: near/far fin travel {np.ptp(tracks[0]):.1f}/{np.ptp(tracks[1]):.1f} px')
        review.append(poses)
    return sheet, review


def write_preview(path, review):
    """Normal composite and both isolated leg layers, at an identical scale and pivot."""
    frames = []
    font = ImageFont.load_default(size=14)
    for i in range(FRAMES):
        canvas = Image.new('RGB', (3 * 216, 42 + len(RIGS) * 103), '#112735')
        draw = ImageDraw.Draw(canvas)
        for col, title in enumerate(('Nado en el juego', 'Pierna cercana', 'Pierna del fondo')):
            draw.text((col * 216 + 108, 18), title, fill='#dfefed', font=font, anchor='mm')
        for row, poses in enumerate(review):
            final, near, far, torso = poses[i]
            for col, im in enumerate((final, near, far)):
                x, y = col * 216, 39 + row * 103
                draw.rectangle((x + 2, y + 1, x + 213, y + 99), fill='#193849')
                if col:
                    outline = torso.copy()
                    outline.putalpha(outline.getchannel('A').point(lambda n: n // 5))
                    im = im.copy()
                    im.alpha_composite(outline)
                crop = im.crop((0, 7, WIDTH, 122))
                crop.thumbnail((158, 85), Image.Resampling.NEAREST)
                canvas.paste(crop, (x + (216 - crop.width)//2, y + 7), crop)
                if not col:
                    draw.text((x + 6, y + 88), RIGS[row][0], font=font, fill='#a5c5cf')
        frames.append(canvas)
    frames[0].save(path, save_all=True, append_images=frames[1:], duration=115, loop=0, lossless=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview', type=Path, help='animated WebP showing each leg separately')
    parser.add_argument('--check', action='store_true', help='compare the shipped cels to the rig')
    args = parser.parse_args()
    result, review = build()
    path = ROOT / 'nadadores-abismo-8.webp'
    if args.check:
        actual = Image.open(path).convert('RGBA').convert('RGBa')
        assert actual.size == result.size and actual.tobytes() == result.convert('RGBa').tobytes()
    else:
        result.save(path, lossless=True, method=6, exact=True)
    if args.preview:
        write_preview(args.preview, review)
