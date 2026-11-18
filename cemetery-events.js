(function(root){
  'use strict';
  // El cementerio como tramo con ritmo propio: altura (tumbas a las que subir),
  // recompensa por explorar (lápidas), peligro que se puede leer y usar
  // (rayos), terreno que frena (manos) y un combate cerrado a mitad de camino.
  const common=typeof module!=='undefined'&&module.exports;
  const P=common?require('./physics'):root.ArcadePhysics,Z=common?require('./cemetery-zombies'):root.ArcadeCemeteryZombies;
  const GROUND=620,ZONE={from:9750,to:16450};
  const TOMBS=[[10350,90,34],[10760,70,72],[11110,96,36],[12180,80,70],[12520,90,36],[13690,96,36],[14050,70,74],[14700,90,36],[15120,74,72],[15650,96,36],[16120,80,70]];
  const STONES=[9980,10480,10990,11560,12290,12700,13600,14420,14830,15420,15820,16420];
  const LANTERNS=[9900,10900,11450,11950,12650,13560,14600,15550,16500];
  const HANDS=[10620,12340,14300,15480].map(x=>({x,w:110}));
  const PIT={left:11395,right:11975,gate:14,height:232,enterFrom:11560,enterTo:11800,leave:260,waves:[[11480,11600,11760,11880],[11520,11840]],ids:300};
  const STRIKE={warn:1.15,flash:.45,radius:28,reach:44,minWait:5.5,maxWait:9.5};
  const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
  function platforms(){return TOMBS.map(([x,w,h],i)=>({id:6000+i,x,y:GROUND-h,w,kind:'deck',thickness:10,tomb:true}));}
  function gates(){return [PIT.left,PIT.right].map((x,i)=>({id:6100+i,x,y:GROUND-PIT.height,w:PIT.gate,kind:'barricade',solid:true,thickness:PIT.height,gate:true}));}
  function create(saved={}){
    const broken=new Set(Array.isArray(saved.stones)?saved.stones:[]);
    return{stones:STONES.map((x,id)=>({id,x,y:GROUND,hp:broken.has(id)?0:2,shake:0})),
      pit:{state:saved.pit==='done'?'done':'idle',wave:0,spawned:[],gateRise:0,age:0},strike:null,strikeWait:4,strikes:0,debris:[],crows:TOMBS.filter((_,i)=>i%2===0).map(([x,w,h],id)=>({id,x:x+w*.3,y:GROUND-h,vx:0,vy:0,flying:false,gone:false})),time:0,platforms:platforms(),gates:gates()};
  }
  function snapshot(s){return{stones:s.stones.filter(x=>x.hp<=0).map(x=>x.id),pit:s.pit.state==='done'?'done':'idle'};}
  function inZone(p,inside){return !inside&&p.x>ZONE.from&&p.x<ZONE.to;}
  // Factor de velocidad: las manos frenan solo a quien pisa el suelo entre ellas.
  function slow(s,p,inside){if(inside||!p.grounded||p.jetpack||p.burrow||Math.abs(p.y-GROUND)>3)return 1;return HANDS.some(h=>p.x>h.x&&p.x<h.x+h.w)?.55:1;}
  function drop(id){const r=hash(id*7.3+2);return r<.4?{kind:'ammo',amount:12}:r<.75?{kind:'points',amount:150}:r<.9?{kind:'health',amount:1}:{kind:'ammo',amount:20};}
  function spawnZombie(x,id,variant,player){
    const n=Z.create([],[{kind:'ground',x:0,y:GROUND,w:18000}])[variant];
    return Object.assign(n,{id,x,y:GROUND,homeX:x,homeY:GROUND,spawnType:'earth',phase:'waking',wakeAge:0,alert:true,facing:player.x<x?-1:1,ambush:true});
  }
  // ctx: {player,stats,enemies,platforms,dt,inside,hurt(stats,player,x,projectile,amount),damage(enemy,amount)}
  function update(s,ctx){
    const {player:p,stats:e,enemies,dt,inside}=ctx,events=[];s.time+=dt;
    for(const d of s.debris){d.life-=dt;d.vy+=520*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;if(d.y>GROUND){d.y=GROUND;d.vy*=-.3;d.vx*=.5;}}s.debris=s.debris.filter(d=>d.life>0);
    for(const c of s.crows){if(c.gone)continue;if(!c.flying&&!inside&&Math.hypot(p.x-c.x,p.y-c.y)<120){c.flying=true;c.vx=(c.x<p.x?-1:1)*(70+hash(c.id)*40);c.vy=-90;events.push({type:'crow',x:c.x,y:c.y});}if(c.flying){c.vy-=30*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;if(c.y<GROUND-700)c.gone=true;}}
    if(inside)return events;
    // Lápidas: ceden ante balas, explosiones y golpes cuerpo a cuerpo.
    for(const stone of s.stones){
      if(stone.hp<=0)continue;stone.shake=Math.max(0,stone.shake-dt);let hits=0;
      for(const b of e.bullets||[])if(!b.enemy&&b.life>0&&Math.abs(b.x-stone.x)<11&&b.y>GROUND-34&&b.y<GROUND){b.life=0;hits+=b.damage>=3?2:1;}
      for(const blast of e.explosions||[])if(!blast.stoneChecked?.has(stone.id)&&blast.kind!=='plasma'&&Math.hypot(blast.x-stone.x,blast.y-(GROUND-15))<(blast.radius||80)){(blast.stoneChecked??=new Set()).add(stone.id);hits+=2;}
      const melee=(p.wolfAttack&&!p.wolfAttack.stoneHit&&p.wolfAttack.age>=p.wolfAttack.duration*.38)||(e.weaponAction?.melee&&!e.weaponAction.stoneHit&&e.weaponAction.age>=e.weaponAction.duration*.28);
      if(melee&&Math.abs(p.y-GROUND)<40&&(stone.x-p.x)*(p.facing||1)>-6&&Math.abs(stone.x-p.x)<58){hits+=2;if(p.wolfAttack)p.wolfAttack.stoneHit=true;if(e.weaponAction?.melee)e.weaponAction.stoneHit=true;}
      if(!hits)continue;stone.hp=Math.max(0,stone.hp-hits);stone.shake=.18;
      for(let i=0;i<(stone.hp?4:12);i++)s.debris.push({x:stone.x+(hash(i+s.time)-.5)*14,y:GROUND-8-hash(i+3)*22,vx:(hash(i+s.time*3)-.5)*150,vy:-60-hash(i+5)*130,life:.9+hash(i)*.5,size:hash(i+8)>.6?3:2});
      if(stone.hp<=0)events.push({type:'stone',stone,drop:drop(stone.id)});
    }
    // Rayos: avisan en el suelo, caen donde avisaron y no distinguen bandos.
    if(s.strike){
      const k=s.strike;k.age+=dt;
      if(!k.hit&&k.age>=STRIKE.warn){k.hit=true;events.push({type:'strike',x:k.x});
        if(Math.abs(p.x-k.x)<STRIKE.radius&&p.y>GROUND-70&&!p.burrow&&ctx.hurt)ctx.hurt(e,p,k.x,false,1);
        for(const n of enemies||[])if(n.hp>0&&Math.abs(n.x-k.x)<STRIKE.reach&&Math.abs(n.y-GROUND)<60&&(n.kind!=='zombie'||n.phase==='active'))ctx.damage?.(n,2);
        for(const stone of s.stones)if(stone.hp>0&&Math.abs(stone.x-k.x)<STRIKE.reach){stone.hp=0;events.push({type:'stone',stone,drop:drop(stone.id)});}
        for(let i=0;i<10;i++)s.debris.push({x:k.x+(hash(i+s.time)-.5)*20,y:GROUND-2,vx:(hash(i*3+s.time)-.5)*190,vy:-80-hash(i+1)*150,life:.8,size:2,hot:true});}
      if(k.age>=STRIKE.warn+STRIKE.flash)s.strike=null;
    }else if(inZone(p,inside)){
      s.strikeWait-=dt;
      if(s.strikeWait<=0){s.strikes++;s.strikeWait=STRIKE.minWait+hash(s.strikes*3.1)*(STRIKE.maxWait-STRIKE.minWait);
        // Cae cerca del jugador, adelantado a su marcha, nunca dentro de una reja.
        const lead=(p.vx||0)*.9,x=Math.max(ZONE.from+40,Math.min(ZONE.to-40,p.x+lead+(hash(s.strikes*5.7)-.5)*220));
        s.strike={x,age:0,hit:false,seed:s.strikes};events.push({type:'warn',x});}
    }
    // La Fosa: las rejas se cierran y los muertos salen por oleadas.
    const pit=s.pit;pit.gateRise+=((pit.state==='fight'?1:0)-pit.gateRise)*Math.min(1,dt*5);
    if(pit.state==='idle'&&p.x>PIT.enterFrom&&p.x<PIT.enterTo&&Math.abs(p.y-GROUND)<90){pit.state='fight';pit.wave=0;pit.age=0;pit.spawned=[];ctx.platforms?.push(...s.gates);events.push({type:'pitStart'});}
    if(pit.state==='fight'){
      pit.age+=dt;
      const alive=pit.spawned.filter(n=>n.hp>0).length;
      if(pit.wave<PIT.waves.length&&alive===0&&(pit.wave===0||pit.age>.8)){PIT.waves[pit.wave].forEach((x,i)=>{const id=PIT.ids+pit.spawned.length,n=spawnZombie(x,id,(pit.wave+i)%3,p);pit.spawned.push(n);enemies?.push(n);});pit.wave++;pit.age=0;events.push({type:'pitWave',wave:pit.wave,total:PIT.waves.length});}
      else if(pit.wave>=PIT.waves.length&&alive===0){pit.state='done';release(s,ctx.platforms);events.push({type:'pitEnd',x:(PIT.left+PIT.right)/2});}
      // Salir volando por encima anula el encierro sin premio.
      else if(p.x<PIT.left-PIT.leave||p.x>PIT.right+PIT.leave){pit.state='idle';release(s,ctx.platforms);for(const n of pit.spawned)if(n.hp>0){n.hp=0;n.death=0;}pit.spawned=[];events.push({type:'pitAbort'});}
    }
    return events;
  }
  function release(s,platforms){if(!platforms)return;for(const g of s.gates){const i=platforms.indexOf(g);if(i>=0)platforms.splice(i,1);}}
  // Luces de faroles y del rayo para el mapa de luz de la escena.
  function lights(s,view){
    const list=[];for(const x of LANTERNS)if(x>view.left-200&&x<view.right+200)list.push({x,y:GROUND-52,r:120,a:.75,glow:'255,196,110',ga:.12});
    if(s.strike?.hit)list.push({x:s.strike.x,y:GROUND-120,r:520,a:1,glow:'205,225,255',ga:.3*(1-(s.strike.age-STRIKE.warn)/STRIKE.flash)});
    return list;
  }
  function stone(c,x,y,w,h,light='#6f7168',mid='#55574f',dark='#34362f'){c.fillStyle=mid;c.fillRect(x,y,w,h);c.fillStyle=light;c.fillRect(x,y,w,2);c.fillRect(x,y,2,h);c.fillStyle=dark;c.fillRect(x,y+h-2,w,2);c.fillRect(x+w-2,y,2,h);}
  function drawBack(c,s,view){
    const seen=x=>x>view.left-140&&x<view.right+140;
    for(const x of LANTERNS){if(!seen(x))continue;
      c.fillStyle='#22241f';c.fillRect(x-1,GROUND-58,3,58);c.fillRect(x-6,GROUND-3,13,3);c.fillRect(x-1,GROUND-60,12,2);
      const flick=Math.floor(s.time*9+x)%3;c.fillStyle='#2a2c26';c.fillRect(x+6,GROUND-58,8,11);c.fillStyle=flick?'#ffcf7a':'#ffe9b0';c.fillRect(x+8,GROUND-55,4,6);c.fillStyle='#ff9a3f';c.fillRect(x+9,GROUND-52,2,3);}
    for(const [x,w,h] of TOMBS){if(!seen(x))continue;const top=GROUND-h;
      c.fillStyle='#1a1c1a';c.fillRect(x-4,GROUND-2,w+8,3);
      if(h>50){
        // Panteón alto: basa, fuste con hornacina y cornisa donde apoyar los pies.
        stone(c,x+2,GROUND-12,w-4,12);stone(c,x+7,top+10,w-14,h-22,'#666860','#4c4e47','#2f312c');stone(c,x-3,top,w+6,10,'#84867b','#63655c','#3d3f38');
        c.fillStyle='#22241f';c.fillRect(x+w/2-8,top+22,16,h-40);c.fillRect(x+w/2-6,top+18,12,4);c.fillStyle='#8a8c80';c.fillRect(x+w/2-1,top+28,2,12);c.fillRect(x+w/2-4,top+31,8,2);
      }else{
        // Sarcófago: tapa lisa que sobresale del arca.
        stone(c,x+5,top+9,w-10,h-9,'#666860','#4c4e47','#2f312c');stone(c,x,top,w,9,'#84867b','#63655c','#3d3f38');
        c.fillStyle='#3d3f38';for(let k=x+14;k<x+w-10;k+=18)c.fillRect(k,top+14,8,h-20);
      }
      c.fillStyle='#4f6a3a';for(let k=0;k<5;k++)c.fillRect(Math.round(x+hash(x+k)*w),top+(k%2?1:0),3,2);
    }
    for(const st of s.stones){if(!seen(st.x))continue;const sx=Math.round(st.x+(st.shake>0?Math.sin(s.time*90)*1.5:0));
      if(st.hp<=0){c.fillStyle='#4c4e47';c.fillRect(sx-8,GROUND-5,16,5);c.fillStyle='#63655c';c.fillRect(sx-8,GROUND-5,7,2);c.fillRect(sx+2,GROUND-7,5,3);continue;}
      stone(c,sx-8,GROUND-28,16,28);c.fillStyle='#63655c';c.fillRect(sx-6,GROUND-31,12,3);c.fillRect(sx-3,GROUND-33,6,2);c.fillStyle='#34362f';c.fillRect(sx-1,GROUND-24,2,10);c.fillRect(sx-4,GROUND-21,8,2);
      if(st.hp<2){c.fillStyle='#22241f';c.fillRect(sx-2,GROUND-28,1,9);c.fillRect(sx-1,GROUND-20,1,7);c.fillRect(sx,GROUND-14,1,8);}
    }
    for(const cr of s.crows){if(cr.gone||!seen(cr.x))continue;const flap=cr.flying?Math.floor(s.time*12)%2:0,x=Math.round(cr.x),y=Math.round(cr.y);c.fillStyle='#0d0f12';
      if(cr.flying){c.fillRect(x-2,y-4,5,2);c.fillRect(x-7,y-(flap?7:3),5,2);c.fillRect(x+3,y-(flap?7:3),5,2);}else{c.fillRect(x-2,y-6,5,5);c.fillRect(x+2,y-8,3,3);c.fillRect(x-5,y-3,3,2);c.fillStyle='#c9a14a';c.fillRect(x+5,y-7,2,1);}}
    // Rejas de la Fosa: suben desde el suelo y vuelven a hundirse.
    if(s.pit.gateRise>.02)for(const g of s.gates){if(!seen(g.x))continue;const h=Math.round(PIT.height*s.pit.gateRise),top=GROUND-h;c.fillStyle='#16181a';c.fillRect(g.x,top,g.w,h);c.fillStyle='#3a3d40';for(let k=0;k<3;k++)c.fillRect(g.x+2+k*4,top,2,h);c.fillStyle='#55595c';for(let y=top+8;y<GROUND;y+=26)c.fillRect(g.x-2,y,g.w+4,3);c.fillStyle='#8a8f92';for(let k=0;k<3;k++){c.fillRect(g.x+2+k*4,top-5,2,5);c.fillRect(g.x+1+k*4,top-2,4,1);}}
  }
  function drawFront(c,s,view){
    const seen=x=>x>view.left-140&&x<view.right+140;
    for(const h of HANDS){if(!seen(h.x)&&!seen(h.x+h.w))continue;
      for(let k=0;k<6;k++){const hx=Math.round(h.x+8+k*(h.w-16)/5),reach=7+Math.round((Math.sin(s.time*2.2+k*1.7+h.x)*.5+.5)*11),lean=Math.round(Math.sin(s.time*1.6+k)*2);
        c.fillStyle='#3f5a3c';c.fillRect(hx,GROUND-reach,3,reach);c.fillStyle='#5f8456';c.fillRect(hx+lean,GROUND-reach-3,3,3);c.fillRect(hx+lean-2,GROUND-reach-5,1,3);c.fillRect(hx+lean+1,GROUND-reach-6,1,3);c.fillRect(hx+lean+4,GROUND-reach-5,1,3);}
      c.fillStyle='#2a2f26';c.fillRect(h.x,GROUND-1,h.w,2);}
    for(const d of s.debris){c.fillStyle=d.hot?'#ffe2a0':d.size>2?'#63655c':'#84867b';c.fillRect(Math.round(d.x),Math.round(d.y)-d.size,d.size,d.size);}
    const k=s.strike;
    if(k&&seen(k.x)){
      if(!k.hit){
        // Aviso: escuadras que se cierran y chispas en el punto de caída.
        const u=k.age/STRIKE.warn,r=Math.round(STRIKE.radius*(1.7-u*.7)),on=Math.floor(k.age*(6+u*14))%2;c.fillStyle=on?'#eaf4ff':'#7fb4e6';
        for(const side of [-1,1]){c.fillRect(Math.round(k.x+side*r)-1,GROUND-3,2,4);c.fillRect(Math.round(k.x+side*r)-(side>0?6:-1),GROUND-1,6,2);}
        for(let i=0;i<4;i++)c.fillRect(Math.round(k.x+(hash(i+Math.floor(k.age*18))-.5)*STRIKE.radius*1.6),GROUND-3-Math.round(hash(i+7+Math.floor(k.age*18))*12),2,2);
      }else{
        const fade=1-(k.age-STRIKE.warn)/STRIKE.flash;
        // Rayo: trazo quebrado de píxeles desde fuera de cuadro hasta el suelo.
        let x=k.x+(hash(k.seed)-.5)*120;const top=view.top-20,steps=14;
        for(let i=0;i<steps;i++){const t=(i+1)/steps,nx=i===steps-1?k.x:k.x+(hash(k.seed*9+i)-.5)*90*(1-t),y0=top+(GROUND-top)*(i/steps),y1=top+(GROUND-top)*t,n=Math.max(1,Math.round((y1-y0)/3));
          for(let j=0;j<n;j++){const px=Math.round(x+(nx-x)*j/n),py=Math.round(y0+(y1-y0)*j/n);c.fillStyle=fade>.55?'#ffffff':'#bcd8ff';c.fillRect(px-1,py,fade>.4?4:2,4);if(fade>.5){c.fillStyle='#7fb4e6';c.fillRect(px-3,py,2,3);}}
          x=nx;}
        if(fade>.3){c.fillStyle='#ffffff';c.fillRect(Math.round(k.x)-10,GROUND-4,20,4);c.fillRect(Math.round(k.x)-4,GROUND-10,8,6);}
      }
    }
  }
  // Niebla baja por bandas de píxeles; se dibuja en pantalla, sobre la escena.
  function fog(c,s,camera,width,height,amount){
    if(amount<=.02)return;const base=GROUND-camera.y;
    for(let band=0;band<4;band++){const y=Math.round(base-6-band*9),speed=10+band*7,offset=(s.time*speed+band*90+camera.x*(.9+band*.05))%64;c.fillStyle='rgba(190,204,214,'+(amount*(.2-band*.04)).toFixed(3)+')';
      for(let x=-64-offset;x<width+64;x+=64){c.fillRect(Math.round(x),y,38,3);c.fillRect(Math.round(x+18+band*5),y-3,26,3);}}
  }
  const api={GROUND,ZONE,TOMBS,STONES,LANTERNS,HANDS,PIT,STRIKE,platforms,gates,create,snapshot,inZone,slow,drop,update,lights,drawBack,drawFront,fog};
  if(common)module.exports=api;else root.ArcadeCemeteryEvents=api;
})(typeof window!=='undefined'?window:globalThis);
