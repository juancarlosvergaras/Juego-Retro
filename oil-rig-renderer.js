(function(root){
  'use strict';
  const rig=root.ArcadeOilRig,animation=root.ArcadeSoldierAnimation;
  const paths={rigBackdrop:'assets/worlds/delta-torre-petrolera.webp',crew:'assets/sprites/delta-cubierta.webp',
    foreman:'assets/sprites/delta-contramaestre.webp',fall:'assets/sprites/delta-contramaestre-caida-8.webp',patrol:'assets/sprites/delta-patrulleras.webp'};
  const order=['barrel','wrench','rush','stomp','crane'];
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const tinted=new WeakMap();
  function impact(image,doc){
    if(tinted.has(image))return tinted.get(image);
    const sheet=doc.createElement('canvas');sheet.width=image.width;sheet.height=image.height;
    const c=sheet.getContext('2d');c.drawImage(image,0,0);c.globalCompositeOperation='source-atop';
    c.fillStyle='rgba(237,77,67,.43)';c.fillRect(0,0,sheet.width,sheet.height);tinted.set(image,sheet);return sheet;
  }
  function bar(c,x,y,w,hp,max){
    c.fillStyle='#192024';c.fillRect(x-w/2-1,y-1,w+2,5);
    c.fillStyle='#5b3d33';c.fillRect(x-w/2,y,w,3);
    c.fillStyle='#f3aa6c';c.fillRect(x-w/2,y,w*clamp(hp/max,0,1),3);
  }
  function crew(c,image,row,col,x,y,dir){
    c.save();c.translate(Math.round(x),Math.round(y));c.scale(dir,1);
    c.drawImage(image,col*160,row*128,160,128,-40,-64,80,64);c.restore();
  }
  function player(c,r,im,s){
    const p=r.p,mode={crouching:r.crouch,sliding:p.slide>0},e=r.gear?.e;
    if(p.cloak>0&&Math.floor(p.cloak*9)%4!==0)return;
    c.save();if(s.grace>1.35)c.globalAlpha=.42;else if(p.hurt>0&&Math.floor(p.hurt*26)%2)c.globalAlpha=.55;
    root.ArcadePhysics.jumpTurn.apply(c,p);
    if(e&&im.soldier){
      root.ArcadeNewYorkRenderer.drawCharacter(c,im,p,e,mode,rig.platforms);
      if(['soldier','robot'].includes(p.form)&&!p.transform&&!p.ladder&&!p.rope)
        root.ArcadeWeaponRenderer.draw(c,p,e);
      if(p.jetpack)root.ArcadeJetpackRenderer.draw(c,p,rig.platforms,'front',p.fuelMax);
    }else crew(c,im.crew,0,0,p.x,p.y,p.facing);
    c.restore();
  }
  function deck(c,f,i){
    const {x,y,w}=f;
    c.fillStyle='#503e30';c.fillRect(x,y-19,w,2);c.fillRect(x,y-10,w,1);
    c.fillStyle='#c49854';c.fillRect(x,y-20,w,1);
    for(let j=3;j<w;j+=30){c.fillStyle='#423a32';c.fillRect(x+j,y-20,2,20);c.fillStyle='#c09154';c.fillRect(x+j,y-19,1,18);}
    c.fillStyle='#1b272b';c.fillRect(x,y,w,10);
    c.fillStyle='#a29a80';c.fillRect(x,y,w,2);c.fillStyle='#54605a';c.fillRect(x,y+3,w,2);
    for(let j=3;j<w-4;j+=12){
      c.fillStyle=(j%24===3?'#38454a':'#746d59');c.fillRect(x+j,y+2,7,1);
      c.fillStyle='#958471';c.fillRect(x+j,y+6,2,2);
    }
    for(const edge of [x+3,x+w-36])for(let j=0;j<31;j+=7){c.fillStyle='#d7a452';c.fillRect(edge+j,y+2,4,3);}
    if(i){c.fillStyle='#394549';c.fillRect(x+18,y+9,4,7);c.fillRect(x+w-24,y+9,4,7);}
  }
  function ladder(c,l){
    for(const dx of [-8,7]){
      c.fillStyle='#3b3028';c.fillRect(l.x+dx-1,l.top-5,4,l.bottom-l.top+5);
      c.fillStyle='#dc9d3f';c.fillRect(l.x+dx,l.top-5,2,l.bottom-l.top+4);
    }
    for(let y=l.bottom-6;y>l.top-3;y-=9){c.fillStyle='#573d29';c.fillRect(l.x-7,y,15,4);c.fillStyle='#f1bc62';c.fillRect(l.x-7,y,15,2);}
  }
  function worker(c,b,im){
    if(b.hp<=0){
      const frame=rig.collapseFrame(b.groundedAge??b.defeat);
      c.save();c.translate(Math.round(b.x),Math.round(b.y));c.scale(-b.face,1);
      c.drawImage(im.fall,frame*208,0,208,168,-52,-83,104,84);c.restore();
      return;
    }
    const image=b.flash>0||b.hit>0?impact(im.foreman,c.canvas.ownerDocument):im.foreman;
    const cfg=rig.steps[b.move],id=order.indexOf(b.move),at=cfg?b.age/cfg.wind:0;
    let frame=7;
    if(cfg){const cut=b.move==='barrel'||b.move==='wrench'?6:3;
      frame=at<1?Math.floor(at*cut):Math.min(7,cut+Math.floor((b.age-cfg.wind)/cfg.act*(8-cut)));}
    c.save();c.translate(b.x,b.y);c.scale(-b.face,1);
    if(b.move==='rush')c.scale(.83,.83);
    c.drawImage(image,frame*256,Math.max(0,id)*204,256,204,-64,-100.5,128,102);
    c.restore();
  }
  function danger(c,r,s){
    const b=r.boss,cfg=rig.steps[b.move];if(!cfg||b.age>cfg.wind)return;
    const progress=b.age/cfg.wind,roof=rig.floors[4];
    c.save();c.globalAlpha=.48+.3*Math.sin(s.t*18)**2;
    if(b.move==='crane'){c.fillStyle='#c45442';c.fillRect(b.targetX-19,roof-3,38,3);c.strokeStyle='#ffc385';c.strokeRect(b.targetX-14,roof-6,28,5);
      c.setLineDash([3,6]);c.beginPath();c.moveTo(b.targetX,roof-147);c.lineTo(b.targetX,roof-5);c.stroke();}
    else if(b.move==='rush'){c.fillStyle='#ffb860';for(let j=1;j<4;j++){const x=b.x+b.face*(30+j*19);c.beginPath();c.moveTo(x,roof-8);c.lineTo(x+b.face*6,roof-5);c.lineTo(x,roof-2);c.fill();}}
    else if(b.move==='stomp'){c.strokeStyle='#ffb66b';c.beginPath();c.ellipse(b.x,roof-1,18+progress*32,4,0,0,Math.PI*2);c.stroke();}
    c.restore();
  }
  function hazard(c,h){
    c.save();c.translate(h.x,h.y);
    if(h.kind==='barrel'){
      c.rotate(h.angle);c.fillStyle='#302a2b';c.beginPath();c.arc(0,0,13,0,Math.PI*2);c.fill();
      c.fillStyle='#a74530';c.beginPath();c.arc(0,0,11,0,Math.PI*2);c.fill();
      c.strokeStyle='#e7a069';c.lineWidth=2;c.beginPath();c.arc(0,0,9,-2.8,.9);c.stroke();
      c.fillStyle='#5a3831';c.fillRect(-7,-2,14,3);c.fillStyle='#e3b08b';c.fillRect(2,-6,3,3);
    }else if(h.kind==='wrench'){
      c.rotate(h.angle);c.strokeStyle='#242b33';c.lineWidth=6;c.beginPath();c.moveTo(10,1);c.lineTo(-11,0);c.stroke();
      c.strokeStyle='#b3b8a5';c.lineWidth=3;c.stroke();c.beginPath();c.arc(10,0,5,.65,5.75);c.stroke();
    }else if(h.kind==='hook'){
      c.strokeStyle='#4d5150';c.lineWidth=3;c.beginPath();c.moveTo(0,-310);c.lineTo(0,-6);c.stroke();
      c.fillStyle='#e6a73d';c.fillRect(-7,-15,14,9);
      c.strokeStyle='#c6c6ae';c.lineWidth=4;c.beginPath();c.arc(0,0,7,-1.55,2.9);c.stroke();
    }else{c.strokeStyle='#ffa44e';c.lineWidth=3;c.beginPath();c.moveTo(-12,2);c.lineTo(-4,-8);c.lineTo(1,-3);c.lineTo(6,-13);c.lineTo(12,1);c.stroke();}
    c.restore();
  }
  function draw(c,s,im){
    const r=s.rig,p=r.p,cx=clamp(p.x-320,0,89),cy=r.cam;
    c.save();c.imageSmoothingEnabled=false;c.translate(-Math.round(cx),-Math.round(cy));
    c.drawImage(im.rigBackdrop,-563,-57,1863,1242);
    for(let i=0;i<rig.platforms.length;i++)deck(c,rig.platforms[i],i);
    for(const l of rig.ladders)ladder(c,l);
    danger(c,r,s);
    for(const n of r.guards){
      if(!root.ArcadeEnemySpecialists.drawRam(c,n,im.ramHit)&&!root.ArcadeEnemySpecialists.draw(c,n,im))
        root.ArcadeMissionKit.drawEnemy(c,n,im.enemy);
      root.ArcadeMissionKit.enemyBar(c,n);
    }
    worker(c,r.boss,im);
    if(r.boss.active&&r.boss.hp>0)bar(c,r.boss.x,r.boss.y-86,52,r.boss.hp,r.boss.max);
    if(r.arrival>0){
      const t=clamp((1.1-r.arrival)/.94,0,1);
      const jumper={...p,x:12+(p.x-12)*t,y:p.y+7*(1-t)-Math.sin(t*Math.PI)*34,
        grounded:t===1,vy:t<.5?-225:185};
      player(c,{...r,p:jumper},im,{...s,grace:0});
    }else player(c,r,im,s);
    if(r.gear)root.ArcadeMissionCombat.draw(c,r.gear.e,r.gear.powers,p,{left:cx,right:cx+640,top:cy,bottom:cy+360});
    for(const h of r.hazards)hazard(c,h);
    for(const q of r.shots){if(q.kind==='grenade'){
      c.fillStyle='#332d27';c.fillRect(q.x-3,q.y-3,7,7);c.fillStyle='#b8bd70';c.fillRect(q.x-2,q.y-2,4,3);
    }else{c.strokeStyle=q.enemy?'#fa965b':'#ffdb81';c.lineWidth=2;c.beginPath();c.moveTo(q.x,q.y);c.lineTo(q.x-q.vx*.018,q.y-q.vy*.018);c.stroke();}}
    for(const f of r.effects){c.fillStyle=f.color;c.fillRect(f.x,f.y,3,2);}
    c.restore();
    if(r.arrival>0){
      const u=1-r.arrival/1.35,alpha=clamp((1-u)/.38,0,1);
      c.save();c.globalAlpha=alpha;c.drawImage(im.rigBackdrop,0,0,640,360);
      c.restore();
    }
  }
  root.ArcadeOilArt={paths,draw};
})(window);
