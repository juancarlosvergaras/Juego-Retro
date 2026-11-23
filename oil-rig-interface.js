(function(root){
  'use strict';
  function create({images,profile,carry,canvas,audio,save,active,usePower,difficulty}){
    const el=id=>document.getElementById(id);
    let task,ready=false,bound=null,hud,wheel,locked=true;
    async function load(){
      if(task)return task;
      const dev=root.ArcadeDeveloperMode.isolated;
      const unlock={...profile,...(dev?{heroUnlocked:true,robotUnlocked:true,tankUnlocked:true,fighterUnlocked:true,zombieUnlocked:true}:{})};
      const ids=['enemy','knife','ramHit','alienPower','soldier','walk','climb','slide','melee','crouch','kicks','transformation','wolf','wolfClimb','wolfSprint','wolfWalk','wolfActions','wolfCombos','wolfRam','wolfJump','formTransition','powerSheet','orbitalSheet','impact','jetMk2'];
      if(unlock.zombieUnlocked||carry.zombieUnlocked||carry.form==='zombie')ids.push('zombiePlayer','zombieExtra','zombieSoldier','zombieSoldierExtra','zombieCast','zombieIdle','zombieRun','shock');
      task=Promise.all([ArcadeAdvancedForms.load(unlock),unlock.robotUnlocked||carry.robotUnlocked?ArcadeRobotForm.load():null,...ids.map(async id=>{
        if(images[id])return;
        const img=new Image();img.src=id==='alienPower'?'assets/sprites/poder-alien-v1.png':ArcadeNewYorkRenderer.paths[id];await img.decode();images[id]=prepareWhiteDeath(img);
      })]).then(()=>{
        ArcadeFormTransition.setSheet(images.formTransition);
        ArcadeImpact.setSheet(images.impact);ArcadePowerSprites.setSpriteSheet(images.powerSheet);
        ArcadePowerSprites.setOrbitalSheet(images.orbitalSheet);ArcadePowerSprites.setAlienSheet(images.alienPower);ArcadeJetpackRenderer.setSheet(images.jetMk2);
        if(images.zombiePlayer){
          ArcadeZombieForm.setSheet(images.zombiePlayer);ArcadeZombieForm.setExtra(images.zombieExtra);
          ArcadeZombieForm.setPlayerSheets(images.zombieSoldier,images.zombieSoldierExtra);
          ArcadeZombieForm.setIdleSheet(images.zombieIdle);ArcadeZombieForm.setCastSheet(images.zombieCast);
          ArcadeZombieForm.setRunSheet(images.zombieRun);ArcadeZombieForm.setShockSheet(images.shock);
        }
        ready=true;
      }).catch(err=>{task=null;throw err;});
      return task;
    }
    function switchForm(id){
      if(!active()||locked||!bound)return;
      if(ArcadeZombieForm.change(bound.gear.e,bound.p,id)){update(false);save();}
    }
    function select(slot){
      if(!active()||locked||!bound||!['soldier','robot'].includes(bound.p.form))return;
      if(ArcadeArsenal.selectWeapon(bound.gear.e.inventory,slot,bound.p.form))save();
    }
    function cycle(){
      if(!active()||locked||!profile.owned.length)return;
      profile.equipped=profile.owned[(profile.owned.indexOf(profile.equipped)+1)%profile.owned.length];save();
    }
    function bind(s){
      const r=s.rig;if(!r||bound===r)return;
      const {e,powers}=ArcadeOilRig.equip(s,profile,carry,difficulty());
      bound=r;ArcadeDeveloperMode.prepare(profile,r.p,e,powers);
      el('weapon-slots').replaceChildren();el('power-wheel').replaceChildren();
      wheel=ArcadeCharacterWheel.create(el('characters-two'),switchForm);
      wheel.setSprites(images.soldier,SOLDIER_V2_FRAMES[0][0],images.wolf,ACTION_FRAMES.wolf[0][7]);
      hud=ArcadeMissionHud.create({player:r.p,encounter:e,profile,powers,canvas,audio,score:()=>s.score,
        onSelect:select,onCycle:cycle,onPower:usePower,onPersist:save});
    }
    function update(block){
      locked=block||!!bound?.p.transform;
      if(!bound)return;
      const p=bound.p;hud.update(locked);wheel.update(p.form,true,locked,p.zombieUnlocked,p.formCooldown,p.robotUnlocked,p.tankUnlocked,p.fighterUnlocked,p.heroUnlocked);
    }
    return {load,bind,update,select,cycle,switchForm,get ready(){return ready;}};
  }
  root.ArcadeRigInterface={create};
})(window);
