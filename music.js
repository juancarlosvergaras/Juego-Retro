(function(root){
  'use strict';
  // Música original generada por código: un secuenciador pequeño sobre el
  // AudioContext del juego (sound-effects.js lo crea y lo comparte).
  //  · Parte pura (temas, notas, compases, planificador): se prueba en Node.
  //  · Parte de audio: osciladores y ruido filtrado con envolventes; cada nota se
  //    desconecta al terminar y el bus entero se desmonta al detenerse.
  //  · Parte de página: tema según la misión, variación de jefe y deslizador.
  const STORAGE_KEY='cap-dollar.music.v1',DEFAULT_VOLUME=.45;
  const LOOKAHEAD=.12,INTERVAL_MS=25,START_DELAY=.06,FADE_IN=1.5,FADE_OUT=.5,PREVIEW_MS=3000;
  // Ganancia del bus a volumen 100 %. La música queda por debajo de los efectos.
  const MIX=.7;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

  // ───────────────────────── Notas y escalas ─────────────────────────
  const SEMITONES={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  function noteToMidi(name){
    const m=/^([A-G])([#b]?)(-?\d)$/.exec(String(name));
    return m?12*(Number(m[3])+1)+SEMITONES[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0):null;
  }
  const midiToFrequency=midi=>440*Math.pow(2,(midi-69)/12);
  const noteToFrequency=name=>{const midi=noteToMidi(name);return midi===null?null:midiToFrequency(midi);};
  const SCALES={
    major:[0,2,4,5,7,9,11],
    minor:[0,2,3,5,7,8,10],
    dorian:[0,2,3,5,7,9,10],
    octatonic:[0,1,3,4,6,7,9,10] // semitono-tono: ambigua y disonante
  };
  // Clases de altura (0–11) de la escala declarada por un tema.
  function scaleNotes(key,scale){
    const tonic=noteToMidi(key+'0'),steps=SCALES[scale];
    return tonic===null||!steps?[]:steps.map(step=>(tonic+step)%12);
  }

  // ───────────────────────────── Timbres ─────────────────────────────
  // gain = pico por nota (acotado); gate = fracción de la nota que suena;
  // cutoff = paso bajo fijo de la pista. Los tambores usan ruido filtrado.
  const VOICES={
    bass:    {wave:'square',  gain:.15, attack:.004,decay:.09,sustain:.7, release:.03,gate:.85,cutoff:900},
    subBass: {wave:'sawtooth',gain:.14, attack:.006,decay:.12,sustain:.75,release:.04,gate:.9, cutoff:560},
    softBass:{wave:'triangle',gain:.2,  attack:.012,decay:.2, sustain:.8, release:.08,gate:.95,cutoff:1200},
    lead:    {wave:'pulse',   gain:.1,  attack:.006,decay:.12,sustain:.65,release:.05,gate:.9, cutoff:3600},
    flute:   {wave:'triangle',gain:.15, attack:.02, decay:.2, sustain:.8, release:.09,gate:.95,cutoff:4200},
    arp:     {wave:'square',  gain:.05, attack:.003,decay:.06,sustain:.3, release:.03,gate:.6, cutoff:2400},
    pluck:   {wave:'triangle',gain:.11, attack:.003,decay:.14,sustain:.25,release:.08,gate:.8, cutoff:3200},
    pad:     {wave:'triangle',gain:.05, attack:.18, decay:.3, sustain:.85,release:.25,gate:1,  cutoff:1800},
    stab:    {wave:'sawtooth',gain:.04, attack:.004,decay:.08,sustain:.25,release:.04,gate:.5, cutoff:1600},
    kick:    {drum:'kick', gain:.2},
    snare:   {drum:'snare',gain:.1},
    hat:     {drum:'hat',  gain:.04}
  };
  const DRUMS=['kick','snare','hat'];
  // Percusión: x golpe, X acento (charles abierto), o suave, . silencio.
  const HIT={x:1,X:1.3,o:.5};

  // ────────────────────────────── Temas ──────────────────────────────
  // Cada compás es una cadena. Notas: «D4», «F#3», «Bb2»; «-» alarga la nota
  // anterior; «.» es silencio; «A3+C4+E4» es un acorde. El número de símbolos
  // reparte el compás: 16 = semicorcheas, 8 = corcheas, 4 = negras, 1 = redonda.
  // Una pista con menos compases que el tema se repite en bucle.
  // Todas las melodías son composición propia para este juego.
  const x4=cell=>(cell+' ').repeat(4).trim();

  // Motivo de la misión 1 (ascenso sobre la tríada menor). La misión 8 lo retoma.
  const OBRA_LEAD=[
    'D4 - F4 A4 - - G4 A4',  'F4 - - E4 D4 - - .',
    'D4 - F4 Bb4 - - A4 Bb4','G4 - - E4 C4 - E4 G4',
    'A4 - D5 - - C5 A4 -',   'C5 - A4 F4 - - G4 A4',
    'Bb4 - - A4 G4 - Bb4 -', 'A4 - - - E4 - . .'
  ];

  const obra={
    id:'obra',mission:1,title:'La obra',character:'Noche, tensión y ascenso',
    key:'D',scale:'minor',tempo:104,bars:8, // Dm Dm Bb C | Dm F Gm Am
    tracks:{
      bass:{voice:'bass',bars:[
        'D2 - . D2 A2 - D2 .', 'D2 - . D2 A2 - C3 .', 'Bb2 - . Bb2 F2 - Bb2 .','C3 - . C3 G2 - C3 .',
        'D2 - . D2 A2 - D2 .', 'F2 - . F2 C3 - F2 .', 'G2 - . G2 D3 - G2 .',   'A2 - . A2 E2 - A2 C3']},
      lead:{voice:'lead',bars:OBRA_LEAD},
      arp:{voice:'arp',bars:[
        'A3 D4 F4 D4 A3 D4 F4 D4',  'A3 D4 F4 D4 A3 D4 F4 D4',  'Bb3 D4 F4 D4 Bb3 D4 F4 D4','G3 C4 E4 C4 G3 C4 E4 C4',
        'A3 D4 F4 D4 A3 D4 F4 D4',  'A3 C4 F4 C4 A3 C4 F4 C4',  'G3 Bb3 D4 Bb3 G3 Bb3 D4 Bb3','A3 C4 E4 C4 A3 C4 E4 C4']}
    },
    drums:{kick:['x.....x...x.....'],snare:['....x.......x...'],hat:['o.x.o.x.o.x.o.x.']},
    boss:{tempo:1.09,
      drums:{kick:['x...x.x.x...x.x.'],snare:['....x.......x.xx'],hat:['xoxoxoxoxoxoxoxo']},
      layer:{voice:'stab',bars:[
        'D3+A3 . . D3+A3 . . D3+A3 .',  'D3+A3 . . D3+A3 . . D3+A3 .',  'Bb2+F3 . . Bb2+F3 . . Bb2+F3 .','C3+G3 . . C3+G3 . . C3+G3 .',
        'D3+A3 . . D3+A3 . . D3+A3 .',  'C3+F3 . . C3+F3 . . C3+F3 .',  'D3+G3 . . D3+G3 . . D3+G3 .',  'E3+A3 . . E3+A3 . . E3+A3 .']}}
  };

  const umbral={
    id:'umbral',mission:2,title:'El umbral del rey',character:'Marcial y sombrío',
    key:'C',scale:'minor',tempo:96,bars:8, // Cm Cm Ab Gm | Cm Fm Bb Cm
    tracks:{
      bass:{voice:'subBass',bars:[
        'C2 G2 C2 G2','C2 G2 C2 G2','Ab2 Eb2 Ab2 Eb2','G2 D2 G2 D2',
        'C2 G2 C2 G2','F2 C3 F2 C3','Bb2 F2 Bb2 F2',  'C2 G2 C2 .']},
      lead:{voice:'flute',bars:[
        'C4 - - G3 C4 - Eb4 -', 'Eb4 - D4 C4 G3 - - .','Ab3 - - C4 Eb4 - C4 -','D4 - - Bb3 G3 - - .',
        'C4 - - G3 C4 - Eb4 -', 'F4 - - Eb4 C4 - Ab3 -','Bb3 - D4 - F4 - D4 -', 'Eb4 - D4 - C4 - - .']},
      pad:{voice:'pad',bars:['C4+Eb4','C4+Eb4','C4+Eb4','Bb3+D4','C4+Eb4','Ab3+C4','Bb3+D4','G3+C4+Eb4']}
    },
    drums:{kick:['x.......x.......'],snare:['o..ox.o.o..ox.oo'],hat:['o...o...o...o...']},
    boss:{tempo:1.08,
      drums:{kick:['x...x...x...x...'],snare:['x..xx.x.x..xx.xx'],hat:['o.x.o.x.o.x.o.x.']},
      layer:{voice:'arp',level:1.2,bars:[
        'C3 C3 G2 C3 C3 C3 G2 G2',    'C3 C3 G2 C3 C3 C3 G2 G2','Ab2 Ab2 Eb3 Ab2 Ab2 Ab2 Eb3 Eb3','G2 G2 D3 G2 G2 G2 D3 D3',
        'C3 C3 G2 C3 C3 C3 G2 G2',    'F2 F2 C3 F2 F2 F2 C3 C3','Bb2 Bb2 F3 Bb2 Bb2 Bb2 F3 F3',    'C3 C3 G2 C3 C3 C3 G2 G2']}}
  };

  const aire={
    id:'aire',mission:3,title:'Guerra en el Aire',character:'Rápido y heroico',
    key:'G',scale:'major',tempo:152,bars:16, // G D Em C | G D C D || Em C G D | Em C D D
    tracks:{
      bass:{voice:'bass',bars:[
        'G2 G2 D3 G2 G2 G2 D3 G2','D3 D3 A2 D3 D3 D3 A2 D3','E2 E2 B2 E2 E2 E2 B2 E2','C3 C3 G2 C3 C3 C3 G2 C3',
        'G2 G2 D3 G2 G2 G2 D3 G2','D3 D3 A2 D3 D3 D3 A2 D3','C3 C3 G2 C3 C3 C3 G2 C3','D3 D3 A2 D3 D3 D3 A2 D3',
        'E2 E2 B2 E2 E2 E2 B2 E2','C3 C3 G2 C3 C3 C3 G2 C3','G2 G2 D3 G2 G2 G2 D3 G2','D3 D3 A2 D3 D3 D3 A2 D3',
        'E2 E2 B2 E2 E2 E2 B2 E2','C3 C3 G2 C3 C3 C3 G2 C3','D3 D3 A2 D3 D3 D3 A2 D3','D3 D3 A2 D3 D3 D3 A2 D3']},
      lead:{voice:'lead',bars:[
        'G4 - B4 D5 - - B4 D5',   'F#5 - E5 D5 A4 - - .', 'G4 - B4 E5 - - D5 B4', 'C5 - E5 - G5 - E5 -',
        'D5 - B4 G4 - - B4 D5',   'A4 - D5 F#5 - - E5 D5','E5 - - C5 G4 - C5 E5', 'D5 - - - A4 - F#4 A4',
        'B4 - - G4 E4 - G4 B4',   'C5 - - G4 E4 - G4 C5', 'D5 - - B4 G4 - B4 D5', 'F#5 - E5 D5 - - A4 -',
        'G5 - - E5 B4 - E5 G5',   'E5 - - C5 G4 - C5 E5', 'F#5 - - D5 A4 - D5 F#5','A5 - - - F#5 - D5 -']},
      arp:{voice:'arp',bars:[
        x4('G3 B3 D4 B3'),x4('F#3 A3 D4 A3'),x4('G3 B3 E4 B3'),x4('G3 C4 E4 C4'),
        x4('G3 B3 D4 B3'),x4('F#3 A3 D4 A3'),x4('G3 C4 E4 C4'),x4('F#3 A3 D4 A3'),
        x4('G3 B3 E4 B3'),x4('G3 C4 E4 C4'),x4('G3 B3 D4 B3'),x4('F#3 A3 D4 A3'),
        x4('G3 B3 E4 B3'),x4('G3 C4 E4 C4'),x4('F#3 A3 D4 A3'),x4('F#3 A3 D4 A3')]}
    },
    drums:{kick:['x...x...x...x...'],snare:['....x.......x...'],hat:['x.x.x.x.x.x.x.x.']},
    boss:{tempo:1.08,
      drums:{kick:['x..xx...x..xx.x.'],snare:['....x..x....x.xx'],hat:['xoxoxoxoxoxoxoxo']},
      layer:{voice:'stab',bars:[
        '. G3+D4 . G3+D4 . G3+D4 . G3+D4','. A3+D4 . A3+D4 . A3+D4 . A3+D4','. B3+E4 . B3+E4 . B3+E4 . B3+E4','. G3+C4 . G3+C4 . G3+C4 . G3+C4',
        '. G3+D4 . G3+D4 . G3+D4 . G3+D4','. A3+D4 . A3+D4 . A3+D4 . A3+D4','. G3+C4 . G3+C4 . G3+C4 . G3+C4','. A3+D4 . A3+D4 . A3+D4 . A3+D4',
        '. B3+E4 . B3+E4 . B3+E4 . B3+E4','. G3+C4 . G3+C4 . G3+C4 . G3+C4','. G3+D4 . G3+D4 . G3+D4 . G3+D4','. A3+D4 . A3+D4 . A3+D4 . A3+D4',
        '. B3+E4 . B3+E4 . B3+E4 . B3+E4','. G3+C4 . G3+C4 . G3+C4 . G3+C4','. A3+D4 . A3+D4 . A3+D4 . A3+D4','. A3+D4 . A3+D4 . A3+D4 . A3+D4']}}
  };

  const carretera={
    id:'carretera',mission:4,title:'Furia en la Carretera',character:'Persecución a toda velocidad',
    key:'E',scale:'minor',tempo:168,bars:16, // Em Em C D | Em G Am Bm || C D Em Em | C D Bm Bm
    tracks:{
      bass:{voice:'bass',bars:[ // bajo en corcheas
        'E2 E2 E3 E2 E2 E2 E3 E2','E2 E2 E3 E2 E2 E2 E3 E2','C3 C3 G3 C3 C3 C3 G3 C3','D3 D3 A3 D3 D3 D3 A3 D3',
        'E2 E2 E3 E2 E2 E2 E3 E2','G2 G2 D3 G2 G2 G2 D3 G2','A2 A2 E3 A2 A2 A2 E3 A2','B2 B2 F#3 B2 B2 B2 F#3 B2',
        'C3 C3 G3 C3 C3 C3 G3 C3','D3 D3 A3 D3 D3 D3 A3 D3','E2 E2 E3 E2 E2 E2 E3 E2','E2 E2 E3 E2 E2 E2 E3 E2',
        'C3 C3 G3 C3 C3 C3 G3 C3','D3 D3 A3 D3 D3 D3 A3 D3','B2 B2 F#3 B2 B2 B2 F#3 B2','B2 B2 F#3 B2 B2 B2 F#3 B2']},
      lead:{voice:'lead',bars:[
        'E4 - G4 B4 - A4 G4 E4',  'G4 - E4 - - . B3 D4',  'E4 - G4 C5 - B4 G4 E4','F#4 - A4 - D5 - - .',
        'E5 - D5 B4 - G4 B4 D5',  'D5 - B4 G4 - B4 D5 -', 'C5 - A4 E4 - A4 C5 -', 'B4 - F#4 - D4 - F#4 B4',
        'G4 - - E4 G4 - C5 -',    'A4 - - F#4 A4 - D5 -', 'B4 - - G4 B4 - E5 -',  'D5 - B4 - G4 - E4 -',
        'E5 - - C5 E5 - G5 -',    'F#5 - - D5 F#5 - A5 -','F#5 - D5 - B4 - F#4 -','B4 - - - F#4 - A4 B4']},
      arp:{voice:'arp',bars:[
        x4('B3 E4 G4 E4'),x4('B3 E4 G4 E4'),x4('C4 E4 G4 E4'),x4('A3 D4 F#4 D4'),
        x4('B3 E4 G4 E4'),x4('B3 D4 G4 D4'),x4('A3 C4 E4 C4'),x4('B3 D4 F#4 D4'),
        x4('C4 E4 G4 E4'),x4('A3 D4 F#4 D4'),x4('B3 E4 G4 E4'),x4('B3 E4 G4 E4'),
        x4('C4 E4 G4 E4'),x4('A3 D4 F#4 D4'),x4('B3 D4 F#4 D4'),x4('B3 D4 F#4 D4')]}
    },
    drums:{kick:['x...x...x...x...'],snare:['....x.......x...'],hat:['x.xxx.xxx.xxx.xx']},
    boss:{tempo:1.08,
      drums:{kick:['x..xx..xx..xx..x'],snare:['....x..o....x.oo'],hat:['xoxoxoxoxoxoxoxo']},
      layer:{voice:'stab',bars:[ // acentos 3+3+2
        'E3+B3 . . E3+B3 . . E3+B3 .', 'E3+B3 . . E3+B3 . . E3+B3 .','C3+G3 . . C3+G3 . . C3+G3 .',  'D3+A3 . . D3+A3 . . D3+A3 .',
        'E3+B3 . . E3+B3 . . E3+B3 .', 'G3+D4 . . G3+D4 . . G3+D4 .','A3+E4 . . A3+E4 . . A3+E4 .',  'B3+F#4 . . B3+F#4 . . B3+F#4 .',
        'C3+G3 . . C3+G3 . . C3+G3 .', 'D3+A3 . . D3+A3 . . D3+A3 .','E3+B3 . . E3+B3 . . E3+B3 .',  'E3+B3 . . E3+B3 . . E3+B3 .',
        'C3+G3 . . C3+G3 . . C3+G3 .', 'D3+A3 . . D3+A3 . . D3+A3 .','B3+F#4 . . B3+F#4 . . B3+F#4 .','B3+F#4 . . B3+F#4 . . B3+F#4 .']}}
  };

  const abismo={
    id:'abismo',mission:5,title:'Bajo el abismo',character:'Lento y acuático, arpegios con eco',
    key:'B',scale:'minor',tempo:66,bars:8, // Bm G D A | Bm G Em F#m
    echo:{steps:3,feedback:.42,mix:.5}, // eco a corchea con puntillo
    tracks:{
      bass:{voice:'softBass',bars:[
        'B2 - F#2 -','G2 - D3 -','D3 - A2 -','A2 - E3 -',
        'B2 - F#2 -','G2 - D3 -','E2 - B2 -','F#2 - C#3 -']},
      lead:{voice:'flute',level:.8,echo:.4,bars:[
        'F#5 - - - - - D5 -','B4 - - - - - . .', 'A4 - - - D5 - - -', 'C#5 - - - - - E5 -',
        'D5 - - - - - F#5 -','G5 - - - D5 - - -','E5 - - - - - G5 -', 'F#5 - - - C#5 - - .']},
      arp:{voice:'pluck',echo:.6,bars:[
        'B3 F#4 B4 D5 C#5 B4 F#4 D4','G3 D4 G4 B4 A4 G4 D4 B3','D4 A4 D5 F#5 E5 D5 A4 F#4','A3 E4 A4 C#5 B4 A4 E4 C#4',
        'B3 F#4 B4 D5 C#5 B4 F#4 D4','G3 D4 G4 B4 A4 G4 D4 B3','E3 B3 E4 G4 F#4 E4 B3 G3',  'F#3 C#4 F#4 A4 C#5 A4 F#4 C#4']}
    },
    drums:{kick:['x...............'],hat:['........o.......']},
    boss:{tempo:1.1,
      drums:{kick:['x......xx.....x.'],snare:['....o.......x...'],hat:['o.o.o.o.o.o.o.o.']},
      layer:{voice:'arp',level:1.2,bars:[
        'B3 . B3 B3 . B3 B3 .','G3 . G3 G3 . G3 G3 .','D3 . D3 D3 . D3 D3 .','A3 . A3 A3 . A3 A3 .',
        'B3 . B3 B3 . B3 B3 .','G3 . G3 G3 . G3 G3 .','E3 . E3 E3 . E3 E3 .','F#3 . F#3 F#3 . F#3 F#3 .']}}
  };

  // Infiltración en el centro comercial: Sol menor natural, pulso firme y un
  // motivo de dos compases (pregunta) que responde sobre Mib–Fa y se desarrolla
  // por secuencia en la segunda mitad. Las notas largas de la melodía son notas
  // del acorde; las de paso están a un tono de él, nunca a un semitono.
  // Gm Gm Eb F | Gm Gm Eb Dm || Cm Cm Gm Gm | Eb F Dm Dm (semicadencia: vuelve a Gm)
  const CENTRO_CHORDS=['Gm','Gm','Eb','F','Gm','Gm','Eb','Dm','Cm','Cm','Gm','Gm','Eb','F','Dm','Dm'];
  const CENTRO={ // bajo (tónica en 1 y 3, quinta en 2 y 4), arpegio, colchón y golpe de jefe
    Gm:{bass:'G2 G2 D3 G2 G2 G2 D3 G2',    arp:'G3 D4 Bb3 D4',  pad:'G3+D4', stab:'G4+Bb4+D5'},
    Eb:{bass:'Eb3 Eb3 Bb2 Eb3 Eb3 Eb3 Bb2 Eb3',arp:'G3 Eb4 Bb3 Eb4',pad:'G3+Bb3',stab:'G4+Bb4+Eb5'},
    F: {bass:'F2 F2 C3 F2 F2 F2 C3 F2',    arp:'F3 C4 A3 C4',   pad:'A3+C4', stab:'A4+C5+F5'},
    Dm:{bass:'D3 D3 A2 D3 D3 D3 A2 D3',    arp:'F3 D4 A3 D4',   pad:'A3+D4', stab:'A4+D5+F5'},
    Cm:{bass:'C3 C3 G2 C3 C3 C3 G2 C3',    arp:'G3 Eb4 C4 Eb4', pad:'C4+Eb4',stab:'G4+C5+Eb5'}
  };
  const centroBars=(part,last)=>CENTRO_CHORDS.map((chord,bar)=>bar===15&&last?last:CENTRO[chord][part]);
  const centro={
    id:'centro',mission:6,title:'El último centro',character:'Infiltración en un lugar que aparenta normalidad',
    key:'G',scale:'minor',tempo:118,bars:16,
    tracks:{
      // El último compás camina hacia la tónica: Re–Do–La–Fa → Sol.
      bass:{voice:'bass',bars:centroBars('bass','D3 D3 A2 D3 D3 C3 A2 F2')},
      lead:{voice:'lead',bars:[
        'G4 . . G4 Bb4 . D5 .',  'C5 . D5 . F5 - - .',  // pregunta: sube por la tríada y queda en la séptima
        'G5 - F5 . Eb5 . . .',   'D5 . C5 . A4 - - .',  // respuesta: baja y se detiene en La
        'G4 . . G4 Bb4 . D5 .',  'C5 . D5 . G5 - - .',  // la pregunta vuelve y llega más alto
        'Bb5 - G5 . F5 . Eb5 .', 'D5 - - - A4 - - .',   // respuesta que reposa en la dominante
        'C5 . . C5 Eb5 . G5 .',  'F5 . G5 . Bb5 - - .', // secuencia del motivo sobre Do menor
        'D5 . . D5 G5 . Bb5 .',  'Bb5 - G5 . F5 . D5 .',// y sobre Sol menor, una octava más tensa
        'Eb5 . G5 . Bb5 - G5 .', 'A5 - G5 . F5 . C5 .',
        'D5 . F5 . A5 - G5 F5',  'D5 - - - . . . .']},
      arp:{voice:'arp',bars:CENTRO_CHORDS.map(chord=>x4(CENTRO[chord].arp))},
      pad:{voice:'pad',level:.8,bars:centroBars('pad')}
    },
    drums:{
      kick:['x.....x...x.....'],
      snare:['....x.......x...','....x.......x...','....x.......x...','....x.......x...','....x.......x...','....x.......x...','....x.......x...','....x.......x.ox'],
      hat:['o.x.o.x.o.x.o.x.','o.x.o.x.o.x.o.x.','o.x.o.x.o.x.o.x.','o.x.o.x.o.x.o.x.','o.x.o.x.o.x.o.x.','o.x.o.x.o.x.o.x.','o.x.o.x.o.x.o.x.','o.x.o.x.o.x.o.x.',
           'x.x.x.x.x.x.x.x.','x.x.x.x.x.x.x.x.','x.x.x.x.x.x.x.x.','x.x.x.x.x.x.x.x.','x.x.x.x.x.x.x.x.','x.x.x.x.x.x.x.x.','x.x.x.x.x.x.x.x.','x.x.x.x.x.x.x.X.']},
    // El Coloso: bombo a negras, caja con redobles, charles a semicorcheas y
    // acordes a contratiempo que empujan cada compás.
    boss:{tempo:1.08,
      drums:{kick:['x...x...x...x.x.'],snare:['....x.......x.xx'],hat:['xoxoxoxoxoxoxoXo']},
      layer:{voice:'stab',level:1.2,bars:CENTRO_CHORDS.map(chord=>'. '+CENTRO[chord].stab+' . '+CENTRO[chord].stab+' . '+CENTRO[chord].stab+' . '+CENTRO[chord].stab)}}
  };

  const VA='C5 . . A4 . . F#4 . . Eb4 . . C4 . . .',VB='Db5 . . Bb4 . . G4 . . E4 . . Db4 . . .';
  const vacio={
    id:'vacio',mission:7,title:'El Soberano del Vacío',character:'Espacial y disonante, con pulsos',
    key:'C',scale:'octatonic',tempo:84,bars:8, // pedal de C con tritonos: C C F# F# | Eb Eb A G
    echo:{steps:3,feedback:.5,mix:.5},
    tracks:{
      bass:{voice:'subBass',bars:[
        'C2 . C2 . C2 . C2 G2',    'C2 . C2 . C2 . C2 G2',    'F#2 . F#2 . F#2 . F#2 C3','F#2 . F#2 . F#2 . F#2 C3',
        'Eb2 . Eb2 . Eb2 . Eb2 Bb2','Eb2 . Eb2 . Eb2 . Eb2 Bb2','A2 . A2 . A2 . A2 E3',    'G2 . G2 . G2 . Db3 .']},
      lead:{voice:'flute',level:.75,echo:.5,bars:[
        '. . . . E5 - Eb5 -', 'C5 - - - - - . .',   '. . . . A4 - C5 -',  'Eb5 - - - - - . .',
        '. . . . G5 - F#5 -', 'Eb5 - - - Db5 - - -','. . E5 - Db5 - A4 -','Bb4 - - - F#4 - - .']},
      pad:{voice:'pad',bars:['G3+Db4','G3+E4','A3+Eb4','A3+C4','G3+Db4','G3+Bb3','G3+Db4','F#3+Bb3']},
      arp:{voice:'arp',level:.8,echo:.6,bars:[VA,VA,VA,VA,VA,VA,VA,VB]}
    },
    drums:{kick:['x..o....x..o....'],hat:['......o.......o.']},
    boss:{tempo:1.1,
      drums:{kick:['x..x..x.x..x..x.'],snare:['....x.......x..o'],hat:['o.xoo.xoo.xoo.xo']},
      layer:{voice:'stab',level:1.3,bars:['C4 C4 . C4 C4 . F#4 .','Eb4 Eb4 . Eb4 Eb4 . A4 .']}}
  };

  const nuevaYork={
    id:'nueva-york',mission:8,title:'Nueva York · La última batalla',character:'Final épico sobre el motivo de la misión 1',
    key:'D',scale:'minor',tempo:138,bars:12, // Dm Dm Bb C | Dm F Gm Am || F C Bb C
    tracks:{
      bass:{voice:'bass',bars:[
        'D2 D2 A2 D2 D2 D2 A2 D2','D2 D2 A2 D2 D2 D2 A2 D2','Bb2 Bb2 F3 Bb2 Bb2 Bb2 F3 Bb2','C3 C3 G3 C3 C3 C3 G3 C3',
        'D2 D2 A2 D2 D2 D2 A2 D2','F2 F2 C3 F2 F2 F2 C3 F2','G2 G2 D3 G2 G2 G2 D3 G2',      'A2 A2 E3 A2 A2 A2 E3 A2',
        'F2 F2 C3 F2 F2 F2 C3 F2','C3 C3 G3 C3 C3 C3 G3 C3','Bb2 Bb2 F3 Bb2 Bb2 Bb2 F3 Bb2','C3 C3 G3 C3 C3 C3 G3 C3']},
      // El motivo de «La obra», una octava arriba, y un puente en el relativo mayor.
      lead:{voice:'lead',transpose:12,bars:[...OBRA_LEAD,
        'F4 - A4 C5 - - Bb4 C5','E4 - - D4 C4 - G3 -','D4 - F4 - - E4 D4 -','E4 - - C4 G3 - C4 E4']},
      arp:{voice:'arp',bars:[
        x4('D4 F4 A4 F4'),x4('D4 F4 A4 F4'),x4('D4 F4 Bb4 F4'),x4('C4 E4 G4 E4'),
        x4('D4 F4 A4 F4'),x4('C4 F4 A4 F4'),x4('D4 G4 Bb4 G4'),x4('C4 E4 A4 E4'),
        x4('C4 F4 A4 F4'),x4('C4 E4 G4 E4'),x4('D4 F4 Bb4 F4'),x4('C4 E4 G4 E4')]}
    },
    drums:{kick:['x...x...x...x...'],snare:['....x.......x...','....x.......x...','....x.......x...','....x.......x.xx'],hat:['x.x.x.x.x.x.x.x.']},
    boss:{tempo:1.08,
      drums:{kick:['x..xx...x..xx.x.'],snare:['....x.......x.xx'],hat:['xoxoxoxoxoxoxoxo']},
      layer:{voice:'pad',bars:[
        'D4+F4+A4','D4+F4+A4','D4+F4+Bb4','C4+E4+G4',
        'D4+F4+A4','C4+F4+A4','D4+G4+Bb4','C4+E4+A4',
        'C4+F4+A4','C4+E4+G4','D4+F4+Bb4','C4+E4+G4']}}
  };

  const QA='G3+C4+E4',QD='F#3+A3+C4',QE='G3+B3+E4';
  const funk=chord=>'. '+chord+' . '+chord+' . . '+chord+' .';
  const quimera={
    id:'quimera',page:'quimera',title:'Quimera',character:'Callejero, de pelea a puñetazos',
    key:'A',scale:'dorian',tempo:116,bars:8, // Am7 Am7 D7 D7 | Am7 Am7 C·D Em
    tracks:{
      bass:{voice:'bass',bars:[
        'A2 . . A2 . A2 C3 . A2 . . G2 A2 . E2 G2','A2 . . A2 . A2 C3 . A2 . . G2 A2 . E2 G2',
        'D3 . . D3 . D3 F#3 . D3 . . C3 D3 . A2 C3','D3 . . D3 . D3 F#3 . D3 . . C3 D3 . A2 C3',
        'A2 . . A2 . A2 C3 . A2 . . G2 A2 . E2 G2','A2 . . A2 . A2 C3 . A2 . . G2 A2 . E2 G2',
        'C3 . . C3 . C3 E3 . D3 . . D3 . D3 F#3 .','E3 . . E3 . E3 G3 . E3 . D3 . B2 . G2 .']},
      lead:{voice:'lead',bars:[
        'A4 . C5 . D5 - E5 . . D5 C5 . A4 - . .', 'G4 . A4 . C5 - A4 . . . . . . . E4 G4',
        'A4 . . F#4 . A4 . D5 - - . C5 . A4 . .', 'F#4 . A4 . C5 - A4 . . . . . . . . .',
        'A4 . C5 . D5 - E5 . . G5 E5 . D5 - . .', 'C5 . A4 . G4 - A4 . . . . . . . . .',
        'E5 . E5 . G5 - E5 . F#5 . F#5 . A5 - F#5 .','E5 - - D5 . B4 . G4 . E4 - . . . . .']},
      comp:{voice:'stab',bars:[
        funk(QA),funk(QA),funk(QD),funk(QD),
        funk(QA),funk(QA),'. '+QA+' . '+QA+' . . F#3+A3+D4 .',funk(QE)]}
    },
    drums:{kick:['x..x......x..x..'],snare:['....x..o.o..x...'],hat:['x.x.x.x.x.x.x.X.']},
    boss:{tempo:1.08,
      drums:{kick:['x..x..x...x..x.x'],snare:['....x..o.o..x.oo'],hat:['xoxoxoxoxoxoxoXo']},
      layer:{voice:'arp',level:1.1,bars:[
        'A3+E4 . . A3+E4 . . A3+E4 .','A3+E4 . . A3+E4 . . A3+E4 .','A3+D4 . . A3+D4 . . A3+D4 .','A3+D4 . . A3+D4 . . A3+D4 .',
        'A3+E4 . . A3+E4 . . A3+E4 .','A3+E4 . . A3+E4 . . A3+E4 .','G3+C4 . . G3+C4 . . A3+D4 .','B3+E4 . . B3+E4 . . B3+E4 .']}}
  };

  const fuga={
    id:'fuga',page:'fuga',title:'Fuga del Sol',character:'Synthwave de carretera costera',
    key:'F#',scale:'minor',tempo:112,bars:8, // F#m D A E ×2
    echo:{steps:3,feedback:.35,mix:.35},
    tracks:{
      bass:{voice:'subBass',bars:[
        'F#2 F#2 F#2 F#2 F#2 F#2 C#3 F#2','D3 D3 D3 D3 D3 D3 A2 D3','A2 A2 A2 A2 A2 A2 E3 A2','E2 E2 E2 E2 E2 E2 B2 E2']},
      lead:{voice:'lead',echo:.5,bars:[
        'C#5 - - - A4 - B4 C#5', 'F#5 - - - E5 - D5 -','E5 - - - C#5 - A4 -','B4 - - - - - G#4 B4',
        'C#5 - - - F#5 - E5 C#5','D5 - - - F#5 - A5 -','A5 - G#5 E5 - - C#5 -','B4 - - - E5 - G#5 -']},
      arp:{voice:'arp',echo:.3,bars:[x4('F#4 A4 C#5 A4'),x4('F#4 A4 D5 A4'),x4('E4 A4 C#5 A4'),x4('E4 G#4 B4 G#4')]}
    },
    drums:{kick:['x...x...x...x...'],snare:['....X.......X...'],hat:['o.x.o.x.o.x.o.x.']},
    boss:{tempo:1.08,
      drums:{kick:['x...x...x...x.x.'],snare:['....X.......X.oo'],hat:['xoxoxoxoxoxoxoXo']},
      layer:{voice:'arp',level:1.1,bars:[x4('F#3 C#4 F#3 C#4'),x4('D3 A3 D3 A3'),x4('A3 E4 A3 E4'),x4('E3 B3 E3 B3')]}}
  };

  const marea={
    id:'marea',mission:9,title:'Marea de hierro',character:'Bajo sincopado y arpegios de agua',key:'E',scale:'dorian',tempo:136,bars:8,
    tracks:{
      bass:{voice:'subBass',bars:['E2 . B2 D3 E3 - B2 .','A2 - E3 . C#3 . A2 B2','D3 . A2 D3 F#3 . E3 D3','B2 - F#3 B2 . D3 B2 .']},
      lead:{voice:'pluck',bars:['B4 . D5 E5 - B4 A4 .','C#5 E5 - . B4 A4 - .','A4 D5 F#5 - E5 D5 . A4','F#4 - A4 B4 - - . .','B4 D5 E5 G5 - F#5 E5 .','A4 . C#5 E5 F#5 E5 - .','D5 F#5 A5 - F#5 E5 D5 .','B4 - F#4 A4 B4 D5 E5 -']},
      arp:{voice:'arp',bars:[x4('E4 G4 B4 G4'),x4('A3 C#4 E4 C#4'),x4('D4 F#4 A4 F#4'),x4('B3 D4 F#4 D4')]}},
    drums:{kick:['x.....x.x.....x.'],snare:['....X..o....X...'],hat:['x.o.x.o.x.o.x.o.']},
    boss:{tempo:1.09,drums:{kick:['x..x..x.x..x..xx'],snare:['....X..o..o.X.oo'],hat:['xoxoxoxoxoxoxoXo']},layer:{voice:'stab',bars:['E4+B4 . . E4+B4 . . G4+B4 .','A3+E4 . . A3+E4 . . B3+F#4 .']}}
  };
  const cenit={
    id:'cenit',mission:10,title:'Último vector',character:'Fanfarria aérea de dos voces',key:'A',scale:'minor',tempo:148,bars:8,
    tracks:{
      bass:{voice:'bass',bars:['A2 - E3 A2 . G3 E3 .','F2 - C3 F3 - C3 A2 .','C3 . G3 C3 E3 - G3 .','G2 - D3 G3 - B2 D3 .']},
      lead:{voice:'lead',bars:['E5 - A5 - G5 E5 C5 -','F5 - C5 A4 - C5 D5 .','E5 G5 - E5 - D5 C5 .','B4 D5 G5 - D5 B4 - .','A4 C5 E5 A5 - G5 E5 -','F5 - A5 G5 F5 E5 C5 .','E5 - G5 C6 - B5 G5 E5','D5 B4 G4 B4 A4 - - -']},
      arp:{voice:'arp',bars:[x4('A3 E4 C4 E4'),x4('F3 C4 A3 C4'),x4('C4 G4 E4 G4'),x4('G3 D4 B3 D4')]}},
    drums:{kick:['x..x....x.x.....'],snare:['....X.......X.o.'],hat:['x.x.o.x.x.x.o.x.']},
    boss:{tempo:1.08,drums:{kick:['x..x..x.x.xx..xx'],snare:['....X.oo....X.oo'],hat:['xoxoxoxoxoxoxoXo']},layer:{voice:'stab',bars:['A3+E4 . A3+E4 . . E4+A4 . .','F3+C4 . . F3+C4 . G3+D4 . .']}}
  };
  const themes=[obra,umbral,aire,carretera,abismo,centro,vacio,nuevaYork,quimera,fuga,marea,cenit];
  // Compás de acción, respuesta instrumental y cadencia de llegada escrita para cada misión.
  // Los espacios separan los cuatro tiempos del patrón de bombo.
  const arrangements={
    obra:{voice:'stab',pulse:'X... ..x. x..o ..x.',answer:[2,7,10],fill:[10,14,15],cadence:['A4 . D5 - C5 A4 F4 A4','D5 - - - A4 - D5 -']},
    umbral:{voice:'pluck',pulse:'X..o .... x.x. ...o',answer:[0,6,12],fill:[9,11,14,15],cadence:['G3 C4 Eb4 - D4 - Bb3 G3','C4 - G4 - Eb4 - C4 -']},
    aire:{voice:'stab',pulse:'X... x..o x.x. x...',answer:[0,7,12],fill:[10,13,15],cadence:['D5 G5 - F#5 E5 D5 B4 D5','G5 - - - D5 - G5 -']},
    carretera:{voice:'lead',pulse:'X... x.x. x... x.ox',answer:[3,6,11,14],fill:[11,13,14,15],cadence:['B4 . E5 G5 F#5 E5 D5 B4','E5 - B4 E5 - - - .']},
    abismo:{voice:'pluck',pulse:'x... .... ..o. x...',answer:[3,11],fill:[10,15],cadence:['F#4 - A4 - G4 F#4 D4 .','B3 - - F#4 B4 - - -']},
    centro:{voice:'stab',pulse:'X... ..x. x..x ..o.',answer:[2,6,10,14],fill:[11,14,15],cadence:['D4 . G4 Bb4 . A4 G4 D4','G4 - Bb4 - D5 - G4 -']},
    vacio:{voice:'pluck',pulse:'X..o ..x. ..x. .o..',answer:[1,7,13],fill:[8,11,15],cadence:['G4 Bb4 . A4 F#4 - Eb4 Db4','C4 - - G4 C5 - - -']},
    'nueva-york':{voice:'stab',pulse:'X... x.x. x..o x.x.',answer:[0,6,10,14],fill:[9,11,14,15],cadence:['D5 F5 A5 - G5 A5 F5 E5','D5 - A4 D5 - - - -']},
    marea:{voice:'pluck',pulse:'X... .ox. x... .ox.',answer:[1,6,11],fill:[10,13,15],cadence:['B4 D5 E5 G5 F#5 E5 D5 B4','E5 - B4 - E5 - - -']},
    cenit:{voice:'stab',pulse:'X..x ..x. x.x. ..x.',answer:[0,5,10,14],fill:[9,12,14,15],cadence:['E5 A5 G5 E5 C5 D5 E5 G5','A5 - E5 - A4 - - -']},
    quimera:{voice:'pluck',pulse:'X..x ..o. ..x. x..o',answer:[3,6,9,14],fill:[9,12,15],cadence:['E4 G4 . A4 C5 B4 . G4','A4 . E4 G4 A4 - - -']},
    fuga:{voice:'arp',pulse:'X... x..x x... x.x.',answer:[2,7,11,14],fill:[10,13,14,15],cadence:['C#5 - F#5 A5 G#5 F#5 E5 C#5','F#5 - A5 - F#5 - - -']}
  };
  function arrangementFor(theme){
    const root=theme.key+'4';
    return arrangements[theme.id]||{voice:'pluck',pulse:'x... ..o. x... ..x.',answer:[2,10],fill:[14,15],cadence:[root+' - . '+root,root+' - - -']};
  }
  // Acepta un tema, su id, el número de misión o el nombre de la página.
  function themeFor(value){
    if(value&&typeof value==='object')return value;
    return themes.find(t=>t.id===value||t.page===value||(typeof value==='number'&&t.mission===value))||null;
  }

  // ───────────────────── Compilación de los compases ─────────────────────
  const compiled=new WeakMap();
  function instrumentsOf(theme){
    const list=[];
    const add=(name,track)=>{
      const base=VOICES[track.voice];if(!base)throw new Error(theme.id+': timbre desconocido «'+track.voice+'» en '+name);
      const inst=Object.assign({},base,{name,voice:track.voice,slot:list.length,gain:base.gain*(track.level??1),echo:track.echo||0,transpose:track.transpose||0});
      if(track.wave)inst.wave=track.wave;if(track.cutoff)inst.cutoff=track.cutoff;if(track.gate)inst.gate=track.gate;
      list.push(inst);return inst;
    };
    for(const name of Object.keys(theme.tracks||{}))add(name,theme.tracks[name]);
    if(theme.boss?.layer)add('capa',theme.boss.layer);
    add('respuesta',{voice:arrangementFor(theme).voice,level:.65});
    for(const name of DRUMS)if(theme.drums?.[name]||theme.boss?.drums?.[name])add(name,{voice:name});
    return list;
  }
  function build(theme,mode,instruments){
    const boss=mode==='boss',combat=mode==='combat',victory=mode==='victory',score=arrangementFor(theme);
    const beats=theme.beats||4,div=theme.div||4,stepsPerBar=beats*div,totalSteps=stepsPerBar*theme.bars;
    const tempo=theme.tempo*(boss?theme.boss?.tempo||1:combat?1.045:victory?.92:1),steps=new Array(totalSteps).fill(null);let count=0;
    const bySlot=name=>instruments.find(i=>i.name===name);
    const put=event=>{(steps[event.step]||(steps[event.step]=[])).push(event);count++;};
    const melodic=(inst,bars)=>{
      let held=null;
      for(let bar=0;bar<theme.bars;bar++){
        const tokens=String(bars[bar%bars.length]).trim().split(/\s+/),span=stepsPerBar/tokens.length;
        if(!Number.isInteger(span))throw new Error(theme.id+'/'+inst.name+': el compás '+(bar+1)+' tiene '+tokens.length+' símbolos y no reparte '+stepsPerBar+' pasos');
        for(let i=0;i<tokens.length;i++){
          const token=tokens[i];
          if(token==='.'){held=null;continue;}
          if(token==='-'){if(held)for(const e of held)e.len+=span;continue;}
          held=token.split('+').map(name=>{
            const midi=noteToMidi(name);if(midi===null)throw new Error(theme.id+'/'+inst.name+': nota no válida «'+name+'» en el compás '+(bar+1));
            const event={inst,step:bar*stepsPerBar+i*span,len:span,midi:midi+inst.transpose,frequency:midiToFrequency(midi+inst.transpose),level:1};
            put(event);return event;
          });
        }
      }
    };
    const percussion=(inst,bars)=>{
      for(let bar=0;bar<theme.bars;bar++){
        const cells=String(bars[bar%bars.length]).replace(/\s+/g,''),span=stepsPerBar/cells.length;
        if(!Number.isInteger(span))throw new Error(theme.id+'/'+inst.name+': el compás '+(bar+1)+' tiene '+cells.length+' golpes y no reparte '+stepsPerBar+' pasos');
        for(let i=0;i<cells.length;i++){
          if(cells[i]==='.')continue;
          const level=HIT[cells[i]];if(!level)throw new Error(theme.id+'/'+inst.name+': golpe no válido «'+cells[i]+'»');
          put({inst,step:bar*stepsPerBar+i*span,len:1,midi:null,frequency:0,level});
        }
      }
    };
    if(victory){
      const root=theme.key;
      const melody=score.cadence.slice(),bass=[root+'3 - . .',root+'3 - - -'];
      // After the cadence, slow the original tune down to two notes per bar over its own harmony.
      const pitches=(track,bar)=>track.bars[bar%track.bars.length].match(/[A-G][#b]?-?\d/g)||[];
      for(let bar=2;bar<theme.bars;bar++){
        const phrase=bar-2,notes=pitches(theme.tracks.lead,phrase);
        melody.push(!notes.length||phrase%4===3?'.':notes[0]+' - '+notes[Math.floor(notes.length/2)]+' -');
        bass.push((pitches(theme.tracks.bass,phrase)[0]||root+'3')+' - - -');
      }
      melodic(bySlot('lead'),melody);melodic(bySlot('bass'),bass);
      const fifth=noteToMidi(root+'3')+7;
      put({inst:bySlot('respuesta'),step:stepsPerBar+8,len:4,midi:fifth,frequency:midiToFrequency(fifth),level:.7});
      if(bySlot('kick'))percussion(bySlot('kick'),Array.from({length:theme.bars},(_,bar)=>bar===0?'X... ..o. .... ..x.':bar===1?'X... .... .... ....':'....'));
      for(const list of steps.slice(2*stepsPerBar))for(const note of list||[])note.level*=.68;
    }else for(const name of Object.keys(theme.tracks||{}))melodic(bySlot(name),theme.tracks[name].bars);
    if(boss&&theme.boss?.layer)melodic(bySlot('capa'),theme.boss.layer.bars);
    const drums=boss?Object.assign({},theme.drums,theme.boss?.drums):theme.drums||{};
    if(!victory){
      for(const name of DRUMS)if(drums[name]){
        percussion(bySlot(name),combat&&name==='kick'?[score.pulse]:drums[name]);
      }
      if(combat||boss){
        for(let bar=0;bar<theme.bars;bar++){
          const start=bar*stepsPerBar;
          // Answer alternate phrases using pitches from the bass line at that exact beat.
          // The upper line stays inside the local harmony, including the octatonic space theme.
          if(combat&&bar%4!==0){
            let bass;
            for(let k=0;k<stepsPerBar;k++){
              const line=steps[start+k]?.find(e=>e.inst.name==='bass');if(line)bass=line;
              if(!bass||!score.answer.includes(k))continue;
              const midi=bass.midi+12;
              put({inst:bySlot('respuesta'),step:start+k,len:bar%4===3?1:2,midi,frequency:midiToFrequency(midi),level:k%4?.76:1});
            }
          }
          if(bar%4===3){
            const drum=bySlot('snare')||bySlot('hat');
            for(const k of score.fill){
              const step=start+k;
              if(drum&&!steps[step]?.some(e=>e.inst===drum))put({inst:drum,step,len:1,midi:null,frequency:0,level:(boss?.62:.42)+k*.02});
            }
          }
        }
      }
      // Let the melody breathe across four-bar phrases. Offbeats remain lighter than downbeats.
      for(const list of steps)for(const note of list||[])if(note.midi!==null){
        const phrase=Math.floor(note.step/stepsPerBar)%4;
        note.level*=([.88,.95,1,.91][phrase])*(note.step%div?.88:1);
      }
    }
    return{id:theme.id,theme,mode,boss,tempo,beats,div,bars:theme.bars,stepsPerBar,stepsPerBeat:div,totalSteps,loopStart:victory?stepsPerBar*2:0,stepSeconds:60/tempo/div,steps,count,instruments};
  }
  // Secuencia lista para el planificador: steps[n] = notas que empiezan en el paso n.
  // Se calcula una vez por tema y variación; el planificador no crea objetos.
  function compile(theme,variation=false){
    theme=themeFor(theme);if(!theme)return null;
    let entry=compiled.get(theme);
    if(!entry){entry={instruments:instrumentsOf(theme),calm:null,boss:null};compiled.set(theme,entry);}
    const mode=variation===true?'boss':variation||'explore';
    if(!['explore','combat','boss','victory'].includes(mode))throw new Error('Arreglo musical desconocido: '+mode);
    return entry[mode]||(entry[mode]=build(theme,mode,entry.instruments));
  }
  // Patrón de un compás: [{step,track,voice,midi,frequency,len,level}] en orden.
  function barEvents(theme,bar,boss=false){
    const seq=compile(theme,boss);if(!seq)return[];
    const index=((bar%seq.bars)+seq.bars)%seq.bars,from=index*seq.stepsPerBar,out=[];
    for(let step=0;step<seq.stepsPerBar;step++)for(const e of seq.steps[from+step]||[])out.push({step,track:e.inst.name,voice:e.inst.voice,midi:e.midi,frequency:e.frequency,len:e.len,level:e.level});
    return out;
  }
  // Suma de picos por pista (acordes incluidos): cota del nivel antes del bus.
  function peak(seq){
    const top=new Map();
    for(const list of seq.steps)if(list){const here=new Map();for(const e of list)here.set(e.inst,(here.get(e.inst)||0)+e.inst.gain*e.level);for(const [inst,g] of here)top.set(inst,Math.max(top.get(inst)||0,g));}
    let sum=0;for(const g of top.values())sum+=g;return sum;
  }
  // Comprobación de un tema; devuelve la lista de problemas (vacía si es válido).
  function validate(theme){
    const errors=[];let calm,boss;
    if(!theme.id||!theme.title)errors.push('falta id o título');
    if(!(theme.tempo>=50&&theme.tempo<=200))errors.push('tempo fuera de 50–200');
    if(!(Number.isInteger(theme.bars)&&theme.bars>=8&&theme.bars<=16))errors.push('el bucle debe tener 8–16 compases');
    const scale=scaleNotes(theme.key,theme.scale);if(!scale.length)errors.push('tonalidad o escala desconocida');
    if(!(theme.boss?.tempo>=1.08&&theme.boss?.tempo<=1.1))errors.push('la variación de jefe debe subir el tempo un 8–10 %');
    try{calm=build(theme,'explore',instrumentsOf(theme));boss=build(theme,'boss',instrumentsOf(theme));}catch(error){errors.push(error.message);return errors;}
    for(const seq of [calm,boss])for(const list of seq.steps)for(const e of list||[]){
      if(e.midi===null)continue;
      if(!scale.includes(((e.midi%12)+12)%12))errors.push(e.inst.name+': nota fuera de la escala (midi '+e.midi+', paso '+e.step+')');
      if(e.frequency<60||e.frequency>2100)errors.push(e.inst.name+': nota fuera del rango audible útil (midi '+e.midi+')');
    }
    const drumHits=seq=>seq.steps.reduce((n,list)=>n+(list||[]).filter(e=>e.midi===null).length,0);
    if(!(drumHits(boss)>drumHits(calm)))errors.push('la variación de jefe debe añadir percusión');
    if(!boss.steps.some(list=>(list||[]).some(e=>e.inst.name==='capa')))errors.push('la variación de jefe debe añadir una capa');
    for(const inst of calm.instruments)if(inst.gain>.3)errors.push(inst.name+': volumen por voz demasiado alto');
    if(peak(boss)>1)errors.push('la suma de voces supera el techo de mezcla');
    return errors;
  }

  // ──────────────────────────── Planificador ────────────────────────────
  // Reloj puro: tick(ahora, emitir) entrega cada nota una sola vez, en orden,
  // con su instante exacto, hasta `lookahead` segundos por delante. Si el reloj
  // salta (pestaña en segundo plano, pausa larga), descarta los pasos perdidos y
  // sigue en la misma cuadrícula en vez de disparar el atraso.
  function createTransport({lookahead=LOOKAHEAD}={}){
    let seq=null,pending=null,step=0,time=0,started=false,skipped=0;
    function advance(n){
      const next=step+n,loop=seq.loopStart||0;
      step=next<seq.totalSteps?next:loop+(next-seq.totalSteps)%(seq.totalSteps-loop);
    }
    function enter(sequence){
      if(!seq||seq.id!==sequence.id||seq.mode!==sequence.mode&&(seq.mode==='victory'||sequence.mode==='victory'))step=0;
      seq=sequence;pending=null;
    }
    return{
      start(sequence,at){enter(sequence);time=at;started=true;},
      // Cambia de variación (calma ↔ jefe) en el siguiente tiempo del compás.
      use(sequence){if(!started||!seq||seq.id!==sequence.id||seq.totalSteps!==sequence.totalSteps)enter(sequence);else pending=sequence===seq?null:sequence;},
      stop(){started=false;},
      reset(){started=false;seq=null;pending=null;step=0;},
      tick(now,emit){
        if(!started||!seq)return 0;
        if(time<now){const missed=Math.ceil((now-time)/seq.stepSeconds);advance(missed);time+=missed*seq.stepSeconds;skipped+=missed;}
        const horizon=now+lookahead;let emitted=0;
        while(time<horizon){
          if(pending&&step%seq.stepsPerBeat===0)enter(pending);
          const list=seq.steps[step];
          if(list)for(let i=0;i<list.length;i++){emit(list[i],time,seq.stepSeconds);emitted++;}
          time+=seq.stepSeconds;advance(1);
        }
        return emitted;
      },
      state(){return{started,step,time,skipped,sequence:seq};}
    };
  }

  // ─────────────────────────── Volumen guardado ───────────────────────────
  function readVolume(storage){
    try{const saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');if(saved&&Number.isFinite(Number(saved.volume)))return clamp(Number(saved.volume),0,1);}catch{}
    return DEFAULT_VOLUME;
  }
  function writeVolume(storage,volume){
    try{if(!storage)return false;storage.setItem(STORAGE_KEY,JSON.stringify({volume:clamp(Number(volume)||0,0,1)}));return true;}catch{return false;}
  }

  // ──────────────────────────── Página y DOM ────────────────────────────
  // Misión de la página: #main-menu[data-mission] o, en los especiales, su nombre.
  function detectTheme(doc,location){
    let mission=0;try{mission=Number(doc?.getElementById('main-menu')?.dataset?.mission)||0;}catch{}
    if(mission>=1&&mission<=10)return themeFor(mission);
    const path=String(location?.pathname||'');
    return /quimera/i.test(path)?quimera:/fuga/i.test(path)?fuga:null;
  }
  // Deslizador «Volumen de música»: hermano del bloque de efectos en #menu-sound.
  // Solo se inserta cuando el bloque de efectos ya está ahí: antes de eso los
  // motores lo buscan con querySelector('.sound-controls') y no debe encontrar este.
  function mountSlider(doc,host,player,Observer){
    if(doc.getElementById('music-volume'))return null;
    const block=doc.createElement('div'),label=doc.createElement('label'),output=doc.createElement('output'),input=doc.createElement('input');
    block.className='sound-controls music-controls';
    label.htmlFor='music-volume';output.id='music-level';label.append('Volumen de música ',output);
    input.id='music-volume';input.type='range';input.min='0';input.max='100';input.step='5';input.setAttribute('aria-label','Volumen de música');
    block.append(label,input);
    const show=()=>{input.value=String(Math.round(player.status().volume*100));output.textContent=input.value==='0'?'Sin música':input.value+'%';};
    input.addEventListener('input',()=>{player.setVolume(Number(input.value)/100);player.preview();show();});
    const place=()=>{
      if(block.parentNode===host&&host.lastElementChild===block)return;
      if(Array.prototype.some.call(host.children,child=>child!==block&&/(^|\s)sound-controls(\s|$)/.test(child.className||'')))host.append(block);
    };
    show();place();
    if(Observer)new Observer(place).observe(host,{childList:true});
    return{block,input,output,show,place};
  }

  // ───────────────────────────── Reproductor ─────────────────────────────
  function create(options={}){
    let storage=options.storage;
    if(storage===undefined)try{storage=root.localStorage;}catch{}
    const timers=options.timers||root;
    const doc=options.document===undefined?root.document:options.document;
    const Observer=options.MutationObserver===undefined?root.MutationObserver:options.MutationObserver;
    let context=null,destination=null,noise=null,pulse=null,bus=null;
    let theme=options.theme===undefined?detectTheme(doc,options.location||root.location):themeFor(options.theme);
    let volume=readVolume(storage),muted=false,running=false,hidden=false,mode='explore',previewing=false;
    let followsGame=false,scanIn=0,combatHold=0;
    let playing=false,timer=null,teardownTimer=null,previewTimer=null,hits=0;
    const transport=createTransport(),active=new Set();

    function ramp(param,value,seconds){const now=context.currentTime;param.cancelScheduledValues(now);param.setTargetAtTime(value,now,seconds/4);}
    function finish(node){if(!active.delete(node))return;try{node.disconnect();node.envelope.disconnect();}catch{}}
    function ended(){finish(this);}
    function track(node,envelope,end){node.envelope=envelope;node.end=end;node.onended=ended;active.add(node);}

    // Bus: pistas → suma → fundido → volumen → salida. Vive solo mientras suena.
    function buildBus(seq){
      const c=context,nodes=[],make=node=>{nodes.push(node);return node;};
      const sum=make(c.createGain()),fade=make(c.createGain()),level=make(c.createGain());
      fade.gain.value=0;level.gain.value=volume*MIX;
      sum.connect(fade);fade.connect(level);level.connect(destination);
      let delay=null,send=null;
      if(theme.echo&&c.createDelay){
        delay=make(c.createDelay(2));send=make(c.createGain());
        const tone=make(c.createBiquadFilter()),feedback=make(c.createGain()),wet=make(c.createGain());
        delay.delayTime.value=theme.echo.steps*seq.stepSeconds;tone.type='lowpass';tone.frequency.value=2400;feedback.gain.value=theme.echo.feedback;wet.gain.value=theme.echo.mix;
        send.connect(delay);delay.connect(tone);tone.connect(feedback);feedback.connect(delay);tone.connect(wet);wet.connect(sum);
      }
      const inputs=seq.instruments.map(inst=>{
        const input=make(c.createGain());let out=input;
        const shape=inst.drum==='snare'?['bandpass',2200,.5]:inst.drum==='hat'?['highpass',7500,.7]:inst.drum?null:['lowpass',inst.cutoff,.7];
        if(shape){const filter=make(c.createBiquadFilter());filter.type=shape[0];filter.frequency.value=shape[1];filter.Q.value=shape[2];input.connect(filter);out=filter;}
        const pan={arp:-.22,pad:-.14,comp:-.18,hat:.18,respuesta:.28,capa:.16}[inst.name];
        if(pan&&c.createStereoPanner){const stereo=make(c.createStereoPanner());stereo.pan.value=pan;out.connect(stereo);out=stereo;}
        out.connect(sum);
        if(inst.echo&&send){const amount=make(c.createGain());amount.gain.value=inst.echo;out.connect(amount);amount.connect(send);}
        return input;
      });
      return{nodes,fade,level,delay,inputs};
    }
    function teardown(){
      teardownTimer=null;
      for(const node of [...active]){try{node.onended=null;node.stop();}catch{}finish(node);}
      if(bus){for(const node of bus.nodes)try{node.disconnect();}catch{}bus=null;}
    }
    function pulseWave(){
      if(pulse||!context.createPeriodicWave)return pulse;
      // Onda de pulso al 25 %: el timbre nasal de las consolas de 8 bits.
      const real=new Float32Array(33),imag=new Float32Array(33);
      for(let n=1;n<33;n++)real[n]=2*Math.sin(n*Math.PI*.25)/(n*Math.PI);
      try{pulse=context.createPeriodicWave(real,imag);}catch{pulse=null;}
      return pulse;
    }
    function noiseBuffer(){
      if(noise)return noise;
      noise=context.createBuffer(1,context.sampleRate,context.sampleRate);const data=noise.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      return noise;
    }
    function emit(event,time,stepSeconds){
      const inst=event.inst,input=bus.inputs[inst.slot],peak=inst.gain*event.level,envelope=context.createGain(),gain=envelope.gain;let node,end;
      // Lay the Quimera backbeat slightly behind the grid and let the funk guitar answer it.
      if(theme.id==='quimera'&&(inst.name==='snare'||inst.name==='comp')&&event.step%8!==0)time+=stepSeconds*.09;
      if(inst.drum==='kick'){
        node=context.createOscillator();node.type='sine';node.frequency.setValueAtTime(150,time);node.frequency.exponentialRampToValueAtTime(46,time+.1);end=time+.2;
        gain.setValueAtTime(0,time);gain.linearRampToValueAtTime(peak,time+.002);gain.exponentialRampToValueAtTime(.0001,end);
      }else if(inst.drum){
        node=context.createBufferSource();node.buffer=noiseBuffer();end=time+(inst.drum==='snare'?.15:event.level>1?.16:.04);
        gain.setValueAtTime(0,time);gain.linearRampToValueAtTime(peak,time+.001);gain.exponentialRampToValueAtTime(.0001,end);
      }else{
        node=context.createOscillator();
        if(inst.wave==='pulse'&&pulseWave())node.setPeriodicWave(pulse);else node.type=inst.wave==='pulse'?'square':inst.wave;
        node.frequency.setValueAtTime(event.frequency,time);
        const length=event.len*stepSeconds,attack=Math.min(inst.attack,length*.5),off=time+Math.max(attack,length*inst.gate);end=off+inst.release*2;
        gain.setValueAtTime(0,time);gain.linearRampToValueAtTime(peak,time+attack);gain.setTargetAtTime(peak*inst.sustain,time+attack,inst.decay/3);gain.setTargetAtTime(0,off,inst.release/3);
      }
      node.connect(envelope);envelope.connect(input);track(node,envelope,end+.02);
      if(inst.drum&&inst.drum!=='kick')node.start(time,(hits++*.173)%.8);else node.start(time);
      node.stop(end+.02);
    }
    function tick(){if(!playing)return;try{transport.tick(context.currentTime,emit);}catch{}}
    function begin(){
      const seq=compile(theme,mode);
      if(teardownTimer!==null){timers.clearTimeout(teardownTimer);teardownTimer=null;}
      if(!bus)bus=buildBus(seq);
      ramp(bus.fade.gain,1,FADE_IN);ramp(bus.level.gain,volume*MIX,.08);
      transport.start(seq,context.currentTime+START_DELAY);
      playing=true;timer=timers.setInterval(tick,INTERVAL_MS);tick();
    }
    function end(){
      playing=false;timers.clearInterval(timer);timer=null;transport.stop();
      const cut=context.currentTime+FADE_OUT;ramp(bus.fade.gain,0,FADE_OUT);
      for(const node of active)if(node.end>cut){try{node.stop(cut);}catch{}node.end=cut;}
      teardownTimer=timers.setTimeout(teardown,(FADE_OUT+.1)*1000);
    }
    // Único punto de decisión: suena si hay contexto, tema, volumen y el juego corre.
    function sync(){
      const wanted=!!context&&!!theme&&!muted&&volume>0&&!hidden&&(running||previewing);
      try{if(wanted&&!playing)begin();else if(!wanted&&playing)end();}catch{playing=false;}
      return playing;
    }

    // El motor de efectos entrega su contexto (ya desbloqueado) y su búfer de ruido.
    function attach(audioContext,sharedNoise,output){
      if(!audioContext)return false;
      if(context!==audioContext){if(context){if(playing)try{end();}catch{}try{teardown();}catch{}}context=audioContext;pulse=null;noise=null;transport.reset();}
      destination=output||audioContext.destination;if(sharedNoise&&!noise)noise=sharedNoise;
      return sync();
    }
    function setRunning(value){value=!!value;if(running===value)return;running=value;sync();}
    function setMuted(value){value=!!value;if(muted===value)return;muted=value;sync();}
    function setVolume(value){
      volume=clamp(Number(value)||0,0,1);writeVolume(storage,volume);
      if(bus&&volume>0)try{ramp(bus.level.gain,volume*MIX,.08);}catch{}
      sync();
    }
    function setMode(next){
      if(mode===next)return;
      mode=next;
      if(!playing)return;
      const seq=compile(theme,mode);transport.use(seq);
      if(bus.delay)try{bus.delay.delayTime.setTargetAtTime(theme.echo.steps*seq.stepSeconds,context.currentTime,.3);}catch{}
    }
    function setBoss(value){setMode(value?'boss':'explore');}
    function follow(dt,p,field,{victory=false,boss=false,quiet=false,pressure=false}={}){
      followsGame=true;
      if(victory||quiet||boss){
        combatHold=boss?2:0;scanIn=0;
        setMode(victory?'victory':quiet?'explore':'boss');return;
      }
      combatHold=Math.max(0,combatHold-dt);scanIn-=dt;
      if(pressure)combatHold=3;
      if(scanIn<=0){
        scanIn=.18;
        if(p&&field){
          const near=(actor,w,h)=>Math.abs(actor.x-p.x)<w&&Math.abs(actor.y-p.y)<h;
          const hostile=field.bullets?.some(b=>b.enemy&&b.life>0&&!b.visualOnly&&near(b,420,165));
          let nearby=0;
          for(const n of field.enemies||[]){
            if(n.hp<=0||n.entry||n.phase==='dormant'||!near(n,430,140))continue;
            nearby++;
            if(near(n,200,90)||n.alert||n.flash>0||nearby>=2){combatHold=3;break;}
          }
          if(hostile||p.hurt>0)combatHold=3;
        }
      }
      setMode(combatHold>0?'combat':'explore');
    }
    function setTheme(value){
      const next=themeFor(value);if(next===theme)return;
      if(playing)try{end();}catch{}
      if(teardownTimer!==null){timers.clearTimeout(teardownTimer);}
      if(context)try{teardown();}catch{}
      theme=next;transport.reset();sync();
    }
    // Deja oír unos segundos el volumen elegido aunque el juego esté en pausa.
    function preview(ms=PREVIEW_MS){
      if(previewTimer!==null)timers.clearTimeout(previewTimer);
      previewing=true;previewTimer=timers.setTimeout(()=>{previewTimer=null;previewing=false;sync();},ms);sync();
    }
    function setHidden(value){value=!!value;if(hidden===value)return;hidden=value;sync();}
    function status(){return{theme:theme?theme.id:null,playing,running,muted,volume,boss:mode==='boss',mode,attached:!!context,voices:active.size,tempo:theme?compile(theme,mode).tempo:0};}
    const player={attach,setRunning,setMuted,setVolume,setBoss,setMode,follow,setTheme,setHidden,preview,status,slider:null};

    if(doc){
      try{
        hidden=!!doc.hidden;
        doc.addEventListener?.('visibilitychange',()=>setHidden(doc.hidden));
        // Variación de jefe: la barra de jefe pierde o recupera el atributo hidden.
        const bar=doc.getElementById('boss-hud')||doc.getElementById('boss-strip');
        if(bar){setBoss(!bar.hidden);if(Observer)new Observer(()=>{if(!followsGame)setBoss(!bar.hidden);}).observe(bar,{attributes:true,attributeFilter:['hidden']});}
        const host=doc.getElementById('menu-sound');
        if(host)player.slider=mountSlider(doc,host,player,Observer);
      }catch{}
    }
    api.current=player;
    return player;
  }

  const api={create,themes,themeFor,detectTheme,mountSlider,noteToMidi,midiToFrequency,noteToFrequency,scaleNotes,SCALES,VOICES,compile,barEvents,peak,validate,createTransport,readVolume,writeVolume,STORAGE_KEY,DEFAULT_VOLUME,LOOKAHEAD,INTERVAL_MS,FADE_IN,FADE_OUT,MIX,current:null};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ArcadeMusic=api;
})(typeof window!=='undefined'?window:globalThis);
