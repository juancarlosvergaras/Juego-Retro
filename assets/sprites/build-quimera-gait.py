"""Build the district's continuous ground gait from the game's registered stance cells."""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).parent
PHASES, STRENGTHS = 32, 9
# At the soles: ankle centres (back/front), inner seam, hip height, step length.
# The optional polygons keep equipment and hands above the moving legs.
RIGS = {
    'fighter':  (35, 65, 54, 63, 36, []),
    'knife':    (37, 65, 54, 66, 33, [[(65,52),(81,49),(80,68),(65,69)]]),
    'rifle':    (30, 55, 46, 64, 30, [[(21,56),(31,57),(31,70),(22,73)]]),
    'warden':   (23, 58, 45, 63, 32, [[(65,44),(79,45),(79,74),(66,74)]]),
    'infected': (40, 61, 53, 69, 25, [[(32,50),(42,55),(48,70),(45,74),(33,73)],[(57,48),(71,51),(77,71),(62,73)]]),
    'robot':    (37, 60, 53, 63, 28, []),
}
WIDTH, HEIGHT = 96, 90
LEFT, TOP = 6, 5
Y, X = np.mgrid[0:98, 0:120].astype(np.float32)


def smooth(t):
    t = np.clip(t, 0, 1)
    return t*t*(3-2*t)


def foot(phase, span):
    # The planted sole rolls back at constant speed. The airborne foot leaves
    # and meets the ground at that same velocity, including the loop seam.
    support = .5
    if phase < support:
        return span*(.5-phase/support), 0
    t = (phase-support)/(1-support)
    return span*(-.5 + 2*smooth(t)-t), math.sin(math.pi*t)**2


def warp(layer, sx, sy):
    # Premultiplied bilinear sampling retains thin outlines at fractional poses.
    ix = np.clip(sx, 0, 118.999)
    iy = np.clip(sy, 0, 96.999)
    x0, y0 = ix.astype(int), iy.astype(int)
    u, v = (ix-x0)[:,:,None], (iy-y0)[:,:,None]
    pix = (1-v)*((1-u)*layer[y0,x0]+u*layer[y0,x0+1]) + v*((1-u)*layer[y0+1,x0]+u*layer[y0+1,x0+1])
    return Image.fromarray(np.uint8(np.clip(np.rint(pix),0,255)), 'RGBa').convert('RGBA')


def bone_map(a, b, c, d):
    """Map from destination bone c--d back to the source bone a--b."""
    sx, sy = b[0]-a[0], b[1]-a[1]
    tx, ty = d[0]-c[0], d[1]-c[1]
    dest_len = math.hypot(tx,ty)
    src_len = math.hypot(sx,sy)
    u = ((X-c[0])*tx+(Y-c[1])*ty)/(dest_len*dest_len)
    v = ((Y-c[1])*tx-(X-c[0])*ty)/dest_len
    return a[0]+u*sx-v*sy/src_len, a[1]+u*sy+v*sx/src_len


def leg_warp(layer, ankle, hip, seam, side, phase, strength, span, bob):
    direction = 1 if side == 0 else -1
    a = (seam+5*direction,hip)
    knee_y = round((hip+84)/2)
    knee_pixels = np.where(layer[knee_y,:,3]>125)[0]
    b = (knee_pixels.mean(),knee_y)
    c = (ankle,84)
    reach, lift = foot(phase,span)
    end = (ankle+strength*(seam-3+direction*5+reach-ankle),84-7*lift*strength)
    root = (a[0]+strength*reach*.09,hip+bob)
    dx, dy = end[0]-root[0], end[1]-root[1]
    distance = math.hypot(dx,dy)
    thigh,shin = math.dist(a,b),math.dist(b,c)
    # Fold toward the facing direction while keeping both bone lengths.
    along = np.clip((thigh**2-shin**2+distance**2)/(2*distance),0,distance)
    bend = math.sqrt(max(0,thigh**2-along**2))
    knee = (root[0]+(along*dx+bend*dy)/distance,root[1]+(along*dy-bend*dx)/distance)
    # At rest retain the source illustrator's knee position exactly.
    knee = (b[0]+strength*(knee[0]-b[0]),b[1]+strength*(knee[1]-b[1]))
    thigh_x,thigh_y = bone_map(a,b,root,knee)
    shin_x,shin_y = bone_map(b,c,knee,end)
    roll = .24*math.sin(2*math.pi*(phase-.5)/.5)*strength if phase>.5 else 0
    toe = (end[0]+10*math.cos(roll),end[1]+10*math.sin(roll))
    boot_x,boot_y = bone_map(c,(ankle+10,84),end,toe)
    # Blend in small rings around each joint, following the inclination of the leg.
    knee_mix = smooth((((X-knee[0])*dx+(Y-knee[1])*dy)/distance+4)/8)
    boot_mix = smooth((Y-end[1]+3)/6)
    hip_mix = smooth((Y-root[1]+1)/6)
    x = X+(thigh_x-X)*hip_mix
    y = Y-bob+(thigh_y-Y+bob)*hip_mix
    x += (shin_x-x)*knee_mix
    y += (shin_y-y)*knee_mix
    return warp(layer,x+(boot_x-x)*boot_mix,y+(boot_y-y)*boot_mix)


def gait(kind, rig, stance=None):
    rear, front, seam, hip, span, equipment = rig
    if stance is None:
        with Image.open(ROOT/f'quimera-{kind}.png') as sheet:
            stance = sheet.crop((0,0,120,98)).convert('RGBA')
    keep = Image.new('1', stance.size)
    for polygon in equipment:
        ImageDraw.Draw(keep).polygon(polygon, fill=1)
    low = (Y >= hip) & ~np.asarray(keep)
    pixels = np.asarray(stance.convert('RGBa'), dtype=np.float32)
    # A one-pixel underlap at the belt covers the seam during weight transfer.
    torso = pixels * ((~low)|(Y <= hip))[:,:,None]
    legs = [pixels*(low & mask)[:,:,None] for mask in [X>=seam,X<seam]]
    atlas = Image.new('RGBA',(WIDTH*PHASES,HEIGHT*STRENGTHS))
    for row in range(STRENGTHS):
        strength = row/(STRENGTHS-1)
        for i in range(PHASES):
            phase = i/PHASES
            wave = math.sin(2*math.pi*phase)
            bob = -1.6*strength*wave**2
            pose = Image.new('RGBA',stance.size)
            for side,(layer,ankle,offset) in enumerate(zip(legs,[front,rear],[0,.5])):
                pose.alpha_composite(leg_warp(layer,ankle,hip,seam,side,(phase+offset)%1,strength,span,bob))
            upper = np.clip((hip-Y)/38,0,1)
            breathe = (1-strength)*.65*math.sin(phase*2*math.pi)
            # Guarded shoulders turn against the planted leg. The skull keeps its shape.
            sway = strength*.85*wave
            counter = np.zeros_like(Y)
            if kind == 'fighter':
                # Small opposing forearm swings retain the raised boxing guard.
                arms = np.exp(-((Y-51)/8)**2)
                counter = 2.4*wave*strength*arms*np.tanh((X-54)/7)
            pose.alpha_composite(warp(torso,X-upper*sway-counter,Y-bob-upper*breathe))
            atlas.paste(pose.crop((LEFT,TOP,LEFT+WIDTH,TOP+HEIGHT)),(i*WIDTH,row*HEIGHT))
    # Share one palette across every frame so fine outlines retain their colour
    # around the seam while the browser downloads one compact strip per actor.
    atlas = atlas.quantize(colors=256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE)
    atlas.convert('RGBA').save(ROOT/f'quimera-pasos-{kind}.webp',lossless=True,method=4)


if __name__ == '__main__':
    for name, rig in RIGS.items():
        gait(name,rig)
    with Image.open(ROOT/'quimera-armados-claves.webp') as keys:
        for row, name in enumerate(('batter','foreman','capBat','capAlloy','capRifle','capPistol')):
            stance = keys.crop((0,row*98,120,(row+1)*98)).convert('RGBA')
            gait(name,(36,66,53,66,34 if row<2 else 36,[]),stance)
