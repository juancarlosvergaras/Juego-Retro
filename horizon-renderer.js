(function(root){
  'use strict';
  const M=typeof module!=='undefined'&&module.exports?require('./horizon-world'):root.ArcadeHorizon;
  const {clamp,mix}=M,TAU=Math.PI*2;
  const paths={fleet:'assets/sprites/cenit-flota.webp',airFire:'assets/sprites/cenit-fuego-8.webp',wreck:'assets/sprites/cenit-derrota-8.webp',exhaust:'assets/sprites/delta-propulsores-8.webp',delta:'assets/worlds/delta-de-hierro.webp',sky:'assets/worlds/cielo-cenit.webp',terrain:'assets/worlds/archipielago-cenit.webp',jet:'assets/sprites/interceptor-dorsal.webp',hull:'assets/sprites/hidroplano-popa.webp',portraits:'assets/sprites/vehiculos-horizonte.webp'};
  const palettes={
    hero:['#183440','#23727a','#61ac9c','#d5d2ad','#faf0c7','#dc7d38','#ffd176'],
    red:['#282338','#612f47','#ad4253','#92919a','#ead3bf','#fc7850','#ffd398'],
    gold:['#40313b','#955b38','#dca84b','#cfbd96','#ffe3ab','#66acb1','#a4eaef'],
    blue:['#1d2d4b','#354978','#597d9e','#acb6c2','#e4e9db','#ef9056','#ffd697']
  };
  function camera(s,w=640,h=360){
    const p=s.player,water=s.level===9,b=water?1:s.blend;
    const yaw=water?Math.atan2(M.center(p.z+12)-M.center(p.z-12),24):p.yaw;
    const orbit=b*Math.PI*.455,dist=mix(107,24,b),back=water?16:Math.sin(orbit)*dist-(1-b)*14;
    const x=water?p.x-Math.sin(yaw)*back:p.x*b-Math.sin(yaw)*back;
    const y=water?5.5+s.air*.18:p.y+Math.cos(orbit)*dist+1.2*b;
    const z=p.z-Math.cos(yaw)*back-(water?0:(1-b)*s.lead);
    const pitch=water?-.13:mix(-Math.PI/2,-.08+p.pitch*.68,b);
    return {x,y,z,yaw,pitch,sy:Math.sin(yaw),cy:Math.cos(yaw),sp:Math.sin(pitch),cp:Math.cos(pitch),
      lens:(water?307:mix(304,310,b))*w/640,cx:w/2,mid:h*(water?.52:mix(.55,.53,b))};
  }
  function view(c,x,y,z){
    const dx=x-c.x,dy=y-c.y,dz=z-c.z,forward=dx*c.sy+dz*c.cy;
    return [dx*c.cy-dz*c.sy,dy*c.cp-forward*c.sp,dy*c.sp+forward*c.cp];
  }
  function screen(c,v){return [c.cx+v[0]*c.lens/v[2],c.mid-v[1]*c.lens/v[2]];}
  function project(c,p){const v=view(c,p.x,p.y,p.z);return v[2]>1?screen(c,v):null;}
  function exhaust(ctx,sheet,x,y,width,height,time,throttle){
    if(!sheet)return;
    const cell=sheet.width/8,frame=Math.floor(time*16)%8;
    const w=width*(.135+.048*throttle),h=height*(.18+.48*throttle);
    for(const [side,phase] of [[112/343,0],[232/343,3]]){
      ctx.drawImage(sheet,(frame+phase)%8*cell,0,cell,sheet.height,x+width*side-w/2,y+height*.823,w,h);
    }
  }
  function create(ctx,images){
    let cam,w,h,queue=[],fog;
    function face(points,color,bias=0){
      let vs=points.map(p=>view(cam,...p));
      if(vs.every(p=>p[2]<1)||vs.every(p=>p[2]>870))return;
      if(vs.some(p=>p[2]<1)){
        const clipped=[];
        for(let i=0;i<vs.length;i++){const a=vs[i],b=vs[(i+1)%vs.length];if(a[2]>=1)clipped.push(a);
          if((a[2]<1)!==(b[2]<1)){const t=(1-a[2])/(b[2]-a[2]);clipped.push([mix(a[0],b[0],t),mix(a[1],b[1],t),1]);}}
        vs=clipped;
      }
      if(vs.length<3)return;
      const pix=vs.map(v=>screen(cam,v));
      if(pix.every(p=>p[0]<-2)||pix.every(p=>p[0]>w+2)||pix.every(p=>p[1]<-2)||pix.every(p=>p[1]>h+2))return;
      queue.push({pix,color,depth:vs.reduce((v,p)=>v+p[2],0)/vs.length+bias});
    }
    function flush(){
      queue.sort((a,b)=>b.depth-a.depth);
      for(const q of queue){if(q.paint){q.paint();continue;}ctx.fillStyle=q.color;ctx.beginPath();q.pix.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();
        if(fog&&q.depth>125){ctx.fillStyle='rgba('+fog+','+Math.min(.64,(q.depth-125)/820)+')';ctx.fill();}}
      queue.length=0;
    }
    function box(x,y,z,rx,ry,rz,top,front,side){
      const a=x-rx,b=x+rx,c=z-rz,d=z+rz,j=y+ry;
      face([[a,j,c],[a,j,d],[b,j,d],[b,j,c]],top);
      face([[a,y,c],[a,j,c],[b,j,c],[b,y,c]],front);
      face([[a,y,d],[b,y,d],[b,j,d],[a,j,d]],front);
      face([[a,y,c],[a,y,d],[a,j,d],[a,j,c]],side);face([[b,y,c],[b,j,c],[b,j,d],[b,y,d]],side);
    }
    function triangle(img,a,b,c,cull=true,bias=-1.15,opacity=1){
        if(!a||!b||!c)return;
        const [x,y]=a.p,dx=b.p[0]-x,dy=b.p[1]-y,ex=c.p[0]-x,ey=c.p[1]-y;
        if((cull?dx*ey-dy*ex:Math.abs(dx*ey-dy*ex))<=.05)return;
        if(Math.max(x,b.p[0],c.p[0])<0||Math.min(x,b.p[0],c.p[0])>w||Math.max(y,b.p[1],c.p[1])<0||Math.min(y,b.p[1],c.p[1])>h)return;
        const du=b.u-a.u,dv=b.v-a.v,eu=c.u-a.u,ev=c.v-a.v,inv=1/(du*ev-dv*eu);
        const xx=(dx*ev-ex*dv)*inv,xy=(dy*ev-ey*dv)*inv,yx=(ex*du-dx*eu)*inv,yy=(ey*du-dy*eu)*inv;
        queue.push({depth:(a.z+b.z+c.z)/3+bias,paint(){
          ctx.save();ctx.globalAlpha*=opacity;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(...b.p);ctx.lineTo(...c.p);ctx.closePath();ctx.clip();
          ctx.transform(xx,xy,yx,yy,x-xx*a.u-yx*a.v,y-xy*a.u-yy*a.v);ctx.drawImage(img,0,0);ctx.restore();
        }});
      }
    function panelArt(img,points,source,opacity=1){
      if(!img)return;
      const [x,y,width,height]=source,uv=[[x,y],[x+width,y],[x+width,y+height],[x,y+height]];
      const vertices=points.map((p,i)=>[...view(cam,...p),...uv[i]]),visible=[];
      for(let i=0;i<4;i++){
        const a=vertices[i],b=vertices[(i+1)%4];if(a[2]>=1)visible.push(a);
        if((a[2]<1)!==(b[2]<1)){const t=(1-a[2])/(b[2]-a[2]);visible.push(a.map((n,j)=>mix(n,b[j],t)));}
      }
      const polygon=visible.map(v=>({p:screen(cam,v),z:v[2],u:v[3],v:v[4]}));
      for(let i=2;i<polygon.length;i++)triangle(img,polygon[0],polygon[i-1],polygon[i],false,-.6,opacity);
    }
    function wingTexture(at,img){
      if(!img)return;
      // Sew the dorsal artwork onto a shallow, banked surface in aircraft coordinates.
      const cols=4,rows=3,grid=[];
      for(let j=0;j<=rows;j++){
        const row=[];
        for(let i=0;i<=cols;i++){
          const u=i/cols,v=j/rows,x=(u-.5)*14.9;
          const pts=view(cam,...at([x,.23+.95*Math.exp(-x*x*.23),6.65-v*12.1]));
          row.push(pts[2]>1?{p:screen(cam,pts),z:pts[2],u:u*img.width,v:v*img.height}:null);
        }grid.push(row);
      }
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const a=grid[j][i],b=grid[j][i+1],c=grid[j+1][i+1],d=grid[j+1][i];triangle(img,a,b,c);triangle(img,a,c,d);
      }
    }
    function deck(p,pal,boat,t,scale=1,texture=null){
      const sy=Math.sin(p.yaw||0),cy=Math.cos(p.yaw||0),sr=Math.sin(p.roll||0),cr=Math.cos(p.roll||0),sp=Math.sin(p.pitch||0),cp=Math.cos(p.pitch||0);
      const at=([x,y,z])=>{const a=(x*cr-y*sr)*scale,b=(x*sr+y*cr)*scale,c=z*scale,up=b*cp+c*sp,f=c*cp-b*sp;
        return [p.x+a*cy+f*sy,p.y+up,p.z+f*cy-a*sy];};
      const f=(col,...v)=>face(v.map(at),col),[ink,shade,body,metal,light,accent,glow]=pal;
      // Faceted fuselage with independent dorsal, port and starboard panels.
      function hull(sections,wide=false){
        const rings=sections.map(([z,r,base,high])=>[[-r,base,z],[-r*.61,high,z],[r*.61,high,z],[r,base,z],[0,base-.38*r,z]]);
        for(let i=1;i<rings.length;i++){
          const a=rings[i-1],b=rings[i];[body,wide?metal:light,shade,ink,shade].forEach((col,j)=>f(col,a[j],a[(j+1)%5],b[(j+1)%5],b[j]));
        }f(ink,...rings[0]);f(accent,...rings[rings.length-1]);
      }
      if(boat){
        hull([[-3.8,1.28,.38,1.28],[-1,1.53,.45,1.67],[2.3,.76,.4,1.35],[4.2,.08,.46,.69]],true);
        for(const d of [-1,1]){
          const v=(x,y,z)=>[x*d,y,z];
          f(body,v(.7,.65,-2.6),v(2.55,.56,-2.8),v(2.35,.68,1.35),v(.7,1,1.83));
          f(accent,v(1.69,.67,-3.15),v(2.67,.58,-3.05),v(2.4,.86,2.3),v(1.77,1.01,2.7));
          f(glow,v(1.77,1.01,2.7),v(2.4,.86,2.3),v(2.05,.53,4.82));
          f(shade,v(2.67,.58,-3.05),v(2.4,.86,2.3),v(2.05,.53,4.82),v(2.68,.04,-1.9));
          f(ink,v(1.82,.12,-3),v(2.68,.1,-3),v(2.67,.58,-3.05),v(1.69,.67,-3.15));
          f(metal,v(.72,1,-2.2),v(1.02,2.02,-2.68),v(1.17,2.06,-3.35),v(1.16,1,-3.2));
        }
        f(shade,[-.78,1.34,-.65],[-.5,2.09,-.36],[.5,2.09,-.36],[.78,1.34,-.65]);
        f('#518a95',[-.5,2.09,-.36],[-.48,1.5,1.18],[.48,1.5,1.18],[.5,2.09,-.36]);
        f('#acc7bf',[-.5,2.09,-.36],[-.48,1.5,1.18],[-.3,1.55,1.14],[-.31,2.09,-.36]);
        f(accent,[-1.63,2.08,-3.32],[1.63,2.08,-3.32],[1.63,2.14,-2.86],[-1.63,2.14,-2.86]);
      }else{
        hull([[-4.9,1.38,0,.82],[-2,1.56,.15,1.18],[1.8,.93,.26,1.48],[4.1,.55,.35,.77],[6.7,.03,.34,.38]],true);
        for(const d of [-1,1]){
          const v=(x,y,z)=>[x*d,y,z];
          f(shade,v(.54,.29,3.3),v(6.8,-.02,-2.9),v(7.5,-.08,-4.45),v(.98,.16,-3.32));
          f(metal,v(.55,.42,3.3),v(5.25,.13,-1.83),v(4.12,.2,-3.65),v(.89,.52,-2.85));
          f(accent,v(5.25,.13,-1.83),v(6.8,.04,-2.92),v(7.5,-.02,-4.45),v(6,-.01,-4.16));
          f(body,v(1.25,.53,-1.54),v(1.98,2.64,-4.12),v(2.11,2.65,-5.15),v(1.57,.48,-4.78));
          f(accent,v(1.98,2.64,-4.12),v(2.11,2.65,-5.15),v(2.02,2.1,-4.91),v(1.86,2.11,-3.73));
          f(shade,v(1.14,.25,-3.4),v(3.31,.08,-4.7),v(3.61,.04,-5.53),v(1.06,.36,-4.81));
          f(ink,v(.22,.02,-4.98),v(1.23,.02,-4.98),v(1.18,.84,-4.98),v(.27,.84,-4.98));
          f(glow,v(.37,.27,-5),v(1.04,.27,-5),v(.97,.65,-5),v(.43,.65,-5));
          f('#76d4cf',v(.37,.31,-5),v(.96,.31,-5),v(.67,.4,-6.1-.48*Math.sin(t*23)));
        }
        wingTexture(at,texture);
        f('#28465b',[-.67,1.17,-.7],[-.44,1.91,.6],[.44,1.91,.6],[.67,1.17,-.7]);
        f('#809fa1',[-.44,1.91,.6],[-.35,1.17,2.75],[.35,1.17,2.75],[.44,1.91,.6]);
        f(glow,[-.4,1.9,.63],[-.32,1.17,2.67],[-.18,1.21,2.48],[-.27,1.88,.62]);
      }
    }
    // Project the illustrated ground through the same camera as the models.
    // Each scanline lies at a fixed world depth, so only its first texel needs a ray cast.
    const doc=ctx.canvas.ownerDocument,tiles={},buffer=doc?.createElement('canvas');
    let pixels,ground;
    function texture(id,img){
      if(!buffer||!img)return null;
      if(tiles[id])return tiles[id];
      const tile=doc.createElement('canvas');tile.width=tile.height=512;
      const painter=tile.getContext('2d',{willReadFrequently:true});
      if(id==='water')painter.drawImage(img,img.width*.2,img.height*.83,img.width*.56,img.height*.15,0,0,512,512);
      else painter.drawImage(img,0,0,512,512);
      const pyramid=[new Uint32Array(painter.getImageData(0,0,512,512).data.buffer)];
      const mip=doc.createElement('canvas');mip.width=mip.height=256;
      const small=mip.getContext('2d',{willReadFrequently:true});
      for(let size=256;size>=8;size/=2){small.drawImage(tile,0,0,size,size);pyramid.push(new Uint32Array(small.getImageData(0,0,size,size).data.buffer));}
      tiles[id]=pyramid;return pyramid;
    }
    // Use the same mirrored terrain texels as the ground projection. Sample the
    // outline too, so a long tail cannot travel across an island or a beach.
    function oceanAt(x,z,map){
      const u=Math.floor((x*.946+z*.324)*.91+236)&1023;
      const v=Math.floor((z*.946-x*.324)*.91+98)&1023;
      const pixel=map[(511-(v>=512?1023-v:v))*512+(u>=512?1023-u:u)];
      const red=pixel&255,green=pixel>>8&255,blue=pixel>>16&255;
      return blue>red*1.28&&green>red*1.12&&blue>green*.98;
    }
    function waterEvent(s){
      const decor=root.ArcadeSceneryAnimation;
      if(!decor?.next||s.carrier||s.blend>0&&s.blend<1)return;
      const river=s.level===9,e=decor.next(s,river?'delta':'archipielago',s.t);
      if(!e)return;
      const img=decor.sheet(e.id),p=s.player,sw=img.naturalWidth/8,sh=img.naturalHeight;
      if(river){
        // The eight poses already contain the leap and spray. Reveal the school
        // through the same y=0 surface projected by groundArt.
        e.anchor??=p.z+38+Math.max(94,s.speed)*(1-e.u);
        const z=e.anchor,x=M.center(z)+(e.seed-.5)*12+(e.u-.5)*9;
        const surface=view(cam,x,0,z);
        if(z>=M.riverLength||surface[2]<=1)return;
        const exposed=Math.min(M.ease(e.u/.18),M.ease((1-e.u)/.22));
        if(exposed<=0)return;
        const [cx,waterline]=screen(cam,surface),width=4.8*cam.lens/surface[2];
        const rows=sh*exposed,height=width*rows/sw;
        const sx=sw*e.frame;
        queue.push({depth:surface[2],paint(){
          ctx.drawImage(img,sx,0,sw,rows,cx-width/2,waterline-height,width,height);
        }});
        return;
      }
      const map=tiles.terrain?.[0];if(!map)return;
      const wet=(x,z)=>oceanAt(x,z,map)&&oceanAt(x-16,z,map)&&oceanAt(x+16,z,map)&&oceanAt(x,z-5,map)&&oceanAt(x,z+5,map);
      if(e.anchor===null){
        const forward=s.blend?230:86,side=e.seed<.5?-1:1;
        for(const extra of [0,36,78,124])for(const offset of [25,-32,55,-58,0]){
          if(e.anchor!==null)break;
          const x=p.x+Math.sin(p.yaw)*(forward+extra)+Math.cos(p.yaw)*offset*side;
          const z=p.z+Math.cos(p.yaw)*(forward+extra)-Math.sin(p.yaw)*offset*side;
          if(wet(x,z)&&wet(x+9,z)){e.anchor=x;e.z=z;e.entryAge=e.age;}
        }
      }
      if(e.anchor===null)return;
      const x=e.anchor+(e.age-e.entryAge)*1.5,z=e.z,y=.42;
      if(!wet(x,z))return;
      const width=38,depth=width*sh/sw;
      panelArt(img,[[x-width/2,y,z+depth/2],[x+width/2,y,z+depth/2],[x+width/2,y,z-depth/2],[x-width/2,y,z-depth/2]],
        [sw*e.frame,0,sw,sh],e.alpha*.86);
    }
    function groundArt(s){
      const water=s.level===9,tile=texture(water?'water':'terrain',water?images.delta:images.terrain);
      if(!tile)return false;
      const bw=Math.ceil(w/2),bh=Math.ceil(h/2);
      if(!pixels||buffer.width!==bw||buffer.height!==bh){
        buffer.width=bw;buffer.height=bh;ground=buffer.getContext('2d');pixels=ground.createImageData(bw,bh);
      }
      const out=new Uint32Array(pixels.data.buffer),scale=water?5.5:.91;
      for(let j=0;j<bh;j++){
        const v=(cam.mid-(j+.5)*2)/cam.lens,dy=cam.sp+cam.cp*v,d=-cam.y/dy;
        if(d<=0||d>(water?540:1400)){out.fill(0,j*bw,(j+1)*bw);continue;}
        const forward=(cam.cp-cam.sp*v)*d,dx=(1-cam.cx)*d/cam.lens;
        let x=(cam.x+cam.sy*forward+cam.cy*dx)*scale,z=(cam.z+cam.cy*forward-cam.sy*dx)*scale;
        if(water){x+=2.2*Math.sin(z*.05+s.t*2.5);z+=s.t*3;}
        let stepX=2*d*cam.cy*scale/cam.lens,stepZ=-2*d*cam.sy*scale/cam.lens;
        if(!water){
          const u=x*.946+z*.324+236,q=z*.946-x*.324+98,du=stepX*.946+stepZ*.324;
          stepZ=stepZ*.946-stepX*.324;stepX=du;x=u;z=q;
        }
        const lod=clamp(Math.floor(Math.log2(Math.max(1,d*2*scale/cam.lens))),0,tile.length-1);
        const sampled=tile[lod],size=512>>lod;
        const fade=(water?d-115:d-125)/(water?285:520),alpha=Math.round(255*(1-M.ease(fade)))<<24;
        for(let k=j*bw,end=k+bw;k<end;k++,x+=stepX,z+=stepZ){
          let u=Math.floor(x)&1023,q=Math.floor(z)&1023;
          if(u>=512)u=1023-u;if(q>=512)q=1023-q;
          out[k]=(sampled[((511-q)>>lod)*size+(u>>lod)]&0xffffff)|alpha;
        }
      }
      ground.putImageData(pixels,0,0);ctx.drawImage(buffer,0,0,w,h);return true;
    }
    function sky(s){
      const img=s.level===9?images.delta:images.sky;
      const horizon=cam.mid+cam.lens*Math.tan(cam.pitch);
      ctx.fillStyle=s.level===9?'#397a83':'#596685';ctx.fillRect(0,0,w,h);
      if(horizon< -h*1.1||!img)return;
      const width=w*1.9,height=width*img.height/img.width,top=horizon-height*(s.level===9?.60:.53);
      const offset=((cam.yaw/TAU*width*4+width*.24)%(width*2)+width*2)%(width*2);
      for(let j=-1;j<=2;j++){const x=j*width-offset;if(x>w||x+width<0)continue;
        ctx.save();ctx.translate(x+(j%2?width:0),top);if(j%2)ctx.scale(-1,1);ctx.drawImage(img,0,0,width,height);ctx.restore();}
    }
    function quad(x,z,rx,rz,y,col){face([[x-rx,y,z-rz],[x+rx,y,z-rz],[x+rx,y,z+rz],[x-rx,y,z+rz]],col);}
    let exteriorImage;
    function exterior(){
      if(exteriorImage)return exteriorImage;
      exteriorImage=doc.createElement('canvas');exteriorImage.width=900;exteriorImage.height=600;
      const brush=exteriorImage.getContext('2d');brush.scale(1.5,1.5);
          brush.beginPath();
          function part(points){
            let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-a[1]*b[0];}
            if(area<0)points.reverse();brush.moveTo(...points[0]);for(const point of points.slice(1))brush.lineTo(...point);brush.closePath();
          }
          part([[7,231],[30,226],[22,196],[22,184],[36,182],[36,154],[42,154],[45,186],[47,146],[50,145],[52,182],[59,163],[80,158],[82,143],[69,141],[69,119],[115,117],[114,145],[104,148],[108,155],[188,159],[190,143],[211,140],[217,160],[246,162],[250,140],[357,137],[367,165],[373,162],[376,139],[388,136],[388,122],[394,119],[399,141],[407,140],[414,130],[427,130],[438,143],[475,143],[477,157],[508,162],[507,189],[522,189],[522,198],[508,198],[504,223],[558,228],[560,244],[551,247],[551,275],[563,275],[567,285],[531,293],[40,293],[27,286],[27,278],[33,276],[32,249],[7,245]]);
          part([[248,232],[287,30],[286,18],[299,18],[305,4],[310,0],[316,17],[329,17],[330,30],[375,231],[363,231],[319,31],[296,31],[260,232]]);
          part([[272,66],[344,63],[346,76],[271,77]]);part([[265,102],[350,101],[352,111],[264,111]]);
          for(const [y,half] of [[33,12],[79,18],[114,25]]){
            const end=y===33?64:y===79?101:147;
            part([[307-half,y],[311-half,y],[310+half,end],[306+half,end]]);
            part([[307+half,y],[311+half,y],[311-half,end],[307-half,end]]);
          }
          part([[76,119],[79,99],[84,96],[90,98],[94,118]]);
          part([[107,111],[218,67],[226,69],[226,75],[117,144],[110,141],[217,75],[108,117]]);
          part([[216,73],[223,72],[223,113],[227,120],[224,132],[218,138],[214,132],[219,128]]);
          part([[420,144],[419,98],[424,98],[426,143]]);part([[430,141],[431,82],[434,80],[437,142]]);
          part([[440,119],[490,112],[554,112],[584,118],[584,128],[560,134],[506,183],[501,179],[546,134],[522,135],[504,158],[499,157],[510,135],[496,135],[496,159],[482,158],[482,134],[441,130]]);
          part([[526,226],[531,189],[576,175],[581,178],[582,184],[540,196],[535,226]]);part([[577,182],[579,183],[579,207],[588,225],[590,231],[565,231],[565,225],[576,205]]);
          for(const [x,width] of [[51,25],[148,29],[240,29],[311,17],[374,29],[467,28],[528,28]]){
            part([[x-width/2,283],[x+width/2,283],[x+width/2-2,350],[x-width/2+2,352]]);
          }
          for(const x of [64,253,392,482]){part([[x,290],[x+7,290],[x+65,333],[x+56,333]]);part([[x+57,290],[x+64,290],[x+8,334],[x,334]]);}
          brush.clip();brush.drawImage(images.rigBackdrop,0,0,600,400);
      return exteriorImage;
    }
    function river(s,textured){
      const start=Math.floor((s.route-25)/14)*14;
      for(let k=0;k<45;k++){
        const a=start+k*14,b=a+14,x=M.center(a),u=M.center(b),r=M.breadth(a),q=M.breadth(b);
        if(!textured)face([[x-r,0,a],[x+r,0,a],[u+q,0,b],[u-q,0,b]],['#287178','#28767d','#2b7880','#28757c'][Math.abs(Math.floor(a/14))%4]);
        for(const d of [-1,1]){
          const shore=x+d*r,next=u+d*q,dike=2+6*M.canal(a),endDike=2+6*M.canal(b),steep=dike>5;
          const upper=[[shore+d*4,dike,a],[next+d*4,endDike,b],[next+d*28,9,b],[shore+d*28,9,a]];
          const slope=[[shore,0,a],[next,0,b],[next+d*4,endDike,b],[shore+d*4,dike,a]];
          if(images.delta&&k<32){
            const img=images.delta,period=Math.floor(a/14),v0=steep?.462:.210;
            const tx=steep?.825:.785,tw=steep?.09:.048,th=steep?.095:.045;
            const sx=(tx+(period%2?tw:0))*img.width,sw=tw*img.width*(period%2?-1:1);
            panelArt(img,upper,[sx,v0*img.height,sw,th*img.height]);
            panelArt(img,slope,[sx,(steep?.49:.246)*img.height,sw,.042*img.height]);
          }else{face(upper,steep?'#757371':'#526e58');face(slope,steep?'#595f63':'#847c70');}
          face([[shore,0,a],[next,0,b],[next-d*1.7,.02,b],[shore-d*1.7,.02,a]],'#87bbb0',-.05);
        }
      }
      for(let j=0;j<105;j++){
        const row=Math.floor(s.route/7)-2+j%35,z=row*7+Math.sin(j*72)*2.5,x=M.center(z)+Math.sin(row*11.7+Math.floor(j/35)*17.1)*M.breadth(z)*.96;
        const y=.1+.27*Math.sin(z*.079-s.t*2.1),span=1.4+1.1*Math.cos(j*7+s.t*2);
        face([[x-span,y,z],[x+.6,y+.05,z-.27],[x+span+1,y,z+.37],[x,y,z+.32]],j%5===0?'#a0cfc2':'#529599');
      }
      for(const o of M.items){
        if(o.z<s.route-16||o.z>s.route+380)continue;
        if(o.kind==='ramp'){
          for(let j=0;j<5;j++){const a=o.z-14+j*2.8,b=a+2.8;
            face([[o.x-7,j*.42,a],[o.x+7,j*.42,a],[o.x+7,(j+1)*.42,b],[o.x-7,(j+1)*.42,b]],j%2?'#dabb79':'#50626b');}
          face([[o.x-2,.74,o.z-9.3],[o.x,1.7,o.z-2.8],[o.x+2,.74,o.z-9.3]],'#ffdc79',-.2);
        }else{box(o.x,.3,o.z,2,1.7,1.6,'#535660','#7e4549','#463747');box(o.x,2,o.z,.48,.9,.48,'#ffc57e','#e46b51','#c55346');}
      }
      if(s.route>M.riverLength-860&&images.rigBackdrop){
        const z=M.riverLength+59,x=M.center(M.riverLength);
        const at=project(cam,{x,y:0,z}),depth=view(cam,x,0,z)[2];
        if(at&&depth>1)queue.push({depth,paint(){
          // The exterior and the playable decks use the same painting. Trace its skyline
          // so the cranes, helipad, and open sea keep the delta sky around them.
          const width=132*cam.lens/depth,height=width*2/3;
          ctx.save();ctx.translate(at[0]-width/2,at[1]-height*.88);ctx.scale(width/300,height/200);
          ctx.drawImage(exterior(),0,0,300,200);ctx.restore();
        }});
      }
    }
    function hydroplane(p,t,ghost,flash,throttle){
      const hull=images.hull,pal=palettes.hero,anchor=project(cam,{x:p.x,y:p.y+.65,z:p.z}),v=view(cam,p.x,p.y,p.z);
      if(!hull||!anchor||v[2]<5){deck(p,pal,true,t);return;}
      const width=7*cam.lens/v[2],height=width*.61,turn=M.angle((p.yaw||0)-cam.yaw);
      queue.push({depth:v[2],paint(){
        ctx.save();ctx.translate(anchor[0],anchor[1]);ctx.rotate(-(p.roll||0)*.65);
        ctx.transform(1,0,-Math.sin(turn)*.46,1+(p.pitch||0)*.55,0,0);
        ctx.globalAlpha=ghost;
        ctx.drawImage(hull,-width/2,-height*.58,width,height);
        exhaust(ctx,images.exhaust,-width/2,-height*.58,width,height,t,throttle);
        ctx.restore();
        const mounts=root.ArcadeDeltaPatrol;
        if(mounts)for(const side of [-1,1]){
          const breech=project(cam,mounts.mount(p,side,1.25)),tip=project(cam,mounts.mount(p,side));
          if(!tip||!breech)continue;
          ctx.save();ctx.globalAlpha=ghost;ctx.lineWidth=Math.max(2,width*.026);ctx.strokeStyle='#263b3b';
          ctx.beginPath();ctx.moveTo(...breech);ctx.lineTo(...tip);ctx.stroke();
          ctx.lineWidth=Math.max(1,width*.009);ctx.strokeStyle='#b2b7a1';ctx.stroke();
          if(flash){ctx.fillStyle='#ffc35f';ctx.fillRect(tip[0]-2,tip[1]-3,4,5);ctx.fillStyle='#fff5ba';ctx.fillRect(tip[0]-1,tip[1]-2,2,3);}ctx.restore();
        }
      }});
    }
    let foam;
    function wakeFoam(){
      if(foam||!doc)return foam;
      const tile=doc.createElement('canvas');tile.width=128;tile.height=192;
      const brush=tile.getContext('2d'),pixels=brush.createImageData(tile.width,tile.height);
      for(let y=0;y<tile.height;y++)for(let x=0;x<tile.width;x++){
        const cross=x/63.5-1,along=y*Math.PI*2/128;
        const ripple=Math.sin(along*7+cross*14)+.42*Math.sin(along*19-cross*31);
        const crest=Math.abs(Math.abs(cross)-(.53+.08*ripple));
        const jets=Math.exp(-crest*crest*34),wash=Math.max(0,1-Math.abs(cross))*.35;
        const bubbles=Math.sin(x*1.43+y*.82)*Math.sin(x*.53-y*.43)+.4*Math.sin(x*.74+y*.31);
        const froth=clamp((.22+.31*ripple+.69*bubbles+jets)*(.83*jets+wash),0,1);
        const i=4*(y*tile.width+x);
        pixels.data[i]=157+froth*88;pixels.data[i+1]=215+froth*33;
        pixels.data[i+2]=210+froth*31;pixels.data[i+3]=Math.round(froth*205);
      }
      brush.putImageData(pixels,0,0);foam=tile;return foam;
    }
    function wake(s,p,width){
      const trail=p.wakeTrail,texture=wakeFoam();if(!texture||!trail?.length)return;
      const head={x:p.x-Math.sin(p.yaw)*2.4,z:p.z-Math.cos(p.yaw)*2.4,yaw:p.yaw,t:s.t,wet:p!==s.player||s.air<.45};
      function side(q,sign){
        const age=Math.max(0,s.t-q.t),spread=width*1.7+age*8.5;
        return [q.x+Math.cos(q.yaw)*spread*sign,.09,q.z-Math.sin(q.yaw)*spread*sign];
      }
      let prev=head;
      for(const mark of trail){
        const age=s.t-mark.t;
        if(prev.wet&&mark.wet&&prev.t>mark.t&&Math.hypot(mark.x-prev.x,mark.z-prev.z)<18){
          const row=((mark.t*187)%128+128)%128;
          const height=(prev.t-mark.t)*187;
          panelArt(texture,[side(prev,-1),side(prev,1),side(mark,1),side(mark,-1)],
            [0,row+height,texture.width,-height],clamp(1-age*.92,0,1));
        }
        prev=mark;
      }
    }
    function terrain(s){
      const p=s.player,b=s.blend,size=40,range=b>.05?14:5;
      const gx=Math.floor(cam.x/size),gz=Math.floor(cam.z/size);
      const height=(x,z)=>Math.max(0,Math.sin(x*.011+z*.003)+Math.sin(z*.014-x*.004)-.38)*10;
      for(let j=-range;j<=range;j++)for(let i=-range;i<=range;i++){
        const x=(gx+i)*size,z=(gz+j)*size,dx=x+size/2-cam.x,dz=z+size/2-cam.z;
        if(b>.8&&(dx*cam.sy+dz*cam.cy< -32||Math.abs(dx*cam.cy-dz*cam.sy)>Math.max(50,dx*cam.sy+dz*cam.cy)*1.35))continue;
        const a=height(x,z),c=height(x+size,z),d=height(x+size,z+size),e=height(x,z+size),v=(a+c+d+e)/4;
        const colors=v<.6?['#426d81','#436e81']:v<3?['#899483','#838c7b']:v<8?['#557c75','#4e736f']:['#58666f','#616d72'];
        const one=[x,a,z],two=[x+size,c,z],three=[x+size,d,z+size],four=[x,e,z+size];
        face([one,two,three],colors[0]);face([one,three,four],colors[1]);
      }flush();
      if(b<.95){
        const start=Math.floor((p.z-150)/36)*36;
        for(let j=0;j<13;j++){const z=start+j*36,x=29*Math.sin(z/300)+80;
          quad(x,z,6,18,.4,'#798785');quad(x,z,.32,5,.42,'#decba1');
          if(Math.floor(z/36)%3===0){box(x+15,1,z,6,4,8,'#a59b8e','#706d74','#4d6470');box(x+15,5,z,3,.45,5,'#b7b2a0','#aaa89a','#8d8f85');}
        }
      }
    }
    const air=root.ArcadeCenit||(typeof module!=='undefined'&&module.exports?require('./cenit-combat'):null);
    let redFleet;
    function aircraft(n,s){
      const pos=project(cam,n);if(!pos||!images.fleet)return;
      const m=air.model(n),row=air.fleet.indexOf(m),depth=view(cam,n.x,n.y,n.z)[2];
      const wide=Math.min(200,m.span*cam.lens/depth),delta=M.angle(n.yaw-cam.yaw);
      const bank=(n.settled?.035:.12)*Math.sin(n.age*2+n.phase);
      const low=M.ease((s.blend-.38)/.53);
      if(n.flash>0&&!redFleet&&doc){
        redFleet=doc.createElement('canvas');redFleet.width=images.fleet.width;redFleet.height=images.fleet.height;
        const g=redFleet.getContext('2d');g.drawImage(images.fleet,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='rgba(255,94,76,.47)';g.fillRect(0,0,redFleet.width,redFleet.height);
      }
      const source=n.flash>0&&redFleet?redFleet:images.fleet;
      function pose(frame,rotation,flip,alpha){
        if(alpha<=0)return;
        ctx.save();ctx.globalAlpha*=alpha;ctx.translate(...pos);ctx.rotate(rotation);if(flip)ctx.scale(-1,1);
        ctx.drawImage(source,frame*128,row*112,128,112,-wide/2,-wide*7/16,wide,wide*7/8);ctx.restore();
      }
      queue.push({depth,paint(){
        pose(0,delta+bank,false,1-low);
        const angle=Math.abs(delta),frame=1+Math.min(4,Math.round(angle/(Math.PI/4)));
        pose(frame,bank,delta>0,low);
      }});
    }
    function flightEffect(row,frame,x,y,width,height,rotation=0){
      ctx.save();ctx.translate(x,y);ctx.rotate(rotation);
      ctx.drawImage(images.airFire,frame*64,row*64,64,64,-width/2,-height/2,width,height);ctx.restore();
    }
    function projectile(b,s){
      const pos=project(cam,b);if(!pos||!images.airFire)return;
      const depth=view(cam,b.x,b.y,b.z)[2],k=clamp(cam.lens/depth*.45,.68,1.65);
      const row=b.kind==='missile'?3:b.kind==='plasma'?2:b.enemy?1:0;
      const next=project(cam,{x:b.x+b.vx*.015,y:b.y+b.vy*.015,z:b.z+(b.vz-(1-s.blend)*s.speed)*.015});
      const rot=next?Math.atan2(next[1]-pos[1],next[0]-pos[0])+Math.PI/2:0;
      const size=[23,12,17,25][row]*k,frame=Math.floor(s.t*14+b.life*2)%8;
      queue.push({depth,paint(){flightEffect(row,frame,...pos,row===0?size*1.24:size,size,row===0||row===3?rot:0);}});
    }
    let hitCarrier;
    function carrier(n,s){
      // Position and aim share the violet emitter in the original cinematic artwork.
      // Its rear elevation stays on the fortress's world axes as the pilot strafes.
      const origin=project(cam,n);if(!origin||!images.portraits)return;
      const right=project(cam,{x:n.x+Math.cos(n.yaw)*8,y:n.y,z:n.z-Math.sin(n.yaw)*8});
      const top=project(cam,{x:n.x,y:n.y+8,z:n.z});
      if(!right||!top)return;
      const unit=.205/8;
      queue.push({depth:view(cam,n.x,n.y,n.z)[2],paint(){
        ctx.save();ctx.transform((right[0]-origin[0])*unit,(right[1]-origin[1])*unit,
          (origin[0]-top[0])*unit,(origin[1]-top[1])*unit,origin[0],origin[1]);
        if(n.defeat!=null){
          const frame=Math.min(7,Math.floor(n.defeat/2.60*8)),sink=M.ease(n.defeat/air.collapseLength);
          ctx.translate(8*sink,45*sink*sink);ctx.rotate(sink*.18);
          ctx.drawImage(images.wreck,frame*320,0,320,190,-244,-222,512,304);
          ctx.restore();return;
        }
        if(n.flash>0&&doc&&!hitCarrier){
          hitCarrier=doc.createElement('canvas');hitCarrier.width=512;hitCarrier.height=240;
          const brush=hitCarrier.getContext('2d');brush.drawImage(images.portraits,512,407,512,240,0,0,512,240);
          brush.globalCompositeOperation='source-atop';brush.fillStyle='rgba(232,78,75,.42)';brush.fillRect(0,0,512,240);
        }
        if(n.flash>0&&hitCarrier)ctx.drawImage(hitCarrier,-244,-156);
        else ctx.drawImage(images.portraits,512,407,512,240,-244,-156,512,240);
        if(n.lockPulse>0&&images.airFire){
          const k=22+14*(1-n.lockPulse/.9);
          flightEffect(2,Math.floor(s.t*14)%8,0,0,k,k);
        }
        if(n.attack&&images.airFire){
          const wind=air.patterns[n.attack].wind;
          const charge=n.fired?1:clamp(1-n.fire/wind,0,1);
          const emitters=n.attack==='lance'?[0]:n.attack==='fan'?[n.fired?17:-17]:n.attack==='cross'?[-32,32]:[(n.sweepSign||1)*(-36+12*(n.fired||0))];
          for(const offset of emitters){
            const size=12+charge*17;
            flightEffect(n.attack==='lance'?2:1,Math.floor(s.t*12)%8,offset/.205,0,size,size);
          }
        }
        ctx.restore();
      }});
    }
    function draw(s,override){
      if(s.rig){root.ArcadeOilArt.draw(ctx,s,images);return;}
      w=ctx.canvas.width;h=ctx.canvas.height;cam=override||camera(s,w,h);ctx.imageSmoothingEnabled=false;fog=s.level===9?'155,171,158':'145,135,153';
      sky(s);const textured=groundArt(s);
      if(textured)waterEvent(s);
      if(s.level===9){river(s,textured);for(const n of s.rivals){
          const p={...n,y:n.y-(n.sink||0)*1.8,yaw:Math.atan2(M.center(n.z+4)-M.center(n.z-4),8)+(n.heading<0?Math.PI:0)};
          if(n.hp>0)wake(s,p,1.65);
          const v=view(cam,p.x,p.y,p.z),at=project(cam,p);
          if(at&&v[2]>4&&images.patrol){
            const size=7.8*cam.lens/v[2],height=size*.83;
            queue.push({depth:v[2],paint(){
              ctx.save();ctx.translate(...at);ctx.rotate(.035*Math.sin(n.age*2)+(n.sink||0)*.54);
              ctx.drawImage(images.patrol,n.heading<0?0:180,0,180,220,-size/2,-height*.87,size,height);
              if(n.flash>0){ctx.strokeStyle='#f89b7d';ctx.strokeRect(-size*.35,-height*.72,size*.7,2);}
              if(n.muzzle>0){ctx.fillStyle='#ffe1a4';ctx.fillRect(-size*.035,-height*.60,size*.09,size*.08);}
              ctx.restore();
            }});
          }
        }
        for(const b of s.shots){
          const torp=b.kind==='torpedo',width=torp?.48:.2,back=b.z-b.vz*(torp?.04:.026);
          const trail=b.x-b.vx*(torp?.04:.026);
          face([[b.x-width,b.y,b.z],[b.x,b.y+width,b.z],[b.x+width,b.y,b.z],[trail,b.y,back]],torp?'#ebf9d9':b.enemy?'#ff925e':'#fff3a5');
          if(b.enemy)box(b.x,b.y,b.z,.28,.25,.60,'#fff1af','#ff9251','#d05d3c');
          if(torp)box(b.x,b.y,b.z,width,width,1,'#d2bc86','#72796e','#3d5859');
        }
        wake(s,s.player,1.7);
      }else{
        if(!textured)terrain(s);
        for(const n of s.enemies){
          if(n.kind==='carrier')carrier(n,s);
          else aircraft(n,s);
        }
        for(const b of s.shots)projectile(b,s);
      }
      const protectedAlpha=s.grace>1.35?.26:s.shieldFlash>0&&Math.floor(s.t*18)%2?.53:1;
      if(s.level===9)hydroplane(s.player,s.t,protectedAlpha,s.gun>.115,s.boosting?1:clamp((s.speed-45)/115,.08,.60));
      else{
        const start=queue.length;
        deck(s.player,s.shieldFlash>.12?palettes.gold:palettes.hero,false,s.t,1,images.jet);
        if(protectedAlpha<1){const hull=queue.splice(start);queue.push({depth:view(cam,s.player.x,s.player.y,s.player.z)[2],paint(){
          ctx.save();ctx.globalAlpha=protectedAlpha;const rest=queue;queue=hull;flush();queue=rest;ctx.restore();
        }});}
      }
      for(const f of s.fx){
        if(f.explosion&&images.airFire){
          const pos=project(cam,f);if(!pos)continue;
          const depth=view(cam,f.x,f.y,f.z)[2],size=clamp(19*cam.lens/depth,18,110);
          const frame=clamp(Math.floor(8*(1-f.life/f.max)),0,7);
          queue.push({depth,paint(){flightEffect(4,frame,...pos,size,size);}});
        }else{const a=clamp(f.life/f.max,.15,1)*.7;box(f.x,f.y,f.z,a,a,a,f.color,f.color,f.color);}
      }
      flush();
      if(s.level===9&&s.rivals.some(n=>n.hp>0&&n.z<s.route-3&&n.origin==='aft')){
        ctx.save();ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.fillStyle='#293133';ctx.fillRect(w/2-27,h-27,54,13);
        ctx.fillStyle='#ffd285';ctx.fillText('▼ POPA',w/2,h-17);ctx.restore();
      }
      if(s.level===10){
        const p=s.player;
        for(const n of s.enemies){
          if(!n.fromRear||n.settled||n.age>4.5)continue;
          const v=view(cam,n.x,n.y,n.z),at=project(cam,n);
          if((n.x-p.x)*cam.sy+(n.z-p.z)*cam.cy>=0||at&&at[0]>=5&&at[0]<=w-5&&at[1]>5&&at[1]<h-6)continue;
          const x=clamp(w*.5+v[0]*2,18,w-18),y=h-14;
          ctx.fillStyle='#332f36';ctx.fillRect(x-6,y-6,12,11);ctx.fillStyle='#ffce7e';
          ctx.beginPath();ctx.moveTo(x-4,y-3);ctx.lineTo(x+4,y-3);ctx.lineTo(x,y+3);ctx.fill();
        }
        const d=M.direction(p.yaw,p.pitch),cross=project(cam,{x:p.x+d.x*115,y:p.y+d.y*115,z:p.z+d.z*115});
        if(cross){ctx.strokeStyle='#c6f7da';ctx.lineWidth=1;const [x,y]=cross;ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x-2,y);ctx.moveTo(x+2,y);ctx.lineTo(x+7,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y-2);ctx.stroke();}
        const target=s.enemies.find(n=>n.hp>0&&n.id===s.locked)||s.enemies.find(n=>n.hp>0&&n.kind==='carrier');
        if(target){const at=project(cam,target),ok=s.lockTime>=1;
          ctx.strokeStyle=ok?'#ffe479':'#7fe8db';ctx.fillStyle=ctx.strokeStyle;
          if(at&&at[0]>14&&at[0]<w-14&&at[1]>16&&at[1]<h-14){
            const [x,y]=at,r=ok?10:14;for(const d of [-1,1])for(const e of [-1,1]){ctx.beginPath();ctx.moveTo(x+d*(r-4),y+e*r);ctx.lineTo(x+d*r,y+e*r);ctx.lineTo(x+d*r,y+e*(r-4));ctx.stroke();}
          }else if(target.kind==='carrier'){const v=view(cam,target.x,target.y,target.z),d=v[0]<0?-1:1,x=d<0?17:w-17,y=h*.55;
            ctx.beginPath();ctx.moveTo(x+d*6,y);ctx.lineTo(x-d*4,y-5);ctx.lineTo(x-d*4,y+5);ctx.fill();}
        }
      }
      return cam;
    }
    return {draw};
  }
  const api={paths,exhaust,camera,view,project,create};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeHorizonRenderer=api;
})(typeof window!=='undefined'?window:globalThis);
