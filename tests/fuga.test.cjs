const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../fuga'),Power=require('../powers'),Progress=require('../progression'),Combat=require('../mission-combat'),Arsenal=require('../arsenal'),P=require('../physics'),N=require('../enemies');
test('la escolta se golpea y un empujón lateral puede sacar un coche de la carretera',()=>{
 const s=R.create();s.mode='race';s.boss.z=300;s.speed=64;R.update(s,{},1/120);
 const [a,b]=s.cars;a.z=b.z=50;a.x=b.x=0;R.update(s,{},1/120);
 assert.ok(a.bump&&b.bump&&a.vx*b.vx<0);
 a.bump=b.bump=0;a.z=s.z+1;a.x=4.7;b.z=70;s.x=4.1;s.vx=7;
 R.update(s,{right:true},1/120);assert.ok(s.hp<100&&a.vx>5);
 for(let i=0;i<100;i++)R.update(s,{},1/120);
 assert.ok(a.crash>0);
});
test('el objetivo es alcanzar al fugitivo antes del peaje',()=>{
 const s=R.create();for(let t=0;t<320;t++)R.update(s,{},1/120);
 assert.ok(s.boss.z-s.z>100);assert.equal(s.mode,'race');
 s.z=s.boss.z-3;s.speed=80;R.update(s,{gas:true},1/120);assert.equal(s.mode,'caught');
 const lost=R.create();lost.mode='race';lost.boss.z=R.finish;R.update(lost,{},1/120);assert.equal(lost.mode,'escaped');
});
test('el derrape requiere velocidad, conserva inercia y se corrige al contravirar',()=>{
 const s=R.create();s.mode='race';s.boss.z=400;s.speed=30;
 R.update(s,{right:true,drift:true},1/120);assert.equal(s.driftSide,0);
 s.speed=76;let entries=0;
 for(let i=0;i<38;i++){R.update(s,{right:true,drift:true,gas:true,boost:true},1/120);entries+=s.events.includes('drift');}
 assert.equal(entries,1);assert.equal(s.driftSide,1);assert.ok(s.slip>.48&&s.vx>0&&s.skids.length>2);assert.equal(s.boost,false);
 const old=s.slip;R.update(s,{left:true,drift:true},1/120);
 assert.equal(s.driftSide,0);assert.ok(s.vx>0&&s.slip<old&&s.slip>0);
 for(let i=0;i<25;i++)R.update(s,{left:true,drift:true},1/120);
 assert.ok(s.vx<0&&s.slip<.15);assert.equal(s.driftSide,0);
 R.update(s,{},1/120);R.update(s,{left:true,brake:true},1/120);assert.equal(s.driftSide,-1);
 s.x=6.3;R.update(s,{left:true,drift:true},1/120);assert.equal(s.driftSide,0);
});
test('el policía ve el vehículo, corre hacia su arcén y deja paso antes de que llegue',()=>{
 for(const index of [0,1]){
  const s=R.create(),p=s.posts[index];s.mode='race';s.boss.z=p.z+350;s.z=p.z-140;s.speed=83;
  const start=p.officerX,seen=new Set();let previous=start;
  while(s.z<p.z&&s.mode==='race'){
   R.update(s,{gas:true},1/120);seen.add(p.phase);
   const distance=(p.officerX-previous)*p.side;
   assert.ok(distance>=-1e-7&&distance<=5.6/120+1e-7);previous=p.officerX;
   if(p.phase==='watch'||p.phase==='alert')assert.equal(p.officerX,start);
  }
  assert.ok(seen.has('watch')&&seen.has('alert')&&seen.has('run'));assert.ok(p.officerX*p.side>9);
 }
});
test('una valla deja espacio para pasar y un impacto sólo se aplica una vez',()=>{
 for(const hit of [false,true]){
  const s=R.create(),p=s.posts[0];s.mode='race';s.speed=80;s.z=p.z-.4;s.boss.z=p.z+300;s.x=hit?p.x:0;
  R.update(s,{gas:true},1/120);
  assert.equal(s.events.includes('barrier'),hit);assert.equal(p.hitAt!==null,hit);
  if(hit){assert.equal(s.hp,93);assert.ok(s.speed<65);R.update(s,{},1/120);assert.equal(s.events.includes('barrier'),false);}
 }
 const fresh=R.create();assert.ok(fresh.posts.every(post=>post.phase==='watch'&&post.hitAt===null));
 assert.equal(R.finish,8050);assert.ok(fresh.posts.every((p,i)=>p.z<R.finish&&(!i||p.z-fresh.posts[i-1].z>1000)));
});
test('el camuflaje de premio evita el impacto de una bala en vuelo y la detección durante seis segundos',()=>{
 const profile=Progress.fresh(),p=P.createPlayer(),e=Combat.create(Arsenal.createInventory()),powers=Power.create();
 assert.equal(Progress.buy(profile,'cloak').ok,false);profile.owned=['cloak'];profile.equipped='cloak';p.x=250;p.y=400;
 const n=N.createSoldier({x:320,y:400,facing:-1},0);e.enemies=[n];const hp=e.hp;
 e.bullets=[{x:227,y:378,vx:450,vy:0,life:2,enemy:true,fromSoldier:true,damage:2}];
 for(let i=0;i<110;i++)Combat.update(e,p,{power:i===0},1/120,[],powers,profile,{left:0,right:960,top:0,bottom:540});
 assert.equal(e.hp,hp);assert.equal(n.alert,false);assert.equal(e.bullets.length,1);assert.ok(e.bullets[0].x>p.x);
 for(let i=0;i<660;i++)Power.update(powers,e,p,profile,false,1/120);
 assert.equal(p.cloak,0);assert.ok(powers.cooldowns.cloak>0);
});
