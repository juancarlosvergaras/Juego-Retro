# Ampliación de campaña y misión 7

**Actualización:** publicado en Mac mini en `20260928T140348Z`. Las referencias de estado local que siguen corresponden al registro previo de preparación.

Estado: implementación local, paquete revisado `20260928T122808Z`. No se ha publicado esta ampliación en el Mac mini. La publicación anterior sigue siendo `20260928T061153Z`.

## Cambios

- Misión 3: cinco soldados con jetpack adicionales, que se aproximan, apuntan al jugador y caen al ser derrotados.
- Misión 4: recorrido de 6600 a 9600 unidades (+45%), 35 oleadas, enemigos aéreos, 16 rampas/baches y cuatro checkpoints. Las rampas impulsan la moto; los baches restan vida, provocan caída y permiten levantarse/remontar. Sprites de recuperación específicos para las seis formas.
- Misión 5: de 6500 a 11600 unidades de longitud (+78%) y de 2400 a 3200 de profundidad. 42 enemigos marinos, cuatro tiburones con aviso, carga rápida y ataque en arco, 30 minas y 24 suministros. Esclusa trasladada al nuevo extremo profundo.
- Misión 6: plantas de 5400, 4800 y 4600 unidades; 33 enemigos, incluido el guardia con escudo y ráfaga de tres proyectiles. Plataformas opcionales elevadas que dejan libre el paso por el suelo. Conserva Arcade y jefe de azotea.
- Robot y luchador: nuevos atlas acordes con uniforme, botas, contornos y proporciones del soldado. Nuevas poses terrestres, nado y moto. Ajustado el anclaje horizontal para evitar desplazamientos del cuerpo al cambiar de pose.
- El robot usa las armas reales del arsenal en ambos brazos, incluidas parejas de arcos. Cada brazo conserva su cadencia y consume munición; los proyectiles nacen en la posición visual de cada arma.
- Misión 7, El Soberano del Vacío: cubierta exterior de 10000 unidades e interior de 6200, esclusas, checkpoints, suministros y tres estrellas. 42 aliens entre infantería, élites y platillos con piloto visible en cúpula de vidrio.
- Soberano de tentáculos: llegada anunciada, tentáculo dirigido a una marca, onda de suelo, láser a dos alturas y cápsulas descendentes. Derrota animada y recompensa permanente Pulso del Vacío: hasta tres objetivos próximos, daño y parálisis breve, nueve segundos de recarga. La recompensa no se puede comprar antes de vencerlo y no se duplica al recargar.
- Menús, perfiles, modo desarrollador y transición desde misión 6 admiten misión 7. Corregidos textos heredados del centro comercial y etiquetas de enemigos marinos/aéreos.

## Validación

- 105 archivos de pruebas, 609 pruebas aprobadas; registro `tests/expansion-final-results.txt`.
- Pruebas nuevas: rampas, daño/recuperación de baches, cuatro tiburones y persistencia, pisos libres del centro, vuelo de soldados, munición y origen de disparos de ambos brazos, esclusas/checkpoints espaciales, cuatro ataques del jefe, desbloqueo único y guardado del nuevo poder.
- Ejecución del controlador real de misión 7: inicio, guardado, cambio de sector, recompensa/final y transición desde misión 6 sin sobrescritura tardía del progreso.
- Revisión visual en navegador aislado en puerto 4186: exterior/interior espacial, cúpulas, jefe/avisos, robot con dos arcos, luchador/guardia del centro, tiburón, carretera con enemigo aéreo y caída del luchador. Sin errores de consola observados en las vistas comprobadas.
- Sintaxis de todos los JavaScript raíz aprobada. 108 imágenes PNG del paquete decodificadas. SHA256 de los 223 archivos del paquete validado. No incluye pruebas ni documentos privados de despliegue.
- Paquete: 189205383 bytes (180.44 MiB). No equivale al tamaño de la carpeta completa de trabajo, que contiene versiones y pruebas anteriores.
- Límites: no se ha realizado una partida manual completa de las siete misiones ni una prueba con mando Xbox físico en esta revisión.

## Arte

Generado con la herramienta integrada `image_gen`. Prompts guardados en [expansion-art-prompts.json](expansion-art-prompts.json). Los PNG finales se conservan sin edición por scripts; el juego recorta sus atlas al dibujarlos.

| Archivo | Uso |
|---|---|
| `assets/sprites/robot-soldado-v2.png` | Robot, 24 poses terrestres/transición |
| `assets/sprites/robot-movilidad-v2.png` | Robot, 12 poses de nado, moto y caída |
| `assets/sprites/luchador-soldado-v3.png` | Luchador, 24 poses de combate y movilidad |
| `assets/sprites/enemigos-expansion-v1.png` | Jetpack, guardia, tiburón, rampa, bache y caída del soldado |
| `assets/sprites/caidas-carretera-v2.png` | Recuperación de lobo, zombi, luchador y mini tanque |
| `assets/worlds/mission-07/nave-alienigena-v1.png` | Exterior e interior espacial |
| `assets/sprites/aliens-tripulacion-v1.png` | Aliens, élites, platillos y pilotos |
| `assets/sprites/alien-tentaculos-v1.png` | Llegada, ataques y derrota del Soberano |
| `assets/sprites/poder-alien-v1.png` | Recompensa, disparo e impactos alienígenas |
