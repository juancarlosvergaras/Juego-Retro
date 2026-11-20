(function(root){
  'use strict';
  // Guion de la misión 05. Informe y radio reutilizan el sistema de la misión 01.
  // El mapa permite llegar aquí sin haber jugado la 03 ni la 04: el texto solo da
  // por vividas las misiones 01 y 02. Bajo el agua la señal de Vega llega a pedazos.
  // Cada página es el subtítulo de un plano (mission-late-scenes.js, conjunto 'five').
  const briefing=[
    {text:'El Consorcio es una empresa militar con ejército propio y cuentas que nadie revisa. No fabrica sus monstruos: los compra.'},
    {text:'Todo lo que compra entra por mar, de noche, en la bodega de un submarino.'},
    {text:'Lo manda el Capitán del Abismo. Hace años que no sube a la superficie, y no piensa hacerlo hoy.'},
    {text:''}
  ];
  // Tras el cierre bajo el agua (sea-renderer.js): los libros de cuentas y adónde llevan.
  const outro=[
    {text:'Los libros del Capitán anotan cada pedido del Consorcio. Todos salen por el mismo lugar.'},
    {text:'Una antena en la azotea del último centro comercial que sigue en pie.'}
  ];
  const VEGA='VEGA · PILOTO',CAP='CAP DOLLAR';
  const beats=[
    {id:'start',who:VEGA,text:'Cap… aquí Vega. Bajo el agua te voy a oír… a pedazos. Sigue la fosa hacia el este… y hacia abajo.',when:c=>c.diving},
    {id:'hull',who:VEGA,text:'Ese blindaje tuyo… ahí abajo es un submarino. Úsalo.',when:c=>c.diving&&c.submersible},
    {id:'mines',who:VEGA,text:'Minas… por todas partes. No las toques, Cap: dispárales… de lejos.',when:c=>c.mines},
    {id:'shark',who:CAP,text:'Algo grande me está rondando. Y no lleva uniforme.',when:c=>c.shark},
    {id:'hurt',who:VEGA,text:'Tus constantes… bajan. Busca un botiquín entre los restos.',when:c=>c.hp<=3&&c.hp>0},
    {id:'sonar',who:VEGA,text:'Sonar activado… ahí sí te tengo. Si caes, vuelves a ese punto.',when:c=>c.checkpoint>=0&&!c.inside},
    {id:'reef',who:CAP,text:'El arrecife se cierra. Tres bocas, y las tres bajan.',when:c=>c.x>4900&&!c.inside},
    {id:'trench',who:VEGA,text:'Ya casi… no te oigo. La esclusa está al fondo… a tu derecha.',when:c=>c.x>8600&&!c.inside},
    {id:'airlock',who:CAP,text:'Esclusa abierta. Entro.',when:c=>c.airlock},
    {id:'boss',who:VEGA,text:'¡…el Capitán del Abismo! Salta la ametralladora… y sal de las marcas rojas.',when:c=>c.bossActive},
    {id:'half',who:CAP,text:'Retrocede hacia la caja fuerte. Ahí guarda los libros.',when:c=>c.bossHalf},
    {id:'books',who:CAP,text:'Sus libros de cuentas. Los pedidos salen por una antena… en una azotea.',when:c=>c.bossDown},
    {id:'next',who:VEGA,text:'Te copio… El último centro comercial en pie. Yo pongo el rumbo.',when:c=>c.reward,after:'books'}
  ];
  const config={briefing,outro,beats,eyebrow:'MISIÓN 05 · BAJO EL ABISMO',scenes:'five',startLabel:'Sumergirse',ambient:/^(hull|mines|shark|hurt|sonar|reef|trench)/,series:/^(reef|trench)/,
    epilogue:'El Capitán ha caído y su carga ya no llegará a nadie. Entre los sueros sin estrenar había uno de combate: ahora es tuyo. Sus libros de cuentas señalan una antena repetidora en la azotea del último centro comercial en pie.'};
  const api={briefing,beats,config,mount:host=>root.ArcadeMissionOneStory?.mount(host,config)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionFiveStory=api;
})(typeof window!=='undefined'?window:globalThis);
