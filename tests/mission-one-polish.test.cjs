const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../physics.js');
const Story=require('../mission-one-story.js');
const Ambience=require('../ambience.js');
const Fx=require('../mission-one-fx.js');

function jumpHeight(heldSteps){
  const platforms=P.createPlatforms(),p=P.createPlayer();let peak=p.y;
  for(let i=0;i<240;i++){
    const input=heldSteps===null?{jumpPressed:i===0}:{jumpPressed:i===0,jumpHeld:i<heldSteps};
    P.step(p,input,1/120,platforms);peak=Math.min(peak,p.y);
  }
  assert.ok(p.grounded,'el jugador vuelve a aterrizar');
  return P.WORLD.ground-peak;
}
test('soltar el salto pronto acorta el ascenso; mantenerlo conserva la altura completa',()=>{
  const full=jumpHeight(240),legacy=jumpHeight(null),tap=jumpHeight(6),mid=jumpHeight(20);
  assert.ok(Math.abs(full-legacy)<.01,'sin jumpHeld (enemigos, pruebas) el salto no cambia');
  assert.ok(full>80,'altura completa '+full);
  assert.ok(tap<full*.65&&tap>25,'toque corto '+tap);
  assert.ok(mid>tap&&mid<full,'altura intermedia '+mid);
});
test('el segundo salto también responde a soltar el botón',()=>{
  const platforms=P.createPlatforms(),p=P.createPlayer();
  for(let i=0;i<30;i++)P.step(p,{jumpPressed:i===0,jumpHeld:true},1/120,platforms);
  P.step(p,{jumpPressed:true,jumpHeld:true},1/120,platforms);
  assert.equal(p.jumps,2);assert.ok(p.vy< -300);
  P.step(p,{jumpHeld:false},1/120,platforms);
  assert.ok(p.vy>=-190,'ascenso recortado: '+p.vy);
});

const base={arrived:false,workersAlerted:false,enemyAlert:false,hp:5,floor:0,bossActive:false,won:false,transforming:false,finalActive:false,finalStage:1,extraction:false};
function run(radio,c,seconds){let last=null;for(let i=0;i<seconds*60;i++)last=radio.update(c,1/60);return last;}
test('la radio presenta la misión y encadena los avisos sin solaparlos',()=>{
  const radio=Story.createRadio();
  assert.equal(run(radio,base,1),null);
  const first=run(radio,{...base,arrived:true},.1);
  assert.equal(first.id,'start');
  // Dos avisos a la vez: el segundo espera a que termine el primero.
  run(radio,{...base,arrived:true,workersAlerted:true,enemyAlert:true},.1);
  assert.equal(radio.state.current.id,'start');assert.equal(radio.state.queue.length,2);
  run(radio,{...base,arrived:true,workersAlerted:true,enemyAlert:true},first.duration+1);
  assert.equal(radio.state.current.id,'workers');
});
test('un aviso de piso atrasado no suena después del jefe',()=>{
  const radio=Story.createRadio();radio.reset();
  run(radio,{...base,arrived:true},.1);
  run(radio,{...base,arrived:true,floor:5},.1);
  run(radio,{...base,arrived:true,floor:10},.1);
  assert.deepEqual(radio.state.queue.map(b=>b.id),['floor10']);
  run(radio,{...base,arrived:true,floor:19,bossActive:true},.1);
  assert.deepEqual(radio.state.queue.map(b=>b.id),['boss']);
});
test('la mordida precede al aviso de la azotea y no aparece durante la transformación',()=>{
  const radio=Story.createRadio();radio.reset();
  run(radio,{...base,won:true,transforming:true},1);
  assert.equal(radio.state.current,null);
  const shown=[];for(let i=0;i<60*30;i++){const c=radio.update({...base,won:true},1/60);if(c&&shown[shown.length-1]!==c.id)shown.push(c.id);}
  assert.deepEqual(shown,['bite','roof']);
});
test('al reanudar una partida no se repite lo ya vivido',()=>{
  const radio=Story.createRadio();
  run(radio,{...base,floor:12,workersAlerted:true,enemyAlert:true},20);
  assert.equal(radio.state.current,null);assert.equal(radio.state.queue.length,0);
  run(radio,{...base,floor:15,workersAlerted:true,enemyAlert:true},.1);
  assert.equal(radio.state.current.id,'floor15');
});
test('el informe y los avisos tienen texto y hablante',()=>{
  assert.equal(Story.briefing.length,3);
  for(const page of Story.briefing)assert.ok(page.title&&page.text.length>60);
  for(const beat of Story.beats)assert.ok(beat.who&&beat.text.length>20&&beat.text.length<140,beat.id);
  assert.equal(new Set(Story.beats.map(b=>b.id)).size,Story.beats.length);
});

test('el horizonte llega hasta la calle en vistas altas y conserva el paralaje clásico',()=>{
  const ground=P.WORLD.ground;
  for(const height of [319,450,520,700]){
    const camera={x:0,y:P.WORLD.height-height},city=Ambience.cityPlacement(camera,ground,height);
    assert.ok(city.y+city.h>=Math.min(height,ground-camera.y)-.01,'sin franja vacía con alto '+height);
  }
  const camera={x:40,y:1200};
  assert.deepEqual(Ambience.cityPlacement(camera,ground),{x:-20-40*.12,y:340+(ground-1200)*.12-640,w:960,h:640});
});
test('la altitud y las luces de la escena',()=>{
  const W=P.WORLD;
  assert.ok(Fx.altitude({x:0,y:W.height-450},450,W)<.05,'a pie de calle');
  assert.equal(Fx.altitude({x:0,y:W.top},450,W),1);
  const platforms=P.createPlatforms(),player=P.createPlayer();
  const quiet={player,platforms,time:1,arrival:null,checkpoint:null,encounter:{flash:0,enemies:[],boss:{hp:18,flash:0},finalBoss:{active:false,missiles:[]},explosions:[],bullets:[]}};
  const idle=Fx.collect(quiet);
  assert.ok(idle.some(l=>l.x===player.x),'el jugador lleva su propia luz');
  const firing=Fx.collect({...quiet,encounter:{...quiet.encounter,flash:.14,lastAim:{x:1,y:0},explosions:[{x:300,y:300,radius:85,life:.5}],bullets:Array.from({length:60},(_,i)=>({x:i,y:0}))}});
  assert.ok(firing.some(l=>l.glow==='255,214,140'),'fogonazo');
  assert.ok(firing.some(l=>l.r>200),'explosión');
  assert.ok(firing.length-idle.length<=30,'las luces de proyectiles están acotadas');
  for(const l of firing)assert.ok(Number.isFinite(l.x)&&Number.isFinite(l.y)&&l.r>0);
});
