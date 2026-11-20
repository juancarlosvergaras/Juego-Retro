// The escalators of mission six, frame by frame (1/120 s): a short scripted
// crossing with a veil, the same on the way up and on the way down.
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../mall-world'),P=require('../physics'),C=require('../mission-combat'),V=require('../powers'),A=require('../soldier-animation');
const dt=1/120,forms=['soldier','wolf','zombie','robot','tank','fighter','hero'];
function setup(floor,x,form='soldier',saved={}){
 const s=M.create({floor,started:true,x,y:M.FLOOR,...saved}),p=P.createPlayer(),e=C.create({owned:[1,3],selected:3,ammo:{3:200}});
 p.form=form;M.configure(s,p,e);e.invincible=0;
 return {s,p,e,powers:V.create(),profile:{owned:[],levels:{}}};
}
// Position inside the building: the rooms overlap on each landing.
const origin=floor=>M.escalator(floor).exit-M.landingX;
const across=floor=>{let x=0;for(let f=0;f<floor;f++)x+=origin(f);return x;};
// One simulation step in the order of the game: movement, combat, world.
function step(g,input={},combat=false){
 const {s,p,e}=g,held=s.stairs.active?{}:input;
 M.stepPlayer(s,p,held,dt);A.advanceWalk(p,dt);
 if(combat)C.update(e,p,held,dt,s.geometry.platforms,g.powers,g.profile,{left:s.camera.x,right:s.camera.x+960,top:0,bottom:540});
 const events=M.update(s,p,e,input,dt);
 return {floor:s.floor,x:p.x,y:p.y,vx:p.vx,grounded:p.grounded,facing:p.facing,walk:p.walkCycle||0,
  bx:p.x+across(s.floor),by:p.y-146*s.floor,camera:s.camera.x,cameraY:s.camera.y,sx:p.x-s.camera.x,sy:p.y-s.camera.y,
  active:s.stairs.active,phase:s.stairs.phase,fade:s.stairs.fade,events};
}
// Holds a direction until a crossing has started and finished; returns its frames.
function cross(g,input,limit=6){
 const rows=[];let started=false;
 for(let i=0;i<limit/dt;i++){
  const row=step(g,input);
  if(row.active)started=true;
  if(started)rows.push(row);
  if(started&&!row.active)return rows;
 }
 assert.fail('the crossing did not '+(started?'finish':'start'));
}
const seconds=rows=>rows.length*dt;
const upFrom=(floor,form)=>setup(floor,M.escalator(floor).entry-90,form);
const downFrom=(floor,form)=>setup(floor,M.arrivalX+90,form);

test('each escalator is a short crossing to the next floor, and the way down mirrors the way up',()=>{
 for(const floor of [0,1,2]){
  const st=M.escalator(floor),up=upFrom(floor),rise=cross(up,{right:true}),last=rise.at(-1);
  assert.equal(up.s.floor,floor+1);assert.equal(up.s.checkpoint,floor+1);
  assert.equal(rise.flatMap(r=>r.events).filter(v=>v.type==='checkpoint').length,1,'one checkpoint per crossing');
  assert.ok(last.x>=M.arrivalX&&last.x<M.arrivalX+6&&last.y===M.FLOOR&&last.grounded&&last.facing===1,'arrives standing on the new floor, facing on');
  assert.ok(seconds(rise)>1.4&&seconds(rise)<2.6,'up takes '+seconds(rise).toFixed(2)+' s');
  const down=downFrom(floor+1),fall=cross(down,{left:true}),foot=fall.at(-1);
  assert.equal(down.s.floor,floor);assert.equal(down.s.checkpoint,floor);
  assert.ok(foot.x<=st.entry-4&&foot.x>st.entry-10&&foot.y===M.FLOOR&&foot.grounded&&foot.facing===-1,'steps off at the foot');
  assert.ok(Math.abs(seconds(rise)-seconds(fall))<.25,'both directions take the same time: '+seconds(rise).toFixed(2)+' / '+seconds(fall).toFixed(2));
  // The veil: closes, holds, opens. 0.5–0.9 s in all and identical in both directions.
  const veils=[rise,fall].map(rows=>{
   const veil=rows.filter(r=>r.fade>0),peak=veil.findIndex(r=>r.fade===1),end=veil.findLastIndex(r=>r.fade===1);
   assert.ok(peak>0&&end>=peak,'it closes completely');
   for(let i=1;i<veil.length;i++)assert.ok(i<=peak?veil[i].fade>=veil[i-1].fade:i>end?veil[i].fade<=veil[i-1].fade:veil[i].fade===1,'it closes once and opens once');
   assert.equal(rows.find(r=>r.floor!==rows[0].floor).fade,1,'the rooms change only behind the closed veil');
   return {total:seconds(veil),closing:peak*dt,closed:(end-peak+1)*dt,opening:(veil.length-1-end)*dt};
  });
  for(const v of veils){
   assert.ok(v.total>=.5&&v.total<=.9,'veil '+v.total.toFixed(3)+' s');
   assert.ok(Math.abs(v.closing-M.crossing.out)<.02&&Math.abs(v.opening-M.crossing.in)<.02&&v.closed<M.crossing.hold+.03);
  }
  assert.ok(Math.abs(veils[0].total-veils[1].total)<=dt+1e-9);
  assert.equal(M.crossing.out,M.crossing.in,'symmetric');
 }
});
test('nothing jumps: the walk through the building is continuous and the frame only cuts behind the closed veil',()=>{
 for(const form of forms){
  for(const floor of [0,1,2]){
   for(const rows of [cross(upFrom(floor,form),{right:true}),cross(downFrom(floor+1,form),{left:true})]){
    const dir=rows.at(-1).facing;let cuts=0;
    for(let i=1;i<rows.length;i++){
     const a=rows[i-1],b=rows[i],label=form+' floor '+floor+' frame '+i;
     // No teleport: both rooms share the landing, so the path is a single line.
     assert.ok(Math.hypot(b.bx-a.bx,b.by-a.by)<3.2,label+' moves '+Math.hypot(b.bx-a.bx,b.by-a.by).toFixed(2)+' px');
     assert.ok((b.bx-a.bx)*dir>=0,label+' never steps back');
     const onScreen=Math.hypot(b.sx-a.sx,b.sy-a.sy),frame=Math.abs(b.camera-a.camera);
     if(onScreen>3.2||frame>3){cuts++;assert.ok(b.fade===1&&a.fade>.99,label+' cuts in view');}
     assert.equal(b.cameraY,0);
    }
    assert.equal(cuts,1,form+' exactly one cut, when the rooms change');
    // A walk, not a slide: on its feet the whole way, striding with its own gait.
    assert.ok(rows.every(r=>r.grounded),form+' stays on the treads');
    assert.ok(rows.slice(12).every(r=>r.vx*dir>100),form+' keeps walking');
    for(let i=24;i<rows.length;i+=24)assert.ok(rows[i].walk-rows[i-24].walk>.15,form+' animates its steps');
   }
  }
 }
});
test('the frame of each floor is its own: it settles at both ends without showing the next room',()=>{
 for(const floor of [0,1,2]){
  const low=floor?-90:0,high=M.widths[floor]-870;let previous=M.cameraX(floor,0);
  assert.equal(previous,low);assert.equal(M.cameraX(floor,M.widths[floor]),high);
  for(let x=1;x<=M.widths[floor];x++){
   const camera=M.cameraX(floor,x);
   assert.ok(camera>=previous&&camera-previous<=1+1e-9&&camera>=low&&camera<=high,'floor '+floor+' x '+x);previous=camera;
  }
  assert.ok(Math.abs(M.cameraX(floor,2000)-1680)<1e-9,'mid-floor the player stays a third into the frame');
  const st=M.escalator(floor);
  assert.equal(M.cameraX(floor,st.entry),high,'the frame rests before boarding');
  assert.equal(M.cameraX(floor+1,M.arrivalX),floor===2?0:-90,'and on arrival');
  assert.ok(st.exit-high<960&&st.entry-high>300,'the whole escalator is in the frame');
 }
 for(const x of [20,84,270,400,936])assert.equal(M.cameraX(3,x),0,'the roof is one fixed frame');
});
test('nobody is hurt and nobody fires across a crossing',()=>{
 for(const [floor,dir] of [[0,1],[1,-1]]){
  const g=dir>0?upFrom(floor):downFrom(floor),{s,p,e}=g,input=dir>0?{right:true}:{left:true};
  // An alerted rifleman right behind, about to shoot, and a bullet already in flight.
  const guard=s.enemies.find(n=>n.kind==='rifle');
  Object.assign(guard,{x:p.x-dir*150,y:M.FLOOR,facing:dir,memory:5,lastKnown:{x:p.x,y:p.y},alert:true,shot:.05});
  let fired=0;for(let i=0;i<60&&!s.stairs.active;i++){step(g,{},true);fired+=e.bullets.filter(b=>b.enemy).length;}
  assert.ok(fired>0,'the guard does shoot when there is no crossing');
  // Now the player stands one step from the escalator with the same guard behind.
  p.x=dir>0?M.escalator(floor).entry-1:M.returnX+1;
  Object.assign(guard,{x:p.x-dir*150,facing:dir,memory:5,lastKnown:{x:p.x,y:p.y},alert:true,shot:.25,flash:0});
  Object.assign(e,{hp:e.maxHp,invincible:0,damageTaken:0,bullets:[{x:p.x-dir*60,y:p.y-24,vx:dir*400,vy:0,life:2,enemy:true,damage:1}]});
  let frames=0,started=false;
  for(let i=0;i<6/dt;i++){
   const row=step(g,input,true);
   if(row.active){started=true;frames++;
    assert.equal(e.bullets.filter(b=>b.enemy).length,0,'no enemy bullet at frame '+frames);
    assert.equal(e.enemies.length,0,'the guards hold');assert.ok(e.invincible>0);
   }else if(started)break;
  }
  assert.ok(started&&!s.stairs.active&&s.floor===floor+dir);
  assert.equal(e.hp,e.maxHp);assert.equal(e.damageTaken,0);assert.equal(e.dead,false);
  assert.ok(e.invincible>=.9,'a moment of cover on arrival');
  assert.equal(guard.flash,0,'the guard left behind never fired');
  step(g,{},true);assert.equal(e.enemies,s.enemies,'the fight resumes with the guards of the new floor');
 }
});
test('control returns on the new floor, and the keys held through the crossing still count',()=>{
 for(const floor of [0,1,2]){
  const g=upFrom(floor),{s,p}=g;cross(g,{right:true});
  const x=p.x;for(let i=0;i<30;i++)step(g,{right:true});
  assert.ok(p.x>x+30&&!s.stairs.active,'keeps walking with the key that was held');
  for(let i=0;i<30;i++)step(g,{});assert.equal(p.vx,0,'and stops when it is released');
  step(g,{jumpPressed:true});assert.ok(!p.grounded&&p.vy<0,'jumps again');
  // A tap is enough: the crossing finishes without any key.
  const tap=upFrom(floor);let rows=0;
  for(let i=0;i<6/dt;i++){const row=step(tap,tap.s.stairs.active||tap.s.floor>floor?{}:{right:true});if(row.active)rows++;else if(rows)break;}
  assert.equal(tap.s.floor,floor+1);assert.ok(!tap.s.stairs.active&&tap.p.x>=M.arrivalX);
  // During the crossing the controls do nothing.
  const busy=upFrom(floor);while(!busy.s.stairs.active)step(busy,{right:true});
  for(let i=0;i<40;i++){
   M.stepPlayer(busy.s,busy.p,{left:true,jumpPressed:true,down:true,run:true,jetpackPressed:true},dt);M.update(busy.s,busy.p,busy.e,{left:true},dt);
   assert.ok(busy.p.grounded&&busy.p.vx>0&&busy.p.facing===1&&!busy.p.jetpack);
  }
 }
});
test('a crossing needs intent: standing, recoil, flight and burrowing never start one',()=>{
 for(const floor of [0,1,2]){
  const st=M.escalator(floor);
  // Standing or jumping on the incline, and walking back off it.
  const g=setup(floor,st.lower+90),{s,p,e}=g;
  assert.equal(p.y,M.treadY(st,p.x));
  for(let i=0;i<120;i++)step(g,{});assert.ok(!s.stairs.active&&Math.abs(p.x-st.lower-90)<1e-6,'the treads do not carry anybody who is not crossing');
  step(g,{jumpPressed:true});for(let i=0;i<20;i++)step(g,{});assert.ok(!p.grounded&&p.y<M.treadY(st,p.x)-20);
  for(let i=0;i<200&&!p.grounded;i++)step(g,{});assert.ok(p.grounded&&Math.abs(p.y-M.treadY(st,p.x))<1e-6);
  for(let i=0;i<240;i++)step(g,{left:true});assert.ok(p.x<st.entry&&p.y===M.FLOOR&&s.floor===floor&&!s.stairs.active);
  // Knocked onto the treads while hurt: nothing until the player chooses to go on.
  Object.assign(p,{x:st.entry+20,hurt:.1});step(g,{right:true});assert.ok(!s.stairs.active);
  p.hurt=0;p.transform=.5;step(g,{right:true});assert.ok(!s.stairs.active);p.transform=0;
  e.dead=true;step(g,{right:true});assert.ok(!s.stairs.active);e.dead=false;
  step(g,{right:true,left:true});assert.ok(!s.stairs.active);
  step(g,{right:true});assert.ok(s.stairs.active&&s.stairs.dir===1);
  // Upstairs, recoil or a shove to the left is not a decision to go down.
  const up=setup(floor+1,M.returnX-10),q=up.p;
  q.vx=-100;step(up,{});assert.ok(!up.s.stairs.active);
  Object.assign(q,{y:65,grounded:false,heroFlight:true,form:'hero'});step(up,{left:true});assert.ok(!up.s.stairs.active,'not in flight');
  Object.assign(q,{y:M.FLOOR,grounded:true,heroFlight:false,burrow:{}});M.update(up.s,q,up.e,{left:true},dt);assert.ok(!up.s.stairs.active,'not underground');
  q.burrow=null;M.update(up.s,q,up.e,{left:true},dt);assert.ok(up.s.stairs.active&&up.s.stairs.dir===-1);
 }
 // Flying high against the end of a floor changes nothing.
 const g=setup(1,M.escalator(1).exit+1,'hero');Object.assign(g.p,{y:65,grounded:false,heroFlight:true});
 for(let i=0;i<60;i++)step(g,{right:true});assert.equal(g.s.floor,1);assert.ok(!g.s.stairs.active);
});
test('a crossing can start anywhere on the escalator, even from the landing at the top',()=>{
 for(const floor of [0,1,2]){
  const st=M.escalator(floor);
  for(const x of [st.entry+1,st.lower+150,st.upper-20,st.upper+30,st.exit+20]){
   const g=setup(floor,x);g.s.y=M.treadY(st,x);M.configure(g.s,g.p,g.e);
   const rows=cross(g,{right:true});
   assert.equal(g.s.floor,floor+1,'from x='+x);assert.ok(g.p.x>=M.arrivalX&&g.p.grounded&&seconds(rows)<2.6);
   assert.equal(rows.find(r=>r.floor===floor+1).fade,1);
  }
  for(const x of [M.returnX,60,30]){
   const g=setup(floor+1,x),rows=cross(g,{left:true});
   assert.equal(g.s.floor,floor,'down from x='+x);assert.ok(g.p.x<=st.entry-4&&g.p.y===M.FLOOR&&seconds(rows)<2.6);
  }
 }
});
test('a save made at any moment of a crossing restores a valid state and completes it',()=>{
 for(const [floor,dir] of [[0,1],[1,1],[2,1],[1,-1],[2,-1],[3,-1]]){
  const g=dir>0?upFrom(floor):downFrom(floor),input=dir>0?{right:true}:{left:true},target=floor+dir;let frames=0,started=false;
  for(let i=0;i<6/dt;i++){
   const row=step(g,input);
   if(!row.active){if(started)break;continue;}
   started=true;if(frames++%7)continue;
   // The physics world bounds are shared: hand them back to the original run afterwards.
   const saved=JSON.parse(JSON.stringify(M.snapshot(g.s,g.p))),bounds={...P.WORLD};
   assert.equal(saved.stairs,dir);
   const s=M.create(saved),p=P.createPlayer(),e=C.create({owned:[1],selected:1,ammo:{}}),copy={s,p,e};M.configure(s,p,e);
   const ground=s.geometry.platforms.filter(pl=>pl.kind==='ground').find(pl=>p.x>=pl.x&&p.x<=pl.x+pl.w);
   assert.ok(ground&&p.grounded&&Math.abs(p.y-P.surfaceY(ground,p.x))<1e-6,'restored on its feet at frame '+frames);
   assert.ok(Number.isFinite(p.x)&&p.x>=20&&p.x<=M.widths[s.floor]-20&&s.stairs.fade===0);
   let time=0;step(copy,{});assert.ok(s.stairs.active&&s.stairs.dir===dir,'the crossing resumes (saved at frame '+frames+', phase '+row.phase+')');
   while(s.stairs.active&&time<4){const r=step(copy,{});time+=dt;assert.ok(r.grounded||r.fade===1);}
   assert.ok(!s.stairs.active&&s.floor===target&&p.grounded,'and ends on floor '+target+' (saved at frame '+frames+')');
   assert.ok(dir>0?p.x>=M.arrivalX:p.x<=M.escalator(target).entry-4);
   assert.equal(M.snapshot(s,p).stairs,0);
   Object.assign(P.WORLD,bounds);
  }
  assert.ok(frames>150);
 }
 // A save from the previous version, standing on the treads, is still a valid place to be.
 const st=M.escalator(0),old=setup(0,st.lower+96,'soldier',{y:M.treadY(st,st.lower+96)});
 assert.ok(old.p.grounded&&old.p.y===M.treadY(st,old.p.x));for(let i=0;i<60;i++)step(old,{});assert.ok(!old.s.stairs.active&&old.s.floor===0);
 // Dying never resumes a crossing: the retry starts at the checkpoint of the floor.
 const g=upFrom(1);while(g.s.stairs.phase!=='in')step(g,{right:true});
 const retry=M.retry(g.s);assert.equal(retry.floor,2);assert.equal(retry.x,140);assert.equal(retry.resume,0);assert.ok(!retry.stairs.active);
});
test('rooms, checkpoints and the roof keep working around the crossings',()=>{
 const g=upFrom(0),{s,p,e}=g,guards=s.enemies;guards[0].hp=1;s.awarded.add('mall-0-3');s.taken.add('0-kit');
 e.bullets.push({x:0,y:0,vx:0,vy:0,life:1});
 cross(g,{right:true});assert.equal(s.floor,1);assert.notEqual(s.enemies,guards);assert.equal(e.bullets.length,0);
 assert.equal(M.snapshot(s,p).floor,1);assert.equal(M.snapshot(s,p).checkpoint,1);
 const upstairs=s.enemies;cross(g,{left:true});
 assert.equal(s.floor,0);assert.equal(s.checkpoint,0);assert.equal(s.enemies,guards,'the floor is as it was left');assert.equal(guards[0].hp,1);
 cross(g,{right:true});assert.equal(s.enemies,upstairs);
 // Up to the roof: the Colossus waits until the player walks into the arena.
 const roof=upFrom(2),rows=cross(roof,{right:true});
 assert.equal(roof.s.floor,3);assert.ok(rows.every(r=>r.floor<3||r.camera===0));assert.equal(roof.s.boss.active,false);
 assert.equal(rows.flatMap(r=>r.events).find(v=>v.type==='checkpoint').text,'CHECK POINT · '+M.names[3]);
 for(let i=0;i<200&&!roof.s.boss.active;i++)step(roof,{right:true});assert.ok(roof.s.boss.active&&roof.p.x>=270);
 // The treads run with the rider: up by default, down during a ride down.
 const belt=downFrom(1);let before=belt.s.belt;step(belt,{});assert.ok(belt.s.belt>before);
 while(!belt.s.stairs.active)step(belt,{left:true});for(let i=0;i<60;i++)step(belt,{});
 before=belt.s.belt;step(belt,{});assert.ok(belt.s.belt<before);
 // The world announces the crossing so the game can play a short sound.
 const sound=upFrom(0);let events=[];for(let i=0;i<4/dt;i++)events.push(...step(sound,{right:true}).events);
 assert.deepEqual(events.filter(v=>v.type==='stairs').map(v=>v.phase+v.dir),['walk1','out1']);
});
