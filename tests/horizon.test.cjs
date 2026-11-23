const test=require('node:test'),assert=require('node:assert/strict');
const W=require('../horizon-world'),R=require('../horizon-renderer'),Campaign=require('../campaign');
const step=1/120;
function sail(s){
  const next=W.items.find(o=>o.kind!=='mine'&&o.z>s.route);
  const bend=W.center(s.route+30)-W.center(s.route);
  const target=next&&next.z-s.route<230?next.x-W.center(next.z):0;
  return {fire:true,special:true,x:W.clamp((target-s.lane+bend*.75-s.slide*.2)/13,-1,1),y:-1,boost:Math.abs(bend)<5};
}
function fly(s){
  const p=s.player,boss=s.enemies.find(n=>n.kind==='carrier'),input={fire:true,special:true};
  if(s.blend<.02){
    const target=s.enemies.filter(n=>n.z>p.z+25).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
    input.x=W.clamp(((target?.x??30*Math.sin(s.t))-p.x)/18,-1,1);
  }else if(boss){
    const x=boss.x-p.x,y=boss.y-p.y,z=boss.z-p.z;
    const lateral=-x*Math.cos(boss.yaw)+z*Math.sin(boss.yaw);
    input.x=W.clamp((26*Math.sin(boss.age*1.22)-lateral)/9,-1,1);
    input.y=W.clamp(-Math.atan2(y,Math.hypot(x,z))/.53,-1,1);
  }else{input.x=.32*Math.sin(s.t*.32);input.y=.2*Math.cos(s.t*.66);}
  return input;
}
const Rig=require('../oil-rig');
function climb(s){
  const r=s.rig,p=r.p;
  if(r.deck<4){
    const dx=Rig.ladders[r.deck].x-p.x;
    return Math.abs(dx)>12?{x:Math.sign(dx),run:true,fire:true}:{y:-1,fire:true};
  }
  const b=r.boss,dx=b.x-p.x;
  const jump=r.hazards.some(h=>['wave','barrel'].includes(h.kind)&&Math.abs(h.x-p.x)<64)||b.move==='rush'&&Math.abs(dx)<85;
  return {x:Math.sign(dx)!==p.facing?Math.sign(dx):0,fire:true,special:r.grenade<=0,jump};
}
test('las armas permiten atravesar el delta, abordar y ganar solo después de combatir en la cima',()=>{
  let s=W.create(9);const events=[];
  while(!s.rig&&s.phase==='play'&&s.t<150){
    const previous=s.player.y,notes=W.update(s,sail(s),step);
    if(notes.some(e=>e.type==='jump')){
      assert.ok(Math.abs(s.player.y-previous)<.4,'el casco mantiene la altura en el borde de la rampa');
      assert.ok(s.player.y-W.swell(s.player.x,s.player.z,s.t)>=2,'despega desde el extremo elevado');
    }
    events.push(...notes);
  }
  assert.equal(s.phase,'play');assert.equal(s.checkpoint,3);assert.equal(s.rig.deck,0);
  const count=type=>events.filter(e=>e.type===type).length;
  assert.ok(count('jump')>=8&&count('gate')===0);assert.equal(count('splash'),count('jump'));
  assert.ok(count('torpedo')>10&&count('stern')>2);assert.ok([...s.awards].some(id=>id.startsWith('patrol-')));
  assert.equal(count('won'),0);
  while(s.phase==='play'&&s.t<210)events.push(...W.update(s,climb(s),step));
  if(s.phase==='lost'){
    assert.equal(s.hp,0);assert.equal(s.checkpoint,5);
    s=W.retry(s);
    while(s.phase==='play'&&s.t<90)events.push(...W.update(s,climb(s),step));
  }
  assert.equal(s.checkpoint,5);assert.equal(s.phase,'won');assert.equal(count('won'),1);
  assert.equal(count('board'),1);assert.equal(count('boss'),1);assert.equal(count('foremanDown'),1);
});
test('el abordaje conserva el progreso y la reaparición funciona en cada cubierta de control',()=>{
  const s=W.create(9);s.checkpoint=2;s.route=W.riverLength-.1;s.awards.add('gate25');s.score=180;
  W.update(s,{},step);assert.ok(s.rig);
  for(const cp of [3,4,5]){
    const next=W.retry({...s,checkpoint:cp});
    assert.equal(next.route,W.riverLength);assert.equal(next.grace,5);assert.equal(next.rig.deck,(cp-3)*2);
    assert.deepEqual([...next.awards],['gate25']);assert.equal(next.score,180);assert.equal(next.phase,'play');
    W.update(next,{fire:true},step);
    const copy=W.restore(9,JSON.parse(JSON.stringify(W.snapshot(next))));
    for(let i=0;i<65;i++){W.update(next,{x:1},step);W.update(copy,{x:1},step);}
    assert.deepEqual(W.snapshot(next),W.snapshot(copy));assert.notEqual(next.rig.p,copy.rig.p);
  }
  const old=W.snapshot(W.create(9));delete old.wave;old.route=1950;old.rivals=[{z:900,lane:5,speed:80}];
  assert.equal(W.restore(9,old).wave,4);assert.equal(W.restore(9,old).rivals.length,0);
});
test('las patrulleras de proa se aproximan y las de popa llegan desde atrás antes de abrir fuego',()=>{
  for(const wave of [0,1]){
    const s=W.create(9);s.wave=wave;s.route=51+wave*485;s.player.z=s.route;
    W.update(s,{},step);const n=s.rivals[0];
    assert.equal(Math.sign(n.z-s.route),wave?-1:1);assert.equal(n.heading,wave?1:-1);
    const before=n.z;W.update(s,{fire:true,special:true},step);assert.ok(wave?n.z>before:n.z<before);
    assert.equal(s.shots.filter(b=>b.kind==='seaRound').length,2);
    const q=s.shots.find(b=>b.kind==='torpedo');assert.equal(q.dir,wave?-1:1);
    if(wave){
      assert.equal(q.target,n.id);
      for(let k=0;k<170;k++)W.update(s,{},step);
      assert.ok(s.awards.has(n.id));assert.ok(!s.shots.some(b=>b.enemy));
    }
  }
});
test('el contramaestre anticipa cinco ataques diferentes y el barril golpea cubierta y rueda',()=>{
  const s=W.retry({...W.create(9),checkpoint:5}),r=s.rig,log=[],found=new Set();
  r.p.x=75;
  let rolling=false;
  for(let j=0;j<2400;j++){
    for(const e of W.update(s,{},step))if(e.type.startsWith('foreman'))log.push(e);
    for(const h of r.hazards){found.add(h.kind);if(h.kind==='barrel'&&Math.abs(h.y-(Rig.floors[4]-13))<1&&Math.abs(h.angle)>2)rolling=true;}
    if(new Set(log.filter(e=>e.type==='foremanStrike').map(e=>e.attack)).size===5&&found.has('wave'))break;
  }
  const strikes=log.filter(e=>e.type==='foremanStrike').map(e=>e.attack);
  assert.equal(new Set(strikes.slice(0,5)).size,5);assert.ok(rolling);
  for(const k of ['barrel','wrench','wave','hook'])assert.ok(found.has(k),k);
  for(const name of strikes)assert.ok(log.findIndex(e=>e.type==='foremanTell'&&e.attack===name)<log.findIndex(e=>e.type==='foremanStrike'&&e.attack===name));
});
test('en cenital las tres escoltas conservan su posición en pantalla y se pueden derribar',()=>{
  const s=W.create(10),events=[];
  for(let k=0;k<480;k++)events.push(...W.update(s,{},step));
  const guards=s.enemies.filter(n=>n.mission==='station');
  assert.equal(guards.length,3);assert.ok(guards.every(n=>n.settled));
  const positions=guards.map(n=>R.project(R.camera(s),n));
  for(let k=0;k<880;k++)W.update(s,{x:k<410?1:-1,y:k<450?-1:1,boost:k%180<90},step);
  for(const [i,n] of guards.entries()){
    assert.ok(s.enemies.includes(n));const at=R.project(R.camera(s),n);
    assert.ok(Math.abs(at[0]-positions[i][0])<.1&&Math.abs(at[1]-positions[i][1])<.1);
    assert.ok(at[0]>20&&at[0]<620&&at[1]>35&&at[1]<180);
  }
  assert.ok(s.enemies.length<=5);
  const n=guards[1];for(let k=0;k<700&&n.hp>0;k++)W.update(s,{x:W.clamp((n.x-s.player.x)/3,-1,1),fire:true},step);
  assert.ok(s.awards.has(n.id));
});
test('en ambas vistas el refuerzo anunciado cruza desde atrás y da tiempo para verlo antes de disparar',()=>{
  for(const three of [false,true]){
    const s=W.create(10);if(three){s.route=W.turnAt+W.orbitLength+44;s.player.z=s.route;s.player.yaw=1.3;s.nextWave=Math.floor(s.route/555);}
    const events=W.update(s,{},step);
    assert.ok(events.some(e=>e.type==='rearWing'));
    const n=s.enemies.find(e=>e.fromRear);assert.ok(n);
    const ahead=()=>(n.x-s.player.x)*Math.sin(s.player.yaw)+(n.z-s.player.z)*Math.cos(s.player.yaw);
    assert.ok(ahead()<-65);let seen=0;
    for(let k=0;k<570;k++){
      W.update(s,{x:three?.25:0,boost:three},step);
      const at=R.project(R.camera(s),n);
      if(at&&at[0]>0&&at[0]<640&&at[1]>0&&at[1]<360&&ahead()>0)seen+=step;
      if(n.settled||three&&n.mission==='intercept')break;
      assert.ok(s.enemies.includes(n));assert.ok(!n.settled&&(!three||n.mission==='overtake'));
    }
    assert.ok(seen>.4);assert.ok(ahead()>30);assert.ok(n.fire>.8);
  }
});
test('el Cénit conserva posición y orientación bajo fuego, al esquivar, guardar y reintentar',()=>{
  const s=W.retry({...W.create(10),checkpoint:2}),boss=s.enemies[0];
  const coords=n=>[n.x,n.y,n.z,n.yaw],anchor=coords(boss);let shots=0;
  boss.hp=boss.maxHp*.45;
  for(let k=0;k<1320;k++){
    W.update(s,{x:k%350<175?1:-1,y:k%260<130?.65:-.65,boost:k%400<180},step);
    const at=R.project(R.camera(s),boss);
    assert.deepEqual(coords(boss),anchor);assert.ok(at&&at[0]>40&&at[0]<600&&at[1]>16&&at[1]<334);
    shots+=Number(s.shots.some(b=>b.enemy));
  }
  assert.ok(shots>0&&boss.coreOpen);
  const copy=W.restore(10,JSON.parse(JSON.stringify(W.snapshot(s))));
  for(let k=0;k<18;k++){W.update(s,{x:.5},step);W.update(copy,{x:.5},step);}
  assert.deepEqual(W.snapshot(s),W.snapshot(copy));
  const legacy=W.snapshot(s);delete legacy.enemies[0].anchored;const loaded=W.restore(10,legacy);
  assert.ok(loaded.enemies[0].anchored);assert.equal(loaded.enemies[0].hp,boss.hp);
  assert.ok(W.retry(s).enemies[0].anchored);
});
test('el impacto sigue el contorno del Cénit y el núcleo violeta recibe daño doble',()=>{
  const s=W.retry({...W.create(10),checkpoint:2}),n=s.enemies[0];
  function hit(x,y){
    const hp=n.hp;
    s.shots.push({x:n.x+x,y:n.y+y,z:n.z-9,vx:0,vy:0,vz:330,kind:'tracer',life:1,damage:2});
    W.update(s,{},.05);return hp-n.hp;
  }
  assert.equal(hit(0,0),4);assert.equal(hit(32,4),2);assert.equal(hit(41,18),0);assert.equal(hit(0,-13),0);
});
test('el avión recorre ambos modos y derriba al Cénit con cañón y misiles sin cambiar el modelo',()=>{
  const s=W.create(10),events=[];let previous=null,orbitFrames=0,midTime=0;
  while(s.phase==='play'&&s.t<160){
    events.push(...W.update(s,fly(s),step));
    const xy=R.project(R.camera(s),s.player);
    assert.ok(xy&&xy[0]>4&&xy[0]<636&&xy[1]>4&&xy[1]<356);
    if(s.blend>0&&s.blend<1){orbitFrames++;if(s.blend>=.5&&!midTime)midTime=s.t;
      assert.ok(Math.hypot(xy[0]-previous[0],xy[1]-previous[1])<2);}
    previous=xy;
  }
  assert.equal(s.phase,'won');assert.ok(orbitFrames>480);assert.ok(midTime/s.t>.4&&midTime/s.t<.65);
  for(const type of ['boss','blast','missile','gun','won'])assert.ok(events.some(e=>e.type===type),type);
});
test('guardar durante el giro conserva posición, proyectiles y el encuadre en la siguiente actualización',()=>{
  const s=W.create(10);s.route=W.turnAt+W.orbitLength*.56;s.player.z=s.route;
  W.update(s,{x:.6,fire:true},step);const copy=W.restore(10,JSON.parse(JSON.stringify(W.snapshot(s))));
  for(let j=0;j<25;j++){W.update(s,{x:.3,y:-.4},step);W.update(copy,{x:.3,y:-.4},step);}
  assert.deepEqual(W.snapshot(s),W.snapshot(copy));assert.deepEqual(R.camera(s),R.camera(copy));
});
test('Nueva York abre el delta y solo ganar el delta abre Último vector',()=>{
  assert.equal(Campaign.available('m9',8,[6],false),false);assert.equal(Campaign.available('m9',8,[6,8],false),true);
  assert.equal(Campaign.available('m10',8,[6,8],false),false);assert.equal(Campaign.available('m10',9,[6,8,9],false),true);
});

test('el casco acusa el fuego de una patrullera y el abordaje lateral separa ambos cascos',()=>{
  const s=W.create(9);s.wave=200;s.player.z=s.route=800;s.lane=0;
  const patrol=(dz,lane)=>({id:'control',z:s.route+dz,x:W.center(s.route+dz)+lane,y:0,lane,baseLane:lane,origin:'bow',heading:-1,age:1,hp:8,reload:0,phase:0,flash:0});
  s.rivals=[patrol(84,7)];const events=[];
  for(let i=0;i<180;i++)events.push(...W.update(s,{},step));
  assert.ok(events.some(e=>e.type==='patrolGun'));assert.ok(s.hp<100);
  s.grace=0;s.rivals=[patrol(3,s.lane)];const last=s.hp;
  assert.ok(W.update(s,{},step).some(e=>e.type==='ram'));
  assert.ok(s.hp<last);assert.ok(Math.abs(s.player.x-s.rivals[0].x)>4);
  assert.ok(W.items.every(o=>o.kind!=='gate'));
});
test('un fusilero hiere al soldado en cubierta y el daño continúa tras guardar y reanudar',()=>{
  let s=W.retry({...W.create(9),checkpoint:3});s.grace=0;
  for(let i=0;i<700&&s.hp===100;i++)W.update(s,{},step);
  assert.ok(s.hp>0&&s.hp<100);
  const health=s.hp;s=W.restore(9,JSON.parse(JSON.stringify(W.snapshot(s))));
  for(let i=0;i<700&&s.hp===health;i++)W.update(s,{},step);
  assert.ok(s.hp<health);
});

test('el modo de prueba solo protege el casco y al soldado al activar invulnerabilidad',()=>{
  const s=W.create(9);s.route=s.player.z=800;s.player.x=W.center(800);s.wave=200;s.grace=0;
  const collide=()=>{s.rivals=[{id:'control',z:s.route+3,x:s.player.x,y:0,lane:s.lane,baseLane:s.lane,origin:'bow',heading:-1,age:1,hp:8,reload:5,phase:0,flash:0}];W.update(s,{},step);};
  s.god=true;collide();assert.equal(s.hp,100);
  s.god=false;collide();assert.ok(s.hp<100);
  const rig=W.retry({...W.create(9),checkpoint:3});rig.grace=0;rig.god=true;
  for(let i=0;i<850;i++)W.update(rig,{},step);
  assert.equal(rig.hp,100);rig.god=false;
  for(let i=0;i<850&&rig.hp===100;i++)W.update(rig,{},step);
  assert.ok(rig.hp<100);
});
test('el checkpoint de la torre conserva forma, arma y munición tras perder una vida',()=>{
  const s=W.retry({...W.create(9),checkpoint:3}),rig=require('../oil-rig');
  const gear=rig.equip(s,undefined,{form:'wolf'});
  gear.e.inventory.ammo[5]=112;
  const next=W.retry(s),again=rig.equip(next);
  assert.equal(next.rig.p.form,'wolf');assert.equal(again.e.inventory.selected,gear.e.inventory.selected);
  assert.equal(again.e.inventory.ammo[5],112);
});

test('la patrulla de la torre usa la vista y el oído del fusilero y admite guardados anteriores',()=>{
  const s=W.retry({...W.create(9),checkpoint:3}),r=s.rig,n=r.guards[0];s.god=true;
  n.facing=1;W.update(s,{},step);assert.equal(n.alert,false);
  W.update(s,{fire:true},step);assert.ok(n.alert);assert.equal(n.awareness,'sound');
  const old=n.x;for(let i=0;i<105;i++)W.update(s,{},step);
  assert.ok(n.x<old-10&&n.facing===-1&&n.runCycle>0);
  const data=W.snapshot(s);data.rig.guards=[{deck:0,home:396,id:n.id,x:n.x,y:n.y,face:-1,hp:2,dead:0,scriptedAI:true}];
  const restored=W.restore(9,data);W.update(restored,{},step);
  const guard=restored.rig.guards[0];assert.equal(guard.kind,'rifle');assert.ok(guard.hp>0&&guard.hp<guard.maxHp&&guard.alert);
});
test('los poderes y mejoras comprados funcionan en cubierta y el rayo y el dron conservan sus blancos al reanudar',()=>{
  const Progress=require('../progression'),profile=Progress.fresh();profile.wallet=90000;
  for(const id of ['life','jet','jump','speed','damage','rate','regen','shield','flame','orbital','drone','turret','cryo','wave','heal'])
    assert.equal(Progress.buy(profile,id).ok,true,id);
  const s=W.retry({...W.create(9),checkpoint:3});s.grace=0;
  const r=s.rig,n=r.guards[0],gear=Rig.equip(s,profile);n.hp=n.maxHp=500;
  n.x=r.p.x+70;n.frozen=20;
  assert.deepEqual([r.p.maxJumps,r.p.fuelMax,r.p.speedBonus,r.p.damageBonus,r.p.rateBonus,r.p.regenLevel,r.p.shield,gear.e.maxHp],[3,1476,1.08,1.1,1.1,1,10,9]);
  for(const id of ['cryo','wave','turret','heal','flame','drone','orbital']){
    profile.equipped=id;if(id==='heal')gear.e.hp--;
    W.update(s,{power:true},step);assert.ok(gear.powers.cooldowns[id]>0,id);
  }
  assert.ok(n.hp<500&&n.frozen>0&&gear.powers.turrets.length===1&&gear.powers.flame>0&&gear.e.hp===gear.e.maxHp);
  const saved=W.snapshot(s),copy=W.restore(9,JSON.parse(JSON.stringify(saved))),restored=Rig.equip(copy,profile);
  assert.equal(restored.powers.drones[0].target,copy.rig.guards[0]);assert.ok(restored.powers.beams[0].hits instanceof Set);
  for(let j=0;j<62;j++)W.update(copy,{},step);
  assert.ok(restored.powers.beams[0].hits.has(copy.rig.guards[0]));
  const again=W.restore(9,JSON.parse(JSON.stringify(W.snapshot(copy)))),resumed=Rig.equip(again,profile);
  assert.ok(resumed.powers.beams[0].hits.has(again.rig.guards[0]));
});

test('el contramaestre cae desde su altura, apoya el cuerpo y mantiene la pose antes del epílogo',()=>{
  for(const height of [0,62]){
    let s=W.retry({...W.create(9),checkpoint:5});
    const roof=Rig.floors[4],notes=[],frames=new Set();
    Object.assign(s.rig.boss,{move:'stomp',hp:0,y:roof-height});
    let lastY=s.rig.boss.y;
    for(let i=0;i<360&&s.phase==='play';i++){
      notes.push(...W.update(s,{},step));
      const boss=s.rig.boss;
      assert.ok(boss.y>=lastY&&boss.y<=roof);lastY=boss.y;
      if(i===0&&height)assert.ok(boss.y<roof-60);
      frames.add(Rig.collapseFrame(boss.groundedAge));
      if(i===72)s=W.restore(9,JSON.parse(JSON.stringify(W.snapshot(s))));
    }
    assert.deepEqual([...frames],[0,1,2,3,4,5,6,7]);
    assert.equal(s.phase,'won');assert.ok(s.rig.boss.groundedAge>=1.8);
    for(const type of ['foremanDown','foremanImpact','won'])assert.equal(notes.filter(n=>n.type===type).length,1);
  }
});

test('las oleadas presentan los siete modelos incluso con las tres escoltas originales en su puesto',()=>{
  const models=new Set(),s=W.create(10);s.god=true;
  while(s.route<W.turnAt){W.update(s,{},step);for(const n of s.enemies)models.add(n.model);}
  assert.deepEqual(models,new Set(require('../cenit-combat').fleet.map(m=>m.id)));
});
test('la derrota del Cénit conserva sus ocho poses al guardar y entrega una sola victoria',()=>{
  const s=W.retry({...W.create(10),checkpoint:2}),b=s.enemies[0];
  b.hp=1;s.shots.push({x:b.x,y:b.y,z:b.z-3,vx:0,vy:0,vz:300,kind:'tracer',life:1,damage:3});
  const notes=[],seen=new Set();let current=s;
  for(let i=0;i<510&&current.phase==='play';i++){
    notes.push(...W.update(current,{},step));const boss=current.enemies[0];
    if(boss.defeat!=null)seen.add(Math.min(7,Math.floor(boss.defeat/2.60*8)));
    if(i===130)current=W.restore(10,JSON.parse(JSON.stringify(W.snapshot(current))));
  }
  assert.equal(current.phase,'won');assert.equal(seen.size,8);
  for(const event of ['cenitDown','hullBreak','won'])assert.equal(notes.filter(n=>n.type===event).length,1);
  assert.equal(current.shots.length,0);
});
