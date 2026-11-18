(function(root){
 'use strict';
 function create(host,onSwitch){
  host.className='character-wheel';host.setAttribute('aria-label','Personajes disponibles');
  const title=document.createElement('span'),deck=document.createElement('div'),cycle=document.createElement('button');
  title.className='hud-label';title.textContent='PERSONAJES';deck.className='character-cards';
  cycle.className='character-cycle';cycle.type='button';cycle.innerHTML='<kbd>T</kbd> Alternar';
  cycle.onclick=()=>onSwitch();host.replaceChildren(title,deck,cycle);
  let assets=null,unlocked=null,lastView='';
  const cards=new Map();
  function setSprites(soldier,soldierFrame,wolf,wolfFrame,custom={}){root.ArcadeZombieForm?.setForms?.(soldier,soldierFrame,wolf,wolfFrame);assets={soldier:{image:soldier,frame:soldierFrame},wolf:{image:wolf,frame:wolfFrame},zombie:root.ArcadeZombieForm?.icon(),robot:root.ArcadeRobotForm?.icon(),tank:root.ArcadeAdvancedForms?.icon('tank'),hero:root.ArcadeAdvancedForms?.icon('hero'),fighter:root.ArcadeAdvancedForms?.icon('fighter'),...custom};unlocked=null;}
  function update(form,won,blocked,zombie=false,cooldown=0,robot=false,tank=false,fighter=false,hero=false){
   if(!assets)return;
   form=['wolf','zombie','robot','tank','fighter','hero'].includes(form)?form:'soldier';
   const available=['soldier',...(won||zombie?['wolf']:[]),...(zombie&&assets.zombie?['zombie']:[]),...(robot&&assets.robot?['robot']:[]),...(tank&&assets.tank?['tank']:[]),...(fighter&&assets.fighter?['fighter']:[]),...(hero&&assets.hero?['hero']:[])],key=available.join(',');
   const view=[key,form,!!blocked,Math.ceil(cooldown)].join('|');
   if(unlocked===key&&view===lastView)return;
   lastView=view;
   if(unlocked!==key){
    unlocked=key;deck.replaceChildren();cards.clear();
    for(const id of available){
     const button=document.createElement('button'),art=document.createElement('canvas'),name=document.createElement('span');
     button.type='button';button.className='character-card';button.dataset.form=id;
     art.width=54;art.height=52;art.setAttribute('aria-hidden','true');
     const c=art.getContext('2d'),{image,frame:f}=assets[id],scale=Math.min(48/f[3],48/f[2]);c.imageSmoothingEnabled=false;
     c.drawImage(image,...f,27-f[2]*scale/2,51-f[3]*scale,f[2]*scale,f[3]*scale);
     name.textContent=id==='hero'?'CENTELLA':id==='tank'?'MINI TANQUE':id==='fighter'?'LUCHADOR':id==='robot'?'ROBOT':id==='zombie'?'ZOMBI':id==='wolf'?'LOBO':'SOLDADO';button.append(art,name);
     button.onclick=()=>{if(button.getAttribute('aria-pressed')!=='true')onSwitch(id);};
     deck.append(button);cards.set(id,button);
    }
   }
   for(const [id,card] of cards){
    const active=id===form;card.classList.toggle('front',active);card.setAttribute('aria-pressed',String(active));
    card.setAttribute('aria-label',(id==='hero'?'CENTELLA':id==='tank'?'MINI TANQUE':id==='fighter'?'LUCHADOR':id==='robot'?'ROBOT':id==='zombie'?'Zombi':id==='wolf'?'Lobo':'Soldado')+(active?' · activo':' · cambiar con T'));
    const offset=(available.indexOf(id)-available.indexOf(form)+available.length)%available.length;
    card.style.transform=active?'translate(-30px,0) rotate(-3deg)':'translate(calc(var(--character-fan-start, 8px) + '+(offset-1)+' * var(--character-fan-gap, 22px)),-1px) rotate('+(12+(offset-1)*8)+'deg) scale(.9)';
    card.disabled=!!blocked||cooldown>0;card.style.zIndex=active?'7':String(7-offset);
   }
   host.classList.toggle('single',available.length===1);host.classList.toggle('triple',available.length>=3);cycle.disabled=available.length===1||!!blocked||cooldown>0;
   cycle.innerHTML='<kbd>T</kbd> '+(cooldown>0?Math.ceil(cooldown)+' s':'Alternar');
   cycle.title=cooldown>0?'Transformación disponible en '+Math.ceil(cooldown)+' segundos':available.length>1?'Alternar '+available.map(id=>id==='hero'?'CENTELLA':id==='tank'?'MINI TANQUE':id==='fighter'?'LUCHADOR':id==='robot'?'ROBOT':id==='zombie'?'zombi':id==='wolf'?'lobo':'soldado').join(', ')+' con T':'Derrota al lobo blanco para desbloquear al lobo';
   cycle.setAttribute('aria-label',cycle.title);
  }
  return {update,setSprites};
 }
 root.ArcadeCharacterWheel={create};
})(window);
