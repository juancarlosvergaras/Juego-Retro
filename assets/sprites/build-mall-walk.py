"""Bake a registered walking cycle for the two shoppers from their original standing artwork."""
from pathlib import Path
import math

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
SIZE, FRAMES, STRIDE = 80, 24, 40
Y, X = np.mgrid[:SIZE, :SIZE]
# The closest leg and arm are on the left of both source drawings.
RIGS = [
    dict(row=0, hip=46, seam=[41,40,38,38,39], ankles=[33,42],
         arms=[[(35,34),(32,44),(33,52)],[(43,35),(46,45),(48,53)]],
         arm_edges=[[(32,34),(37,35),(37,39),(35,44),(35,48),(38,51),(37,55),(32,57),(28,55),(27,42)],
                    [(44,37),(47,38),(52,52),(50,58),(46,58),(44,53),(45,47)]]),
    dict(row=3, hip=46, seam=[42,41,38,37,39], ankles=[32,42],
         arms=[[(32,34),(29,43),(32,52)],[(44,35),(47,43),(49,52)]],
         arm_edges=[[(29,33),(35,34),(36,37),(35,42),(34,44),(34,48),(37,51),(36,55),(29,56),(26,53),(25,40)],
                    [(45,36),(50,38),(53,51),(51,56),(46,55),(46,49),(45,44)]])
]


def polygon(points):
    mask = Image.new('1', (SIZE, SIZE))
    ImageDraw.Draw(mask).polygon(points, fill=1)
    return np.asarray(mask)


def sample(layer, x, y):
    # Work in premultiplied alpha so moving a dark outline never leaves a fringe.
    x, y = np.clip(x, 0, SIZE-1.001), np.clip(y, 0, SIZE-1.001)
    ix, iy = x.astype(int), y.astype(int)
    u, v = (x-ix)[...,None], (y-iy)[...,None]
    pixels = (1-v)*((1-u)*layer[iy,ix]+u*layer[iy,ix+1])+v*((1-u)*layer[iy+1,ix]+u*layer[iy+1,ix+1])
    return Image.fromarray(pixels.round().astype('uint8'), 'RGBa').convert('RGBA')


def bone_map(start, end, moved_start, moved_end):
    source, moved = end-start, moved_end-moved_start
    dx, dy = X-moved_start[0], Y-moved_start[1]
    u = (dx*moved[0]+dy*moved[1])/np.dot(moved,moved)
    v = (dy*moved[0]-dx*moved[1])/(np.linalg.norm(moved)*np.linalg.norm(source))
    return start[0]+u*source[0]-v*source[1], start[1]+u*source[1]+v*source[0]


def limb(layer, joints, pose):
    # Each bone moves only its own painted pixels. Overlap at the hinge keeps
    # the knee connected even when the shin folds back across the planted leg.
    result=Image.new('RGBA',(SIZE,SIZE))
    for i in range(len(joints)-1):
        lo=joints[i][1]-2 if i else 0
        hi=joints[i+1][1]+2 if i<len(joints)-2 else SIZE
        part=layer*((Y>=lo)&(Y<=hi))[...,None]
        sx,sy=bone_map(joints[i],joints[i+1],pose[i],pose[i+1])
        result.alpha_composite(sample(part,sx,sy))
    return result


def leg_pose(joints, phase, bob):
    # Half a cycle in contact. Its backward motion cancels the actor's forward travel.
    if phase < .5:
        offset=STRIDE*(.25-phase)
        lift=0
    else:
        t=2*phase-1
        offset=STRIDE*(-.25 + (3*t*t-2*t*t*t) - .5*t)
        lift=6*math.sin(math.pi*t)**2
    hip,knee,ankle,toe=joints
    a=hip+[0,bob]
    b=np.array([38+offset,ankle[1]-lift])
    d=b-a
    length=np.linalg.norm(d)
    thigh,shin=np.linalg.norm(knee-hip),np.linalg.norm(ankle-knee)
    along=min(length,(thigh*thigh-shin*shin+length*length)/(2*length))
    bend=math.sqrt(max(0,thigh*thigh-along*along))
    k=a+(along*d+bend*np.array([d[1],-d[0]]))/length
    angle=.20*math.sin((phase-.5)*4*math.pi) if phase>.5 else 0
    return [a,k,b,b+(toe[0]-ankle[0])*np.array([math.cos(angle),math.sin(angle)])]


def bake(image, rig):
    pixels=np.asarray(image.convert('RGBa'),dtype=float)
    arms=[polygon(points) for points in rig['arm_edges']]
    arm_mask=arms[0]|arms[1]
    hip=rig['hip']
    split=np.interp(Y,[hip,54,62,68,74],rig['seam'])
    pants=pixels*(~arm_mask)[...,None]
    # Recover the cloth hidden behind the nearest resting hand before it swings.
    for y in range(hip,58):
        for x in range(31,46):
            if arm_mask[y,x]:
                pants[y,x]=pixels[58,min(44,max(33,x))]
    legs=[pants*((Y>=hip)&where)[...,None] for where in (X<split,X>=split)]
    legs[1][:,:,:3]*=.84
    torso=pixels*((Y<=hip+2)&~arm_mask)[...,None]
    for y in range(34,hip+2):
        for x in range(31,46):
            if arm_mask[y,x]:
                torso[y,x]=pixels[y,38 if x<38 else 43]
    arm_joints=[np.array(j,float) for j in rig['arms']]
    arm_layers=[pixels*mask[...,None] for mask in arms]
    leg_joints=[np.array([(36+3*i,hip),(ankle+1,57),(ankle,66),(ankle+7,66)],float)
                for i,ankle in enumerate(rig['ankles'])]
    poses=[]
    soles=[[],[]]
    for f in range(FRAMES):
        phase=f/FRAMES
        bob=-1.1*math.sin(2*math.pi*phase)**2
        result=Image.new('RGBA',(SIZE,SIZE))
        swing=math.cos(phase*2*math.pi)
        def arm(i):
            a,b,c=arm_joints[i]
            direction=(1 if i else -1)*swing
            pose=[a+[0,bob],b+[2.8*direction,bob-.5],c+[6.0*direction,bob-1-1.2*max(0,direction)]]
            return limb(arm_layers[i],arm_joints[i],pose)
        result.alpha_composite(arm(1))
        for i in (1,0):
            pose=leg_pose(leg_joints[i],(phase+i*.5)%1,bob)
            leg=limb(legs[i],leg_joints[i],pose)
            visible=np.asarray(leg.getchannel('A'))>=145
            bottom=np.where(visible)[0].max()
            sole_x=np.where(visible[bottom-1:bottom+1].any(axis=0))[0].mean()
            soles[i].append((sole_x,bottom))
            result.alpha_composite(leg)
        result.alpha_composite(sample(torso,X,Y-bob))
        result.alpha_composite(arm(0))
        poses.append(result)
    # Measure the painted soles separately, including the far shoe when occluded.
    for i,track in enumerate(soles):
        xs,ys=np.asarray(track).T
        start=i*FRAMES//2
        planted=xs[start:start+FRAMES//2]+np.arange(FRAMES//2)*STRIDE/FRAMES
        assert np.ptp(planted)<1 and np.ptp(ys)>=5, 'sliding or stationary foot'
    separation=np.asarray(soles[0])[:,0]-np.asarray(soles[1])[:,0]
    assert separation[0]>16 and separation[FRAMES//2]<-16, 'legs do not alternate'
    for pose in poses:
        mask=pose.getchannel('A').point(lambda v:255 if v>=145 else 0)
        count=np.count_nonzero(mask)
        ImageDraw.floodfill(mask,(40,20),127)
        assert np.count_nonzero(np.asarray(mask)==127)>.995*count, 'detached limb'
    return poses


def main():
    source=Image.open(ROOT/'compradores-centro.webp')
    sheet=Image.new('RGBA',(SIZE*FRAMES,SIZE*2))
    for i,rig in enumerate(RIGS):
        y=SIZE*rig['row']
        for f,image in enumerate(bake(source.crop((0,y,SIZE,y+SIZE)),rig)):
            sheet.paste(image,(SIZE*f,SIZE*i))
    sheet.save(ROOT/'pasos-compradores-centro.webp',lossless=True,method=6)


if __name__=='__main__':
    main()
