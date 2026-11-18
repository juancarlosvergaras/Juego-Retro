(function(root){
  'use strict';
  const DURATION=1.2,PAIRS=[['soldier','zombie'],['zombie','wolf'],['soldier','wolf']];
  const HEIGHTS={tank:53,fighter:57,robot:54,soldier:46,zombie:68,wolf:66.03};
  let atlas=null,fxImage=null,fxFrames=null;const endpoints={};
  const FORMS=Object.keys(HEIGHTS);
  function progress(p){return Math.max(0,Math.min(1,1-p.transform/DURATION));}
  function formPose(p,form){return{...p,form,transform:0,transformFrom:null,h:HEIGHTS[form],w:form==='tank'?64:24,submersible:!!p.swimming&&form==='tank',hurt:0,claw:0,kick:0,ram:null,wolfAttack:null,fighterPose:0,zombiePose:0,cannonPose:0};}
  function setEffects(image){fxImage=image;fxFrames=Array.from({length:12},(_,i)=>[Math.round(i%4*image.width/4),Math.round(Math.floor(i/4)*image.height/3),Math.floor(image.width/4),Math.floor(image.height/3)]);}
  function effects(c,p,t,mode){
    if(t<.1||t>.94)return;const intensity=Math.sin(Math.PI*(t-.1)/.84),wide=mode!=='ground',w=wide?142:100,h=wide?94:112;
    if(fxImage&&fxFrames){const f=fxFrames[Math.min(11,Math.floor(t*12))];c.save();c.globalAlpha*=intensity*.72;c.imageSmoothingEnabled=false;c.drawImage(fxImage,...f,Math.round(p.x-w/2),Math.round(p.y-h),w,h);c.restore();}
    // Crisp particles keep a readable boundary even before the optional effect atlas loads.
    c.save();c.fillStyle=p.form==='zombie'?'#a4e9a0':p.form==='wolf'?'#dbd7ba':'#b4e9ec';
    for(let i=0;i<9;i++){const a=i*2.399+t*5,r=(wide?47:27)*intensity;c.fillRect(Math.round(p.x+Math.cos(a)*r),Math.round(p.y-h*.45+Math.sin(a)*h*.38),2,2);}c.restore();
  }
  function compose(c,p,render,mode='ground'){
    const from=p.transformFrom,to=p.form;if(!(p.transform>0)||from===to||!FORMS.includes(from)||!FORMS.includes(to))return false;
    const t=progress(p),a=formPose(p,from),b=formPose(p,to),u=Math.max(0,Math.min(1,(t-.18)/.62));
    c.save();c.imageSmoothingEnabled=false;
    if(u===0)render(a);else if(u===1)render(b);else{
      // Complementary pixel bands replace the silhouette without translucent doubled bodies.
      // Both callbacks retain the exact motorcycle/swimming pose and the same world anchor.
      const left=Math.round(p.x-140),top=Math.round(p.y-170),width=280,height=210,band=7;
      for(const incoming of [false,true]){c.save();c.beginPath();
        for(let i=0;i<height/band;i++){
          const wobble=Math.sin(i*1.7)*.045*Math.sin(u*Math.PI),cut=Math.round(width*Math.max(0,Math.min(1,u+wobble)));
          const x=p.facing<0?left+width-cut:left;
          if(incoming)c.rect(x,top+i*band,cut,band);
          else c.rect(p.facing<0?left:left+cut,top+i*band,width-cut,band);
        }c.clip();render(incoming?b:a);c.restore();
      }
    }
    effects(c,p,t,mode);c.restore();return true;
  }
  function setEndpoint(form,image,frame,height=HEIGHTS[form],pivot){
    endpoints[form]={image,x:frame[0],y:frame[1],w:frame[2],h:frame[3],pivot:pivot??frame[0]+(frame[5]??frame[2]/2),height};
  }
  function setSheet(image){
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,c.width,c.height).data,rows=[],bands=[0,379,706,1024];
    for(let row=0;row<3;row++){const frames=[];
      for(let col=0;col<6;col++){
        const x0=Math.round(col*c.width/6),x1=Math.round((col+1)*c.width/6),y0=Math.round(bands[row]*c.height/1024),y1=Math.round(bands[row+1]*c.height/1024);
        let l=x1,r=x0,t=y1,b=y0;
        for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[(y*c.width+x)*4+3]>190){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
        if(r<l||b<t)throw Error('Empty transformation frame');
        // Feet, rather than the tail or the backpack, anchor the character.
        let left=r,right=l;for(let y=b-Math.ceil((b-t)*.07);y<=b;y++)for(let x=l;x<=r;x++)if(pixels[(y*c.width+x)*4+3]>190){left=Math.min(left,x);right=Math.max(right,x);}
        frames.push({image,x:l,y:t,w:r-l+1,h:b-t+1,pivot:(left+right)/2});
      }
      const [from,to]=PAIRS[row],start=HEIGHTS[from]/frames[0].h,end=HEIGHTS[to]/frames[5].h;
      frames.forEach((f,i)=>{const t=i/5;f.scale=start+(end-start)*t;});rows.push(frames);
    }
    atlas=rows;return rows;
  }
  function pose(p){
    if(!(p.transform>0))return null;
    const to=p.form,from=p.transformFrom||(to==='wolf'?'soldier':'wolf'),row=PAIRS.findIndex(pair=>pair.includes(from)&&pair.includes(to));
    if(from===to||row<0)return null;
    const t=Math.max(0,Math.min(1,1-p.transform/DURATION)),reverse=PAIRS[row][0]!==from;
    // Hold the real endpoints briefly; spend most time on anticipation, morph and recovery.
    if(t<.07)return{endpoint:from,t};if(t>=.92)return{endpoint:to,t};
    const phase=Math.min(5,Math.floor((t-.07)/.85*6));return{row,frame:reverse?5-phase:phase,t};
  }
  function draw(c,p){
    if(p.swimming||p.onMotorcycle)return false;
    if(p.transform>0&&[p.form,p.transformFrom].some(id=>['tank','fighter','robot'].includes(id))){
      if(!endpoints[p.form]||!endpoints[p.transformFrom])return false;
      return compose(c,p,q=>{const f=endpoints[q.form],s=f.height/f.h;c.save();c.translate(Math.round(q.x),Math.round(q.y));c.scale(q.facing||1,1);c.drawImage(f.image,f.x,f.y,f.w,f.h,Math.round((f.x-f.pivot)*s),-Math.round(f.height),Math.round(f.w*s),Math.round(f.height));c.restore();});
    }
    const q=pose(p);if(!q||!atlas||!endpoints[p.form]||!endpoints[p.transformFrom||(p.form==='wolf'?'soldier':'wolf')])return false;
    const f=q.endpoint?endpoints[q.endpoint]:atlas[q.row][q.frame],s=q.endpoint?f.height/f.h:f.scale;
    c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(p.x),Math.round(p.y));c.scale(p.facing||1,1);
    c.drawImage(f.image,f.x,f.y,f.w,f.h,Math.round((f.x-f.pivot)*s),-Math.round(f.h*s),Math.round(f.w*s),Math.round(f.h*s));
    // A few crisp motes follow the change; the body stays fully opaque and readable.
    if(q.t>.22&&q.t<.82){const age=(q.t-.22)/.6,green=p.form==='zombie'||p.transformFrom==='zombie';
      for(let i=0;i<6;i++){const side=i%2?1:-1,r=15+age*12,y=-10-i*8-age*9;c.fillStyle=i%3===0?'#e7eed0':green?'#84cfa8':'#acbec7';c.fillRect(Math.round(side*r+Math.sin(i*5+age*8)*3),Math.round(y),i%3===0?2:1,2);}
    }
    c.restore();return true;
  }
  const api={DURATION,PAIRS,FORMS,pose,progress,formPose,compose,setEffects,setEndpoint,setSheet,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeFormTransition=api;
})(typeof window!=='undefined'?window:globalThis);
