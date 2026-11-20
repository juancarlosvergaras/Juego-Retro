(function(root){
  'use strict';
  // Guion de la misión 06. Informe y radio reutilizan el sistema de la misión 01.
  // Aquí se llega desde la 03, la 04 o la 05: el texto no da por jugada ninguna.
  const briefing=[
    {title:'El último centro',text:'Todas las pistas llevan al mismo sitio: el último centro comercial que sigue en pie. Luces encendidas, vitrinas llenas y gente comprando, como si la guerra no hubiera pasado.\n\nEs del Consorcio. La empresa que compró la ciudad necesitaba una fachada limpia, y la tiene.'},
    {title:'Tres plantas',text:'Atrio, galerías y restaurantes. Entre los clientes patrullan guardias, celadores y torretas, y por el pasillo que dejes atrás llegarán refuerzos.\n\nLas escaleras mecánicas están al fondo de cada planta. Vega te deja en la puerta y sube a esperarte: desde el aire no puede sacar a nadie de ahí dentro.'},
    {title:'La antena',text:'En la azotea hay una antena repetidora. Por ahí entran las órdenes del Consorcio y por ahí salen sus pedidos. La guarda el Coloso, un gigante gris que trepa por la fachada.\n\nTúmbalo, y la antena dirá con quién habla.',objectives:['Cruza el atrio, las galerías y los restaurantes','Sube a la azotea y derriba al Coloso','Averigua adónde apunta la antena del Consorcio']}
  ];
  const VEGA='VEGA · PILOTO',CAP='CAP DOLLAR';
  const beats=[
    {id:'start',who:VEGA,text:'Estás dentro, Cap. Parece un centro comercial cualquiera… hasta que cuentas las cámaras. La antena está en la azotea.',when:c=>c.playing&&c.floor===0},
    {id:'guards',who:VEGA,text:'Guardias del Consorcio con uniforme de vigilante. Usa los balcones y no les des un blanco fijo.',when:c=>c.guards>0},
    {id:'rear',who:VEGA,text:'¡Refuerzos a tu espalda! Te cierran el pasillo: no te quedes en medio.',when:c=>c.rear},
    {id:'arcade',who:CAP,text:'Una tienda Arcade abierta. El Consorcio también cobra por jugar.',when:c=>c.arcade},
    {id:'hurt',who:VEGA,text:'Te están dando duro. Hay un botiquín al inicio de cada planta.',when:c=>c.hp<=3&&c.hp>0},
    {id:'floor2',who:VEGA,text:'Segunda planta, galerías. Cada tienda de estas lava dinero del Consorcio.',when:c=>c.floor>=1},
    {id:'floor3',who:CAP,text:'Tercera planta. Restaurantes vacíos y la cocina encendida. Alguien come aquí arriba.',when:c=>c.floor>=2},
    {id:'roof',who:VEGA,text:'Azotea. Ahí está la antena… y algo enorme sube por la fachada.',when:c=>c.floor>=3},
    {id:'boss',who:VEGA,text:'¡El Coloso! Sal de las marcas, salta las ondas y dispárale al torso.',when:c=>c.bossActive},
    {id:'half',who:CAP,text:'Se le agrieta la piedra. Un poco más y cae.',when:c=>c.bossHalf},
    {id:'signal',who:CAP,text:'Coloso abajo. La antena apunta hacia arriba.',when:c=>c.bossDown},
    {id:'orbit',who:VEGA,text:'La señal sale de la atmósfera. Hay una nave en órbita.',when:c=>c.bossDown,after:'signal'}
  ];
  const config={briefing,beats,eyebrow:'MISIÓN 06 · EL ÚLTIMO CENTRO',scenes:'six',startLabel:'Entrar al centro',ambient:/^(guards|rear|arcade|hurt|floor)/,series:/^floor/,
    epilogue:'El Coloso ha caído y la azotea es tuya. La antena del Consorcio no habla con la ciudad: su señal sube hasta una nave en órbita. Alguien, allá arriba, le vende los monstruos.'};
  const api={briefing,beats,config,mount:host=>root.ArcadeMissionOneStory?.mount(host,config)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionSixStory=api;
})(typeof window!=='undefined'?window:globalThis);
