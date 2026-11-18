const {test}=require('node:test'),assert=require('node:assert/strict'),T=require('../tutorial.js');
function store(){const values=new Map();return {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};}
function context(){return {mission:1,blocked:false,p:{x:145,y:1000,vx:0,form:'soldier'},e:{inventory:{owned:[1,3],selected:3},won:false},input:{},ladders:[],floor:0,hookAvailable:false};}
test('tutorial starts with movement and introduces shooting only after moving',()=>{
 const t=T.create(store()),c=context();t.update(c,.01);assert.equal(t.state.active.id,'move');
 t.update(c,10);assert.equal(t.state.active.id,'move');
 c.p.x+=50;c.p.vx=140;c.input.right=true;t.update(c,3);assert.equal(t.state.active,null);
 t.update(c,3);assert.equal(t.state.active.id,'fire');
 c.input.fire=true;t.update(c,3);t.update(c,3);assert.equal(t.state.active.id,'jump');
});
test('disabled tutorial shows nothing, consumes no lessons, and persists across reloads',()=>{
 const s=store(),t=T.create(s),c=context();t.update(c,.1);assert.ok(t.state.active);
 t.setEnabled(false);t.update(c,30);assert.equal(t.state.active,null);assert.equal(t.state.seen.size,0);
 const next=T.create(s);assert.equal(next.state.enabled,false);next.update(c,30);assert.equal(next.state.active,null);
 next.setEnabled(true);next.update(c,.1);assert.equal(next.state.active.id,'move');
});
test('completed lessons stay learned across retries and reloads, with an explicit reset',()=>{
 const s=store(),t=T.create(s),c=context();t.update(c,.01);t.dismiss();
 const next=T.create(s);next.update(c,.01);assert.equal(next.state.active,null);assert.ok(next.state.seen.has('move'));
 next.reset();next.update(c,.01);assert.equal(next.state.active.id,'move');
});
test('special actions are introduced only in context; future missions receive no mission-one tips',()=>{
 const t=T.create(store()),c=context();for(const id of ['move','fire','jump'])t.state.seen.add(id);
 t.update(c,1);assert.equal(t.state.active,null);
 c.floor=4;c.hookAvailable=true;t.update(c,.1);assert.equal(t.state.active.id,'grip');t.dismiss();
 c.hookAvailable=false;c.p.jetpack=true;t.update(c,3);assert.equal(t.state.active.id,'jet');t.dismiss();
 c.p.jetpack=false;c.e.won=true;t.update(c,3);assert.equal(t.state.active.id,'form');
 t.reset();c.mission=2;t.update(c,20);assert.equal(t.state.active,null);assert.equal(t.state.seen.size,0);
});
test('pause and cinematics neither show new lessons nor age the current one',()=>{
 const t=T.create(store()),c=context();c.blocked=true;t.update(c,30);assert.equal(t.state.active,null);
 c.blocked=false;t.update(c,.1);c.blocked=true;t.update(c,30);assert.equal(t.state.age,0);assert.equal(t.state.active.id,'move');
});
test('denied or malformed storage never prevents play or toggling the tutorial',()=>{
 const t=T.create({getItem(){return '{bad';},setItem(){throw Error('denied');}});
 assert.equal(t.state.enabled,true);assert.equal(t.setEnabled(false),false);t.update(context(),20);assert.equal(t.state.active,null);
});
