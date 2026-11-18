(function(root){
  'use strict';
  function create({onPlay,onPause,onNewGame,soundControls,onSound,difficulty='normal',onDifficulty,tutorial,mission=1,resumeAvailable=false,onSelectMission}){
    const layer=document.getElementById('main-menu');
    if(!layer)return null;
    const pages=Array.from(layer.querySelectorAll('[data-menu-page]'));
    const play=document.getElementById('menu-play'),back=document.getElementById('menu-back');
    const surfaces=Array.from(document.querySelectorAll('body > header,body > main,body > footer'));
    surfaces.forEach(el=>el.inert=true);
    let started=false,ready=false,page='home',loader=null,busy=false;
    async function prepare(){if(busy)return false;if(!loader)return true;busy=true;play.disabled=true;try{return await loader()!==false;}finally{busy=false;play.disabled=!ready;}}
    document.getElementById('menu-sound').append(soundControls);
    const tutorialToggle=document.getElementById('tutorial-enabled'),tutorialReset=document.getElementById('tutorial-reset');
    if(tutorialToggle&&tutorial){
      tutorialToggle.checked=tutorial.state.enabled;
      tutorialToggle.onchange=()=>{const saved=tutorial.setEnabled(tutorialToggle.checked);document.getElementById('settings-message').textContent=(tutorialToggle.checked?'Tutorial activado. Las ayudas aparecerán al avanzar.':'Tutorial desactivado. No se mostrarán ayudas.')+(saved?'':' La preferencia solo durará esta sesión.');};
      tutorialReset.onclick=()=>{tutorial.reset();document.getElementById('settings-message').textContent=tutorial.state.enabled?'Ayudas reiniciadas. Volverán a aparecer cuando las necesites.':'Ayudas reiniciadas. Activa el tutorial para mostrarlas.';};
    }
    const difficultyChoices=document.getElementById('difficulty-choices');
    if(difficultyChoices&&root.ArcadeDifficulty){
      const description=document.getElementById('difficulty-description');
      const refresh=()=>{difficultyChoices.querySelectorAll('input').forEach(input=>input.checked=input.value===difficulty);description.textContent=root.ArcadeDifficulty.get(difficulty).text;};
      for(const level of root.ArcadeDifficulty.levels){
        const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('span');
        input.type='radio';input.name='difficulty';input.value=level.id;name.textContent=level.name;
        input.onchange=()=>{if(!input.checked)return;difficulty=level.id;const saved=onDifficulty?.(difficulty);refresh();document.getElementById('settings-message').textContent=saved===false?'Dificultad aplicada. Este navegador solo permite conservarla durante esta sesión.':'Dificultad '+level.name+' aplicada y guardada.';};
        label.append(input,name);difficultyChoices.append(label);
      }
      refresh();
    }
    const help=document.getElementById('shortcuts').cloneNode(true);help.removeAttribute('id');help.hidden=false;
    document.getElementById('menu-help').append(help);
    function show(next='home'){
      page=next;layer.hidden=false;surfaces.forEach(el=>el.inert=true);onPause();root.ArcadeProfiles?.refresh();
      pages.forEach(el=>el.hidden=el.dataset.menuPage!==next);
      let campaign;try{campaign=root.ArcadeCampaign?.read(root.ArcadeDeveloperMode?.storage(localStorage)||localStorage);}catch{}
      back.hidden=next==='home';play.textContent=started||resumeAvailable||campaign?.level>=2?'Continuar':'Jugar';play.disabled=!ready;
      (next==='home'?play:back).focus({preventScroll:true});
    }
    function close(){layer.hidden=true;surfaces.forEach(el=>el.inert=false);}
    play.onclick=async()=>{if(!ready||busy)return;let campaign;try{campaign=root.ArcadeCampaign?.read(root.ArcadeDeveloperMode?.storage(localStorage)||localStorage);}catch{}if(!started&&campaign?.level!==mission&&[2,3,4,5,6,7,8].includes(campaign?.level)){location.assign((campaign.level===8?'level-eight.html':campaign.level===7?'level-seven.html':campaign.level===6?'level-six.html':campaign.level===5?'level-five.html':campaign.level===4?'level-four.html':campaign.level===3?'level-three.html':'level-two.html')+'?entry=resume');return;}if(!await prepare())return;started=true;close();onPlay();};
    layer.querySelector('[data-start-level="1"]')?.addEventListener('click',async()=>{if(!ready||busy)return;onSelectMission?.(1);try{root.ArcadeCampaign?.write(root.ArcadeDeveloperMode?.storage(localStorage)||localStorage,{level:1});}catch{}if(mission!==1){location.assign('index.html?entry=select');return;}if(!await prepare())return;started=true;close();onNewGame?.();});
    layer.querySelectorAll('[data-open-menu]').forEach(button=>button.onclick=()=>show(button.dataset.openMenu));
    back.onclick=()=>show('home');
    document.getElementById('menu-exit').onclick=()=>{onSound();show('exit');};
    document.getElementById('menu-return').onclick=()=>show('home');
    document.getElementById('menu-fullscreen').onclick=async()=>{
      const notice=document.getElementById('settings-message');
      try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();notice.textContent='Pantalla actualizada.';}
      catch{notice.textContent='Tu navegador no permite cambiar a pantalla completa.';}
    };
    layer.addEventListener('keydown',e=>{
      e.stopPropagation();
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(page!=='home')show('home');return;}
      if(e.key!=='Tab')return;
      const buttons=Array.from(layer.querySelectorAll('button,input,a[href]')).filter(b=>!b.disabled&&!b.closest('[hidden]'));
      const first=buttons[0],last=buttons[buttons.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    return {defer(load){loader=load;ready=true;document.getElementById('menu-loading').textContent='Elige tu perfil y comienza la partida.';show();},show,isOpen:()=>!layer.hidden,ready({autoPlay=false}={}){ready=true;document.getElementById('menu-loading').textContent='La cacería comienza contigo.';if(autoPlay){started=true;close();onPlay();}else show();},fail(){document.getElementById('menu-loading').textContent='No se pudo cargar el juego. Recarga la página para volver a intentarlo.';},get started(){return started;}};
  }
  root.ArcadeMainMenu={create};
})(window);

