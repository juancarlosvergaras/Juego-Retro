(function(root){
  'use strict';
  // Guion de la misión 03. Informe y radio reutilizan el sistema de la misión 01.
  const briefing=[
    {title:'El dueño de la manada',text:'El rey del mausoleo no despertó solo. Alguien lo fue a buscar, igual que alguien pagaba al Capataz.\n\nLas órdenes salían de un portaaviones que no toca el agua: vuela sobre la costa con cuatro motores y una flota de escolta.'},
    {title:'El asalto',text:'Vega te acercará por debajo de las nubes. La artillería antiaérea abrirá fuego en cuanto os vean, así que no habrá segunda pasada.\n\nBajas a cubierta y avanzas hacia proa entre torretas, cazas aparcados y soldados con mochila propulsora.'},
    {title:'El Centinela',text:'La cubierta de proa la vigila una máquina de guerra de dos pisos. Mientras siga en pie, nadie despega ni aterriza.\n\nSu chasis es un prototipo. Si lo tumbas, lo que quede dentro será tuyo.',objectives:['Cruza la cubierta del portaaviones hasta proa','Destruye al Centinela','Hazte con el chasis robot y sal por la zona de extracción']}
  ];
  const VEGA='VEGA · PILOTO',CAP='CAP DOLLAR';
  const beats=[
    {id:'start',who:VEGA,text:'¡Estás en cubierta! Yo me aparto antes de que me derriben. Avanza hacia proa y no mires abajo.',when:c=>c.landed},
    {id:'militia',who:VEGA,text:'Tripulación armada. Usa los contenedores como cobertura: aquí arriba no hay edificios donde esconderse.',when:c=>c.enemyAlert},
    {id:'jets',who:VEGA,text:'¡Soldados con mochila propulsora! Vienen por arriba: apunta en diagonal o sube a las pasarelas.',when:c=>c.jetSeen},
    {id:'hurt',who:VEGA,text:'Te han dado, Cap. Hay botiquines junto a las torres de control.',when:c=>c.hp<=3&&c.hp>0},
    {id:'mid',who:CAP,text:'Media cubierta. El viento casi me arranca del suelo… y la nave sigue acelerando.',when:c=>c.x>3600},
    {id:'bow',who:VEGA,text:'Proa a la vista. Los sensores marcan una firma enorme justo delante. Prepara lo más pesado que tengas.',when:c=>c.x>5900},
    {id:'mecha',who:VEGA,text:'¡El Centinela! Ráfagas, misiles marcados en el suelo y ondas al pisar: muévete siempre.',when:c=>c.mechaActive},
    {id:'half',who:CAP,text:'Echa humo por las juntas. Un poco más y cae.',when:c=>c.mechaHalf},
    {id:'robot',who:CAP,text:'El chasis sigue entero. Dos brazos, dos armas… puedo usar esto.',when:c=>c.mechaDown},
    {id:'exit',who:VEGA,text:'¡Centinela fuera de combate! Te recojo en la zona de extracción, a tu derecha. Los dueños huyen por carretera.',when:c=>c.mechaDown,after:'robot'}
  ];
  const config={briefing,beats,eyebrow:'MISIÓN 03 · GUERRA EN EL AIRE',scenes:'three',startLabel:'Despegar',ambient:/^(militia|jets|hurt|mid|bow)/,series:/^(mid|bow)/};
  const api={briefing,beats,config,mount:host=>root.ArcadeMissionOneStory?.mount(host,config)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionThreeStory=api;
})(typeof window!=='undefined'?window:globalThis);
