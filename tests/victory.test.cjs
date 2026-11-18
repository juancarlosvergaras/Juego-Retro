const {test}=require('node:test'),assert=require('node:assert/strict'),V=require('../victory.js');
test('rescue helicopter is already flying before the ally enters and catches up',()=>{
 const first=V.scene(0);assert.ok(first.lead.x>0&&first.lead.x<1);assert.equal(first.ally.visible,false);
 const entering=V.scene(1.6),middle=V.scene(3.8),formation=V.scene(6.5);
 assert.equal(entering.ally.visible,true);assert.ok(entering.ally.x<0);assert.ok(middle.ally.x>entering.ally.x);assert.ok(formation.ally.x>middle.ally.x);
 assert.ok(formation.ally.x<formation.lead.x);assert.ok(formation.ally.y<formation.lead.y);
 assert.ok(Math.abs(V.scene(50).ally.x-formation.ally.x)<.001);
});
test('Cap Dollar appears first, The Hunter follows, then results become available',()=>{
 assert.equal(V.scene(2.9).title,0);assert.ok(V.scene(3.8).title>0);assert.equal(V.scene(3.8).subtitle,0);
 assert.equal(V.scene(4.7).title,1);assert.ok(V.scene(5.5).subtitle>0);assert.equal(V.scene(7).subtitle,1);
 assert.equal(V.scene(7).ready,false);assert.equal(V.scene(7.5).ready,true);
});

test('background gradually defocuses as the title appears, and flight stays subtle',()=>{
 assert.equal(V.scene(0).blur,0);assert.equal(V.scene(2.5).blur,0);
 assert.ok(V.scene(4).blur>0);assert.ok(V.scene(6).blur>V.scene(4).blur);assert.equal(V.scene(7).blur,1);
 for(let t=0;t<30;t+=.02){const a=V.scene(t),b=V.scene(t+.02);assert.ok(Math.abs(a.lead.y-.32)<=.00101);assert.ok(Math.abs(b.lead.x-a.lead.x)<.00002);assert.ok(Math.abs(b.lead.y-a.lead.y)<.00002);}
});

test('rotor frames retain one fuselage pivot and scale during the flyby',()=>{
 const E=require('../extraction.js'),fs=require('node:fs'),vm=require('node:vm'),scope={window:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../helicopter-atlas.js'),'utf8'),scope);
 const frames=scope.window.HELICOPTER_FRAMES;E.setSpriteSheet({},frames);
 const calls=[],ctx={drawImage(...args){calls.push(args);}};
 for(let i=0;i<frames.length;i++)E.drawFlyby(ctx,400,220,504,(i+.1)/18);
 const pivots=calls.map((a,i)=>[a[5]+frames[i][4]*(a[7]/a[3]),a[6]+frames[i][5]*(a[8]/a[4])]);
 for(let i=0;i<calls.length;i++){assert.equal(calls[i][7]/calls[i][3],1);assert.equal(calls[i][8]/calls[i][4],1);assert.deepEqual(pivots[i],pivots[0]);}
});
