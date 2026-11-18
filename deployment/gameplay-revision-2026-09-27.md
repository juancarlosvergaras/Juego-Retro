# Revisión de jugabilidad — 27 de septiembre de 2026

Implementada localmente; pendiente de publicar en Mac mini. Versión pública anterior: 20260927T065743Z.

## Cambios

- Muro en x=4470 y grupo de edificios en x=4700: ya no hay una fachada entre el tanque y el jugador junto a la barrera. La barrera sigue cerrada hasta vencer al tanque y conserva el trato de guardados antiguos que ya estén más adelante.
- Salto con Shift del lobo: ocho poses propias a cuatro patas, seleccionadas por ascenso, cima, descenso y amortiguación. Comparten ambos niveles; se mantiene la trayectoria y el daño por caída.
- Embestida: espera propia de 0,75 s, separación de combos pendientes y memoria de pulsación de 180 ms mientras comienza a correr. Funciona con ataque o patada; golpea varios enemigos próximos una vez por embestida y se detiene contra obstáculos.
- Transformación: espera de cinco segundos, también en guardados antiguos. La animación sigue durando 1,2 s.
- Rayo: 0,7 s entre disparos; las mejoras de velocidad tienen un límite de 0,5 s. Conserva daño y munición ilimitada.
- Paracaídas: mantener ↓ / S, palanca del mando abajo o Descender en celular multiplica por tres el avance del descenso. Se conserva la animación al tocar el piso y no se aplica daño de caída. Ataques y cambios de forma siguen bloqueados durante la llegada.
- Carros: diez disparos por vehículo, estados visuales en 3, 6 y 10 impactos. Perdigones de un mismo disparo cuentan una vez; impacto y explosión de un misil tampoco duplican daño. Rayos también afectan al carro. Escombros sin colisión, daño persistente, y armas que estaban sobre el carro bajan con él.
- Carga: el menú inicial permite elegir perfil y misión sin solicitar sprites del nivel. Jugar, Continuar y selección de misión disparan su propia carga. Solicitudes simultáneas reutilizan la misma promesa; no se entra si falla y se puede reintentar.

## Validación

483 pruebas aprobadas en 88 archivos. Después del ajuste final de posición del guardia se repitieron las pruebas de jugabilidad y soldados especiales (18 aprobadas). Resultado automatizado completo en `tests/gameplay-revision-results.txt`; pruebas específicas en `tests/gameplay-revision.test.cjs`, `tests/menu-loading.test.cjs` y pruebas extendidas del runtime de misión 2. Incluye impactos reales en carros, muro vulnerable al cañón, salto en ambos sentidos, recuperación de embestida, carga diferida, guardado y descenso rápido sin daño.

Revisión en navegador sobre puerto aislado 4186, sin modificar los perfiles de 4173 ni el servidor público:

- Ambas pantallas principales mostraron cero solicitudes de sprites del nivel antes de Continuar.
- Continuar mostró el progreso de carga y abrió la misión; primera y segunda misión verificadas.
- Revisión visual de las ocho poses y doce imágenes de daño a escala del juego y con fondo contrastante: recortes sin poses vecinas ni fondos opacos.
- Muro visible en avenida, separado de las fachadas.
- En 390 × 844, Descender estaba habilitado durante el paracaídas y los ocho restantes botones de combate/herramientas deshabilitados. Palanca y controles fuera del escenario. No se dispone de una prueba con mando Xbox físico.

## Sprites y prompts

Modo: herramienta integrada `image_gen` (sin CLI). Se conservaron las imágenes originales y se copiaron las nuevas al proyecto; sus canales alfa se limpian con el mismo preparador de sprites ya usado por el juego.

### Vehículos

Archivo final: `C:/Juego Arcade/assets/sprites/carros-dano-v1.png`.
Referencia de estilo e identidad: `C:/Juego Arcade/assets/sprites/carros-destruidos-v1.png`.

Prompt:

> Create a production game sprite atlas, transparent background, no glow, no smoke, no text. Reference image is STYLE AND FOUR VEHICLE IDENTITIES reference, not background. Exactly 3 columns by 4 rows, evenly spaced fixed cells, wide canvas 1536 x 1024. Each vehicle side view facing right, same physical width and baseline in every cell. Row1 blue sedan, row2 rusty red pickup, row3 cream station wagon, row4 olive panel van. Columns progressive destruction: 1 additional bullet damage torn doors dented body still full height; 2 severe bullet damage collapsed roof, loose panels bent chassis lower height; 3 completely collapsed FLAT rubble pile chassis wheels and recognizable colored scraps only 20% original height. Maintain each car width ~450 pixels each cell, baseline near cell bottom, generous separation and zero overlapping cells. Detailed crisp pixel art consistent with reference, no soft airbrush, transparent cutouts.

### Lobo

Archivo final: `C:/Juego Arcade/assets/sprites/lobo-salto-carrera-v1.png`.
Referencia: `C:/Juego Arcade/assets/sprites/lobo-carrera-cuatro-patas-v1.png`.

Prompt:

> Production pixel art sprite sheet transparent background. Reference is exact character/style: grey werewolf amber eyes torn olive soldier uniform brown boots, FOUR LEGGED wolf sprinting. Create natural quadrupedal running JUMP cycle 8 poses exactly 4 columns 2 rows evenly spaced cells on 1536x1024 canvas. Every pose faces RIGHT and same size anatomy. Row1 poses: compress four legs launch, hindlegs pushing off frontarms lifting, airborne stretched horizontal leap, airborne tucked apex. Row2: extending frontpaws for descent, paws reaching ground hindlegs still raised, four paws low landing squash, recovered running stance. Continuous natural animal locomotion, no upright standing poses. Character ~340px wide ~220 high consistent proportions. All feet bottom baseline same cell-relative coordinate, body changes height naturally, complete tail and limbs inside own cell. Crisp pixel clusters hard black outline matching exact reference, no blur, no speed lines, no glow, no scenery, no text. Transparent cutouts.
