(function(root){
  'use strict';
  // Se llega desde la misión 6 o la 7, con el transmisor o su receptor fuera de servicio.
  // Cada página es el subtítulo de un plano (mission-late-scenes.js, conjunto 'eight').
  const briefing=[
    {text:'La señal que alimentaba al Consorcio se apagó. Sin proveedor no hay repuestos.'},
    {text:'Le queda un ejército privado, una sede en Nueva York y el hombre que firma las órdenes: el Comandante.'},
    {text:'La policía espera en Manhattan. Esta vez necesita al Comandante vivo.'},
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
    {id:'down',who:CAP,text:'Titán abatido. La plaza es suya, oficial.',when:c=>c.bossDown}
  ];
  // El final se muestra en el panel de victoria de level-eight.html, que repite
  // estos mismos textos para funcionar aunque este módulo no llegue a cargarse.
  const finale={kicker:'MISIÓN 08 COMPLETADA',title:'Nueva York liberada',
    paragraphs:['La policía de Nueva York tiene al Comandante. Una patrullera del Consorcio lleva rumbo al delta.']};
  function finaleScript(){
    return [{text:'La policía esposa al Comandante entre los restos del Titán.'},
      {text:'Vega por radio. «Están cerrando la presa. Cap, te espero en el muelle».'}];
  }
  const config={briefing,beats,eyebrow:'MISIÓN 08 · NUEVA YORK · LA PLAZA DEL COMANDANTE',scenes:'eight',startLabel:'Entrar en Nueva York',ambient:/^(traffic|soldiers|police|hurt)/,series:/^$/,
    finale:{label:'Nueva York · Rumbo al delta',theme:'nueva-york',script:finaleScript},
    epilogue:'El Titán de Acero se apaga en mitad de la plaza. El Comandante sale de la cabina con las manos en alto y la policía le pone las esposas que le debía.'};
  const api={briefing,beats,config,finale,finaleScript,mount:host=>root.ArcadeMissionOneStory?.mount(host,config)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionEightStory=api;
})(typeof window!=='undefined'?window:globalThis);
