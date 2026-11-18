# Teclado, mando Xbox y rendimiento

Disponible en ambas misiones desde **Ajustes → Configurar teclado / mando Xbox**, o directamente desde la pausa. Las asignaciones se guardan por navegador y dominio, independientemente de las partidas.

Conecta el mando por USB o Bluetooth y pulsa un botón. El panel indica si el navegador lo detectó. El teclado permanece como respaldo y Esc siempre permite pausar. También puedes elegir «Solo teclado».

## Controles Xbox predeterminados

| Control | Acción |
| --- | --- |
| Stick izquierdo / cruceta | Moverse, subir, agacharse o enterrarse |
| Stick derecho | Apuntar en ocho direcciones sin desplazarse |
| A | Saltar |
| RT | Disparar, zarpazo o rayos |
| B | Patada o plasma |
| RB | Correr / turbo del jetpack |
| X | Gancho |
| Y | Cambiar forma |
| LT | Usar poder |
| LB | Cambiar poder |
| Pulsar stick izquierdo | Activar o apagar jetpack |
| Pulsar stick derecho / Vista | Arma siguiente / anterior |
| Menú | Pausar / continuar |

En los menús: cruceta o stick para navegar, A para aceptar, B para volver. En ajustes, arriba/abajo cambia el foco y izquierda/derecha modifica el dispositivo o la zona muerta. El teclado también permite cambiar entre las armas recogidas con `[` y `]`.

Selecciona la acción para reasignar una tecla o botón. Los botones Xbox ocupados intercambian sus acciones para evitar duplicados. Los conflictos de teclado se indican antes de aplicar cambios. Esc cancela la captura; Supr elimina una asignación de mando. «Restaurar controles» recupera los valores originales. La zona muerta se ajusta entre 10 % y 60 % para evitar desplazamientos causados por deriva de los sticks.

Al desconectar el mando durante una partida, el juego se pausa y libera sus controles. Al volver de un menú o recuperar el foco, suelta los botones y centra los sticks antes de continuar. Las pulsaciones sostenidas no repiten saltos, transformaciones ni aperturas del menú. Ratón, teclado y mando pueden coexistir sin que soltar un dispositivo cancele otro que siga pulsado.

## Optimización aplicada

- Se conserva la física a 120 Hz y el dibujado a la frecuencia del monitor.
- El HUD se actualiza a 20 Hz; ya no se reconstruye en cada paso de física.
- El selector de personajes actualiza sus elementos solo cuando cambia la forma, el bloqueo o el segundo del contador.
- Al pausar, el mundo se dibuja una vez y queda congelado. Reanudar o cambiar el tamaño lo redibuja inmediatamente.
- Las pestañas ocultas dejan de dibujar. Los controles se liberan al perder el foco.
- Se conservaron imágenes, efectos, colisiones, velocidades y reglas de combate.

La comparación se realizó durante diez segundos en la misma escena aislada del cementerio, con el mismo tamaño de ventana, inventario y enemigos desactivados. Registro inicial: 1001 fotogramas, 118.118 llamadas de dibujo, 82.200 mutaciones DOM, 1,23 ms medios de JavaScript y percentil 95 de 1,60 ms. La primera medición optimizada mantuvo 1001 fotogramas y 118.118 llamadas de dibujo, redujo las mutaciones a 13.800 (83,2 % menos) y obtuvo 0,76 ms medios y percentil 95 de 1,20 ms.

Estos tiempos miden la ejecución JavaScript instrumentada, no el coste completo de GPU/composición ni garantizan los mismos resultados en otro equipo o combate. En ambas muestras no hubo intervalos entre fotogramas mayores de 25 ms; los tirones intermitentes comunicados no se reprodujeron en esa escena. La mejora verificada consiste en eliminar trabajo repetido conservando los efectos.

La repetición sobre la versión final obtuvo **0,80 ms medios**, percentil 95 de 1,20 ms, 13.800 mutaciones, 118.118 llamadas de dibujo y 1001 fotogramas. Equivale a aproximadamente 35 % menos tiempo de JavaScript frente a la muestra inicial, con la misma cantidad de dibujos.

## Validación

412 pruebas aprobadas en 77 archivos: `tests/controls-full-results.txt`. Incluyen direcciones, zona muerta, gatillos analógicos, acciones simultáneas, reasignación, persistencia tolerante a datos inválidos, liberación de fuentes independientes, llegada, navegación del teclado numérico y presupuestos de interfaz a 60/120/144 Hz.

Comprobaciones en navegador con almacenamiento aislado: disparos diagonales a ambos lados, consumo de munición, salto y carrera simultáneos, pausa con Menú, navegación con cruceta, continuar con A/B, desconexión, reasignación de U compartida entre misiones, intercambio A/RT y restauración. La última corrección de navegación entre selector y zona muerta se comprobó en navegador después de la suite. Sin errores de consola en la comprobación final.

Se utilizó un mando simulado para comprobar la integración. Queda pendiente validar un Xbox físico, su conexión USB/Bluetooth y el navegador concreto del jugador. La implementación usa el mapeo estándar de la [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API); los mandos sin mapeo estándar muestran una indicación para revisar sus asignaciones.

Copia anterior: `deployment/before-controls-20260926.zip`. Publicación posterior solicitada por el usuario: versión 20260926T214817Z instalada en el Mac mini el 26 de septiembre de 2026; 134 archivos verificados desde HTTPS.
