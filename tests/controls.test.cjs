const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../controls'),A=require('../arsenal'),B=require('../frame-budget');
const pad=(buttons=[],axes=[0,0,0,0])=>({connected:true,index:0,mapping:'standard',axes,buttons:Array.from({length:16},(_,i)=>({pressed:buttons.includes(i),value:buttons.includes(i)?1:0}))});
test('Xbox defaults allow running, diagonal aim, fire and jump simultaneously',()=>{
 const s=C.sample(pad([0,5,7],[.8,0,-.8,-.8]),C.fresh());assert.deepEqual([...s.held].sort(),['fire','jump','right','run']);const v=A.aimDirection({right:true,aimVector:s.aim},1);assert.ok(v.x<0&&v.y<0);assert.ok(Math.abs(Math.hypot(v.x,v.y)-1)<1e-8);
});
test('sticks ignore drift and aiming includes all eight directions without movement',()=>{
 assert.equal(C.sample(pad([],[.1,-.1,.1,.1]),C.fresh()).held.size,0);
 for(let i=0;i<8;i++){const angle=i*Math.PI/4,s=C.sample(pad([],[0,0,Math.cos(angle),Math.sin(angle)]),C.fresh());assert.equal(s.held.size,0);assert.ok(Math.abs(s.aim.x-Math.cos(angle))<1e-8);assert.ok(Math.abs(s.aim.y-Math.sin(angle))<1e-8);}
});
test('custom keyboard bindings replace defaults while Esc remains a recovery key',()=>{
 const s=C.clean({keyboard:{fire:'KeyU',jump:'KeyJ',pause:'Enter'}});assert.equal(C.keyboardAction(s,'KeyU').id,'fire');assert.equal(C.keyboardAction(s,'KeyJ').id,'jump');assert.equal(C.keyboardAction(s,'KeyX'),undefined);assert.equal(C.keyboardAction(s,'Escape').id,'pause');assert.equal(C.keyboardAction(s,'Enter').id,'pause');
});
test('numpad navigation with Num Lock off remains movement rather than weapon selection',()=>{
 assert.equal(C.keyboardAction(C.fresh(),'Numpad8','ArrowUp').id,'up');assert.equal(C.keyboardAction(C.fresh(),'Numpad4','ArrowLeft').id,'left');assert.equal(C.keyboardAction(C.fresh(),'Numpad8','8').id,'weapon8');
});
test('custom Xbox assignments, unassignment, analog triggers and disconnected pads',()=>{
 const s=C.clean({gamepad:{jump:3,form:null}});assert.deepEqual([...C.sample(pad([3]),s).held],['jump']);const p=pad();p.buttons[7].value=.7;assert.ok(C.sample(p,s).held.has('fire'));p.connected=false;assert.equal(C.sample(p,s).held.size,0);
});
test('rebinding an occupied Xbox button swaps actions rather than leaving two attacks on one button',()=>{
 const s=C.fresh();assert.equal(C.bind(s,'pad','jump',7).ok,true);assert.deepEqual([...C.sample(pad([7]),s).held],['jump']);assert.deepEqual([...C.sample(pad([0]),s).held],['fire']);assert.equal(C.bind(s,'key','jump','KeyJ').ok,false);assert.equal(C.keyboardAction(s,'Space').id,'jump');C.bind(s,'pad','jet',null);assert.equal(C.sample(pad([10]),s).held.size,0);
});
test('input sources overlap without repeated attacks or stuck releases',()=>{
 const events=[],r=C.createRouter((id,down)=>events.push([id,down]));r.set('key:KeyJ',['fire']);r.set('pad',['fire','right']);r.set('pad',['fire','right']);r.set('key:KeyJ',[]);assert.equal(events.filter(e=>e[0]==='fire').length,1);r.set('pad',[]);assert.deepEqual(events,[['fire',true],['right',true],['fire',false],['right',false]]);r.set('key:KeyD',['right']);r.clear();assert.deepEqual(events.slice(-2),[['right',true],['right',false]]);
});
test('invalid saved controls cannot break input or persist reserved bindings',()=>{
 const s=C.clean({mode:'bad',deadzone:100,keyboard:{fire:'F5',jump:'<script>'},gamepad:{jump:99,fire:-1}});assert.equal(s.mode,'auto');assert.equal(s.deadzone,.6);assert.deepEqual(s.keyboard,{});assert.deepEqual(s.gamepad,{});assert.deepEqual(C.load({getItem(){throw Error();}}),C.fresh());assert.deepEqual(C.load({getItem:()=>'{broken'}),C.fresh());
});
test('held controls survive the arrival input clear without repeating jump or transform',()=>{
 const r=C.createRouter(()=>{});r.set('pad',new Set(['right','run','fire','jump','form']));const input=C.decorateInput({jumpPressed:false},r.held,null);assert.equal(input.right,true);assert.equal(input.run,true);assert.equal(input.fireHeld,true);assert.equal(input.fire,true);assert.equal(input.jumpPressed,false);assert.equal(input.form,undefined);r.clear();assert.equal(C.decorateInput({},r.held,null).right,undefined);
});
test('60/120/144 Hz displays retain native animation rate and update HUD near 20 Hz',()=>{
 for(const hz of [60,120,144]){const budget=B.create();let frames=0,hud=0;for(let i=0;i<hz*10;i++){const p=budget.plan(i*1000/hz,{width:960,height:540});frames+=p.render;hud+=p.hud;}assert.equal(frames,hz*10);assert.ok(hud>=195&&hud<=205,`${hz}: ${hud}`);}
});
test('paused and hidden scenes stop rendering and resume or resize repaint immediately',()=>{
 const b=B.create();assert.equal(b.plan(0).render,true);assert.equal(b.plan(20,{paused:true}).render,true);assert.equal(b.plan(1000,{paused:true}).render,false);assert.equal(b.plan(1010,{paused:true,width:900}).render,true);assert.deepEqual(b.plan(1020,{hidden:true}),{render:false,hud:false});assert.equal(b.plan(1030).render,true);
});
