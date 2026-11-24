const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture(){
  const requests = [], calls = [];
  let now = 0;
  const sandbox = {
    Image: class {
      naturalWidth = 640;
      naturalHeight = 80;
      set src(value){requests.push({value, image: this});}
    },
    Date: {now: () => now}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../scenery-animation.js'),'utf8'), sandbox);
  const ctx = {globalAlpha: .75, drawImage(...args){calls.push(args);}};
  return {ctx, api: sandbox.ArcadeSceneryAnimation, requests, calls, tick: ms => {now += ms;}};
}

test('each scenery loop requests its own strip once and returns to its first pose', () => {
  const {ctx, api, requests, calls} = fixture();
  const cases = {mixer:8, raven:9, plane:12, pump:5, manta:5, horse:7, satellite:5, steam:8, forklift:5, lighthouse:6};
  for(const [id, fps] of Object.entries(cases)){
    const count = calls.length;
    const draw = t => api.draw(ctx,id,t,100,140,40,.5);
    draw(0);
    assert.equal(calls.length,count);
    const request = requests.at(-1);
    assert.ok(fs.existsSync(path.resolve(__dirname,'..',request.value)), request.value);
    request.image.onload();
    for(let i=0;i<=8;i++)draw((i+.05)/fps);
    assert.deepEqual(calls.slice(count).map(call=>call[1]),[0,80,160,240,320,400,480,560,0]);
    assert.equal(ctx.globalAlpha,.75);
  }
  assert.equal(requests.length,10);
  assert.equal(new Set(requests.map(r=>r.value)).size,10);
});

test('a missing scenery strip skips drawing and backs off before retrying', () => {
  const {ctx, api, requests, calls, tick} = fixture();
  const draw = () => api.draw(ctx,'steam',1,50,130,48);
  draw();
  requests[0].image.onerror();
  tick(4999); draw();
  assert.equal(requests.length,1);
  tick(1); draw(); draw();
  assert.equal(requests.length,2);
  assert.equal(calls.length,0);
  requests[1].image.onload(); draw();
  assert.equal(calls.length,1);
});

test('los sucesos programados cargan por zona y reproducen sus ocho celdas',()=>{
  const sets={obra:['casco'],ciudad:['derrumbe'],cementerio:['calavera'],aire:['gaviota'],
    carretera:['helicoptero','rueda'],superficie:['ballena'],lecho:['cangrejo'],tiendas:['aspiradora'],
    espacio:['astronauta'],avenida:['pizza'],delta:['voladores'],archipielago:['lagarto'],muelles:['pelicano']};
  for(const [scene,ids] of Object.entries(sets)){
    const {api,requests}=fixture(),owner={},frames=new Map();
    for(let k=0;k<60*80;k++){
      const e=api.next(owner,scene,k/60),request=requests.at(-1);if(request&&!request.loaded){request.image.onload();request.loaded=true;}
      if(e){if(!frames.has(e.id))frames.set(e.id,new Set());frames.get(e.id).add(e.frame);}
    }
    assert.equal(requests.length,ids.length);assert.deepEqual([...frames.keys()],ids);
    for(const [id,f] of frames){
      assert.ok(fs.existsSync(path.join(__dirname,'../assets/sprites/suceso-'+id+'-8.webp')));
      assert.deepEqual([...f].sort(),[0,1,2,3,4,5,6,7]);
    }
    if(scene==='ciudad')assert.equal(api.next(owner,scene,200).frame,7);
  }
});
test('un suceso espera a la imagen, se congela con el reloj de juego y conserva su apoyo al mover la cámara',()=>{
  const {api,requests,ctx,calls}=fixture(),owner={};let t=0;
  for(;t<12;t+=.1)assert.equal(api.next(owner,'tiendas',t),null);
  requests[0].image.onload();let e;
  for(;t<32&&!e;t+=.1)e=api.next(owner,'tiendas',t);
  const age=e.age;
  api.next(owner,'tiendas',t-.1);assert.equal(e.age,age);
  api.next(owner,'tiendas',t+70);assert.equal(e.age,age);
  api.place(ctx,e,250,110,960,80,.7);api.place(ctx,e,266,110,960,80,.7);
  assert.equal(calls[0][5]-calls[1][5],16);assert.equal(calls[0][6],calls[1][6]);
});

test('los peces del delta completan el salto y se sumergen al terminar la octava pose',()=>{
  const {api,requests}=fixture(),owner={},frames=new Map();
  let lastDraw,end;
  for(let i=0;i<6*120;i++){
    const t=i/120,e=api.next(owner,'delta',t);
    if(i===0)requests[0].image.onload();
    if(e){
      frames.set(e.frame,(frames.get(e.frame)||0)+1);
      lastDraw=t;
    }else if(lastDraw!==undefined){end=t;break;}
  }
  assert.equal(frames.size,8);
  for(const count of frames.values())assert.ok(count>=14&&count<=16,'cada pose dura un octavo de segundo');
  assert.ok(end-lastDraw<=1/120+1e-10);
  for(let i=1;i<=120;i++)assert.equal(api.next(owner,'delta',end+i/120),null);
});

test('el correcaminos y el helicóptero entran y salen completos, sin fundirse dentro del encuadre',()=>{
 for(const hz of [60,30,15,2]){
  const {api,requests,ctx,calls}=fixture(),owner={},observed=new Map();
  for(let i=0;i<hz*80;i++){
   const e=api.next(owner,'carretera',i/hz),request=requests.at(-1);
   if(request&&!request.loaded){request.image.onload();request.loaded=true;}
   if(!e)continue;
   const width=e.id==='rueda'?68:108;
   api.cross(ctx,e,316,960,width,.8);
   const left=calls.at(-1)[5];
   if(!observed.has(e.id))observed.set(e.id,{start:left,end:left,previous:left,width,done:false});
   const row=observed.get(e.id);if(row.done)continue;
   assert.ok(left>=row.previous&&left-row.previous<=Math.ceil(220/hz));
   assert.equal(e.alpha,1);row.previous=left;row.end=left;
   if(left>=960)row.done=true;
  }
  assert.deepEqual([...observed.keys()],['helicoptero','rueda']);
  for(const row of observed.values()){assert.ok(row.start+row.width<=0);assert.ok(row.done&&row.end>=960);}
 }
});
