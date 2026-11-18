# Dirigible, jetpack MK II y zombi · 27 de septiembre de 2026

Implementación local pendiente de publicación en Mac mini.

## Cambios
- Zombi: salida anticipada del subsuelo con ↑ / W o la acción de salto (Espacio, A del mando o Emerger en celular). Conserva la salida automática a los tres segundos y busca terreno libre si hay escombros encima.
- Carrera con seis poses nuevas, avance de fotogramas según la distancia realmente recorrida, línea de suelo común y elevación de pies en la fase aérea.
- Impacto del rayo con seis fotogramas nuevos de electrocución, siguiendo al enemigo durante 0,48 s. No modifica daño ni cadencia.
- Torre de ocho pisos al final de la ciudad (x=9450), construida con piezas de la fachada existente a escala constante. Más alta que los otros edificios, con pisos y escaleras transitables.
- Dirigible de 800 px de ancho centrado sobre la mitad del mapa, con cubierta en y=-230 (850 px sobre la calle). Navegación y hélices animadas; cubierta estable y recompensa exclusiva.
- Jetpack MK II: desbloqueo permanente por perfil al aterrizar y recogerlo. Funciona en ambas misiones, para el soldado; velocidad normal 320 px/s y turbo 560 px/s. Conserva consumo de gasolina y controles existentes. Se muestra MK II ×2 junto a la gasolina; el modo desarrollador también lo habilita.
- Cámara conserva el encuadre del jugador al cambiar el tamaño de la ventana en zonas elevadas.

## Validación
Suite completa: 503 pruebas en 90 archivos, seguida de una prueba adicional y la repetición de los 38 casos del runtime de misión 2 tras el ajuste de encuadre. Total actual: 504 pruebas aprobadas.

Comprobaciones: el salto doble básico no alcanza la cubierta desde la torre; siete saltos disponibles o el jetpack básico sí permiten llegar. La recompensa exige estar sobre el dirigible, se guarda inmediatamente y sobrevive a reintentos y recargas. Velocidad doble verificada en ocho direcciones, salida subterránea segura y efectos de electrocución temporales.

Prueba visual aislada en navegador: carrera del zombi, salida anticipada, electrocución sobre un soldado, dirigible y recogida del jetpack con su sprite equipado. Fixture: tests/sky-expedition-preview.html, puerto 4186. No se modificaron los perfiles del juego habitual.

## Assets
Generados con la herramienta integrada image_gen, no con la API/CLI. Transparencia original conservada; escala y recortes controlados por el juego.
- C:/Juego Arcade/assets/sprites/zombi-carrera-v2.png
- C:/Juego Arcade/assets/sprites/electrocucion-v1.png
- C:/Juego Arcade/assets/sprites/jetpack-mk2-v1.png
- C:/Juego Arcade/assets/worlds/mission-02/dirigible-v1.png

Referencia de identidad para la carrera: C:/Juego Arcade/assets/sprites/zombi-soldado-v1.png.

## Prompts
### zombieRun

Create a transparent pixel-art game sprite sheet, ONE ROW of SIX distinct consecutive running animation frames of the EXACT SAME olive-uniform zombie soldier from the reference: olive WWII helmet, cyan glowing eyes, pale green corpse face, ragged olive jacket and trousers, brown boots and backpack. Reference only for character identity and palette. All six face RIGHT in pure side view, no perspective change. Full natural sprint cycle: left contact, left compression, left passing flight, right contact, right compression, right passing flight. Clear opposite leg/arm movement, alternating front/back legs, elbows bent, forward lean, compact natural strides, believable weight, NO dragging feet. The feet lift during flight. Same head size, body proportions and fixed hip pivot across every frame. Highly polished crisp 1990s military gothic game pixel art, strong dark outlines, deliberate visible pixel clusters, no blur, no anti-aliasing. Transparent background, no ground or shadows, no text. Six evenly spaced equal cells across a wide sheet, no overlaps, generous margins on every side. Uniform world height equivalent to existing 68px zombie; consistent scale through all frames.

### shock

Transparent pixel art SPRITE SHEET, six square cells in ONE HORIZONTAL ROW. Six consecutive frames of ELECTROCUTION HIT OVERLAY for a side-scroller soldier or zombie. ONLY cyan-white electrical arcs and tiny sparks wrapping around the contour of an INVISIBLE humanoid figure (no person drawn). Narrow roughly human body silhouette: crown spark, arcs across chest, two branching arms, two legs, feet sparks. Sequence: small contact flash, branching surge, full bright outline of electrical current, alternating branches, fading broken arcs, last few sparks. Center fixed, same 2:3 tall bounds all frames. Crisp discrete 1-3 pixel stair-stepped zigzag clusters, dark teal edging, cyan body, tiny ivory cores, no gradients no soft glow no blur. Should read like enemy convulsing with electrical energy when layered on any 50-80pixel tall character. Six equal cells, large empty gutters, transparent background, NO words, NO black background, NO character or bones.

### jetMk2

Transparent pixel art sprite sheet for a military gothic side scrolling action game. SIX equal cells in ONE horizontal row. SAME compact advanced wearable JETPACK viewed strictly from the soldier's left side facing RIGHT, dark olive body, brass protective rims, two slim steel cylinders with bright cyan core strips, two downward nozzle bells. No character, no straps extending far, no background or text. Fixed pack size and location every frame. Frame0 powered off, no exhaust, usable as collectible icon. Frame1 idle short cyan exhaust; frames2 and3 cruise medium blue-white exhaust distinctly flickering; frames4 and5 turbo long forked blue-white exhaust distinctly flickering. The pack body is identical in all six cells and exhaust extends beneath it. Very detailed sharp pixel clusters, dark outlines and weathered metal matching 1990s military arcade sprites, no smooth gradients, no blur, transparent. Body centered horizontally, its top at same level and nozzle bottoms at same level in all six cells; sufficient empty space beneath for turbo flames. Pack body proportions roughly 3 wide by 4 high and final game size approximately 22x31 pixels.

### airship

A single game-ready transparent pixel art sprite of a large military exploration DIRIGIBLE, broadside SIDE VIEW pointing RIGHT, for a detailed 1990s gothic war arcade platform game. Entire vessel fully visible, generous transparent margins. Long olive canvas gas envelope with brass ribs and subtle worn cream paneling, dark rudder fins at left, pointed nose at right. Beneath the envelope hangs a clearly separated long horizontal open wooden landing DECK with railings at the ends, a small enclosed cockpit on the right, suspension cables, two propeller engines. The walkable deck must be a perfectly horizontal straight top surface across its central 60%, unobstructed and clearly readable so a soldier can land there. A small brass equipment stand at deck center is EMPTY, no object on it. Dramatic polished hand-made pixel art, crisp intentional square pixel clusters, limited muted olive/brass/steel palette, dark outline, strong silhouette; no blur no photorealism no smooth gradients. No text, no sky, no ground, no shadow outside ship; true transparent background. Approximately 3:1 overall silhouette width to height. This is a stationary floating secret platform in the game.

