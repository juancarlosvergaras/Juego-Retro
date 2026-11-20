(function(root){
  'use strict';
  // Guion de la misión 04. Informe y radio reutilizan el sistema de la misión 01.
  const briefing=[
    {title:'Huyen por carretera',text:'El Consorcio, la empresa militar que compró la ciudad tras la guerra, está sacando lo suyo antes de que lo alcances. Sale por tierra, en un convoy blindado.\n\nLleva consigo lo único que le importa salvar: un prototipo que pensaba estrenar contra la ciudad.'},
    {title:'La persecución',text:'Vega te deja en la Autopista 04 con una moto del ejército y el depósito lleno. Desde el aire no puede seguirlos: la escolta lleva soldados con mochila propulsora.\n\nLa calzada está rota. Las rampas te lanzan por encima de lo que venga; los baches te tiran al suelo.'},
    {title:'El Devorador de Asfalto',text:'Cierra el convoy un camión de seis ruedas con tres torretas. Dispara, siembra minas y frena en seco para aplastar a quien lo siga.\n\nCada torreta que pierde es un arma menos. Cuando no le quede ninguna, lo que guarda dentro será tuyo.',objectives:['Alcanza al convoy por la Autopista 04','Destruye las tres torretas del Devorador de Asfalto','Hazte con el prototipo: el mini tanque']}
  ];
  const VEGA='VEGA · PILOTO',CAP='CAP DOLLAR';
  const beats=[
    {id:'start',who:VEGA,text:'Tienes la autopista para ti. Yo subo antes de que me vean los de las mochilas. ¡Písale, Cap!',when:c=>c.riding},
    {id:'escort',who:VEGA,text:'Escolta del convoy por delante. Disparan hacia atrás: cambia de carril y no les des un blanco fijo.',when:c=>c.vehicles>0},
    {id:'ramp',who:CAP,text:'Rampa. Con el turbo paso por encima de lo que haya debajo.',when:c=>c.rampNear},
    {id:'crash',who:VEGA,text:'¡Eso era un bache! Salta los charcos o cambia de carril: cada caída te cuesta vida y tiempo.',when:c=>c.crashed},
    {id:'jets',who:VEGA,text:'Mochilas propulsoras sobre la calzada. Apunta en diagonal con I o Q, o deja que se cansen.',when:c=>c.jets>0},
    {id:'hurt',who:VEGA,text:'Te están acribillando. Los botiquines van en la calzada: pásales por encima.',when:c=>c.hp<=3&&c.hp>0},
    {id:'mid',who:CAP,text:'Media autopista. El asfalto está lleno de piezas suyas… voy por buen camino.',when:c=>c.distance>4700},
    {id:'near',who:VEGA,text:'Veo la cola del convoy. Lo que la cierra no es un camión cualquiera: prepara lo más pesado que tengas.',when:c=>c.distance>8700},
    {id:'boss',who:VEGA,text:'¡El Devorador de Asfalto! Tres torretas. Cuando avise la embestida, cambia de carril o salta.',when:c=>c.bossActive},
    {id:'turret',who:CAP,text:'Una torreta menos. Se le ven las tripas al horno.',when:c=>c.bossStage>=1},
    {id:'last',who:VEGA,text:'¡Solo le queda una! Ahora embestirá más: no te quedes en su carril.',when:c=>c.bossStage>=2},
    {id:'tank',who:CAP,text:'Así que esto era lo que escondían. Pequeño, blindado… y con un cañón que no cabe en él.',when:c=>c.reward},
    {id:'sea',who:VEGA,text:'Convoy neutralizado. Sus papeles nombran un puerto y un centro comercial. Y ese juguete tuyo también flota.',when:c=>c.reward,after:'tank'}
  ];
  const config={briefing,beats,eyebrow:'MISIÓN 04 · FURIA EN LA CARRETERA',scenes:'four',startLabel:'Arrancar',ambient:/^(escort|ramp|crash|jets|hurt|mid|near)/,series:/^(mid|near)/,
    epilogue:'El Devorador ha caído y su prototipo es tuyo. El Consorcio aún tiene dos salidas: un submarino en el puerto y el último centro comercial en pie. Elige por dónde seguir.'};
  const api={briefing,beats,config,mount:host=>root.ArcadeMissionOneStory?.mount(host,config)};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMissionFourStory=api;
})(typeof window!=='undefined'?window:globalThis);
