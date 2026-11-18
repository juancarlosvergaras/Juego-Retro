(function(root){
  'use strict';
  // Capa de luz y partículas para los poderes. Se dibuja encima de los sprites
  // existentes (powers.js no cambia): anillos de choque, escarcha, chispas de
  // curación, estelas de dron, mira de torreta, marca orbital y brillo de escudo.
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
  function glow(c,x,y,r,color,alpha){if(alpha<=.004||r<=0)return;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+color+','+alpha.toFixed(3)+')');g.addColorStop(1,'rgba('+color+',0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  function ring(c,x,y,rx,ry,color,alpha,width=2){if(alpha<=.004)return;c.strokeStyle='rgba('+color+','+alpha.toFixed(3)+')';c.lineWidth=width;c.beginPath();c.ellipse(x,y,Math.max(1,rx),Math.max(1,ry),0,0,Math.PI*2);c.stroke();}
  const COLORS={wave:'255,211,107',cryo:'144,234,255',heal:'168,255,160',orbital:'255,170,110',alien:'190,150,255',shield:'150,205,255',flame:'255,160,80',drone:'255,181,75',turret:'255,226,160'};
  // Luces que los poderes aportan al mapa de luz de la escena.
  function lights(s,p){
    const list=[];if(!s)return list;
    for(const f of s.effects||[]){const k=clamp(f.life/(f.duration||.5)),color=COLORS[f.kind]||COLORS.wave;list.push({x:f.tx??f.x,y:f.ty??f.y,r:(f.r||60)*1.6,a:k,glow:color,ga:.3*k});}
    for(const b of s.beams||[])if(b.age>=.45)list.push({x:b.x,y:b.y-120,r:420,a:1,glow:COLORS.orbital,ga:.35*clamp((2-b.age)*2)});
    for(const d of s.drones||[])list.push({x:d.x,y:d.y,r:70,a:.7,glow:COLORS.drone,ga:.2});
    for(const t of s.turrets||[])list.push({x:t.x,y:t.y,r:t.flash>0?120:60,a:t.flash>0?.9:.5,glow:COLORS.turret,ga:t.flash>0?.28:.08});
    if(s.flame>0&&p){const a=p.aim||{x:p.facing||1,y:0};list.push({x:p.x+a.x*80,y:p.y-30+a.y*80,r:170,a:1,glow:COLORS.flame,ga:.34});}
    if(p&&p.shield>0)list.push({x:p.x,y:p.y-28,r:70,a:.5,glow:COLORS.shield,ga:.06});
    return list;
  }
  function draw(c,s,p,e){
    if(!s||!c.createRadialGradient)return;
    c.save();c.globalCompositeOperation='lighter';
    for(const f of s.effects||[]){
      const u=clamp(1-f.life/(f.duration||.5)),fade=1-u,color=COLORS[f.kind]||COLORS.wave;
      if(f.kind==='wave'||f.kind==='orbital'){
        // Onda de choque: dos frentes que se abren y polvo a ras de suelo.
        ring(c,f.x,f.y,f.r*u,f.r*u*.42,color,fade*.9,3);ring(c,f.x,f.y,f.r*u*.7,f.r*u*.3,'255,255,255',fade*.5,1.5);glow(c,f.x,f.y,f.r*(.4+u*.6),color,.35*fade);
        for(let i=0;i<12;i++){const a=i/12*Math.PI*2,d=f.r*u*(.8+hash(i)*.3);c.fillStyle='rgba('+color+','+(fade*.8).toFixed(3)+')';c.fillRect(Math.round(f.x+Math.cos(a)*d),Math.round(f.y+Math.sin(a)*d*.42),2,2);}
      }else if(f.kind==='cryo'){
        ring(c,f.x,f.y,f.r*u,f.r*u*.5,color,fade*.8,2);glow(c,f.x,f.y,f.r*(.3+u*.7),color,.28*fade);
        for(let i=0;i<18;i++){const a=hash(i)*Math.PI*2,d=f.r*u*hash(i+9),x=Math.round(f.x+Math.cos(a)*d),y=Math.round(f.y+Math.sin(a)*d*.6-u*14);c.fillStyle='rgba(230,250,255,'+(fade*.9).toFixed(3)+')';c.fillRect(x-2,y,5,1);c.fillRect(x,y-2,1,5);}
      }else if(f.kind==='heal'&&p){
        glow(c,p.x,p.y-28,54,color,.4*Math.sin(Math.PI*u));ring(c,p.x,p.y-2,10+u*30,3+u*8,color,fade*.7,2);
        for(let i=0;i<9;i++){const x=Math.round(p.x+(hash(i)-.5)*40),y=Math.round(p.y-6-((u*1.2+hash(i+3))%1)*62);c.fillStyle='rgba('+color+','+(fade*.95).toFixed(3)+')';c.fillRect(x-2,y,5,1);c.fillRect(x,y-2,1,5);}
      }else if(f.kind==='alien'){const t=Math.min(1,u*2),x=f.x+(f.tx-f.x)*t,y=f.y+(f.ty-f.y)*t;glow(c,x,y,46,color,.5*fade);if(u>.5)ring(c,f.tx,f.ty,(u-.5)*90,(u-.5)*60,color,fade*.8,2);}
    }
    for(const b of s.beams||[]){
      if(b.age<.45){
        // Marca de puntería antes del impacto: se cierra sobre el punto.
        const k=b.age/.45;ring(c,b.x,b.y,145*(1.4-k*.4),14*(1.4-k*.4),COLORS.orbital,.5+.4*k,2);ring(c,b.x,b.y,40*(1-k)+6,5,'255,255,255',.7,1.5);
        c.fillStyle='rgba('+COLORS.orbital+','+(.35+.4*k).toFixed(3)+')';c.fillRect(Math.round(b.x)-1,Math.round(b.y-600),2,600);
      }else{const k=clamp((2-b.age)*2);glow(c,b.x,b.y,230,COLORS.orbital,.5*k);ring(c,b.x,b.y,150+Math.sin(b.age*40)*8,20,'255,236,200',.6*k,3);
        for(let i=0;i<10;i++){const u=(b.age*1.8+hash(i))%1;c.fillStyle='rgba(255,220,170,'+((1-u)*k).toFixed(3)+')';c.fillRect(Math.round(b.x+(hash(i+20)-.5)*260),Math.round(b.y-u*120),3,3);}}
    }
    for(const d of s.drones||[]){glow(c,d.x,d.y+6,22,COLORS.drone,.55);
      // El dron marca a su objetivo con un rombo que parpadea.
      const t=d.target;if(t&&t.hp>0&&Math.floor((s.age||0)*8)%2){const tx=Math.round(t.x),ty=Math.round(t.y-34);c.strokeStyle='rgba(255,120,90,.9)';c.lineWidth=1;c.beginPath();c.moveTo(tx,ty-12);c.lineTo(tx+12,ty);c.lineTo(tx,ty+12);c.lineTo(tx-12,ty);c.closePath();c.stroke();}}
    for(const t of s.turrets||[]){
      const young=clamp(1-(t.age||9)/.5);if(young>0)ring(c,t.x,t.y+22,320*(1-young)*.25+20,6,COLORS.turret,young*.8,2);
      if(t.flash>0)glow(c,t.x+Math.cos(t.angle)*22,t.y+Math.sin(t.angle)*22,26,COLORS.turret,.8*(t.flash/.16));
      c.fillStyle='rgba(255,90,70,'+(.18+.1*Math.sin((s.age||0)*9)).toFixed(3)+')';c.save();c.translate(t.x,t.y);c.rotate(t.angle);c.fillRect(18,-.5,150,1);c.restore();
      // Cuenta atrás visible en los últimos segundos de la torreta.
      if(t.life<4){c.fillStyle='rgba(255,226,160,.9)';c.fillRect(Math.round(t.x-14),Math.round(t.y-24),Math.round(28*clamp(t.life/4)),2);}
    }
    if(s.flame>0&&p){const a=p.aim||{x:p.facing||1,y:0};for(let i=1;i<=4;i++)glow(c,p.x+a.x*(30+i*26),p.y-30+a.y*(30+i*26),20+i*7,COLORS.flame,.3-i*.045);}
    if(p&&!p.burrow&&(p.shield>0||s.shieldFlash>0)){const wolf=p.form==='wolf',cy=p.y-(wolf?38:26),hit=clamp(s.shieldFlash/.3);
      ring(c,p.x,cy,(wolf?36:27)+hit*10,(wolf?46:35)+hit*10,COLORS.shield,.22+.6*hit,1.5+hit*2);if(hit>0)glow(c,p.x,cy,60,COLORS.shield,.5*hit);}
    // Los enemigos congelados conservan un halo frío mientras dura el efecto.
    if(e)for(const n of e.enemies||[])if(n.hp>0&&n.frozen>0)glow(c,n.x,n.y-26,34,COLORS.cryo,.25+.1*Math.sin((s.age||0)*6+n.x));
    c.restore();
  }
  const api={COLORS,lights,draw};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadePowerFx=api;
})(typeof window!=='undefined'?window:globalThis);
