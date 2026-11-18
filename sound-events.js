(function(root){
  'use strict';
  const weapons=[null,'knife','axe','pistol','shotgun','rifle','rocket','bow','crossbow','grenade'];
  function spatial(source,listener,range=850){
    if(!source||!listener)return{gain:1,pan:0};
    const distance=Math.hypot(source.x-listener.x,(source.y-listener.y)*1.15);
    return{gain:Math.max(0,1-distance/range)**2,pan:Math.max(-.85,Math.min(.85,(source.x-listener.x)/400))};
  }
  function create(audio){
    const history=new WeakMap(),seen=new WeakSet();let walking=0,lastPlayer=null,rumble=4;
    function state(o){let value=history.get(o);if(!value){value={};history.set(o,value);}return value;}
    function fresh(o){if(seen.has(o))return false;seen.add(o);return true;}
    function update({player:p,encounter:e,powers:s,ambience:a,arrival, fuelTanks=[],weather},dt){
      if(!p||!e)return;
      // The world keeps sounding between fights: wind, rain, thunder and far artillery.
      if(weather){audio.loop('wind',(weather.wind||0)*.2);audio.loop('rain',(weather.rain||0)*.22);
        if(weather.bolt&&fresh(weather.bolt))audio.play('thunder',{gain:.85,pan:Math.max(-.7,Math.min(.7,(weather.bolt.x-p.x)/500))});
        if(weather.distant){rumble-=dt;if(rumble<=0){rumble=5+Math.random()*9;audio.play('distant',{gain:.3+Math.random()*.3,pan:Math.random()*1.6-.8});}}}
      const emit=(name,source=p,extra={})=>audio.play(name,{...spatial(source,p),...extra});
      const ep=state(e),pp=state(p),action=e.weaponAction;
      if(action&&fresh(action)&&action.age<=dt+.02)emit(weapons[action.slot]);
      if((p.ramSound||0)>(pp.ramSound||0))emit('claw');pp.ramSound=p.ramSound;
      if((p.idleHowl||0)>(pp.idleHowl||0))emit('whiteRoar',p,{gain:.25});pp.idleHowl=p.idleHowl;
      if((p.claw||0)>(pp.claw||0))emit('claw');if((p.kick||0)>(pp.kick||0))emit('kick');
      if((p.transform||0)>(pp.transform||0))emit(p.form==='wolf'?'whiteRoar':'wave');
      if(ep.hp!==undefined&&e.hp<ep.hp)emit(p.form==='wolf'?'wolfHurt':'hurt');
      if(pp.shield!==undefined&&p.shield<pp.shield)emit('shield');
      if(pp.grounded===false&&p.grounded&&!e.extraction)emit('land');
      if(pp.jumps!==undefined&&p.jumps>pp.jumps&&p.vy<0&&!p.rope&&!p.jetpack)emit('jump');
      if(p.rope&&!pp.rope)emit('grip');
      if(p!==lastPlayer){walking=0;lastPlayer=p;}
      if(p.grounded&&!p.rope&&!p.ladder&&!arrival?.active){walking+=Math.abs(p.vx||0)*dt;if(walking>30){walking%=30;emit('step',p,{gain:.45});}}
      Object.assign(pp,{claw:p.claw,kick:p.kick,transform:p.transform,shield:p.shield,grounded:p.grounded,jumps:p.jumps,rope:!!p.rope});ep.hp=e.hp;
      for(const n of e.enemies||[]){const h=state(n);if((n.flash||0)>(h.flash||0))emit(n.kind==='zombie'?'plasma':'rifle',n);if(n.kind==='zombie'&&n.phase==='waking'&&h.phase!=='waking')emit('zombieRoar',n);if(n.kind==='zombie'){if(n.lunge!=null&&h.lunge==null)emit('wolfHurt',n,{...spatial(n,p),gain:spatial(n,p).gain*.6});h.lunge=n.lunge;}if(n.kind==='bat'&&n.phase==='wake'&&h.phase!=='wake')emit('bat',n);h.phase=n.phase;if(n.kind==='knife'&&n.attackAge>=.24&&(h.attackAge==null||h.attackAge<.24))emit('knife',n);if(h.hp!==undefined&&n.hp<h.hp)emit('hurt',n);h.attackAge=n.attackAge;h.flash=n.flash;h.hp=n.hp;}
      for(const [b,roar] of [[e.boss,'whiteRoar'],[e.finalBoss,'blackRoar']]){
        if(!b)continue;const h=state(b);
        if(b.active&&!h.active)emit(roar,b);
        if(h.stage!==undefined&&b.stage!==h.stage&&b.stage===2)emit('zombieRoar',b);
        if(h.hp!==undefined&&b.hp<h.hp)emit(b.hp<=0?'wolfDeath':'wolfHurt',b);
        if((b.flash||0)>(h.flash||0))emit('rifle',b);
        if(b.phase!==h.phase){
          if(['attack','zClaw'].includes(b.phase))emit(b.kind==='kick'?'kick':'claw',b);
          if(b.phase==='kick')emit('kick',b);
          if(b.phase==='leap')emit('zombieRoar',b);
          if(b.phase==='charge')emit('drone',b);
          if(b.phase==='launch')emit('rocket',b);
        }
        Object.assign(h,{active:b.active,stage:b.stage,hp:b.hp,phase:b.phase,flash:b.flash});
      }
      if(e.tank){const t=e.tank,h=state(t);if(t.flash>(h.flash||0))emit('explosion',t,{gain:.6});if(t.launchFlash>(h.launchFlash||0))emit('rocket',t);if(h.damageStage!==undefined&&t.damageStage>h.damageStage)emit('debris',t);h.flash=t.flash;h.launchFlash=t.launchFlash;h.damageStage=t.damageStage;}
      for(const b of e.bullets||[])if(b.tankGrenade&&fresh(b))emit('grenade',b);
      for(const blast of e.explosions||[])if(fresh(blast))emit(blast.kind==='plasma'?'splash':'explosion',blast);
      let rubble=null;for(const d of e.debris||[])if(fresh(d))rubble=d;if(rubble)emit('debris',rubble);
      for(const item of [...(e.pickups||[]),...(e.medkits||[]),...fuelTanks]){const h=state(item);if(item.taken&&h.taken===false)emit('pickup',item);h.taken=!!item.taken;}
      if(s){
        const h=state(s);
        for(const [id,wait] of Object.entries(s.cooldowns||{})){if(wait>(h[id]||0)&&id!=='flame')emit(id);h[id]=wait;}
        for(const effect of s.effects||[])if(fresh(effect)&&effect.kind==='orbital')emit('explosion',effect);
        for(const t of s.turrets||[]){const th=state(t);if((t.flash||0)>(th.flash||0))emit('rifle',t,{...spatial(t,p),gain:spatial(t,p).gain*.65});th.flash=t.flash;}
      }
      for(const [i,w] of (a?.workers||[]).entries()){
        const h=state(w);if(!h.screamed&&w.phase==='startled'&&w.age>=w.delay){emit('scream',{x:w.x,y:a.ground},{...spatial({x:w.x,y:a.ground},p),variant:i});h.screamed=true;}
      }
      if(arrival){const h=state(arrival);if(arrival.phase==='brake'&&h.phase!=='brake')emit('brake',{x:arrival.x,y:arrival.ground});h.phase=arrival.phase;}
      const rescue=e.extraction;if(rescue){const h=state(rescue);if(rescue.phase==='latch'&&h.phase!=='latch')emit('door',rescue);h.phase=rescue.phase;}
      const vehicle=arrival?.visible?spatial({x:arrival.x,y:arrival.ground},p):{gain:0,pan:0};
      audio.loop('jeep',vehicle.gain,vehicle.pan,arrival?.phase==='depart'?1.5:arrival?.phase==='reverse'?1.1:.7);
      const helicopter=rescue&&!rescue.returning&&!rescue.done?spatial(rescue,p,1200):{gain:0,pan:0};
      audio.loop('helicopter',helicopter.gain*.85,helicopter.pan);
      audio.loop('jetpack',p.jetpack?(p.jetBoost?.75:.6):0,0,p.jetBoost?1.45:p.vx||p.vy?1.2:.85);
      audio.loop('flame',s?.flame>0?.65:0);
    }
    return{update};
  }
  const api={create,spatial,weapons};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeSoundEvents=api;
})(typeof window!=='undefined'?window:globalThis);

