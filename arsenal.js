(function(root){
  'use strict';
  const turn=(typeof module!=='undefined'&&module.exports?require('./physics'):root.ArcadePhysics).jumpTurn;
  // noise: radio en el que el disparo alerta a los enemigos (sin dato, GUN_NOISE).
  // impact: daño al blanco que recibe el misil de lleno; damage es su onda expansiva.
  const GUN_NOISE=430,QUIET_NOISE=100;
  const weapons=[null,
    {name:'Cuchillo',ammo:null,damage:2,range:48,rate:.32,row:0,noise:QUIET_NOISE},
    {name:'Hacha',ammo:null,damage:4,range:68,rate:.5,row:1,noise:QUIET_NOISE},
    {name:'Pistola',ammo:36,damage:1,speed:510,rate:.24,row:3},
    {name:'Escopeta',ammo:16,damage:1,speed:420,rate:.7,pellets:5,life:.55,row:2},
    {name:'AK',ammo:90,damage:1,speed:600,rate:.11,row:4},
    {name:'Lanzamisiles',ammo:6,damage:5,impact:15,speed:300,rate:1,row:5},
    {name:'Arco',ammo:20,damage:2,speed:420,rate:.6,bow:3,noise:QUIET_NOISE},
    {name:'Ballesta',ammo:15,damage:3,speed:540,rate:.85,bow:4,noise:220},
    {name:'Granadas',ammo:8,damage:4,speed:260,rate:.9,gravity:420,life:3}
  ];
  function noiseRadius(slot){return weapons[slot]?.noise??GUN_NOISE;}
  // El proyectil conserva en damage las mejoras del jugador: el impacto directo guarda la misma proporción.
  function impactDamage(bullet){const w=weapons[bullet?.slot],base=bullet?.damage||w?.damage||1;return w?.impact?base*w.impact/w.damage:base;}
  function createInventory(){return{selected:3,owned:[1,3],ammo:{3:36}};}
  function createPickups(options={}){
    const common=typeof module!=='undefined'&&module.exports;
    const P=common?require('./physics.js'):root.ArcadePhysics,C=common?require('./challenges.js'):root.ArcadeChallenges,M=common?require('./medkits.js'):root.ArcadeMedkits;
    const platforms=options.platforms||P.createPlatforms(),random=options.random||Math.random;
    const shuffle=list=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};
    // Keep the stars' own coordinates as the source of truth, even after collection.
    const protectedItems=[...C.create(platforms).stars,...M.create()];
    for(const floor of [6,14]){const d=platforms.filter(s=>s.kind==='deck'&&s.floor===floor).sort((a,b)=>b.w-a.w)[0];if(d)protectedItems.push({x:d.x+d.w*.5,y:d.y-15});}
    const candidates=[];
    for(const pl of platforms){
      if(pl.crane||pl.arena||pl.w<60||pl.y<P.WORLD.roof)continue;
      for(let x=pl.x+28;x<=pl.x+pl.w-28;x+=18){
        if(pl.y===P.WORLD.ground&&Math.abs(x-145)<85)continue;
        if(protectedItems.some(item=>Math.abs(x-item.x)<62&&Math.abs(pl.y-18-item.y)<68))continue;
        if(platforms.some(other=>other!==pl&&other.y<pl.y&&other.y+(other.thickness||0)>pl.y-45&&x+23>other.x&&x-23<other.x+other.w))continue;
        const zone=Math.min(3,Math.max(0,Math.floor((P.WORLD.ground-pl.y)/(P.WORLD.ground-P.WORLD.roof)*4)));
        candidates.push({x:Math.round(x),y:pl.y,zone});
      }
    }
    const slots=shuffle([2,3,4,5,6,7,8,9]).slice(0,4),items=[];
    // One random placement per height zone keeps all four spread through the level.
    for(let id=0;id<4;id++){
      const free=candidates.filter(c=>items.every(item=>Math.abs(c.x-item.x)>=62||Math.abs(c.y-item.y)>=68));
      const zone=free.filter(c=>c.zone===id),pool=zone.length?zone:free;
      if(!pool.length)throw new Error('No hay cuatro ubicaciones libres para las armas');
      const site=pool[Math.floor(random()*pool.length)];items.push({id,slot:slots[id],x:site.x,y:site.y,taken:false});
    }
    return items;
  }
  function selectWeapon(inv,slot){if(!weapons[slot]||!inv.owned.includes(slot))return false;inv.selected=slot;return true;}
  function supplyRolls(choices,count,saved){
    if(Array.isArray(saved)&&saved.length===count&&saved.every(value=>choices.includes(value)))return saved.slice();
    const rolls=[],bag=[];
    while(rolls.length<count){
      if(!bag.length)bag.push(...choices);
      rolls.push(bag.splice(Math.floor(Math.random()*bag.length),1)[0]);
    }
    return rolls;
  }
  function grantAmmo(inventory,slot,amount){
    if(!inventory.owned.includes(slot))inventory.owned.push(slot);
    inventory.ammo[slot]=(inventory.ammo[slot]||0)+amount;
  }
  function collect(inv,pickups,p){const found=[];for(const item of pickups){if(item.taken||Math.abs(p.x-item.x)>23||Math.abs(p.y-item.y)>24)continue;item.taken=true;const w=weapons[item.slot];if(!inv.owned.includes(item.slot))inv.owned.push(item.slot);if(w.ammo!==null)inv.ammo[item.slot]=(inv.ammo[item.slot]||0)+w.ammo;found.push(w.name);}return found;}
  function controlCode(event){return /^Arrow(Left|Right|Up|Down)$/.test(event.key||'')?event.key:event.code;}
  const fireKeys=['KeyJ','KeyX','Numpad0','KeyQ','KeyC','KeyO','KeyM'];
  function triggerInput(keys,pointerHeld=false,queued=false){
    const fireHeld=pointerHeld||fireKeys.some(code=>keys.has(code));
    return{fireHeld,fire:fireHeld||queued,diagonalUp:keys.has('KeyQ')||keys.has('KeyO'),diagonalDown:keys.has('KeyC')||keys.has('KeyM')};
  }
  function createFireBuffer(){
    let remaining=0,slot=null;
    return{
      press(selected){remaining=.18;slot=selected;},
      clear(){remaining=0;slot=null;},
      tick(dt,p,e,previousAction){
        remaining=Math.max(0,remaining-dt);
        const weapon=weapons[e.inventory.selected];
        if(e.weaponAction!==previousAction||e.dead||p.form==='wolf'||p.transform>0||p.rope||p.ladder||slot!==e.inventory.selected||weapon.ammo!==null&&!(e.inventory.ammo[slot]>0))remaining=0;
        return remaining>0;
      }
    };
  }
  function movementInput(p,input){return input.fire&&!input.jumpPressed&&!p.rope&&!p.jetpack&&!p.heroFlight&&!input.jetpackPressed&&p.form!=='wolf'?{...input,up:false,down:false}:input;}
  function firingAim(input,facing,queuedAim){
    // Key releases can straddle simulation frames. A queued tap keeps the
    // direction at trigger time; a held trigger continues to track live aim.
    if(queuedAim&&input.fire&&input.fireHeld===false)return queuedAim;
    return aimDirection(input,facing);
  }
  // Puntería única de todas las misiones y formas. Arriba y abajo apuntan; las
  // cuatro teclas de diagonal (Q/C y O/M) siguen hacia donde mira el personaje;
  // una pulsación breve conserva la dirección del momento del disparo.
  function aimInput(input){return{...input,aimUp:!!(input.aimUp||input.up),aimDown:!!(input.aimDown||input.down)};}
  function playerAim(p,input,{queuedAim=null,turn=true}={}){
    const aim=firingAim(aimInput(input),p.facing||1,queuedAim);
    if(turn&&aim.x&&!p.rope&&(turn==='always'||p.form!=='wolf'))p.facing=Math.sign(aim.x);
    p.aim=aim;return aim;
  }
  function aimDirection(input,facing=1){
    if(input.aimVector&&Number.isFinite(input.aimVector.x)&&Number.isFinite(input.aimVector.y)){const {x,y}=input.aimVector,length=Math.hypot(x,y);if(length>.01)return{x:x/length,y:y/length};}
    const diagonal=input.diagonalUp||input.diagonalDown;
    // Dedicated aim keys take precedence over movement, including moving left.
    const y=diagonal?(input.diagonalDown?1:-1):(input.aimDown?1:0)-(input.aimUp?1:0);
    const horizontal=input.aimRight?1:input.aimLeft?-1:(input.right?1:0)-(input.left?1:0);
    const x=y?(horizontal||(diagonal?facing:0)):(horizontal||facing),length=Math.hypot(x,y)||1;
    return{x:x/length,y:y/length};
  }
  // Shots leave from the barrel of the gun each fist is holding.
  function robotMuzzle(p,arm=0,slot=3){return turn.point(p,robotSocket(p,arm,slot));}
  function robotSocket(p,arm,slot){
    if(p.swimming&&!p.onMotorcycle){
      const swim=typeof module!=='undefined'&&module.exports?require('./sea-sprites'):root.ArcadeSeaSprites;
      const {x,y}=swim.robotGun(p,arm,slot);return {x,y};
    }
    const R=typeof module!=='undefined'&&module.exports?require('./robot-form.js'):root.ArcadeRobotForm;
    if(R?.hands&&!p.onMotorcycle&&!p.swimming){const a=p.aim||{x:p.facing||1,y:0},fists=R.hands(p),f=fists[arm]||fists[0],facing=p.facing||1,reach=13;return{x:p.x+facing*f.x+a.x*reach,y:p.y+f.y+a.y*reach};}
    const a=p.aim||{x:p.facing||1,y:0},k=p.onMotorcycle?.8:1;return{x:p.x+(p.onMotorcycle?(p.facing||1)*12:0)+a.x*(54+arm*8)*k,y:p.y-(p.onMotorcycle?64:p.swimming?22:p.crouching?23:35)+arm*8*k+a.y*(54+arm*8)*k};}
  function muzzle(p,slot=3){
    const A=typeof module!=='undefined'&&module.exports?require('./soldier-animation.js'):root.ArcadeSoldierAnimation;
    const a=p.aim||{x:p.facing,y:0},hand=A.grip(p,{}, {inventory:{selected:slot},weaponAction:{slot,age:0}}),grip=A.weaponGrip(slot),angle=Math.atan2(a.y,a.x*p.facing),dx=(slot===7?32:26)-grip.x,dy=-grip.y;
    return turn.point(p,{x:p.x+p.facing*(hand.x+Math.cos(angle)*dx-Math.sin(angle)*dy),y:p.y+hand.y+Math.sin(angle)*dx+Math.cos(angle)*dy});
  }
  function reflect(p,b){
    if(p.form!=='hero'||!b.enemy||b.slot===6||b.slot===9||b.gravity||b.type==='missile'||b.type==='torpedo'||b.plasma||b.zombiePlasma||b.stormRay||b.tankShell||b.tankMissile||b.tankGrenade||b.alienLaser)return false;
    b.enemy=false;b.vx=-b.vx;b.vy=-b.vy;b.life=Math.max(b.life,.9);b.damage=b.damage||2;b.reflected=true;return true;
  }
  function fire(inv,p){
      if(p.form==='tank'||p.form==='fighter'||p.form==='hero')return (typeof module!=='undefined'&&module.exports?require('./advanced-forms'):root.ArcadeAdvancedForms).shot(p);
      if(p.form==='robot'&&!p.singleArm){const guns=inv.owned.filter(n=>n>=3),primary=guns.includes(inv.selected)?inv.selected:guns[0];if(!primary)return null;const secondary=guns.includes(inv.secondary)?inv.secondary:primary;const a=fire({...inv,selected:primary},{...p,singleArm:true,robotArm:0}),b=fire({...inv,selected:secondary},{...p,singleArm:true,robotArm:1});if(!a&&!b)return null;return{weapon:{...(a||b).weapon,rate:Math.max(a?.weapon.rate||0,b?.weapon.rate||0)},bullets:[...(a?.bullets||[]),...(b?.bullets||[])]};}
      const w=weapons[inv.selected];if(w.ammo!==null&&!(inv.ammo[inv.selected]>0))return null;if(w.ammo!==null)inv.ammo[inv.selected]--;const bullets=[],a=p.aim||{x:p.facing,y:0},origin=p.form==='robot'?robotMuzzle(p,p.robotArm||0,inv.selected):muzzle(p,inv.selected);
    if(!w.range)for(let i=0;i<(w.pellets||1);i++){const angle=Math.atan2(a.y,a.x)+(i-((w.pellets||1)-1)/2)*.08;bullets.push({x:origin.x,y:origin.y,vx:Math.cos(angle)*w.speed,vy:Math.sin(angle)*w.speed-(inv.selected===9&&a.y===0?150:0),gravity:w.gravity||0,life:w.life||1.8,damage:w.damage*(p.damageBonus||1),slot:inv.selected,robotArm:p.robotArm,enemy:false});}
    return{weapon:w,bullets};
  }
  function tickRobot(e,dt){if(e.robotWait)e.robotWait=e.robotWait.map(n=>Math.max(0,n-dt));}
  function fireRobot(e,p){
    const inv=e.inventory,guns=inv.owned.filter(n=>n>=3),primary=guns.includes(inv.selected)?inv.selected:guns[0];if(!primary)return null;
    const slots=[primary,guns.includes(inv.secondary)?inv.secondary:primary],shots=[];e.robotWait??=[0,0];
    for(let arm=0;arm<2;arm++)if(e.robotWait[arm]<=.00001){const shot=fire({...inv,selected:slots[arm]},{...p,singleArm:true,robotArm:arm});if(shot){shots.push(shot);e.robotWait[arm]=shot.weapon.rate/(p.rateBonus||1);}else e.robotWait[arm]=.1;}
    if(!shots.length)return null;
    return{weapon:{...shots[0].weapon,rate:Math.max(.001,Math.min(...e.robotWait))*(p.rateBonus||1)},bullets:shots.flatMap(s=>s.bullets)};
  }
  const api={GUN_NOISE,noiseRadius,impactDamage,supplyRolls,grantAmmo,reflect,robotMuzzle,controlCode,fireKeys,triggerInput,createFireBuffer,movementInput,firingAim,aimInput,playerAim,weapons,createInventory,createPickups,selectWeapon,collect,aimDirection,muzzle,fire,tickRobot,fireRobot};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeArsenal=api;
})(typeof window!=='undefined'?window:globalThis);

