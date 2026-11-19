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
