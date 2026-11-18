# Misión 5: Bajo el abismo

Implementación local terminada el 28 de septiembre de 2026. Paquete `20260928T054112Z`: 201 archivos públicos, 168742749 bytes. No publicado en Mac mini; la última versión pública confirmada sigue siendo `20260928T041716Z`.

## Juego y continuidad

- La misión 4 desbloquea permanentemente el mini tanque con súper cañón y recarga automática. Su final muestra la recompensa y permite continuar a la misión 5.
- La misión 5 recorre un mar de 6500 × 2400 unidades: nado en ocho direcciones, impulso, burbujas, rayos de luz, restos de barcos, 26 enemigos, 18 minas destructibles, 15 recogibles y tres estaciones de checkpoint. Entrar al submarino profundo activa un cuarto checkpoint y una esclusa animada.
- Dentro del submarino se recupera el movimiento terrestre. El capitán humano utiliza ráfagas, misiles con posiciones señaladas, granada eléctrica que se puede saltar y una carga. Espera a que el jugador entre antes de atacar.
- Derrotarlo da 7000 puntos una sola vez, reproduce su caída y desbloquea al luchador, con combos de puños y patadas. La secuencia final puede recuperarse al continuar una partida.
- Mini tanque y luchador se conservan por perfil y se pueden seleccionar en las cinco misiones. El tanque se convierte en mini submarino bajo el agua; el luchador tiene animaciones de nado, moto y victoria. Se mantienen mejoras, poderes y el intervalo de cinco segundos entre transformaciones.
- Se corrigió la exportación de `ArcadeCampaign.snapshot`: su ausencia podía impedir guardar el estado de carretera. Las misiones nuevas empiezan con salud completa, mientras que continuar recupera su estado guardado.

## Arte final

Siete imágenes finales generadas con la herramienta integrada de imagen, con transparencia donde corresponde. Los atlas se recortan por sus límites de contenido y se dibujan sin suavizado. Prompts completos, referencias y rutas: [mission-five-art-prompts.json](mission-five-art-prompts.json).

| Archivo final | Animaciones o contenido |
| --- | --- |
| `assets/sprites/mini-tanque-submarino-v1.png` | Orugas, disparo, retroceso, transformación y mini submarino |
| `assets/worlds/mission-05/abismo-submarino-v1.png` | Mar y cámara interior del submarino |
| `assets/sprites/enemigos-marinos-v1.png` | Buzos, submarinos enemigos, minas, nave profunda, esclusa y sonar |
| `assets/sprites/capitan-abismo-v1.png` | Caminar, armas, ataques y derrota del capitán |
| `assets/sprites/personajes-buceo-v1.png` | Nado de soldado, lobo, zombi y robot |
| `assets/sprites/luchador-combate-v1.png` | Caminar, puños, patadas, agacharse, salto y guardia |
| `assets/sprites/luchador-movilidad-v2.png` | Nado, moto y celebración del luchador |

## Validación

- Suite completa previa a los últimos ajustes: 100 archivos y 576 pruebas aprobadas, ejecutadas en procesos separados (`tests/sea-full-results.txt`).
- Cuatro pruebas nuevas de los runtimes reales verifican carga diferida, salud inicial, recompensa de carretera, transición al mar, persistencia del final y checkpoint. Total del catálogo: 580 pruebas en 101 archivos.
- Comprobación final de módulos afectados: 71 pruebas aprobadas en ejecuciones separadas, incluidas las cuatro nuevas. Un ensayo conjunto sin aislamiento produjo una interferencia del tamaño global del mundo; la prueba de física pasó al repetirla en su propio proceso. No corresponde a un fallo observado del juego.
- Revisión visual en el origen aislado `localhost:4186`: mar, profundidad, entrada, cámara del capitán, formas nuevas, final del luchador y transición real del botón de misión 4 a misión 5. Vista móvil horizontal 844 × 390 revisada, con controles fuera del área jugable. No se observaron errores de consola.
- Ajustado el apoyo del luchador al piso durante su celebración. Sintaxis del renderizador comprobada después del ajuste.
- Manifiesto final verificado: todas las imágenes finales y módulos nuevos incluidos; ningún fixture de pruebas publicado en el paquete.
- Se reutiliza la configuración de teclado y mando. No se probó con un mando Xbox físico ni se hizo una partida manual completa de extremo a extremo.

Fixtures y regresiones permanentes: `tests/mission-five-preview.html`, `tests/sea-war.test.cjs` y `tests/sea-runtime.test.cjs`. Las pruebas visuales no alteran los perfiles del servidor habitual en el puerto 4173.
