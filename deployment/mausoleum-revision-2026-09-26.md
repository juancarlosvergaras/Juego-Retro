# Revisión visual del mausoleo

Publicado en el Mac mini el 27 de septiembre de 2026, versión 20260927T065743Z. Ver releases/20260927T065743Z.md.

## Cambios

El jefe zombi conserva la altura visible del último fotograma de transformación: aproximadamente 217 px en la pose de referencia, en lugar de ampliarse a 250 px al caminar. Escala común para el atlas nuevo y el salto del atlas anterior; guardados de segunda fase consistentes. Dibujo sin interpolación y con coordenadas enteras. Boca y colisión ajustadas a la altura.

La roca lanzada usa seis fotogramas propios de giro, con facetas, grietas y bordes escalonados. Mantiene trayectoria, aviso de impacto y daño.

Se elimina la franja de techo artificial y se colocan cuatro andamios de madera y mampostería, de 240 a 270 px de ancho. Base y pilares bloquean caminar; la pasarela superior permite aterrizar. Se pueden atravesar usando los saltos normales del soldado. Se preserva el espacio de combate junto al pedestal.

Los cuatro murciélagos existentes reposan en huecos laterales. Sus ojos quedan visibles dentro y salen hacia fuera antes de apuntar y lanzarse. Conservan sus identificadores persistentes. Los seis zombis se sitúan en espacios libres entre estructuras.

## Arte generado

Modo: image_gen integrado, archivos originales RGBA conservados sin edición externa.

- `assets/worlds/mission-02/mausoleum-scaffold-v1.png`: 1536 × 1024. Referencia: environment-atlas-v1.png. Prompt: andamio de restauración gótica aislado, mismo pixel art militar detallado, muro bajo de mampostería gris oliva, vigas y refuerzos diagonales de madera, cubierta superior transitable y aberturas entre niveles, pequeños huecos oscuros laterales para murciélagos, herrajes oxidados y musgo, vista ortográfica lateral, superficies horizontales; sin personajes, texto, suelo ni sombra, fondo transparente. Se mantiene la proporción del dibujo.
- `assets/sprites/rey-roca-v1.png`: 1536 × 1024. Prompt: atlas de seis rotaciones de una misma roca antigua, tres columnas y dos filas, intervalos de 60 grados, silueta angular astillada, grietas y musgo, grupos de píxeles de estética 16 bits, bordes escalonados, facetas sombreadas con luz superior izquierda; legible a 48 × 48, espacios transparentes amplios, sin aspecto vectorial, fotográfico o borroso, sin texto ni escena.

## Comprobación

459 pruebas aprobadas en 84 archivos. La prueba de plataformas comprueba colisión lateral, aterrizaje y recorrido mediante saltos dobles sin mejoras a través de los cuatro obstáculos. Se comprueban también persistencia y salida de murciélagos, escala de transformación/guardado y dibujo sin interpolación.

Revisión visual en navegador aislado del progreso del usuario: comparación de transformación, marcha y ataque; seis rocas; escenario real sin techo, andamios y murciélagos atacando desde los huecos. Sin errores de consola observados. Galería local: tests/mausoleum-revision-preview.html.
