# Misión 02 — El umbral del rey

Arte generado con la herramienta integrada `image_gen`. Los originales se conservaron en la carpeta de imágenes generadas de Codex. Las copias que utiliza el juego están en `C:/Juego Arcade/assets/worlds/mission-02/`.

## Archivos finales

- `city-start-v1.png`: ciudad diurna inicial, sin mechas.
- `city-day-v1.png`: ciudad con mechas abandonados y tanques lejanos.
- `cemetery-dusk-v1.png`: cementerio al atardecer.
- `mausoleum-interior-v1.png`: interior del mausoleo.
- `environment-atlas-v1.png`: atlas transparente de ocho objetos, cuatro columnas por dos filas: dos fachadas, mecha, tanque, lápidas, reja, mausoleo y rey.

El recorrido exterior mide 18 000 unidades y el interior 2 500. La lluvia aparece gradualmente entre 7 700 y 9 500; el cementerio ocupa aproximadamente la segunda mitad. Las llamas, el humo, la lluvia y las salpicaduras reutilizan las filas animadas del sprite sheet `assets/sprites/ambiente-animado-v1.png`.

## Prompts utilizados

### Ciudad con mechas

Create a production environment background for a side-scrolling pixel art action game, Cap Dollar The Hunter. Very wide landscape 3:1. Detailed hand-pixeled 1990s arcade military art, crisp clustered pixels, restrained realistic proportions, weathered stone and metal, NOT vector, NOT 3D. Strict side elevation, horizon horizontal, no diagonal road perspective. Daylight pale dusty blue sky upper half. Lower half: long semi-destroyed European industrial city skyline, burned buildings, pockets of orange fire and smoke in the distance. Two huge abandoned military mecha robots slumped between buildings, dormant and rusted, with small distant war tanks among rubble. All objects distant/background scale; NO foreground playable buildings or ground, no characters, no UI, no text, no lettering, no borders. Left and right edges have similar sky and skyline heights to permit repeated background. This is a parallax background layer; painterly atmosphere only in the far distance but preserve detailed pixel art.

### Atlas de objetos

Production pixel art ENVIRONMENT SPRITE ATLAS on genuinely transparent background, 1536x1024 landscape, exactly 4 columns by 2 rows of equally sized 384x512 cells, each object centered entirely within its cell with 16px transparent padding, no overlap, no labels, no text, no shadows outside silhouette. Polished detailed 1990s military arcade hand-pixel art, crisp weathered stone, believable proportions, side view compatible with a side-scrolling soldier 46 pixels tall. Row1 left to right: 1 a complete six-storey stone city building facade with flat walkable rooftop and sealed door, cracked walls, no open interior; 2 a second complete four-storey damaged brick building facade with flat roof and external fire escape, sealed door; 3 a huge abandoned olive military humanoid mecha slumped sitting with moss and exposed cables, inactive; 4 a distant side-view rusty military tank with long cannon. Row2 left to right: 1 a varied cluster of old cemetery gravestones, tombstones and crosses with weeds; 2 a long section of ornate wrought iron cemetery fence and a stone post; 3 an imposing gothic stone mausoleum facade with a tall pitch-black OPEN entrance doorway in its lower center and triangular pediment, no steps; 4 a giant weathered stone statue of an ancient crowned king, standing upright holding a downward sword, with a wide stone pedestal. No people, no scenery, no background, no checkerboard. All base contact points at bottom of their own cell.

### Cementerio

Production parallax background for a detailed 1990s pixel art side-scrolling military action game. Very wide 3:1 landscape. An immense old cemetery under a slate blue grey late-afternoon sky, rain clouds gathering, slightly darker daylight, moody but readable. Side-elevation horizontal composition, not an isometric or top-down view. Lower half filled with distant layers of countless gravestones and stone crosses, wrought iron fences, broken stone walls, cypress trees, distant ruined city silhouettes far left and small old crypts among trees. Atmosphere recedes into lavender-grey mist. Upper half mostly sky with layered clouds; no giant foreground object, no player, no UI, no text. Preserve crisp clustered pixel textures on stonework, subtle color ramps; no vector art, no 3D. Ground horizon consistent across left and right for scrolling. No rain streaks painted on top; rain is animated separately.

### Interior

A production side-scrolling pixel art game background, very wide 3:1 landscape. Interior of an immense ancient stone royal mausoleum, SIDE ELEVATION, flat horizontal floor at bottom 15%, no vanishing-point corridor. A long sequence of tall gothic arches and weathered carved pillars, burial niches, cracked sandstone blocks, small amber braziers, dusty violet shafts of late afternoon light high above. Detailed mature 1990s arcade pixel art, crisp pixel clusters, rich textured stone, readable dark teal shadow and muted warm highlights, no smooth vector shapes. Leave the central and right floor area empty for a giant king statue which will be added separately. No characters, no statue, no text, no UI. Left and right edges consistent architecture so repeated sections can scroll horizontally.

### Edición de la ciudad inicial

Referencia: `city-day-v1.png`.

Edit this pixel art game city background for the START of the level. Remove BOTH giant abandoned robots and all the tanks, replacing their silhouettes naturally with more bombed urban buildings, rubble and old stone facades at the same depth. Keep the exact wide dimensions, same daylight sky, smoke and fires, mature detailed pixel art style, side-scrolling elevation, same ground horizon and all other architecture. Extend the rubble and cracked grey pavement right down to the bottom edge instead of a flat empty strip. No characters, no text, no new vehicles. This clean urban variant will blend into the original robot-filled city later in the level.

### Paracaídas de llegada

Archivo: `assets/sprites/paracaidas-v1.png`. Generado con image_gen integrado; PNG RGBA de 1536×1024, ocho celdas de 384×512. El cuerpo usa los sprites existentes del soldado.

Create a production transparent PNG pixel art sprite sheet for a military parachute in a 1990s arcade side-scrolling game. EXACT 4 columns x 2 rows of equal 384x512 cells on 1536x1024 canvas. All cells on genuine transparent alpha background, no checkerboard, no text, no labels, no human or soldier. Detailed dark olive green round military parachute canopy, stitched cloth panels, warm khaki highlights, dark outlines, delicate taut suspension lines. Same canopy, size and anchor registration throughout first row. ROW ONE: four consecutive open parachute descent animation frames, subtly billowing cloth, very gentle small left-to-right flex, all suspension lines converge at exactly the same bottom-center harness point at cell coordinate (192,470); canopy occupies cell x=35..349 y=40..215, lines connect canopy down to harness. ROW TWO: four consecutive landing/collapse frames: canopy starts sagging, folds inward, collapses into draped cloth, finally a folded crumpled bundle on the ground; same olive cloth, realistic folding. Cell borders with at least 20px transparent padding, no neighboring frame overflow. Crisp hand-clustered pixels, detailed material, mature gritty pixel art, NOT vector, NOT smooth 3D, NO soldier. Intended to combine with an existing soldier sprite so the character identity remains unchanged.
