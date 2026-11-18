"""Bake full-body arcade key poses into 12-frame RGBA animation strips."""
from pathlib import Path
import json
import math
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).parent
W, H, N = 120, 98, 12
ACTIONS = 'idle walk guard jump jab cross kick uppercut sweep airkick hurt fall win throw pounce morph fly beam hover'.split()
X, Y = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))


def sheet(name):
    image = Image.open(ROOT / (name + '.png')).convert('RGBA')
    # Transparent production sheets can retain soft matte around the silhouette.
    image.putalpha(image.getchannel('A').point(lambda a: 255 if a >= 165 else 0))
    return image


def cut(image, rect):
    part = image.crop(tuple(round(v) for v in rect))
    box = part.getbbox()
    if not box:
        raise ValueError(f'Empty pose at {rect}')
    return part.crop(box)


def grid(image, rows, columns=4, xcuts=None):
    poses = []
    for r, (top, bottom) in enumerate(zip(rows, rows[1:])):
        cols = (xcuts or {}).get(r, [i*image.width/columns for i in range(columns+1)])
        for left, right in zip(cols, cols[1:]):
            poses.append(cut(image, (left, top, right, bottom)))
    return poses


def place(pose, scale, pivot=.5):
    width = round(pose.width*scale)
    height = round(pose.height*scale)
    fit = min(1, (W-6)/width, (H-7)/height)
    size = max(1,round(width*fit)), max(1,round(height*fit))
    part = pose.resize(size, Image.Resampling.LANCZOS)
    # Keep the weight over the planted boot, independent of the reach of the attack.
    left = max(2,min(W-size[0]-2, round(53-size[0]*pivot)))
    result = Image.new('RGBA',(W,H))
    result.alpha_composite(part,(left,91-size[1]))
    return result


def smooth(mat):
    return sum(np.roll(np.roll(mat,x,1),y,0) for x,y in ((0,0),(-1,0),(1,0),(0,-1),(0,1)))/5


def sample(mat,x,y):
    return mat[np.clip(np.rint(y).astype(int),0,H-1), np.clip(np.rint(x).astype(int),0,W-1)]


def flow(a,b):
    # Bounded optical flow bends the source drawing towards the next key pose.
    # Work on one intact silhouette at a time so an in-between never has two arms in the same socket.
    def luminance(im):
        arr = np.asarray(im.filter(ImageFilter.GaussianBlur(.8)),dtype=np.float32)/255
        return arr[:,:,3]*(.45+.55*(arr[:,:,:3] @ [.25,.55,.20]))
    first,second=luminance(a),luminance(b)
    u,v=np.zeros_like(X),np.zeros_like(Y)
    for _ in range(3):
        target=sample(second,X+u,Y+v)
        gy,gx=np.gradient(.5*(first+target)); delta=target-first
        du,dv=np.zeros_like(u),np.zeros_like(v)
        for _ in range(8):
            ax,ay=smooth(du),smooth(dv)
            residual=(gx*ax+gy*ay+delta)/(.015+gx*gx+gy*gy)
            du,dv=ax-gx*residual,ay-gy*residual
        u,v=np.clip(u+du,-7,7),np.clip(v+dv,-6,6)
    return u,v


def bake(name, poses, clips, strips=None):
    output=Image.new('RGBA',(N*W,H*len(ACTIONS)))
    fields={}
    for row,action in enumerate(ACTIONS):
        if action not in clips:
            continue
        keys=clips[action]
        loop=action in ('walk','idle','guard','fly','beam','hover')
        for f in range(N):
            t=(f+.15)/N
            k=t*(len(keys) if loop else len(keys)-1)
            start=int(k); mix=k-start
            i,j=keys[start],keys[(start+1)%len(keys)]
            if mix>.5:i,j,mix=j,i,1-mix
            if (i,j) not in fields:
                fields[i,j]=flow(poses[i],poses[j]) if i!=j else (0,0)
            u,v=fields[i,j]
            # Shift the upper body into the step or impact, keeping the sole fixed.
            # The head and the limbs remain part of the original whole-body drawing.
            weight=np.clip((91-Y)/76,0,1); cycle=2*math.pi*t
            drive=(1.45 if loop else 3.3)*math.sin(cycle)
            breath=(1.8 if loop else 2.3)*math.cos(cycle+.3)
            sx=X-u*mix-weight*drive
            sy=Y-v*mix-weight*breath
            # Bilinear sampling preserves subpixel movement at the atlas resolution.
            frame=poses[i].transform((W,H),Image.Transform.MESH,[
                ((x,y,min(W,x+8),min(H,y+8)), tuple(coord for xx,yy in
                [(x,y),(x,min(H-1,y+8)),(min(W-1,x+8),min(H-1,y+8)),(min(W-1,x+8),y)]
                for coord in (float(sx[yy,xx]),float(sy[yy,xx]))))
                for y in range(0,H,8) for x in range(0,W,8)
            ],Image.Resampling.BILINEAR)
            output.paste(frame,(f*W,row*H))
    for action,filename in (strips or {}).items():
        with Image.open(ROOT/filename) as strip:
            if strip.size!=(N*W,H):raise ValueError(f'Invalid strip: {filename}')
            output.paste(strip,(0,ACTIONS.index(action)*H))
    output.save(ROOT/('quimera-'+name+'.png'),optimize=True)


fighter=grid(sheet('luchador-soldado-v3'),[0,275,535,800,1050,1240,1536],xcuts={2:[0,256,512,805,1024]})
extra=sheet('quimera-luchador-claves')
extra=grid(extra,[0,314,632,947,1261])
fp=[place(p,75/fighter[4].height, .38 if i in (5,6,9,10) else .52) for i,p in enumerate(fighter)]
fp += [place(p,75/extra[12].height,.30 if i in (2,10,14) else .47) for i,p in enumerate(extra)]
bake('fighter',fp,dict(idle=[4,11,4],guard=[4,8,4],jump=[12,13,8,13,11],
 jab=[4,5,6,5,4],cross=[36,37,38,39],kick=[4,8,9,10,11],uppercut=[28,29,30,31],
 sweep=[24,25,26,27],airkick=[32,33,34,35],hurt=[11,12,4],fall=[11,8,12],win=[4,14,15,15]),
 strips={'walk':'luchador-pasos-quimera.png'})

rifle=sheet('soldado-enemigo-v1')
rects=json.loads((ROOT.parent.parent/'enemy-atlas.js').read_text().split('=',1)[1].strip().rstrip(';'))
rifle=[cut(rifle,(x,y,x+w,y+h)) for row in rects for x,y,w,h in row]
rp=[place(p,74/rifle[0].height,.38 if i in (12,13) else .50) for i,p in enumerate(rifle)]
bake('rifle',rp,dict(idle=[0,1],walk=[4,5,6,7],guard=[0,1,0],throw=[0,12,13,0],jab=[8,6,4,8],hurt=[14,8,0],fall=[14,15,15]))

knife=sheet('enemigo-cuchillo-v1')
rects=[[35,88,280,308],[376,88,246,306],[651,88,285,306],[991,88,242,306],[43,470,244,292],[323,470,291,292],[627,493,352,270],[988,470,246,292],[47,819,261,269],[344,860,255,302],[635,935,269,230],[918,1050,327,122]]
kp=[place(cut(knife,(x,y,x+w,y+h)),74/307,.39 if i==6 else .5) for i,(x,y,w,h) in enumerate(rects)]
bake('knife',kp,dict(idle=[4,7],walk=[0,1,2,3],guard=[4,5],jab=[4,5,6,7],hurt=[9,8,4],fall=[9,10,11,11]))

warden=sheet('enemigos-estilo-soldado-v2')
wp=grid(warden,[0,404,714,1010,1263],xcuts={0:[0,312,623,953,1246],3:[0,337,632,925,1246]})
wp=[place(p,76/wp[4].height) for p in wp]
bake('warden',wp,dict(idle=[6,8],walk=[4,5,4,6],guard=[6,8],throw=[8,6,7,8],cross=[8,4,6,8],hurt=[9,8,6],fall=[9,10,11,11]))

jet=grid(sheet('enemigos-estilo-soldado-v2'),[0,404],xcuts={0:[0,312,623,953,1246]})
jp=[place(p,56/jet[0].height) for p in jet]
bake('jet',jp,dict(idle=[0,1,0],walk=[1,0,1],guard=[0,1],throw=[1,2,2,0],hurt=[0,3],fall=[0,3,3]))

def fitted(name,rows,columns,height,xcuts=None):
    poses=grid(sheet(name),rows,columns,xcuts)
    return [place(p,height/poses[0].height) for p in poses]

infected=fitted('zombi-soldado-v1',[0,231,460,681,891,1099,1254],6,74)
bake('infected',infected,dict(idle=[0,1,2],walk=[6,7,8,9,10,11],guard=[18,19],
    jab=[18,19,20,21,23],hurt=[30,31,30],fall=[30,31,32,33,34]))
robot=fitted('robot-soldado-v2',[0,240,505,750,1024],6,74)
bake('robot',robot,dict(idle=[0,1],walk=[0,1,2,3,4,5],guard=[6,7,8],throw=[12,13,14,16,12],
    hurt=[7,8,7],fall=[18,19,20,21]))
wolf=fitted('lobo-negro-jefe-v1',[0,342,635,930,1254],4,74,
    {1:[0,315,647,988,1254],2:[0,307,670,973,1254]})
bake('blackWolf',wolf,dict(idle=[0,1,0],walk=[0,1,2,3],guard=[7,8,7],jab=[4,5,6,7],
    pounce=[7,4,5,6,7],hurt=[11,12,11],fall=[12,13,14,15]))
gunner=fitted('enemigo-torreta-v1',[0,505,1024],4,70,{1:[0,403,762,1128,1536]})
bake('gunner',gunner,dict(idle=[0,1],walk=[0,1,0],guard=[0,1,0],throw=[1,2,3,2],
    hurt=[4,5,4],fall=[4,5,6,7]))

cast=sheet('quimera-reparto'); cast=[cut(cast,(a,0,b,cast.height)) for a,b in [(0,800),(820,1410),(1430,2172)]]
keyart=sheet('quimera-mutacion-claves')
allposes=grid(keyart,[0,346,711,1086],xcuts={2:[0,325,724,1065,1448]})
for row,(name,anchor) in enumerate(zip(['lizard','scientist','hero'],[.58,.54,.62])):
    poses=allposes[row*4:row*4+4]
    base=place(cast[row],75/cast[row].height,anchor)
    source=[base]+[place(p,75/poses[0].height,anchor) for p in poses]
    if name=='lizard':
        lizard_stalk=source[1]; lizard_rest=base
        bake(name,source,dict(idle=[0,1],walk=[1,2,1,0],guard=[1,2],sweep=[1,2,4,1],pounce=[2,3,1],hurt=[0,2,1],fall=[1,2,4]))
    if name=='scientist':
        source.extend([lizard_stalk,lizard_rest])
        bake(name,source,dict(idle=[0,1],walk=[1,0,1],guard=[1,2],throw=[1,2,3,1],hurt=[1,4,1],morph=[0,4,4,5,6],fall=[1,4]))
    if name=='hero':
        bake(name,source,dict(idle=[0,1],walk=[1,0,1],jump=[1,3,1],fly=[2,2],beam=[1,4,4],hover=[3,3]))

