(function(root){
  'use strict';
  // Guion de la misión 08 y final de la campaña. Informe y radio reutilizan el
  // Se llega desde la misión 6 o la 7, con el transmisor o su receptor fuera de servicio.
  // Cada página es el subtítulo de un plano (mission-late-scenes.js, conjunto 'eight').
  const briefing=[
    {text:'La señal que alimentaba al Consorcio se apagó. Sin proveedor no hay repuestos.'},
    {text:'Le queda un ejército privado, una sede en Nueva York y el hombre que firma las órdenes: el Comandante.'},
    {text:'Es el último contrato. Y es el que mejor paga.'},
    {text:''}
  ];
  const VEGA='VEGA · PILOTO',CAP='CAP DOLLAR';
  const beats=[
    {id:'start',who:VEGA,text:'Nueva York, Cap. Sede del Consorcio. Yo vigilo desde arriba; tú ve por el Comandante.',when:c=>c.playing&&c.floor===0},
    {id:'traffic',who:VEGA,text:'¡Cuidado en los cruces! Ese tráfico no frena: espera la señal o salta los carros.',when:c=>c.traffic},
    {id:'soldiers',who:VEGA,text:'Soldados del Consorcio en la avenida. Los granaderos tiran por encima de las barricadas.',when:c=>c.soldiers>0},
    {id:'police',who:CAP,text:'Policías tras una barricada. No me apuntan a mí.',when:c=>c.policeNear},
    {id:'joined',who:VEGA,text:'La policía cambió de bando, Cap. Ya no peleas solo.',when:c=>c.allies>0},
    {id:'hurt',who:VEGA,text:'Estás sangrando. Hay botiquines en la acera: no pases de largo.',when:c=>c.hp<=3&&c.hp>0},
    {id:'midtown',who:VEGA,text:'Midtown. La línea policial aguanta por ti. La plaza está al final de la avenida.',when:c=>c.floor>=1},
    {id:'plaza',who:CAP,text:'La última plaza. Y una máquina apagada del tamaño de un edificio.',when:c=>c.floor>=2},
    {id:'boss',who:VEGA,text:'¡El Comandante! Salta sus ráfagas y no pierdas de vista la granada.',when:c=>c.bossActive},
    {id:'retreat',who:CAP,text:'Corre hacia la máquina. No va a rendirse: va a subirse.',when:c=>c.retreat},
    {id:'titan',who:VEGA,text:'¡El Titán de Acero! Cambia de altura con la ametralladora, sal de las marcas y salta las ondas.',when:c=>c.titan},
    {id:'half',who:CAP,text:'Pierde placas. Es su último prototipo, y ya no hay repuestos.',when:c=>c.titanHalf},
    {id:'down',who:CAP,text:'Contrato cerrado.',when:c=>c.bossDown},
    {id:'wrap',who:VEGA,text:'La plaza es de la policía, Cap. Baja las armas: voy por ti.',when:c=>c.wrap,after:'down'}
  ];
  // El final se muestra en el panel de victoria de level-eight.html, que repite
  // estos mismos textos para funcionar aunque este módulo no llegue a cargarse.
  const finale={kicker:'CAMPAÑA COMPLETADA',title:'Contrato cerrado',
    paragraphs:[
      'Sin proveedor, sin ejército y sin Comandante, el Consorcio ya no es dueño de nada. La ciudad vuelve a ser de quien vive en ella.',
      'Vega aterriza entre los restos del Titán con un maletín: la recompensa más grande de tu carrera. «Cuéntala, Cap Dollar. Por algo te llaman así.»',
      'La mordida no se cura. Vega pregunta qué piensas hacer con el lobo. «Quedármelo. Un cazador usa lo que tiene.»'],
    credits:['GRACIAS POR JUGAR','CAP DOLLAR, THE HUNTER','Fin de la campaña']};
  // Datos de la campaña del jugador para los créditos y el desfile de trofeos.
  // Todo es opcional: sin almacenamiento, los créditos salen sin cifras.
  const FORMS=[['wolf','Lobo'],['zombie','Zombi eléctrico'],['robot','Robot de combate'],['tank','Mini tanque'],['fighter','Luchador'],['hero','Centella']];
  function campaign(data={}){
    const out={completed:null,points:null,difficulty:null,forms:null},store=data.store;
    try{if(store&&root.ArcadeCampaign)out.completed=root.ArcadeCampaign.completedMissions(store);}catch{}
    try{if(store&&root.ArcadeProgression){const p=root.ArcadeProgression.load(store);out.points=p.earned;out.forms={wolf:true,zombie:p.zombieUnlocked,robot:p.robotUnlocked,tank:p.tankUnlocked,fighter:p.fighterUnlocked,hero:p.heroUnlocked};}}catch{}
    try{if(store&&root.ArcadeDifficulty)out.difficulty=root.ArcadeDifficulty.get(root.ArcadeDifficulty.load(store)).name;}catch{}
    const p=data.player;if(p&&!out.forms)out.forms={wolf:true,zombie:!!p.zombieUnlocked,robot:!!p.robotUnlocked,tank:!!p.tankUnlocked,fighter:!!p.fighterUnlocked,hero:!!p.heroUnlocked};
    return out;
  }
  function credits(data={}){
    const c=data.campaign||campaign(data),rows=[];
    if(c.completed)rows.push(['Misiones completadas',c.completed.length+' de 8']);
    if(Number.isFinite(c.points))rows.push(['Puntos ganados',Math.floor(c.points).toLocaleString('es-CO')]);
    if(c.difficulty)rows.push(['Dificultad',c.difficulty]);
    for(const row of data.stats||[])if(Array.isArray(row)&&row.length===2)rows.push([String(row[0]),String(row[1])]);
    if(c.forms){const won=FORMS.filter(([id])=>c.forms[id]).map(([,name])=>name);if(won.length)rows.push(['Formas ganadas',String(won.length)]);}
    return[
      {kind:'head',text:'GRACIAS POR JUGAR'},{kind:'title',text:'CAP DOLLAR, THE HUNTER'},
      {kind:'line',text:'Una cacería en ocho contratos'},{kind:'gap'},
      ...(rows.length?[{kind:'head',text:'TU CAMPAÑA'},...rows.map(([label,value])=>({kind:'stat',label,value})),{kind:'gap'}]:[]),
      {kind:'head',text:'REPARTO'},{kind:'line',text:'Cap Dollar · el cazador'},{kind:'line',text:'Vega · la piloto'},{kind:'line',text:'El Comandante · el que firmaba las órdenes'},{kind:'line',text:'Y todos los que se cruzaron en el camino'},{kind:'gap'},
      {kind:'line',text:'Ningún contrato queda abierto.'},{kind:'line',text:'Por ahora.'},{kind:'gap'},
      {kind:'head',text:'Fin de la campaña'}
    ];
  }
  // El final a pantalla completa (mission-finale-scenes.js): una página por plano, en orden.
  function finaleScript(data={}){
    data.campaign=data.campaign||campaign(data);
    return[
      {text:'El último prototipo del Consorcio se desploma en mitad de la plaza.'},
      {text:'El Comandante sale con las manos en alto. La policía le pone las esposas que le debía.'},
      {text:'Amanece sobre Nueva York. La ciudad vuelve a ser de quien vive en ella.'},
      {text:'Vega aterriza entre los restos con un maletín: la recompensa más grande de su carrera.\n\n«Cuéntala, Cap Dollar. Por algo te llaman así.»'},
      {text:'La mordida no se cura. Vega pregunta qué piensa hacer con el lobo.\n\n«Quedármelo. Un cazador usa lo que tiene.»'},
      {text:'Cada contrato dejó una cicatriz. Y algo más.'},
      {text:'',title:{kicker:'CAMPAÑA COMPLETADA',title:'CAP DOLLAR, THE HUNTER',big:true},hold:6.5},
      {text:'',credits:credits(data)}
    ];
  }
  const config={briefing,beats,eyebrow:'MISIÓN 08 · NUEVA YORK · LA ÚLTIMA BATALLA',scenes:'eight',startLabel:'Entrar en Nueva York',ambient:/^(traffic|soldiers|police|hurt)/,series:/^$/,
    finale:{theme:'obra',script:finaleScript},
    epilogue:'El Titán de Acero se apaga en mitad de la plaza. El Comandante sale de la cabina con las manos en alto y la policía le pone las esposas que le debía.'};
  const api={briefing,beats,config,finale,finaleScript,campaign,credits,FORMS,mount:host=>root.ArcadeMissionOneStory?.mount(host,config)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionEightStory=api;
})(typeof window!=='undefined'?window:globalThis);
