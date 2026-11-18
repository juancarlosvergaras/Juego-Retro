(function(root){
  'use strict';
  let mk2Sheet;
  function setSheet(image){mk2Sheet=image;}
  function drawPickup(c,x,y){if(!mk2Sheet)return;const s=34/299;c.drawImage(mk2Sheet,0,204,mk2Sheet.width/6,299,Math.round(x-mk2Sheet.width/6*s/2),Math.round(y-34),mk2Sheet.width/6*s,34);}
  function pose(ctx,p){
    const lean=Math.max(-.15,Math.min(.15,p.vx/(p.jetBoost?1900:2700))),bob=Math.sin(p.anim*5)*.4;
    ctx.translate(p.x,p.y-27+bob);ctx.rotate(lean);ctx.translate(-p.x,-(p.y-27));
  }
  function draw(ctx,p,platforms=[],layer='back',fuelMax=p.fuelMax||680){
    if(!p.jetpack||p.form==='wolf')return;
    const boost=!!p.jetBoost,thrust=boost?1.5:p.vy< -10?1:p.vy>10?.35:Math.abs(p.vx)>15?.8:.5;
    if(p.jetpackMk2&&mk2Sheet){
      const s=31/299,w=mk2Sheet.width/6,frame=boost?4+Math.floor(p.anim*14)%2:Math.abs(p.vx)+Math.abs(p.vy)>10?2+Math.floor(p.anim*12)%2:1;
      ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(p.facing,1);
      if(layer==='back')ctx.drawImage(mk2Sheet,frame*w,503,w,389,-25,-10,w*s,389*s);
      else ctx.drawImage(mk2Sheet,frame*w,204,w,299,-25,-41,w*s,31);
      ctx.restore();return;
    }
    ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.scale(p.facing,1);
    const r=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
    if(layer==='back'){
      // Flames originate at the two bells, behind the legs; boost adds length and a blue core.
      for(const [i,x] of [-20,-13].entries()){
        const pulse=Math.sin(p.anim*37+i*2)*1.1+Math.sin(p.anim*61+i)*.5,length=9+thrust*16+pulse,drift=-p.vx*p.facing/48;
        ctx.save();ctx.globalAlpha=boost?.24:.14;ctx.fillStyle=boost?'#82dfff':'#ffb753';ctx.beginPath();ctx.ellipse(x+2,-9+length*.4,boost?8:6,length*.65,0,0,Math.PI*2);ctx.fill();ctx.restore();
        for(let j=0;j<length;j+=2){const t=j/length,width=Math.max(1,Math.round((boost?6:5)*(1-t))),bend=drift*t+Math.sin(p.anim*43+i+j*.6)*t;
          r(x+2+bend-width/2,-9+j,width,2,t<.25?'#f0ffff':t<(boost?.7:.48)?'#80dfff':t<.8?'#ffc868':'#ef823d');
          if(t<.55)r(x+1+bend,-9+j,2,2,'#fff6cf');
        }
        for(let n=0;n<3;n++){const t=(p.anim*(boost?3.2:2.2)+n/3+i*.16)%1;ctx.globalAlpha=(1-t)*.25;r(x+drift*t*3+Math.sin(n*6+i)*t*6,-5+length+t*19,2,2,'#c8c4b2');}ctx.globalAlpha=1;
      }
    }else{
      // Draw the visible pack AFTER the soldier so the sprite's painted backpack cannot hide it.
      r(-23,-39,16,29,'#132129');r(-21,-40,11,3,'#32474a');
      for(const x of [-22,-15]){r(x,-37,6,23,'#36555c');r(x+1,-36,3,21,'#7caaa8');r(x+1,-35,1,18,'#c6dfc9');r(x,-32,6,2,'#b9a16a');r(x,-20,6,2,'#acb8ac');r(x,-14,6,4,'#162931');r(x+1,-11,4,2,boost?'#d7ffff':'#a4cac9');}
      r(-16,-35,2,17,'#26353a');r(-9,-33,5,2,'#79694a');r(-9,-23,5,2,'#79694a');
      r(-20,-38,3,2,p.fuel/fuelMax<.2?'#ff7257':boost?'#eaffff':'#8becda');
    }
    ctx.restore();
    if(layer!=='back')return;
    const support=platforms.filter(q=>q.y>=p.y&&q.y-p.y<65&&p.x>=q.x&&p.x<=q.x+q.w).sort((a,b)=>a.y-b.y)[0];
    if(support){ctx.save();const strength=1-(support.y-p.y)/65;for(let i=0;i<(boost?12:8);i++){const t=(p.anim*(boost?2.5:1.8)+i/8)%1,side=i%2?1:-1;ctx.globalAlpha=(1-t)*strength*.38;ctx.fillStyle='#c3b395';ctx.fillRect(p.x+side*(8+t*(boost?45:32)),support.y-2-Math.sin(t*Math.PI)*5,3+t*4,2);}ctx.restore();}
  }
  const api={pose,draw,setSheet,drawPickup};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeJetpackRenderer=api;
})(typeof window!=='undefined'?window:globalThis);
