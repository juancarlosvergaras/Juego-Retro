const test=require('node:test');
const assert=require('node:assert/strict');
const Armory=require('../armory.js');
const Arsenal=require('../arsenal.js');
const Map=require('../mission-map.js');

const profile=wallet=>({wallet});
test('la armería vende un arma nueva con su munición inicial',()=>{
  const inv=Arsenal.createInventory(),p=profile(2000);
  const result=Armory.buy(p,inv,4);
  assert.equal(result.ok,true);assert.equal(p.wallet,2000-Armory.prices[4]);
  assert.ok(inv.owned.includes(4));assert.equal(inv.ammo[4],Arsenal.weapons[4].ammo);
  assert.equal(Arsenal.selectWeapon(inv,4),true,'el arma comprada se puede equipar');
});
test('con el arma en el equipo se compra munición, más barata y con tope',()=>{
  const inv=Arsenal.createInventory(),p=profile(100000);
  const offer=Armory.offer(inv,3);
  assert.equal(offer.kind,'ammo');assert.equal(offer.have,36);
  for(let i=0;i<10;i++)Armory.buy(p,inv,3);
  assert.equal(inv.ammo[3],Arsenal.weapons[3].ammo*Armory.AMMO_PACKS);
  const before=p.wallet,full=Armory.buy(p,inv,3);
  assert.equal(full.ok,false);assert.equal(p.wallet,before,'no cobra al llegar al tope');
  Armory.buy(p,inv,5);
  assert.ok(Armory.offer(inv,5).cost<Armory.prices[5],'la munición cuesta menos que el arma');
});
test('sin puntos suficientes no cambia nada',()=>{
  const inv=Arsenal.createInventory(),p=profile(100);
  const result=Armory.buy(p,inv,6);
  assert.equal(result.ok,false);assert.equal(p.wallet,100);assert.deepEqual(inv.owned,[1,3]);assert.equal(inv.ammo[6],undefined);
});
test('un arma cuerpo a cuerpo solo se compra una vez',()=>{
  const inv=Arsenal.createInventory(),p=profile(5000);
  assert.equal(Armory.buy(p,inv,2).ok,true);
  const again=Armory.buy(p,inv,2);
  assert.equal(again.ok,false);assert.equal(p.wallet,5000-Armory.prices[2]);
  assert.equal(Armory.offer(inv,2).full,true);
});
test('la armería ofrece todas las armas menos el cuchillo inicial',()=>{
  const offers=Armory.offers(Arsenal.createInventory());
  assert.deepEqual(offers.map(o=>o.slot),[2,3,4,5,6,7,8,9]);
  for(const o of offers){assert.ok(o.cost>0&&o.note.length>10);assert.ok(Object.values(o.stats).every(v=>v>0&&Number.isFinite(v)),o.name);}
  assert.equal(Armory.buy(profile(9999),Arsenal.createInventory(),1).ok,false);
});

test('la campaña tiene cuatro recorridos y todos pasan por el abismo',()=>{
  const {nodes,edges,forks}=Map.graph();
  assert.deepEqual(forks.map(f=>f.choices),[['m3','m4'],['m6','m7']]);
  assert.equal(new Set(nodes.map(n=>n.x+','+n.y)).size,12);
  function paths(id){
    if(id==='m10')return [[id]];
    return edges.filter(e=>e.from.id===id).flatMap(e=>paths(e.to.id).map(t=>[id,...t]));
  }
  assert.deepEqual(paths('m1').map(p=>p.join('-')).sort(),[
    'm1-m2-m3-m5-m6-m8-m9-m10','m1-m2-m3-m5-m7-m8-m9-m10','m1-m2-m4-m5-m6-m8-m9-m10','m1-m2-m4-m5-m7-m8-m9-m10'
  ]);
  for(const n of nodes.filter(n=>n.special)){
    assert.deepEqual(edges.filter(e=>e.to===n).map(e=>e.from.id),[n.id==='fuga'?'m4':'m5']);
    assert.ok(!edges.some(e=>e.from===n));
  }
});
test('el mapa distingue las alternativas, las victorias y los premios de cada especial',()=>{
  const {nodes}=Map.graph(),states=(level,wins,hero=false,cloak=false)=>Object.fromEntries(
    Map.states(level,nodes,hero,cloak,wins).map((state,i)=>[nodes[i].id,state]));
  const first=states(4,[1,2]);assert.equal(first.m3,'choice');assert.equal(first.m4,'current');
  const fork=states(5,[1,2,3,5]);assert.equal(fork.m6,'choice');assert.equal(fork.m7,'choice');
  const second=states(6,[1,2,4,5],true);assert.equal(second.m7,'choice');assert.equal(second.m5,'done');
  assert.equal(second.quimera,'done');assert.equal(second.fuga,'open');assert.equal(states(8,[8],false,true).fuga,'done');
});
test('las curvas del camino unen exactamente sus dos paradas',()=>{
  const {edges}=Map.graph();
  for(const e of edges){const d=Map.route(e.from,e.to);assert.ok(d.startsWith('M'+e.from.x+' '+e.from.y+' C'));assert.ok(d.endsWith(e.to.x+' '+e.to.y));}
});

test('el mapa recuerda las victorias del perfil tras repetir y distingue las rutas solo visitadas',()=>{
  const Campaign=require('../campaign');
  const records=new globalThis.Map();
  const store={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)};
  const save=(name,data)=>store.setItem('cap-dollar.mission-'+name+'.v1',JSON.stringify(data));
  save('three',{ending:false});
  save('four',{road:{complete:true}});
  save('two',{inside:true,king:{defeated:true}});
  save('five',{sea:{complete:false}});
  Campaign.write(store,{level:8});
  assert.deepEqual(Campaign.completedMissions(store),[4]);
  save('four',{road:{complete:false}});
  save('two',{inside:false,king:{defeated:true}});
  Campaign.markCompleted(store,8);
  assert.deepEqual(Campaign.completedMissions(store),[2,4,8]);
  assert.equal(Map.states(8,Map.graph().nodes,false,false,[2,4,8])[Map.graph().nodes.findIndex(n=>n.id==='m8')],'done');
});

test('un enlace directo respeta el perfil activo y devuelve al mapa sin avanzar la campaña',()=>{
  const vm=require('node:vm'),fs=require('node:fs'),records=new globalThis.Map();
  const store={getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,v)};
  let redirected=null,profile={fighterUnlocked:false,owned:['cloak']};
  const window={document:{},localStorage:store,location:{replace:url=>redirected=url},
    ArcadeDeveloperMode:{storage:()=>store,active:()=>false},ArcadeProgression:{load:()=>profile}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../campaign'),'utf8'),{window});
  const c=window.ArcadeCampaign;c.write(store,{level:4});
  assert.equal(c.guardEntry('fuga'),false);assert.equal(redirected,'index.html?menu=levels#fuga');
  c.markCompleted(store,4);assert.equal(c.guardEntry('fuga'),true);
  assert.equal(c.guardEntry('quimera'),false);profile={...profile,fighterUnlocked:true};
  assert.equal(c.guardEntry('quimera'),true);assert.equal(c.guardEntry('m8'),false);
  assert.equal(c.read(store).level,4);
});
