const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const parachute=require('../parachute.js'),campaign=require('../campaign.js');
test('parachute settles on the walking plane without a position discontinuity',()=>{
 let previous=parachute.sample(0);for(let t=0;t<7;t+=1/120){const next=parachute.sample(t);assert.ok(next.y>=previous.y);assert.ok(Math.abs(next.y-previous.y)<1);assert.ok(next.y<=620);previous=next;}
 const end=parachute.sample(7);assert.equal(end.x,240);assert.equal(end.y,620);assert.equal(end.active,false);assert.equal(end.alpha,0);
});
test('campaign transfers score, ammunition and remaining supplies without mutating the first mission',()=>{
 const memory=new Map(),store={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},inventory={selected:4,ammo:{4:12}};
 campaign.transfer(store,{fuel:200,shield:3},{hp:6,inventory},{total:5200});inventory.ammo[4]=0;
 const next=campaign.read(store);assert.equal(next.score,5200);assert.equal(next.hp,6);assert.equal(next.fuel,200);assert.equal(next.inventory.ammo[4],12);assert.equal(next.level,2);
 assert.equal(campaign.read({getItem(){throw Error();}}),null);
});
test('mission two includes twenty zombies and remembers their defeat separately from soldiers',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:9700,landed:true,hp:8,defeated:[2,103]})});
 const zombies=g.state.combat.enemies.filter(n=>n.kind==='zombie');assert.equal(zombies.length,20);assert.equal(g.state.combat.enemies.length,53);assert.equal(zombies.find(n=>n.id===103).hp,0);
 const target=zombies.find(n=>n.id===100);target.hp=0;target.death=1.3;for(const id of [200,203,205])g.state.combat.enemies.find(n=>n.id===id).hp=0;g.tick(.1);g.element('pause-two').click();
 const saved=JSON.parse(g.data.get('cap-dollar.mission-two.v1'));assert.ok([2,100,103,200,203,205].every(id=>saved.defeated.includes(id)));
 assert.equal((await game('?entry=resume',Object.fromEntries(g.data))).state.combat.enemies.find(n=>n.id===200).hp,0);
 const resumed=await game('?entry=resume',Object.fromEntries(g.data));assert.equal(resumed.state.combat.enemies.find(n=>n.id===100).hp,0);assert.equal(resumed.state.combat.enemies.find(n=>n.id===2).hp,0);assert.equal(resumed.state.combat.enemies.filter(n=>n.kind==='zombie').length,20);
});
test('mission 2 restores elapsed time only when resuming the same run',async()=>{
 const key='cap-dollar.mission-two.v1';
 const saved={x:400,landed:true,elapsed:84};
 const g=await game('?entry=resume',{[key]:JSON.stringify(saved)});
 g.tick(1);g.pagehide();
 const elapsed=JSON.parse(g.data.get(key)).elapsed;
 assert.ok(elapsed>=85&&elapsed<86);
 const back=await game('?entry=resume',Object.fromEntries(g.data));
 assert.ok(back.state.time>=elapsed&&back.state.time<elapsed+1);
 const fresh=await game('?entry=select',Object.fromEntries(g.data));assert.ok(fresh.state.time<1);
 const legacy=await game('?entry=resume',{[key]:JSON.stringify({x:400,landed:true})});assert.ok(legacy.state.time<1);
});

async function game(query='?entry=select',initial={}){
 const data=new Map(Object.entries(initial)),listeners={},elements=new Map();let frame,view,wheelState,menuCallbacks,resizeCallback,navigation;
 // Stable loot prevents an unrelated random ammunition pickup during input tests.
 if(data.has('cap-dollar.mission-two.v1')){const saved=JSON.parse(data.get('cap-dollar.mission-two.v1'));saved.lootSeed??=77;data.set('cap-dollar.mission-two.v1',JSON.stringify(saved));}
 const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',style:{},parentElement:{setAttribute(){}},setAttribute(){},focus(){},events:{},addEventListener(name,fn){this.events[name]=fn;},setPointerCapture(id){this.captured=id;},dispatch(name,event={}){this.events[name]?.({pointerId:1,button:0,preventDefault(){},...event});},querySelector(){return element('back');},getBoundingClientRect(){return{width:1296,height:729};},getContext(){return{};},width:960,height:540,click(){this.onclick?.();}});return elements.get(id);};
 const window={ArcadeSkyExpedition:require('../sky-expedition'),addEventListener:(name,fn)=>listeners[name]=fn,ArcadeMainMenu:{create(options){menuCallbacks=options;return{isOpen:()=>false,ready({autoPlay}){if(autoPlay)options.onPlay();},show(){options.onPause();}};}}};
 const context={ArcadeJetpackRenderer:require('../jetpack-renderer'),ArcadeCheckpoints:require('../checkpoints'),ArcadeWreckedCars:require('../wrecked-cars'),ArcadeZombieForm:{...require('../zombie-form'),setSheet(){},setExtra(){},setPlayerSheets(){},setIdleSheet(){},setRunSheet(){},setShockSheet(){}},ArcadeStormZombie:require('../storm-zombie'),ArcadeMausoleumKing:{...require('../mausoleum-king'),prepareAtlas:()=>({}),prepareZombieStrips:()=>({}),setRockSheet(){}},ArcadeCemeteryBat:require('../cemetery-bat'),ArcadeCemeteryZombies:require('../cemetery-zombies'),ArcadeWaterCrater:{...require("../water-crater.js"),prepareSprite:image=>image},window,console,Math,Set,Map,Number,JSON,URLSearchParams,ArcadeImpact:require('../impact-effects.js'),location:{search:query,assign:url=>navigation=url},localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},document:{getElementById:element,querySelector:element,querySelectorAll:()=>[],addEventListener(){}},ResizeObserver:class{constructor(callback){resizeCallback=callback;}observe(){}},Image:class{set src(v){queueMicrotask(()=>this.onload());}},requestAnimationFrame:fn=>frame=fn,
 ArcadeMissionCombat:require('../mission-combat.js'),ArcadeCityTank:require('../city-tank.js'),ArcadeMissionTwoLoot:require('../mission-two-loot.js'),ArcadeScore:require('../score.js'),ArcadeDifficulty:require('../difficulty.js'),ArcadeArsenal:require('../arsenal.js'),ArcadePowers:require('../powers.js'),ArcadeSoundEvents:require('../sound-events.js'),ArcadeMissionHud:{create:()=>({update(){}})},ArcadePowerSprites:{setSpriteSheet(){},setOrbitalSheet(){}},prepareWhiteDeath:image=>image,ArcadePhysics:require('../physics.js'),ArcadeLevelTwo:require('../level-two.js'),ArcadeParachute:parachute,ArcadeCampaign:campaign,ArcadeProgression:require('../progression.js'),ArcadeSoldierAnimation:require('../soldier-animation.js'),
 ArcadeAudio:{create:()=>({play(){},loop(){},setRunning(){},unlock(){}})},ArcadeCharacterWheel:{create:()=>({setSprites(){},update(...args){wheelState=args;}})},ArcadeLevelTwoRenderer:{create:()=>({draw(_ctx,state,camera){view={state,camera};}})},SOLDIER_V2_FRAMES:[[[0,0,10,10]]],ACTION_FRAMES:{wolf:[[0,0,0,0,0,0,0,[0,0,10,10]]]}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../level-two-game.js'),'utf8'),context);await new Promise(resolve=>setImmediate(resolve));
 let now=0;function tick(seconds){for(let i=0;i<Math.ceil(seconds*120);i++){now+=1000/120;frame(now);}}
 function key(code,down=true,event={}){listeners[down?'keydown':'keyup']({code,repeat:false,preventDefault(){},...event});}
 tick(.05);return{tick,key,element,data,resize:()=>resizeCallback(),get state(){return view.state;},get camera(){return view.camera;},get wheel(){return wheelState;},get menu(){return menuCallbacks;},get navigation(){return navigation;},pagehide:()=>listeners.pagehide?.()};
}
test('dirigible reward is collected by the actual mission runtime and survives resume and retry',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:9000,landed:true,hp:8,tank:{hp:0}})}),p=g.state.player,deck=g.state.geometry.platforms.find(s=>s.airship);
 Object.assign(p,{x:9000,y:deck.y,ground:deck,grounded:true,vx:0,vy:0});g.tick(.03);assert.equal(p.jetpackMk2,true);assert.equal(JSON.parse(g.data.get('obra10.progress.v1')).jetpackMk2,true);
 const resumed=await game('?entry=resume',Object.fromEntries(g.data));assert.equal(resumed.state.player.jetpackMk2,true);
 resumed.state.combat.hp=0;resumed.state.combat.dead=true;resumed.element('play-two').click();assert.equal(resumed.state.player.jetpackMk2,true);
});
test('resizing while high over the map keeps the camera on the player',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:9000,landed:true,hp:8,tank:{hp:0}})});
 Object.assign(g.state.player,{y:-230,grounded:false});g.resize();assert.ok(g.camera.y<g.state.player.y);assert.ok(g.state.player.y<g.camera.y+g.element('level-two').height);
});

test('mission two advances wolf idle gestures and maps sprint plus L to the same ram',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:11900,landed:true,form:'wolf',hp:8,shield:99,tank:{hp:0}})});
 for(const n of g.state.combat.enemies){n.hp=0;n.death=0;}g.state.combat.bullets.length=0;
 g.tick(7);assert.ok(g.state.player.idleTime>=6.8);assert.equal(g.state.player.idleHowl,1);
 g.key('KeyD');g.key('ShiftLeft');g.tick(.3);g.key('KeyL');g.tick(.02);
 assert.ok(g.state.player.ram);assert.equal(g.state.player.ramSound,1);assert.equal(g.state.player.idleTime,0);assert.equal(g.state.player.kick,0);
});

test('mausoleum enemies and both boss phases persist, pause, and award completion once',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({inside:true,x:1580,landed:true,hp:8,shield:99,king:{active:true,x:1950},interiorDefeated:[300,320]})});
 assert.equal(g.state.combat.enemies.length,10);assert.equal(g.state.combat.enemies.find(n=>n.id===300).hp,0);assert.equal(g.state.combat.enemies.find(n=>n.id===320).hp,0);
 for(const n of g.state.combat.enemies)n.hp=0;
 const king=g.state.king;require('../mausoleum-king').damage(king,10000);assert.equal(king.phase,'crack');g.tick(1);g.element('pause-two').click();const age=king.age;g.tick(2);assert.equal(king.age,age);
 const saved=JSON.parse(g.data.get('cap-dollar.mission-two.v1'));assert.equal(saved.king.phase,'crack');assert.equal(saved.interiorDefeated.length,10);
 const resumed=await game('?entry=resume',Object.fromEntries(g.data));resumed.tick(7.5);assert.equal(resumed.state.king.stage,2);assert.equal(resumed.state.king.phase,'walk');assert.match(resumed.element('boss-title').textContent,/II \/ II/);
 require('../mausoleum-king').damage(resumed.state.king,10000);resumed.tick(4);assert.equal(resumed.state.king.defeated,true);resumed.element('pause-two').click();const done=JSON.parse(resumed.data.get('cap-dollar.mission-two.v1'));assert.equal(done.king.defeated,true);const total=done.score;
 const final=await game('?entry=resume',Object.fromEntries(resumed.data));final.tick(2);final.element('pause-two').click();assert.equal(JSON.parse(final.data.get('cap-dollar.mission-two.v1')).score,total);assert.match(final.element('boss-title').textContent,/MISIÓN COMPLETADA/);
});
test('arrival blocks action keys, lands, and unlocks both forms with T',async()=>{
 const g=await game();g.key('KeyD');g.key('KeyJ');g.key('KeyT');g.tick(2);assert.equal(g.state.player.form,'soldier');assert.equal(g.state.bullets.length,0);assert.ok(g.state.player.y<620);assert.equal(g.wheel[2],true);
 g.tick(5);assert.equal(g.state.player.x,240);assert.equal(g.state.player.y,620);assert.equal(g.wheel[1],true);assert.equal(g.wheel[2],false);
 g.key('KeyT');g.tick(1.4);assert.equal(g.state.player.form,'wolf');assert.equal(g.state.player.h,64);
 g.key('KeyD');g.tick(1);g.key('KeyD',false);assert.ok(g.state.player.x>300);
 g.key('KeyT',false);g.key('KeyT');g.tick(.1);assert.equal(g.state.player.form,'wolf','wait five seconds between changes');g.tick(8);g.key('KeyT',false);g.key('KeyT');g.tick(1.4);assert.equal(g.state.player.form,'soldier');assert.equal(g.state.player.h,46);
});
test('pause freezes the arrival and resume preserves form and checkpoint',async()=>{
 const g=await game();g.tick(1);g.element('pause-two').click();const y=g.state.player.y;g.tick(1);assert.equal(g.state.player.y,y);g.element('play-two').click();g.tick(7);g.key('KeyT');g.tick(1.4);g.key('KeyD');g.tick(1);g.key('KeyD',false);g.element('pause-two').click();
 const save=JSON.parse(g.data.get('cap-dollar.mission-two.v1'));assert.equal(save.form,'wolf');assert.equal(save.landed,true);
 const resume=await game('?entry=resume',Object.fromEntries(g.data));assert.equal(resume.state.player.form,'wolf');assert.ok(Math.abs(resume.state.player.x-save.x)<1);assert.equal(resume.state.player.y,620);
});
test('real second-mission runtime saves ammunition, equipped powers and cooldowns across reload',async()=>{
 const profile=require('../progression.js').fresh();profile.levels.jump=2;profile.owned=['wave'];profile.equipped='wave';
 const initial={'obra10.progress.v1':JSON.stringify(profile),'cap-dollar.campaign.v1':JSON.stringify({version:1,level:2,score:9200,hp:6,fuel:440,shield:3,inventory:{selected:4,owned:[1,3,4],ammo:{3:0,4:3}}})};
 const g=await game('?entry=campaign',initial);g.tick(7);assert.equal(g.state.player.maxJumps,4);g.key('KeyJ');g.tick(.04);g.key('KeyJ',false);g.key('KeyG');g.tick(.04);g.key('KeyG',false);g.element('pause-two').click();
 const saved=JSON.parse(g.data.get('cap-dollar.mission-two.v1'));assert.equal(saved.inventory.ammo[4],2);assert.equal(saved.inventory.ammo[3],0);assert.ok(saved.cooldowns.wave>9);assert.equal(saved.score,9200);
 const resumed=await game('?entry=resume',Object.fromEntries(g.data));assert.equal(resumed.state.combat.inventory.selected,4);assert.equal(resumed.state.combat.inventory.ammo[4],2);assert.equal(resumed.state.player.maxJumps,4);assert.equal(resumed.state.player.shield,3);assert.equal(resumed.state.player.fuel,440);
});

test('new missions refill upgraded health, while resuming keeps saved damage even during arrival',async()=>{
 const profile=require('../progression.js').fresh();profile.levels.life=5;
 const carry={version:1,level:2,hp:10,score:9200,shield:3,fuel:440,inventory:{selected:4,owned:[1,3,4],ammo:{3:7,4:12}}};
 for(const query of ['?entry=campaign','?entry=select','?entry=resume']){
  const initial={'obra10.progress.v1':JSON.stringify(profile),'cap-dollar.campaign.v1':JSON.stringify(carry)};
  if(query!=='?entry=resume')initial['cap-dollar.mission-two.v1']=JSON.stringify({x:240,landed:true,hp:2});
  const g=await game(query,initial);assert.equal(g.state.combat.maxHp,13);assert.equal(g.state.combat.hp,13);
  assert.equal(g.state.combat.inventory.ammo[4],12);assert.equal(g.state.player.shield,3);assert.equal(g.state.player.fuel,440);
  g.state.combat.hp=10;g.element('pause-two').click();const saved=JSON.parse(g.data.get('cap-dollar.mission-two.v1'));assert.equal(saved.hp,10);assert.equal(saved.landed,false);assert.equal(saved.score,9200);
  const resumed=await game('?entry=resume',Object.fromEntries(g.data));assert.equal(resumed.state.combat.hp,10);assert.equal(resumed.state.combat.maxHp,13);
 }
});
test('city kills award points once and stay defeated after continuing',async()=>{
 const g=await game();g.tick(7);assert.equal(g.state.combat.enemies.filter(n=>!['zombie','bat','stormZombie'].includes(n.kind)).length,26);
 g.state.combat.enemies[0].hp=0;g.state.combat.enemies[19].hp=0;g.tick(.05);
 const saved=JSON.parse(g.data.get('cap-dollar.mission-two.v1'));assert.deepEqual(saved.defeated,[0,19]);assert.equal(saved.score,400);
 const earned=JSON.parse(g.data.get('obra10.progress.v1'));assert.equal(earned.wallet,400);assert.equal(earned.earned,400);
 const resumed=await game('?entry=resume',Object.fromEntries(g.data));resumed.tick(.1);assert.equal(resumed.state.combat.enemies[0].hp,0);resumed.element('pause-two').click();
 assert.equal(resumed.state.combat.enemies[19].hp,0);
 assert.equal(JSON.parse(resumed.data.get('cap-dollar.mission-two.v1')).score,400);
 assert.equal(JSON.parse(resumed.data.get('obra10.progress.v1')).wallet,400);assert.equal(JSON.parse(resumed.data.get('obra10.progress.v1')).earned,400);
});
test('high fall kills in mission two and retry returns alive to the entrance',async()=>{
 const g=await game();g.tick(7);const p=g.state.player;Object.assign(p,{x:400,y:100,grounded:false,ground:null,fallPeak:100,vy:0,shield:10});g.state.combat.hp=1;
 g.tick(2);assert.equal(g.state.combat.hp,0);assert.equal(g.state.combat.dead,true);assert.equal(p.shield,10);assert.equal(g.element('play-two').textContent,'Reintentar misión');
 g.element('play-two').click();g.tick(.1);assert.equal(g.state.combat.dead,false);assert.equal(g.state.combat.hp,g.state.combat.maxHp);assert.equal(p.x,240);assert.equal(p.y,620);
});
test('mission runtime saves randomized loot and tank defeat without awarding them twice',async()=>{
 const g=await game();g.tick(7);const loot=g.state.loot,w=loot.weapons[0];Object.assign(g.state.player,{x:w.x,y:w.y+12,grounded:true,vy:0});g.tick(.05);assert.ok(w.taken);
 g.state.combat.tank.hp=0;g.tick(.05);g.element('pause-two').click();const saved=JSON.parse(g.data.get('cap-dollar.mission-two.v1'));assert.equal(saved.tank.hp,0);assert.ok(saved.loot.weapons.includes(w.id));assert.equal(saved.score,1100);
 const resumed=await game('?entry=resume',Object.fromEntries(g.data));assert.equal(resumed.state.combat.tank.hp,0);assert.equal(resumed.state.loot.seed,loot.seed);assert.deepEqual(JSON.parse(JSON.stringify(resumed.state.loot.weapons)),JSON.parse(JSON.stringify(loot.weapons)));resumed.tick(.05);resumed.element('pause-two').click();assert.equal(JSON.parse(resumed.data.get('cap-dollar.mission-two.v1')).score,1100);
});
test('shared main menu pauses and resumes mission two without losing its loadout',async()=>{
 const g=await game();g.tick(7);g.state.combat.inventory.ammo[3]=11;
 const x=g.state.player.x;g.menu.onPause();g.key('KeyD');g.tick(1);assert.equal(g.state.player.x,x);
 g.menu.onPlay();g.key('KeyD');g.tick(.2);g.key('KeyD',false);assert.ok(g.state.player.x>x);assert.equal(g.state.combat.inventory.ammo[3],11);
 assert.equal(g.menu.mission,2);
});
test('mission two settings preserve boss damage and show the shared health bar only near the tank',async()=>{
 const g=await game();g.tick(7);const tank=g.state.combat.tank;tank.hp=tank.maxHp/2;
 g.menu.onDifficulty('fuerte');assert.equal(g.data.get('cap-dollar.difficulty.v1'),'fuerte');assert.equal(g.state.combat.combatDamage,2);assert.equal(tank.hp/tank.maxHp,.5);
 assert.equal(g.element('boss-hud').hidden,true);
 Object.assign(g.state.player,{x:3500,y:620,grounded:true});g.tick(.1);assert.equal(g.element('boss-hud').hidden,false);assert.equal(g.element('boss-title').textContent,'SUBJEFE · TANQUE DE ASEDIO');
 Object.assign(g.state.player,{x:500,y:620});g.tick(.1);assert.equal(g.element('boss-hud').hidden,true);
 Object.assign(g.state.player,{x:tank.x-400,y:620});g.tick(.1);assert.equal(g.element('boss-hud').hidden,false);assert.equal(g.element('boss-fill').style.width,'50%');
 tank.hp=0;g.tick(.1);assert.equal(g.element('boss-hud').hidden,false);assert.equal(g.element('boss-title').textContent,'SUBJEFE · TANQUE DESTRUIDO');assert.equal(g.element('boss-fill').style.width,'0%');assert.equal(g.element('boss-value').textContent,'0 / '+tank.maxHp);
 g.tick(2.6);assert.equal(g.element('boss-hud').hidden,true);
 g.element('pause-two').click();const resumed=await game('?entry=resume',Object.fromEntries(g.data));assert.equal(resumed.element('boss-hud').hidden,true);
});

test('mission two arrow chords fire all four diagonals with navigation and keypad events',async()=>{
 for(const trigger of ['KeyJ','KeyX','Numpad0'])for(const keypad of [false,true])for(const horizontal of ['ArrowLeft','ArrowRight'])for(const vertical of ['ArrowUp','ArrowDown'])for(const fireFirst of [false,true]){
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:300,landed:true,hp:8,inventory:{selected:3,owned:[1,3,4,6,8],ammo:{3:36,4:10,6:10,8:10}}})});
 const codes={ArrowLeft:'Numpad4',ArrowRight:'Numpad6',ArrowUp:'Numpad8',ArrowDown:'Numpad2'},press=key=>g.key(keypad?codes[key]:key,true,{key});
 if(fireFirst){g.key(trigger);g.tick(.02);}press(horizontal);press(vertical);if(!fireFirst)g.key(trigger);
 let shot;for(let i=0;i<40;i++){const ammo=g.state.combat.inventory.ammo[3];g.tick(1/120);if(g.state.combat.inventory.ammo[3]<ammo){shot=g.state.bullets.filter(b=>!b.enemy).at(-1);break;}}
 assert.equal(g.state.combat.inventory.selected,3,'navigation must not select keypad weapon slots');assert.ok(shot);assert.equal(Math.sign(shot.vx),horizontal==='ArrowLeft'?-1:1);assert.equal(Math.sign(shot.vy),vertical==='ArrowUp'?-1:1);assert.ok(Math.abs(Math.abs(shot.vx)-Math.abs(shot.vy))<.001);assert.equal(g.state.player.ladder,null);
 g.key(keypad?codes[horizontal]:horizontal,false,{key:horizontal});g.key(keypad?codes[vertical]:vertical,false,{key:vertical});g.key(trigger,false);g.tick(.2);assert.equal(g.state.player.aim.y,0);assert.equal(g.state.player.vx,0);
 }
});
test('arrow-up aiming while firing does not grab a nearby ladder and repeat restores held controls',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:300,landed:true,hp:8})});
 const ladder=g.state.geometry.ladders.find(l=>l.bottom===620);assert.ok(ladder);Object.assign(g.state.player,{x:ladder.x,y:ladder.bottom});g.key('ArrowRight',true,{key:'ArrowRight',repeat:true});g.key('ArrowUp',true,{key:'ArrowUp'});g.key('Numpad0');g.tick(.03);
 assert.ok(g.state.player.aim.x>0&&g.state.player.aim.y<0);assert.equal(g.state.player.ladder,null);assert.ok(g.state.bullets.some(b=>!b.enemy&&b.vx>0&&b.vy<0));
});

test('a quick diagonal tap preserves its aim and fires once even with numpad zero',async()=>{
 for(const fire of ['KeyJ','Numpad0']){const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:300,landed:true,hp:8})});
 for(const key of ['ArrowLeft','ArrowDown',fire])g.key(key);for(const key of ['ArrowLeft','ArrowDown',fire])g.key(key,false);g.tick(1/120);
 const bullet=g.state.bullets.find(b=>!b.enemy);assert.ok(bullet&&bullet.vx<0&&bullet.vy>0);assert.equal(g.state.combat.inventory.ammo[3],35);g.tick(.4);assert.equal(g.state.combat.inventory.ammo[3],35);
 }
});

test('cemetery ground permits sustained arrow diagonal shots with every ranged weapon',async()=>{
 for(const slot of [3,4,5,6,7,8,9])for(const direction of [-1,1]){
  const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:11900,landed:true,hp:8,shield:99,defeated:Array.from({length:20},(_,i)=>100+i),inventory:{selected:slot,owned:[slot],ammo:{[slot]:20}}})});
  g.key(direction<0?'ArrowLeft':'ArrowRight');g.key('ArrowUp');g.key('KeyJ');let count=0;
  for(let i=0;i<150;i++){const before=g.state.combat.inventory.ammo[slot];g.tick(1/120);if(g.state.combat.inventory.ammo[slot]<before){const shot=g.state.bullets.filter(b=>!b.enemy).at(-1);assert.ok(shot,'visible projectile for slot '+slot);assert.equal(Math.sign(shot.vx),direction);assert.ok(shot.vy<0);count++;}}
  assert.ok(count>=2);assert.equal(g.state.player.ladder,null);assert.equal(g.state.player.rope,null);
 }
});

test('a diagonal J tap just before the weapon is ready is not discarded',async()=>{
 for(const side of ['ArrowLeft','ArrowRight']){
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:11900,landed:true,hp:8,shield:99,inventory:{selected:3,owned:[3],ammo:{3:36}}})});
 g.key('ArrowUp');g.key(side);g.key('KeyJ');g.tick(.03);g.key('KeyJ',false);assert.equal(g.state.combat.inventory.ammo[3],35);
 g.tick(.08);g.key('KeyJ');g.key('KeyJ',false);g.tick(.16);
 assert.equal(g.state.combat.inventory.ammo[3],34);const shot=g.state.bullets.filter(b=>!b.enemy).at(-1);assert.equal(Math.sign(shot.vx),side==='ArrowLeft'?-1:1);assert.ok(shot.vy<0);
 g.key('ArrowUp',false);g.key(side,false);g.tick(.5);assert.equal(g.state.combat.inventory.ammo[3],34,'one tap makes one shot');
 }
});

test('pausing cancels a pending diagonal shot before continuing',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:11900,landed:true,hp:8})});g.state.combat.cooldown=.1;
 g.key('ArrowUp');g.key('ArrowRight');g.key('KeyJ');g.key('KeyJ',false);g.tick(.02);g.element('pause-two').click();g.element('play-two').click();g.tick(.3);assert.equal(g.state.combat.inventory.ammo[3],36);
});

test('releasing J and one arrow before the next frame preserves the requested diagonal',async()=>{
 for(const side of ['ArrowLeft','ArrowRight']){
  const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:1700,landed:true,hp:8,shield:99})});
  g.key('ArrowUp');g.key(side);g.key('KeyJ');g.key('KeyJ',false);g.key(side,false);g.tick(1/120);
  const shot=g.state.bullets.find(b=>!b.enemy);assert.ok(shot);assert.ok(shot.vy<0);assert.equal(Math.sign(shot.vx),side==='ArrowLeft'?-1:1);assert.equal(g.state.combat.inventory.ammo[3],35);
 }
});

test('X fires diagonally when its key events arrive, including held fire',async()=>{
 for(const side of ['ArrowLeft','ArrowRight']){
  const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:1700,landed:true,hp:8,shield:99})});
  g.key('ArrowUp');g.key(side);g.key('KeyX');g.tick(.04);
  assert.equal(g.state.combat.inventory.ammo[3],35);
  const shot=g.state.bullets.find(b=>!b.enemy);assert.ok(shot);assert.ok(shot.vy<0);assert.equal(Math.sign(shot.vx),side==='ArrowLeft'?-1:1);
  g.tick(.5);assert.ok(g.state.combat.inventory.ammo[3]<=33);g.key('KeyX',false);g.tick(.3);const ammo=g.state.combat.inventory.ammo[3];g.tick(.3);assert.equal(g.state.combat.inventory.ammo[3],ammo);
 }
});



test('mouse fires every arrow diagonal without any keyboard trigger and releases cleanly',async()=>{
 for(const side of ['ArrowLeft','ArrowRight'])for(const vertical of ['ArrowUp','ArrowDown'])for(const release of ['pointerup','pointercancel','lostpointercapture']){
  const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:1700,landed:true,hp:8,shield:99})}),canvas=g.element('level-two');
  g.key(side);g.key(vertical);g.tick(.02);assert.equal(g.state.combat.inventory.ammo[3],36,'arrows alone do not fire');
  canvas.dispatch('pointerdown');g.tick(.03);assert.equal(g.state.combat.inventory.ammo[3],35);
  const shot=g.state.bullets.find(b=>!b.enemy);assert.ok(shot);assert.equal(Math.sign(shot.vx),side==='ArrowLeft'?-1:1);assert.equal(Math.sign(shot.vy),vertical==='ArrowUp'?-1:1);
  g.tick(.3);assert.equal(g.state.combat.inventory.ammo[3],34);canvas.dispatch(release);g.tick(.5);assert.equal(g.state.combat.inventory.ammo[3],34,'released pointer does not latch');
 }
});

test('mouse trigger tracks direction, coexists with J and clears on pause',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:1700,landed:true,hp:8,shield:99})}),canvas=g.element('level-two');
 g.key('ArrowUp');g.key('ArrowRight');canvas.dispatch('pointerdown',{button:2});g.tick(.03);assert.equal(g.state.combat.inventory.ammo[3],36,'right click is not fire');
 canvas.dispatch('pointerdown');g.tick(.03);g.key('ArrowRight',false);g.key('ArrowLeft');g.tick(.3);assert.ok(g.state.bullets.filter(b=>!b.enemy).at(-1).vx<0&&g.state.bullets.filter(b=>!b.enemy).at(-1).vy<0);
 g.key('KeyJ');canvas.dispatch('pointerup');const before=g.state.combat.inventory.ammo[3];g.tick(.3);assert.ok(g.state.combat.inventory.ammo[3]<before,'releasing mouse must not release keyboard trigger');
 g.key('KeyJ',false);canvas.dispatch('pointerdown');g.element('pause-two').click();canvas.dispatch('pointerdown');g.element('play-two').click();const pausedAmmo=g.state.combat.inventory.ammo[3];g.tick(.5);assert.equal(g.state.combat.inventory.ammo[3],pausedAmmo);
});

test('mouse tap keeps diagonal aim and arrival rejects pointer fire',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:1700,landed:true,hp:8,shield:99})}),canvas=g.element('level-two');
 g.key('ArrowUp');g.key('ArrowLeft');canvas.dispatch('pointerdown');canvas.dispatch('pointerup');g.key('ArrowLeft',false);g.key('ArrowUp',false);g.tick(.03);
 assert.equal(g.state.combat.inventory.ammo[3],35);assert.ok(g.state.bullets.filter(b=>!b.enemy).at(-1).vx<0&&g.state.bullets.filter(b=>!b.enemy).at(-1).vy<0);g.tick(.5);assert.equal(g.state.combat.inventory.ammo[3],35);
 const arriving=await game();arriving.element('level-two').dispatch('pointerdown');arriving.tick(7);assert.equal(arriving.state.combat.inventory.ammo[3],36);
});

test('single-key diagonals in mission two match mission one without a three-key chord',async()=>{
 for(const key of ['KeyQ','KeyC','KeyO','KeyM'])for(const facing of [-1,1]){
  const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:1700,landed:true,hp:8,shield:99})});g.state.player.facing=facing;
  g.key(key);g.tick(.03);assert.equal(g.state.combat.inventory.ammo[3],35);
  const shot=g.state.bullets.find(b=>!b.enemy);assert.ok(shot);assert.equal(Math.sign(shot.vx),['KeyO','KeyM'].includes(key)?1:facing);assert.equal(Math.sign(shot.vy),['KeyC','KeyM'].includes(key)?1:-1);assert.equal(g.state.player.x,1700);
  g.tick(.3);assert.equal(g.state.combat.inventory.ammo[3],34);g.key(key,false);g.tick(.4);assert.equal(g.state.combat.inventory.ammo[3],34);
 }
});


test('Heraldo blocks the mausoleum, unlocks zombie permanently and keeps five-second form cooldown on resume',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:17440,landed:true,hp:8,shield:99})});
 for(const n of g.state.combat.enemies)if(n.kind!=='stormZombie'){n.hp=0;n.death=0;}
 g.key('ArrowUp');g.tick(.02);assert.equal(g.state.inside,false);assert.match(g.element('context-two').textContent,/Heraldo/);g.key('ArrowUp',false);g.tick(.02);
 const boss=g.state.storm;require('../enemies').damage(boss,1000);g.tick(1.7);assert.equal(g.state.player.zombieUnlocked,true);assert.equal(JSON.parse(g.data.get('obra10.progress.v1')).zombieUnlocked,true);
 g.key('KeyT');g.tick(1.3);assert.equal(g.state.player.form,'wolf');g.key('KeyT',false);g.key('KeyT');g.tick(.05);assert.equal(g.state.player.form,'wolf');g.key('KeyT',false);g.tick(9);g.key('KeyT');g.tick(1.3);assert.equal(g.state.player.form,'zombie');
 const ammo=g.state.combat.inventory.ammo[3];g.key('KeyJ');g.tick(.3);g.key('KeyJ',false);assert.equal(g.state.combat.inventory.ammo[3],ammo);
 g.element('pause-two').click();const cooldown=g.state.player.formCooldown;g.tick(2);assert.equal(g.state.player.formCooldown,cooldown);
 const resumed=await game('?entry=resume',Object.fromEntries(g.data));assert.equal(resumed.state.player.form,'zombie');assert.ok(resumed.state.player.formCooldown>2);assert.equal(resumed.state.storm.hp,0);
 const total=JSON.parse(g.data.get('cap-dollar.mission-two.v1')).score;resumed.tick(.1);resumed.element('pause-two').click();assert.equal(JSON.parse(resumed.data.get('cap-dollar.mission-two.v1')).score,total);
 resumed.element('play-two').click();resumed.key('ArrowUp');resumed.tick(.03);assert.equal(resumed.state.inside,true);assert.equal(resumed.state.player.form,'zombie');
});


test('entering just after the Heraldo falls cannot skip the permanent reward',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:17440,landed:true,hp:8,shield:99})});
 for(const n of g.state.combat.enemies)if(n!==g.state.storm)n.hp=0;
 require('../enemies').damage(g.state.storm,1000);g.key('ArrowUp');g.tick(.03);
 assert.equal(g.state.inside,false,'finish the defeat and grant the suit before crossing');
 g.key('ArrowUp',false);g.tick(1.7);assert.ok(g.state.player.zombieUnlocked);
 g.key('ArrowUp');g.tick(.05);assert.equal(g.state.inside,true);
 assert.ok(JSON.parse(g.data.get('obra10.progress.v1')).zombieUnlocked);
});
test('scene change clears projectiles, lingering impacts and unfinished melee actions',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:17440,landed:true,hp:8,shield:99,storm:{hp:0},zombieUnlocked:true})});
 const e=g.state.combat;e.playerPlasma=[{x:150,y:590,vx:0,vy:0,life:1}];e.zombieEffects=[{kind:'ray',life:1}];e.explosions=[{x:150,y:590,radius:50,life:1}];e.weaponAction={slot:1,age:0,duration:1,melee:{range:200,damage:100}};
 g.key('ArrowUp');g.tick(.02);assert.equal(g.state.inside,true);
 assert.equal(e.playerPlasma.length,0);assert.equal(e.zombieEffects.length,0);assert.equal(e.explosions.length,0);assert.equal(e.weaponAction,null);
});

test('partial old saves with malformed optional collections still load a playable mission',async()=>{
 const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:9700,landed:true,hp:6,defeated:{},interiorDefeated:{},loot:{stars:{},weapons:9,medkits:false,fuelTanks:{}}})});
 assert.equal(g.state.combat.hp,6);assert.equal(g.state.loot.stars.length,5);assert.equal(g.state.loot.weapons.length,12);
 g.key('KeyD');g.tick(.2);assert.ok(g.state.player.x>9700);
});

test('mission two alternates zombie idle gestures, freezes them on pause and interrupts with native fire',async()=>{
 const Z=require('../zombie-form'),g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:9800,landed:true,form:'zombie',zombieUnlocked:true,hp:8,shield:99,tank:{hp:0}})});
 const p=g.state.player;p.form='zombie';p.zombieUnlocked=true;p.idleTime=0;for(const n of g.state.combat.enemies){n.hp=0;n.death=0;}g.state.combat.bullets.length=0;
 g.tick(6.1);assert.equal(Z.pose(p).gesture,'hand');const age=p.idleTime;g.menu.onPause();g.tick(3);assert.equal(p.idleTime,age);g.menu.onPlay();g.tick(12);assert.equal(Z.pose(p).gesture,'head');g.key('KeyJ');g.tick(.04);assert.equal(p.idleTime,0);assert.equal(Z.pose(p).cast,true);assert.equal(Z.pose(p).row,2);assert.equal(Z.pose(p).idle,undefined);
});

test('down key speeds up parachute while attacks stay blocked, then leaves a safe landing',async()=>{const g=await game();g.key('ArrowDown');g.key('KeyJ');g.tick(1.6);assert.equal(g.state.player.y,620);assert.equal(g.state.combat.inventory.ammo[3],36);g.tick(1.9);g.key('ArrowDown',false);assert.equal(g.state.player.grounded,true);assert.equal(g.state.player.fallDamage||0,0);assert.equal(g.state.combat.hp,g.state.combat.maxHp);});
test('car damage survives runtime save/reload',async()=>{const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:1100,landed:true,cars:[0,3,10,7]})});assert.deepEqual(g.state.geometry.cars.map(c=>c.hp),[0,3,10,7]);assert.ok(!g.state.geometry.platforms.some(p=>p.kind==='wreck'&&p.car===0));g.state.combat.damageCar(1);g.element('pause-two').click();const resumed=await game('?entry=resume',Object.fromEntries(g.data));assert.equal(resumed.state.geometry.cars[1].hp,2);});

test('PC activates on contact, persists immediately, and death retries there with inventory intact',async()=>{const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:8040,landed:true,hp:8,inventory:{owned:[1,3],selected:3,ammo:{3:19}}})});assert.equal(g.state.checkpoints.active,'two-out-5');assert.equal(JSON.parse(g.data.get('cap-dollar.mission-two.v1')).checkpoints.active,'two-out-5');g.state.player.x=8500;g.state.combat.hp=0;g.state.combat.dead=true;g.tick(.03);g.element('play-two').click();g.tick(.01);assert.equal(g.state.player.x,8050);assert.equal(g.state.combat.hp,g.state.combat.maxHp);assert.equal(g.state.combat.inventory.ammo[3],19);assert.ok(g.state.combat.invincible>2);});
test('cemetery and mausoleum checkpoints restore their own scene from a dead save',async()=>{for(const [id,x,inside]of [['two-out-5',8050,false],['two-out-9',15960,false]]){const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:100,inside:false,landed:true,dead:true,hp:0,checkpoints:{active:id,visited:[id]},king:{defeated:true}})});assert.equal(g.state.inside,inside);assert.equal(g.state.player.x,x);assert.equal(g.state.combat.hp,g.state.combat.maxHp);assert.equal(g.state.checkpoints.active,id);}});
test('fresh missions reset prior checkpoints while legacy saves still use the entrance on death',async()=>{const initial={'cap-dollar.mission-two.v1':JSON.stringify({x:13850,landed:true,dead:true,checkpoints:{active:'two-out-8',visited:['two-out-8']}})};const fresh=await game('?entry=select',initial);assert.equal(fresh.state.checkpoints.active,null);const legacy=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({x:13850,landed:true,dead:true})});assert.equal(legacy.state.player.x,240);assert.equal(legacy.state.inside,false);});

test('leaving the defeated mausoleum transfers to mission three and pagehide cannot overwrite it',async()=>{const g=await game('?entry=resume',{'cap-dollar.mission-two.v1':JSON.stringify({inside:true,x:70,landed:true,hp:8,king:{defeated:true},inventory:{owned:[1,3,5],selected:5,ammo:{3:18,5:80}}})});g.key('ArrowUp');g.tick(.03);assert.equal(g.navigation,'level-three.html?entry=campaign');g.pagehide();g.menu.onPause();const carry=JSON.parse(g.data.get('cap-dollar.campaign.v1'));assert.equal(carry.level,3);assert.equal(carry.inventory.ammo[5],80);});
