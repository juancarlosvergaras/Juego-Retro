const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const mappings={
 'soldier-v2-atlas.js':{SOLDIER_V2_FRAMES:'soldado-v2.png'},'sprite-atlas.js':{SOLDIER_FRAMES:'soldado-v1.png'},
 'climb-atlas.js':{CLIMB_FRAMES:'soldado-escalada-v2.png'},'crouch-atlas.js':{CROUCH_FRAMES:'soldado-agachado-pasos-v1.png'},
 'walk-atlas.js':{WALK_FRAMES:'soldado-pasos-v3.png'},'slide-atlas.js':{SLIDE_FRAMES:'soldado-deslizamiento-v1.png'},
 'melee-atlas.js':{MELEE_FRAMES:'soldado-cuchillo-hacha-v1.png'},'kick-atlas.js':{KICK_FRAMES:'lobo-patadas-v1.png'},
 'wolf-climb-atlas.js':{WOLF_CLIMB_FRAMES:'lobo-escalada-v1.png'},'wolf-walk-atlas.js':{WOLF_WALK_FRAMES:'lobo-caminata-v2.png'},
 'wolf-sprint-atlas.js':{WOLF_SPRINT_FRAMES:'lobo-carrera-cuatro-patas-v1.png'},'enemy-atlas.js':{ENEMY_FRAMES:'soldado-enemigo-v1.png'},
 'black-wolf-atlas.js':{BLACK_WOLF_FRAMES:'lobo-negro-jefe-v1.png'},'zombie-wolf-atlas.js':{ZOMBIE_WOLF_FRAMES:'lobo-zombie-jefe-v1.png'},
 'white-death-atlas.js':{WHITE_DEATH_FRAMES:'lobo-blanco-muerte-v1.png'},'bow-atlas.js':{BOW_FRAMES:'soldado-escudo-arco-ballesta-v1.png'},
 'helicopter-atlas.js':{HELICOPTER_FRAMES:'helicoptero-rescate-v3.png'},'jeep-atlas.js':{JEEP_ARRIVAL_FRAMES:'jeep-llegada-v1.png',SOLDIER_DISMOUNT_FRAMES:'soldado-desembarco-v1.png'},
 'worker-atlas.js':{WORKER_FRAMES:'trabajadores-descanso-huida-v3.png',WORKER_RUN_FRAMES:'trabajadores-carrera-v4.png'}
};
function rects(data){if(Array.isArray(data)&&data.length>=4&&data.slice(0,4).every(Number.isFinite))return[data];return Object.values(data).flatMap(rects);}
function bounds(data,file){const png=fs.readFileSync(path.join(root,'assets/sprites',file)),w=png.readUInt32BE(16),h=png.readUInt32BE(20);for(const f of rects(data)){const [x,y,a,b]=f;assert.ok(x>=0&&y>=0&&a>0&&b>0&&x+a<=w&&y+b<=h,`${file}: ${f.slice(0,4)} outside ${w}x${h}`);}}
test('all static character and vehicle atlas rectangles fit their actual PNG sheets',()=>{
 for(const [file,map]of Object.entries(mappings)){const scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),scope);for(const [key,image]of Object.entries(map))bounds(scope.window[key],image);}
 const a=require('../soldier-animation');for(const [key,image]of Object.entries({wolfActionFrames:'lobo-reposo-patadas-v2.png',wolfComboFrames:'lobo-combos-v1.png',wolfRamFrames:'lobo-cabezazo-v1.png',transformationFrames:'soldado-transformacion-v2.png'}))bounds(a[key],image);
 const scope={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'action-atlas.js'),'utf8'),scope);for(const [key,image]of Object.entries({wolf:'soldado-lobo-v1.png',mobility:'soldado-movilidad-v1.png',weapons:'soldado-armas-v1.png'}))bounds(scope.window.ACTION_FRAMES[key],image);
});
test('both entry pages and all their declared local assets exist',()=>{
 const visited=new Set(),queue=['index.html','level-two.html'];while(queue.length){const file=queue.shift();if(visited.has(file))continue;visited.add(file);assert.ok(fs.existsSync(path.join(root,file)),file);const text=fs.readFileSync(path.join(root,file),'utf8');const refs=file.endsWith('.html')?[...text.matchAll(/(?:src|href)=["']([^"'?#]+\.(?:js|css|png|html))/g)].map(m=>m[1]):[...text.matchAll(/["'](assets\/[^"']+\.(?:png|webp|ogg|mp3|wav))["']/g)].map(m=>m[1]);for(const ref of refs){assert.ok(fs.existsSync(path.join(root,ref)),`${file} -> ${ref}`);if(/\.(js|css|html)$/.test(ref))queue.push(ref);}}
});
test('three player forms remain finite through deterministic mixed movement and combat stress',()=>{
 const P=require('../physics'),E=require('../encounter'),M=require('../mission-combat'),L=require('../level-two'),V=require('../powers'),U=require('../progression'),A=require('../arsenal'),Z=require('../zombie-form');
 const original={...P.WORLD};let seed=20260926;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 try{for(const mission of [1,2]){Object.assign(P.WORLD,mission===1?original:L.WORLD);const geometry=mission===1?{platforms:P.createPlatforms(),ladders:P.createLadders()}:L.geometry(false);
  for(const form of ['soldier','wolf','zombie']){const p=Object.assign(P.createPlayer(),{x:mission===1?145:8300,y:mission===1?original.ground:620,form,h:form==='soldier'?46:form==='wolf'?64:68,zombieUnlocked:true,grounded:true,fuel:2000,fuelMax:2000}),e=mission===1?E.createEncounter():M.create(A.createInventory()),powers=V.create(),profile=U.fresh();e.enemies=mission===1?e.enemies:M.cityEnemies();e.inventory.owned=[1,2,3,4,5,6,7,8,9];for(let slot=3;slot<=9;slot++)e.inventory.ammo[slot]=500;e.hp=e.maxHp=10000;
   let input={};for(let frame=0;frame<6000;frame++){if(frame%24===0){const dir=random();input={left:dir<.35,right:dir>.5,up:random()<.1,down:random()<.15,run:random()<.4,fire:random()<.45,kick:random()<.15,jumpPressed:random()<.35,hookPressed:random()<.04,jetpackPressed:random()<.025};if(form==='soldier')e.inventory.selected=1+Math.floor(random()*9);}
    p.aim=A.aimDirection(input,p.facing);P.step(p,A.movementInput(p,input),1/120,geometry.platforms,{ladders:geometry.ladders});input.jumpPressed=input.hookPressed=input.jetpackPressed=false;
    if(mission===1)E.updateEncounter(e,p,input,1/120,geometry.platforms);else{Z.tick(p,1/120);M.update(e,p,input,1/120,geometry.platforms,powers,profile);}
    for(const key of ['x','y','vx','vy','fuel'])assert.ok(Number.isFinite(p[key]),`${mission}/${form}/${frame}/${key}`);
    assert.ok(p.x>=0&&p.x<=P.WORLD.width);assert.ok(e.hp>=0&&e.hp<=e.maxHp);assert.ok(e.bullets.length<400);for(const b of e.bullets)assert.ok([b.x,b.y,b.vx,b.vy,b.life].every(Number.isFinite));
   }
  }
 }}finally{Object.assign(P.WORLD,original);}
});
