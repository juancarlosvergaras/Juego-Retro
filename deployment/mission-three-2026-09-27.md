# Misión 3 · Guerra en el Aire

Implementación local, pendiente de publicación. No se ha actualizado el Mac mini en este turno.

- Salida del mausoleo tras derrotar al rey: ↑ en la puerta inicia Misión 3. Transferencia de inventario, munición, puntos, poderes, mejoras y formas del perfil, con salud completa al comenzar.
- Cinemática de helicóptero de nueve segundos y vista completa del portaaviones volador. Carga diferida hasta jugar/continuar.
- Recorrido de 7800 unidades (misión 2: 18000), catorce soldados de tres tipos, once plataformas, diez armas, tres estrellas, tres botiquines, dos depósitos y cuatro PC de checkpoint.
- Sprite del portaaviones, atlas de cubierta, torres con radar, cazas estacionados y despegando, luces de pista, nubes con paralaje y rápidas en primer plano.
- Jefe de una fase, Centinela Aéreo: ráfagas dirigidas, tres misiles con aviso previo y pisotón con ondas que se esquivan saltando. Solo inicia al entrar en la arena y estar visible. Barreras de arena, barra de vida, doce poses y destrucción de cuatro segundos. Reinicia sano al reintentar una pelea sin terminar.
- Recompensa permanente del perfil: robot cromado militar. Disponible con T en las tres misiones, transformación de 1.2 s con sprites de materialización y espera compartida de 5 s.
- Dos armas: 3–9 para el brazo principal; L, botón de patada del mando o botón «Brazo secundario» para alternar el segundo. J dispara ambas, con munición independiente; se pueden duplicar armas. Cada brazo respeta su propia cadencia: el fusil sigue disparando mientras el lanzacohetes o la pistola recargan. Una mano agotada no impide que dispare la otra.
- Gancho y jetpack continúan exclusivos del soldado. El metal del portaaviones permite agacharse, pero no enterrarse.
- Guardado por perfil, modo desarrollador temporal, mando Xbox, móvil y tienda comparten los módulos existentes.

## Validación

Suite completa: 98 archivos, 546 pruebas en el primer pase; se reparó la inclusión de una propiedad secundaria indefinida en inventarios anteriores y su prueba quedó aprobada. Después se añadieron cuatro casos (salida del mausoleo, cadencias independientes, cubierta sólida y robot en el combate de la misión 1), total 550. Los módulos afectados se volvieron a comprobar en tests/mission-three-final-results.txt (107 pruebas aprobadas). Prueba visual aislada sin modificar la partida de localhost:4173, mediante tests/mission-three-preview.html. Paquete local 20260928T041413Z: 177 archivos / 145673422 bytes, incluyendo página y assets de misión 3. Publicado posteriormente en Mac mini como 20260928T041716Z: 177 archivos verificados desde HTTPS, servidor healthy y prueba pública de carga y disparo aprobada. Detalle: releases/20260928T041716Z.md.

## Arte y prompts finales

Habilidad utilizada: C:/Users/pc/.codex/skills/.system/imagegen/SKILL.md. Generación integrada, archivos PNG RGBA versionados. Transparencia recortada en memoria con el procesador ya existente; filtrado de imágenes desactivado para mantener el pixel art. Recorte de celdas y anclaje a los pies calculados una sola vez al cargar.

### assets/worlds/mission-03/portaaviones-v1.png

Create production pixel art game sprite asset, landscape 1536x1024. Transparent background. A gigantic flying aircraft carrier, orthographic side view facing right, ENTIRE ship visible centered with generous transparent margin. Long horizontal flat flight deck, charcoal navy steel armored hull, yellow runway marks, stacked control tower, radar, parked jet fighters, four massive downward blue thruster engines, warm cabin windows, believable layered details. 1990s detailed arcade military pixel art, crisp clustered pixels and black outlines, limited steel teal ochre palette, no blur, no text, no perspective tilt. Main deck horizontal around y=400. Ship occupies width 1400 height650. This will be the hero background and establishing shot of a playable side scrolling game set on the flying aircraft carrier in the sky. No ocean no clouds no unrelated objects.

### assets/sprites/mecha-aereo-v1.png

Production sprite sheet for a side scrolling military pixel art game. Transparent background, 1536x1024, EXACT 4 columns x 3 rows equally sized cells each384x341. Same enormous armored biped MECHA in every cell, facing LEFT, full body contained in cell, feet same baseline near bottom. Detailed crisp retro arcade pixel clusters, dark outlines, steel blue armor yellow danger markings orange glowing reactor, two heavy cannon arms shoulder missile pod. Row1 four walking frames left foot forward, passing, right foot forward, passing. Row2 four attack frames: braced rotary cannon firing, shoulder missiles launching, raised foot stomp preparation, foot slammed deck. Row3 four destruction frames: reactor sparking cracked armor, kneeling sparks, torso explosive rupture parts falling, smoking wreck. Entire character visible no text no labels no grid no background. Rough silhouette height240 pixels, broad squat biped, consistent proportions. Fine pixel art, not blurry, no smooth gradients. Sprite gameplay asset.

### assets/sprites/robot-combate-v1.png

Production detailed pixel art sprite sheet for military side scrolling videogame, transparent background 1536x1024, EXACT 6 columns x 4 rows uniform cells256x256. Original chrome combat android humanoid soldier, exposed metallic skull red eyes, dark olive tactical vest over silver mechanical endoskeleton, athletic soldier proportions, facing RIGHT. Same character eachcell, visible entirebody, 170px tall, feetbaseline y225 each cell, consistent size. Row1 six walking/running animation sequential frames with natural alternating legs; arms bent ready to hold guns no guns. Row2 six frames: idle1 idle2 crouchidle crouchstep jumpascending jumpdescending. Row3 six dual pistol action frames, arms extended forward at two slightly different heights, two separate small dark pistols muzzle flashes in frames2 and4, others recoil recovery. Row4 six materialization frames from silver wireframe outline to forming metal bones to armor plating to sparks to standing android to stable standing. Crisp small pixel clusters, black outlines, restrained olive graphite silver palette red eyes, no painterly blur no text no grid no scenery, all characters separate.

### assets/worlds/mission-03/cubierta-atlas-v1.png

Pixel art game environment atlas for airborne aircraft carrier side-scrolling military arcade game. Transparent background 1536x1024 arranged 3columns x2rows of separate assets in cells512x512. Top left: a horizontal side view steel aircraft carrier flight deck tile 512wide and200high centered vertically, top flat surface with yellow hazard paint, layered rivets pipes warm tiny windows below. Top middle: sideview elevated control cabin and radar tower with flat roof catwalk and support legs, 400wide400high. Top right: sideview parked dark navy jet fighter 450wide200high, landing gear. Bottom left: two separated fluffy horizontal pixel cloud wisps one above another, blue white subtle texture no dark outline, transparent edges, 460wide160high each. Bottom middle: a steel shipping crate with hazard markings, 280wide200high. Bottom right: sideview small support helicopter olive green with rotor, 440wide250high. Crisp high quality small pixel clusters, consistent 1990s arcade military style dark outlines for metal, no text no grid no background, strictly orthographic sideview, sharp detail no blur.

