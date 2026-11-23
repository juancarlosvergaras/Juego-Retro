# OBRA 10 — escaleras, gancho y jefe

Abre `index.html` en un navegador moderno. No requiere instalación ni conexión a internet: todos los recursos se incluyen en el proyecto. Conserva la carpeta `assets` junto a los archivos HTML, CSS y JavaScript.

También puedes servir esta carpeta con `node server.cjs` y visitar http://localhost:4173.

## Controles

- A / D o flechas: caminar.
- Shift: correr.
- Espacio: salto; vuelve a pulsar en el aire para el segundo salto.
- W / S o arriba / abajo: subir y bajar por las escaleras doradas. Sin pulsar, el soldado permanece agarrado. Espacio o movimiento lateral permiten soltarse.
- E: lanzar el gancho al anclaje azul disponible; E otra vez para soltarse. El anclaje seleccionado se ilumina.
- Con el cable conectado, A / D impulsa el balanceo y W / S recoge o alarga el cable. Espacio suelta el gancho con impulso de salto.
- J: disparar la pistola; se puede mantener pulsado.
- S o flecha abajo: agacharse; Shift + S: deslizarse.
- R: volver al último checkpoint.
- P o Escape: pausar.
- En pantallas táctiles hay botones de movimiento, escaleras/cable, correr, saltar, gancho y disparar.

Las plataformas con borde ámbar son superficies de colisión de un solo sentido: puedes atravesarlas desde abajo y aterrizar encima. Las colisiones siguen los bordes superiores de losas, andamios y plataformas suspendidas de la ilustración. Se eliminaron los puentes artificiales para dejar huecos reales; la ruta requiere combinar escaleras, saltos y gancho. Las escaleras doradas dibujadas por el juego son utilizables; las escaleras restantes de la ilustración son decorativas. Cada piso nuevo alcanzado sobre una plataforma lateral guarda un checkpoint.

El objetivo es derrotar al Capataz, un jefe provisional que utiliza el arte del hombre lobo en la zona superior. Al derrotarlo, el jugador se transforma en lobo, recupera ocho puntos de salud y sigue jugando. J pasa a realizar zarpazos; la forma de lobo corre más rápido y salta más alto. No se abre una pantalla de final de partida. Volver al checkpoint conserva la transformación; reiniciar desde abajo restaura al soldado y al jefe. Llegar a la azotea ya no concede la victoria. El jefe y el jugador tienen barras de vida dentro del escenario. El jefe avisa antes de lanzar proyectiles; el jugador tiene cinco puntos de salud y un breve periodo de invulnerabilidad después de recibir daño. Antes de derrotar al jefe, R o Reintentar restaura al jugador en el checkpoint y reinicia el combate. Reiniciar desde abajo borra el progreso de la partida; no se guarda entre visitas.

La cámara tiene una zona estable, anticipación hacia la dirección de movimiento y seguimiento horizontal/vertical limitado al nivel. Dos capas de ciudad se desplazan a distinta velocidad para crear profundidad. La ilustración original es plana: se conserva la estructura y se abre una máscara solo en el exterior para mostrar las capas del fondo. Es una aproximación de prototipo, no una reproducción exacta de la cámara de Super Mario Bros. 3.

Este prototipo incorpora el escenario, animaciones del soldado, escalada, cable, pistola y un jefe básico. La transformación a zombi todavía no está implementada. El recorte de sprites se describe en `sprite-atlas.js` y `action-atlas.js`, sin modificar las imágenes originales. El gancho se conecta automáticamente a un anclaje atornillado a la cara inferior de una losa, hasta 290 unidades. La selección descarta techos ocultos detrás de otros pisos. El cable no se enrolla alrededor de las esquinas.

## Comprobación

Ejecuta `node --test tests/physics.test.cjs tests/traversal.test.cjs tests/arsenal.test.cjs` para comprobar saltos, colisiones, escaleras, gancho, cámara y combate. La simulación usa pasos fijos de 1/120 s.

## Publicar

Es una web estática. Para alojarla, sube `index.html`, `styles.css`, `game.js`, `physics.js`, `encounter.js`, `sprite-atlas.js`, `action-atlas.js`, `arsenal.js`, `bow-atlas.js` y la carpeta `assets`, manteniendo sus rutas. No hay un servidor de juego ni dependencias externas. `server.cjs` es solo el servidor de desarrollo local.

La caída utiliza poses distintas de descenso lento, caída rápida e impacto; el aterrizaje incluye recuperación y polvo. Las pruebas comprueban también la continuidad de la simulación tras la transformación y una ruta hasta el jefe mediante saltos simulados y escaleras.


## Arsenal y ajuste de movimiento

El primer salto mantiene su impulso. El segundo usa 350 unidades/s en lugar de 430 (420 en forma de lobo). Las escaleras utilizables pasan de 12 a 9 tramos y la escalada baja de 120 a 95 unidades/s. Se utiliza la escalera del fondo, marcada en sus accesos, sin dibujar otra superpuesta.

Recoge las armas al pasar sobre ellas y selecciona: 1 cuchillo, 2 machete, 3 pistola, 4 escopeta, 5 AK, 6 lanzamisiles, 7 arco, 8 ballesta, 9 granadas. J ataca. Empiezas con cuchillo y pistola con 36 balas. La munición es una reserva total, sin recarga de cargador. Cada disparo consume una unidad (también una descarga de escopeta). Sin munición no se dispara; el cuchillo y el machete son ilimitados. Las granadas rebotan en el piso y las plataformas, y explotan 3 segundos después del lanzamiento, con daño por área en un radio de 85 píxeles. La mecha parpadea más rápido antes de explotar. Las armas recogidas y su munición se conservan al volver al checkpoint, y se restablecen al reiniciar desde abajo.


## Ampliación a 20 pisos

El mundo tiene 20 pisos numerados. Diez módulos intermedios reutilizan un tramo del edificio original, alternando su orientación para cambiar el lado de la escalera. La ilustración no se estira: las colisiones, anclajes y suministros se colocan con la misma transformación que cada módulo visual. El mundo mide 729 × 3848 unidades. El jefe sigue en la zona superior y derrotarlo permite continuar como lobo. Ejecuta también tests/extension.test.cjs en la suite de pruebas.


## Disparo direccional y patadas

Mantén J para disparar. W/S o flechas arriba/abajo apuntan verticalmente; combinarlas con A/D o izquierda/derecha permite diagonales. I/K también permiten apuntar arriba/abajo sin activar escaleras. Mientras el soldado dispara, W/S se dedica al apuntado. Los proyectiles salen desde la boca del arma y mantienen su velocidad en diagonal; la dispersión de la escopeta gira con el disparo. Brazos y arma se articulan sobre el cuerpo, con retroceso y fogonazo.

Después de transformarte, J sigue dando zarpazos. L da una patada en tierra; L en el aire ejecuta una patada voladora con impulso y suelta el cable si estabas enganchado. También hay botón táctil L. Las animaciones usan lobo-patadas-v1.png y kick-atlas.js. Incluye kick-atlas.js al publicar. Las pruebas adicionales están en tests/aim-kicks.test.cjs.



Los pisos 8 a 17 tienen cinco distribuciones de plataformas, con seis tramos sin escaleras y apoyos intermedios para saltar. Tras derrotar al jefe, T alterna soldado y lobo; ambas formas comparten la salud desbloqueada y conservan el arsenal.

Soldado enemigo: aparece en planta baja, tiene 3 puntos de vida y una barra roja dividida en tres. Persigue al jugador, salta hacia apoyos cercanos y dispara cada 1,65 s si tiene línea de tiro. Recibe daño de proyectiles, explosiones, armas cuerpo a cuerpo y ataques del lobo. Su hoja transparente contiene 16 poses en assets/sprites/soldado-enemigo-v1.png; enemy-atlas.js define sus recortes.

Soldado v2: hoja transparente de 48 poses completas, con cabeza y cuerpo unidos. Los seis pasos de caminar/correr avanzan con la distancia recorrida. Caída sin arma, gestos de reposo y poses de disparo en ocho direcciones. Fogonazo de 0,1 s por disparo real; el atlas se encuentra en soldier-v2-atlas.js.

## Mejoras compartidas entre misiones

### Lista de chequeo visual de cada misión

- [ ] Reproducir la **intro** desde el menú hasta la primera acción jugable. Comparar al protagonista con el sprite de la partida al entrar en cada plano y al devolver el control.
- [ ] Reproducir la **salida** desde el último impacto hasta la extracción, el epílogo y la pantalla de resultados. Comprobar la identidad de los personajes, la dirección del viaje y las dos poses que enlazan cada transición.
- [ ] Seguir los pies, ruedas y bases de las llamas sobre su superficie al inicio, en mitad y al final de los movimientos de cámara. El humo debe nacer del mismo foco y alejarse desde allí.
- [ ] Inspeccionar por separado las poses de los personajes, vehículos y efectos. Contar al menos ocho poses distintas en los ciclos base y observar el apoyo de los pies y el empalme entre el último y el primer cuadro.
- [ ] Repetir la revisión en escritorio y con el encuadre de un teléfono. Probar la reproducción continua y la opción de omitir, y confirmar que los subtítulos permiten ver la acción.

Las mejoras generales del personaje, controles, animaciones y combate se implementan en los módulos compartidos y se aplican a todas las misiones. Las misiones 1 y 2 utilizan soldier-animation.js para combinar el torso armado (incluidos cuchillo y hacha) con un ciclo de doce pasos al caminar o correr. Las siguientes misiones deben reutilizar este renderizador y su avance de pasos. Las mejoras permanentes del jugador siguen perteneciendo al perfil global.

## Heraldo eléctrico y traje de zombi

El Heraldo espera al final del cementerio (x=16840), antes de la puerta del mausoleo. Tiene barra de subjefe, rayos dirigidos, descarga circular que se puede saltar y una ráfaga de tres bolas de plasma. La entrada se abre al derrotarlo. Se conserva su salud al guardar. Derrotarlo concede 1500 puntos una vez por partida y desbloquea el traje de forma permanente.

El perfil conserva el traje en ambas misiones. T alterna las formas disponibles. Las tarjetas también permiten elegir una forma directamente. Cada cambio inicia una animación de 1,2 segundos y una espera de 5 segundos, sin recuperar salud ni gastar el arsenal. El contador se conserva al guardar y se detiene con la pausa.

Como zombi, J/X/clic/Num 0 lanza rayos ilimitados, con los mismos controles de apuntado. L lanza plasma que ralentiza y causa daño gradual durante cuatro segundos. Recibe la mitad del daño, puede correr con Shift y usar los poderes comprados salvo el lanzallamas. No usa armas ni jetpack. ↓/S en suelo firme inicia tres segundos de movimiento subterráneo inmune; hay que soltar abajo antes de repetir. En una plataforma solo se agacha. No ataca ni cambia de forma bajo tierra.

`zombie-form.js` comparte reglas, ataques y dibujo entre misiones; `storm-zombie.js` controla el subjefe. Las dos hojas de sprites contienen 60 poses y sus instrucciones originales están en `zombie-form-prompts.md`. Las futuras misiones deben reutilizar estos módulos y el desbloqueo del perfil.

