const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');const parachute=require('../parachute.js'),campaign=require('../campaign.js');
const seed=(x=400,extra={})=>({'cap-dollar.mission-three.v1':JSON.stringify({x,landed:true,hp:8,...extra})});
test('mission three defers combat through the helicopter introduction and begins at full health',async()=>{const g=await game('?entry=campaign',{'cap-dollar.campaign.v1':JSON.stringify({version:1,level:3,hp:1,inventory:{owned:[1,3,5],selected:5,ammo:{3:18,5:40}}})});assert.equal(g.state.combat.hp,8);g.tick(8);assert.ok(g.state.introAge<9);assert.equal(g.state.mecha.active,false);assert.equal(g.state.combat.bullets.length,0);g.tick(1.1);assert.equal(JSON.parse(g.data.get('cap-dollar.mission-three.v1')).landed,true);assert.equal(g.state.combat.inventory.ammo[5],40);});
test('mecha activates only at its arena and survives damage until its single-phase destruction completes',async()=>{const g=await game('?entry=resume',seed(6000));g.tick(1);const m=g.state.mecha;assert.equal(m.active,false);assert.equal(m.hp,100);require('../enemies').damage(m,999);assert.equal(m.hp,100);g.state.player.x=6550;g.tick(1);assert.equal(m.active,true);require('../enemies').damage(m,999);g.tick(2);assert.equal(m.defeated,false);g.tick(2.2);assert.equal(m.defeated,true);assert.equal(g.state.player.robotUnlocked,true);const p=JSON.parse(g.data.get('obra10.progress.v1'));assert.equal(p.robotUnlocked,true);const wallet=p.wallet;g.tick(5);assert.equal(JSON.parse(g.data.get('obra10.progress.v1')).wallet,wallet);});
test('robot reward and selected second weapon survive resume, with four forms and separate ammunition',async()=>{const g=await game('?entry=resume',{...seed(500,{form:'robot',robotUnlocked:true,mecha:{defeated:true},inventory:{owned:[1,3,5],selected:5,secondary:3,ammo:{3:30,5:50}}}),'obra10.progress.v1':JSON.stringify({version:1,robotUnlocked:true,zombieUnlocked:true})});assert.equal(g.state.player.form,'robot');g.key('KeyJ');g.tick(.01);g.key('KeyJ',false);assert.equal(g.state.combat.inventory.ammo[3],29);assert.equal(g.state.combat.inventory.ammo[5],49);assert.equal(g.state.combat.bullets.filter(b=>!b.enemy).length,2);g.element('pause-two').click();const next=await game('?entry=resume',Object.fromEntries(g.data));assert.equal(next.state.player.form,'robot');assert.equal(next.state.combat.inventory.secondary,3);assert.equal(next.state.mecha.defeated,true);});
test('checkpoint retry restores health and resets an unfinished mecha without removing collected weapons',async()=>{const g=await game('?entry=resume',seed(5960,{inventory:{owned:[1,3,6],selected:6,ammo:{3:20,6:8}}}));g.tick(.1);g.state.player.x=6400;g.tick(.1);g.state.mecha.hp=2;g.state.combat.dead=true;g.element('play-two').click();assert.equal(g.state.player.x,5960);assert.equal(g.state.mecha.hp,100);assert.equal(g.state.combat.hp,8);assert.equal(g.state.combat.inventory.ammo[6],8);});
test('mission three exit plays its finale then transfers once to mission five, preserving the destination through pause and pagehide',async()=>{const g=await game('?entry=resume',seed(7480,{robotUnlocked:true,mecha:{defeated:true}}));g.tick(.1);assert.ok(g.state.endingAge>=0);g.tick(10);assert.equal(g.navigation,undefined);g.tick(3.2);assert.equal(g.navigation,'level-five.html?entry=campaign');assert.equal(JSON.parse(g.data.get('cap-dollar.campaign.v1')).level,5);g.pagehide();g.menu.onPause();assert.equal(JSON.parse(g.data.get('cap-dollar.campaign.v1')).level,5);});
test('an interrupted mission three finale resumes before handing off to the sea',async()=>{const g=await game('?entry=resume',seed(7480,{ending:true,robotUnlocked:true,mecha:{defeated:true}}));assert.ok(g.state.endingAge>=0);g.tick(13.2);assert.equal(g.navigation,'level-five.html?entry=campaign');});
test('mission 3 restores elapsed time only when resuming the same run',async()=>{
 const key='cap-dollar.mission-three.v1';
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

test('las siete formas reaparecen con su cuerpo y el Centinela mantiene la dificultad vigente',async()=>{
 for(const [form,height,width] of [['soldier',46,24],['wolf',64,24],['zombie',68,24],['robot',54,24],['tank',53,64],['fighter',57,24],['hero',46,24]]){
  const unlocks={heroUnlocked:true,zombieUnlocked:true,robotUnlocked:true,tankUnlocked:true,fighterUnlocked:true};
  const g=await game('?entry=resume',{...seed(5960,{form}),'obra10.progress.v1':JSON.stringify(unlocks)});
  for(const [level,armor] of [['novato',65],['normal',100],['fuerte',135],['extrema',175]]){
   g.menu.onDifficulty(level);g.state.combat.dead=true;g.element('play-two').click();
   const p=g.state.player;
   assert.deepEqual([p.form,p.h,p.w,g.state.mecha.maxHp,g.state.combat.difficulty],[form,height,width,armor,level]);
  }
 }
});

test('en cubierta el disparo agachado conserva la puntería horizontal a ambos lados',async()=>{
 const g=await game('?entry=resume',seed(500)),p=g.state.player;
 for(const facing of [-1,1]){
  p.facing=facing;g.key('ArrowDown');g.tick(.2);g.key('KeyJ');g.tick(.05);
  assert.equal(p.crouching,true);assert.deepEqual([p.aim.x,p.aim.y],[facing,0]);
  g.key('KeyJ',false);g.key('ArrowDown',false);g.tick(.5);
 }
});

test('reanudar conserva el daño del Centinela y termina una destrucción interrumpida una sola vez',async()=>{
 const g=await game('?entry=resume',seed(6600));g.tick(.25);
 const m=g.state.mecha;assert.equal(m.active,true);
 require('../enemies').damage(m,35);g.pagehide();
 const back=await game('?entry=resume',Object.fromEntries(g.data));
 assert.equal(back.state.mecha.hp,65);assert.equal(back.state.mecha.active,true);
 require('../enemies').damage(back.state.mecha,1000);back.tick(1.25);back.pagehide();
 const end=await game('?entry=resume',Object.fromEntries(back.data));
 assert.ok(end.state.mecha.deathAge>1);end.tick(3);
 assert.equal(end.state.mecha.defeated,true);assert.ok(end.state.player.robotUnlocked);
 const wallet=JSON.parse(end.data.get('obra10.progress.v1')).wallet;
 end.pagehide();const paid=await game('?entry=resume',Object.fromEntries(end.data));paid.tick(.5);
 assert.equal(JSON.parse(paid.data.get('obra10.progress.v1')).wallet,wallet);
});
async function game(query='?entry=select',initial={}){
 const data=new Map(Object.entries(initial)),listeners={},elements=new Map();let frame,view,wheelState,menuCallbacks,resizeCallback,navigation;
 // Stable loot prevents an unrelated random ammunition pickup during input tests.
 if(data.has('cap-dollar.mission-three.v1')){const saved=JSON.parse(data.get('cap-dollar.mission-three.v1'));saved.lootSeed??=77;data.set('cap-dollar.mission-three.v1',JSON.stringify(saved));}
 const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',style:{},parentElement:{setAttribute(){}},setAttribute(){},focus(){},events:{},addEventListener(name,fn){this.events[name]=fn;},setPointerCapture(id){this.captured=id;},dispatch(name,event={}){this.events[name]?.({pointerId:1,button:0,preventDefault(){},...event});},querySelector(){return element('back');},getBoundingClientRect(){return{width:1296,height:729};},getContext(){return{};},width:960,height:540,click(){this.onclick?.();}});return elements.get(id);};
 const window={ArcadeSkyExpedition:require('../sky-expedition'),addEventListener:(name,fn)=>listeners[name]=fn,ArcadeMainMenu:{create(options){menuCallbacks=options;return{isOpen:()=>false,ready({autoPlay}){if(autoPlay)options.onPlay();},show(){options.onPause();}};}}};
 const context={ArcadeFormTransition:{setSheet(){}},ArcadeAirMecha:{...require('../air-mecha'),setSheet(){}} ,ArcadeJetpackRenderer:require('../jetpack-renderer'),ArcadeCheckpoints:require('../checkpoints'),ArcadeWreckedCars:require('../wrecked-cars'),ArcadeZombieForm:{...require('../zombie-form'),setSheet(){},setExtra(){},setPlayerSheets(){},setIdleSheet(){},setRunSheet(){},setShockSheet(){}},ArcadeStormZombie:require('../storm-zombie'),ArcadeMausoleumKing:{...require('../mausoleum-king'),prepareAtlas:()=>({}),prepareZombieStrips:()=>({}),setRockSheet(){}},ArcadeCemeteryBat:require('../cemetery-bat'),ArcadeCemeteryZombies:require('../cemetery-zombies'),ArcadeWaterCrater:{...require("../water-crater.js"),prepareSprite:image=>image},window,console,Math,Set,Map,Number,JSON,URLSearchParams,ArcadeImpact:require('../impact-effects.js'),location:{search:query,assign:url=>navigation=url},localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},document:{getElementById:element,querySelector:element,querySelectorAll:()=>[],addEventListener(){}},ResizeObserver:class{constructor(callback){resizeCallback=callback;}observe(){}},Image:class{set src(v){queueMicrotask(()=>this.onload());}},requestAnimationFrame:fn=>frame=fn,
 ArcadeMissionCombat:require('../mission-combat.js'),ArcadeCityTank:require('../city-tank.js'),ArcadeMissionTwoLoot:require('../mission-two-loot.js'),ArcadeScore:require('../score.js'),ArcadeDifficulty:require('../difficulty.js'),ArcadeArsenal:require('../arsenal.js'),ArcadePowers:require('../powers.js'),ArcadeSoundEvents:require('../sound-events.js'),ArcadeMissionHud:{create:()=>({update(){}})},ArcadePowerSprites:{setSpriteSheet(){},setOrbitalSheet(){}},prepareWhiteDeath:image=>image,ArcadePhysics:require('../physics.js'),ArcadeLevelThree:require('../level-three.js'),ArcadeParachute:parachute,ArcadeCampaign:campaign,ArcadeProgression:require('../progression.js'),ArcadeSoldierAnimation:require('../soldier-animation.js'),
 ArcadeAudio:{create:()=>({play(){},loop(){},setRunning(){},unlock(){}})},ArcadeCharacterWheel:{create:()=>({setSprites(){},update(...args){wheelState=args;}})},ArcadeLevelThreeRenderer:{create:()=>({draw(_ctx,state,camera){view={state,camera};}})},SOLDIER_V2_FRAMES:[[[0,0,10,10]]],ACTION_FRAMES:{wolf:[[0,0,0,0,0,0,0,[0,0,10,10]]]}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../level-three-game.js'),'utf8'),context);await new Promise(resolve=>setImmediate(resolve));
 let now=0;function tick(seconds){for(let i=0;i<Math.ceil(seconds*120);i++){now+=1000/120;frame(now);}}
 function key(code,down=true,event={}){listeners[down?'keydown':'keyup']({code,repeat:false,preventDefault(){},...event});}
 tick(.05);return{tick,key,element,data,resize:()=>resizeCallback(),get state(){return view.state;},get camera(){return view.camera;},get wheel(){return wheelState;},get menu(){return menuCallbacks;},get navigation(){return navigation;},pagehide:()=>listeners.pagehide?.()};
}
