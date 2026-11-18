# Revisión de combate y presentación

Cambios locales pendientes de publicación. La versión pública sigue siendo 20260926T225254Z.

- Jefe zombi: atlas con textura y contornos revisados, interpolación limitada a este personaje. Se conserva el salto anterior porque el nuevo atlas presentaba una pose solapada.
- Rocas: doce fotogramas pixel art con relieve, grietas y rotación, almacenados en caché.
- Tanque y Heraldo: no comienzan ataques fuera de la cámara; al entrar tienen anticipación antes del primer disparo.
- Ambas misiones: pantalla de carga con progreso de imágenes y opción de reintentar si falla un recurso.
- Tanque: muro en x=4660, bloquea salto, jetpack y subsuelo hasta derrotarlo. Respeta partidas antiguas que ya estén más adelante.
- Plasma del jugador en ambas misiones: charcos que se extienden y duran 4,5 segundos, ralentizan y dañan enemigos; goteo al impactar paredes. Límite de 18 charcos y 24 gotas para evitar acumulación.

## Verificación

446 pruebas previas pasaron en 81 archivos; se añadió después una regresión que comprueba la presencia del panel de carga en las dos páginas. La suite específica contiene nueve pruebas. Revisión en navegador con partida aislada: jefe transformado, muro en la ciudad, disparo del zombi, render reproducible de charcos/rocas y presentación de carga. No se modificó el progreso del origen habitual.

## Arte generado

Herramienta integrada image_gen (modo built-in), sin CLI. Los resultados se copiaron al proyecto preservando transparencia cuando corresponde.

### Jefe zombi

Archivo: ../assets/sprites/rey-zombi-v3.png. Edición con rey-zombi-v2.png como referencia. Prompt de trabajo: conservar una cuadrícula exacta de seis columnas por cinco filas, mismas poses y siluetas, corona, media calavera, piel verde, armadura de piedra y capa. Refinar el sombreado pixel art y los contornos para evitar bloques gruesos. Fondo transparente, filas de caminar, vómito, salto, garras y muerte, sin plasma emitido, texto ni cuadrícula visible. Solicitud de 2508 o 2048 píxeles; el resultado fue 1254 × 1254, por lo que no se considera una mejora de resolución. El recorte de salto usa la versión anterior para evitar solapamientos.

### Muro del tanque

Archivo: ../assets/worlds/mission-02/tank-wall-v1.png. Generación usando el atlas del entorno como referencia de estilo. Prompt de trabajo: una textura cuadrada opaca de mampostería repetible de borde a borde, piedra gris oliva envejecida, bloques, mortero, pequeñas grietas, desconchados y musgo; vista ortográfica, pixel art gótico de píxel fino, sin objetos, perspectiva, texto ni márgenes. Se repite sin estirar a lo largo del muro.
