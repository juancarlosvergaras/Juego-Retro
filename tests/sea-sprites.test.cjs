const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('../sea-sprites');

function setup(){
 const images={swimmers:{width:1536,height:6*128},submarines:{width:1536,height:3*128},wildlife:{width:1536,height:7*192}};
 const calls=[];
 const ctx={save(){},restore(){},translate(){},rotate(){},scale(){},fillText(){},strokeRect(){},drawImage(...args){calls.push(args);}};
 return {sprites:create(images),ctx,calls};
}
function checkStrip(calls,cellHeight){
 assert.deepEqual(calls.map(call=>call[1]),[0,192,384,576,768,960,1152,1344]);
 assert.equal(new Set(calls.map(call=>call[2])).size,1);
 assert.ok(calls.every(call=>call[3]===192&&call[4]===cellHeight));
 assert.equal(new Set(calls.map(call=>call.slice(5).join(','))).size,1);
}
test('underwater sprites use eight separately drawn cels with a fixed pivot for each movement cycle',()=>{
 const {sprites,ctx,calls}=setup();
 for(const form of ['soldier','wolf','zombie','robot','fighter','tank']){
  for(let i=0;i<8;i++)assert.ok(sprites.player(ctx,{form,x:400,y:270,facing:1,swimCycle:(i+.1)/8}));
  checkStrip(calls.splice(0),128);
 }
 for(const type of ['diver','sub']){
  for(let i=0;i<8;i++)sprites.enemy(ctx,{type,x:400,y:270,h:50,facing:-1,swimCycle:(i+.1)/8});
  checkStrip(calls.splice(0),128);
 }
 for(const type of ['shark','squid']){
  for(let i=0;i<8;i++)sprites.predator(ctx,{type,phase:'swim',stroke:((i+.1)/8-(type==='squid'?.2:0))*2*Math.PI,x:400,y:250,h:50});
  checkStrip(calls.splice(0),192);
 }
 for(const name of ['fish','ray','jelly','turtle']){
  for(let i=0;i<8;i++)sprites.ambient(ctx,name,(i+.1)/8,400,270,46,false);
  checkStrip(calls.splice(0),192);
 }
});
test('shark anticipation and strike play a complete bite, and firing preserves the eight-cel submarine stroke',()=>{
 const {sprites,ctx,calls}=setup();
 for(let i=0;i<8;i++)sprites.predator(ctx,{type:'shark',x:400,y:200,h:58,
  phase:i<4?'warn':'rush',phaseAge:i<4?(i+.1)*.85/4:(i-4+.1)*1.1/4});
 checkStrip(calls.splice(0),192);
 for(let i=0;i<8;i++)sprites.player(ctx,{form:'tank',x:400,y:200,facing:1,swimCycle:(i+.1)/8,cannonPose:.65*(1-(i+.1)/8)});
 const hull=calls.filter(call=>call[3]===192);
 checkStrip(hull,128);
 assert.ok(hull.every(call=>call[2]===0),'the hull and turret keep the cruising registration');
 assert.equal(calls.filter(call=>call[3]===46).length,2,'only the early firing cels show the muzzle flash');
});

test('el escudo de inmersión envuelve el casco y comparte su inclinación al girar',()=>{
 const img={width:1312,height:108},sprites=create({seaShield:img,swimmers:{},submarines:{},wildlife:{}});
 for(const facing of [-1,1]){
  const transforms=[],c={globalAlpha:1,save(){},restore(){},translate(...xy){transforms.push(xy);},rotate(a){transforms.push(a);},drawImage(...a){transforms.push(a);}};
  const p={x:340,y:250,facing,swimPitch:.22,form:'tank'};
  sprites.shield(c,p,{age:.81,shieldFlash:.2});
  const [center,tilt,draw]=transforms;
  assert.equal(tilt,.22*facing);assert.ok(Math.abs(center[0]-340)<1&&Math.abs(center[1]-218)<1);
  assert.equal(draw[0],img);assert.equal(draw[7],131);assert.equal(draw[8],86);
 }
});

test('each underwater fighter move uses eight attack cels then returns to the swimming stroke',()=>{
 const forms=require('../advanced-forms'),image={width:1536,height:512};
 const {ctx,calls}=setup(),sprites=create({swimmers:{width:1536,height:768},submarines:{},wildlife:{},fighterSwim:image});
 for(let row=0;row<4;row++)for(const facing of [-1,1]){
  const p={form:'fighter',x:200,y:320,facing,swimPitch:-.2,fighterPose:.8,fighterCombo:row%3,fighterKick:row===3};
  const move=forms.fighterMove(p);
  for(let i=0;i<8;i++){p.fighterAge=move.duration*(i+.2)/8;sprites.player(ctx,p);}
  const attack=calls.splice(0);checkStrip(attack,128);
  assert.ok(attack.every(a=>a[0]===image&&a[2]===128*row));
  p.fighterAge=move.duration;sprites.player(ctx,p);assert.notEqual(calls.pop()[0],image);
 }
});
