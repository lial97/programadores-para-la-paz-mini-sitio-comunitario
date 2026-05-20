// =============================================================
//  app.js — Lógica principal del Mini-sitio Comunitario
//
//  Este archivo controla dos secciones interactivas:
//    1. Tablero de mensajes  → carrusel MANUAL (el usuario navega)
//    2. Calendario editorial → carrusel AUTOMÁTICO (cambia cada 15 s)
//
//  Ambos carruseles comparten la función genérica `crearCarrusel`.
//  Cada sección tiene su propio bloque de "Cargar + Toggle".
// =============================================================


// =============================================================
//  FUNCIÓN GENÉRICA: crearCarrusel
//
//  Recibe un array de `items`, una función `renderTarjeta` que
//  convierte cada item en HTML, y un objeto `options` con:
//    - trackId       → id del <div> que se desliza
//    - indicadoresId → id del contenedor de los puntos (dots)
//    - btnPrevId     → id del botón "anterior" (←)
//    - btnNextId     → id del botón "siguiente" (→)
//    - autoplay      → true = avanza solo | false = solo manual
//    - duracionMs    → milisegundos entre slides (solo si autoplay)
//    - barraId       → id de la barra de progreso (solo si autoplay)
// =============================================================
function crearCarrusel(items, renderTarjeta, options) {

  // Referencias a los elementos del DOM que moveremos
  const track       = document.getElementById(options.trackId)
  const indicadores = document.getElementById(options.indicadoresId)

  // Limpiamos por si se llama más de una vez
  track.innerHTML       = ""
  indicadores.innerHTML = ""

  // indice guarda qué tarjeta está visible en este momento
  let indice   = 0
  // intervalo es el "temporizador" del autoplay (lo guardamos para poder cancelarlo)
  let intervalo = null

  // ----- Construcción de tarjetas e indicadores (dots) -----
  items.forEach((item, i) => {

    // Creamos el <div> de la tarjeta y le ponemos el HTML que devuelve renderTarjeta
    const tarjeta = document.createElement("div")
    tarjeta.classList.add("tarjeta-carrusel")
    tarjeta.innerHTML = renderTarjeta(item, i, items.length)
    track.appendChild(tarjeta)

    // Creamos el punto indicador (●) que corresponde a esta tarjeta
    const dot = document.createElement("button")
    dot.classList.add("indicador")
    if (i === 0) dot.classList.add("activo")   // el primer punto arranca activo
    dot.setAttribute("aria-label", `Ir al elemento ${i + 1}`)
    dot.addEventListener("click", () => {
      // Al hacer clic en un punto, reiniciamos el autoplay (si lo hay)
      // para que el contador de 15 s empiece desde cero
      if (options.autoplay) reiniciarAutoplay()
      irA(i)
    })
    indicadores.appendChild(dot)
  })


  // ----- irA: mueve el carrusel al índice indicado -----
  function irA(nuevo) {
    indice = nuevo

    // translateX mueve el track horizontalmente:
    // si indice=0 → 0%, si indice=1 → -100%, si indice=2 → -200%, etc.
    track.style.transform = `translateX(-${indice * 100}%)`

    // Actualizamos cuál punto indicador está marcado como activo
    document.querySelectorAll(`#${options.indicadoresId} .indicador`)
      .forEach((dot, i) => dot.classList.toggle("activo", i === indice))

    // Reiniciamos la barra de progreso cada vez que cambiamos de slide
    if (options.autoplay && options.barraId) reiniciarBarra()
  }


  // ----- reiniciarBarra: reinicia la animación de la barra de progreso -----
  // La barra va de 0% a 100% en `duracionMs` milisegundos para
  // que el usuario vea cuánto falta para el próximo cambio automático.
  function reiniciarBarra() {
    const barra = document.getElementById(options.barraId)
    if (!barra) return

    // Quitamos la transición momentáneamente para poder volver a 0% de golpe
    barra.style.transition = "none"
    barra.style.width = "0%"

    // `void barra.offsetWidth` fuerza al navegador a "leer" el estado actual
    // antes de aplicar la nueva transición — sin esto, el reset no funciona
    void barra.offsetWidth

    // Volvemos a activar la transición y la mandamos al 100%
    barra.style.transition = `width ${options.duracionMs}ms linear`
    barra.style.width = "100%"
  }


  // ----- iniciarAutoplay: arranca el temporizador automático -----
  function iniciarAutoplay() {
    if (!options.autoplay) return   // si no tiene autoplay, no hacemos nada

    reiniciarBarra()

    // setInterval llama a la función cada `duracionMs` milisegundos
    // % items.length hace que al llegar al último vuelva al primero (ciclo)
    intervalo = setInterval(() => {
      irA((indice + 1) % items.length)
    }, options.duracionMs)
  }


  // ----- reiniciarAutoplay: cancela el temporizador actual y lo vuelve a arrancar -----
  // Se usa cuando el usuario navega manualmente para que el conteo
  // empiece de nuevo desde 0, evitando saltos inesperados.
  function reiniciarAutoplay() {
    clearInterval(intervalo)
    iniciarAutoplay()
  }


  // ----- Botones de navegación manual (← y →) -----
  document.getElementById(options.btnPrevId).addEventListener("click", () => {
    if (options.autoplay) reiniciarAutoplay()
    // Si estamos en el primer slide (0) y retrocedemos, va al último
    irA((indice - 1 + items.length) % items.length)
  })

  document.getElementById(options.btnNextId).addEventListener("click", () => {
    if (options.autoplay) reiniciarAutoplay()
    // Si estamos en el último slide y avanzamos, vuelve al primero
    irA((indice + 1) % items.length)
  })


  // Ponemos en marcha el autoplay al construir el carrusel
  iniciarAutoplay()
}


// =============================================================
//  RENDER: Tarjeta de MENSAJE
//
//  Recibe un objeto `msg` del JSON /api/mensajes y devuelve
//  el HTML interno de cada tarjeta del carrusel de mensajes.
//
//  Campos usados del JSON:
//    titulo, mensaje, fecha, categoria, audiencia, tono,
//    revisionEditorial, llamadoAccion, fuente
// =============================================================
function renderMensaje(msg, i, total) {

  // Si el campo fecha existe y no es el texto provisional,
  // lo formateamos como fecha legible en español de Colombia.
  // Si no hay fecha real, mostramos "Fecha por confirmar".
  const fechaTexto = msg.fecha && msg.fecha !== "Pendiente por definir"
    ? new Date(msg.fecha).toLocaleDateString("es-CO", {
        year: "numeric", month: "long", day: "numeric"
      })
    : "Fecha por confirmar"

  // Retornamos el HTML completo de la tarjeta como texto
  // Los backticks (`) permiten escribir varias líneas y usar ${variables}
  return `
    <!-- Contador de posición: "Mensaje 01 de 03" -->
    <p class="carrusel-numero">Mensaje ${String(i + 1).padStart(2, "0")} de ${total}</p>

    <!-- Badge (etiqueta) con la fecha del mensaje -->
    <div class="msg-fecha-badge">📅 ${fechaTexto}</div>

    <!-- Título principal del mensaje -->
    <h3 class="carrusel-semana-dia">${msg.titulo}</h3>

    <!-- Cuerpo del mensaje con línea lateral decorativa -->
    <p class="msg-cuerpo">${msg.mensaje}</p>

    <!-- Grid de metadatos: categoría, audiencia, tono, revisión -->
    <div class="carrusel-grid">
      <div class="carrusel-campo">
        <label>Categoría</label>
        <p>${msg.categoria}</p>
      </div>
      <div class="carrusel-campo">
        <label>Audiencia</label>
        <p>${msg.audiencia}</p>
      </div>
      <div class="carrusel-campo">
        <label>Tono</label>
        <p>${msg.tono}</p>
      </div>
      <div class="carrusel-campo">
        <label>Revisión editorial</label>
        <!-- ?? "—" significa: si el campo no existe, muestra un guión -->
        <p>${msg.revisionEditorial ?? "—"}</p>
      </div>
    </div>

    <!-- Caja destacada con el llamado a la acción -->
    <div class="carrusel-accion">
      <strong>Llamado a la acción:</strong> ${msg.llamadoAccion}
    </div>

    <!-- Fuente del mensaje en texto secundario -->
    <p class="texto-secundario" style="margin-top:12px">
      <strong>Fuente:</strong> ${msg.fuente}
    </p>
  `
}


// =============================================================
//  RENDER: Tarjeta de CALENDARIO
//
//  Recibe un objeto `pieza` del JSON /api/calendario y devuelve
//  el HTML interno de cada tarjeta del carrusel del calendario.
//
//  Campos usados del JSON:
//    semana, dia, tema, pieza, canal, publicoObjetivo,
//    proposito, llamadoAccion
// =============================================================
function renderCalendario(pieza, i, total) {
  return `
    <!-- Contador de posición: "Pieza 01 de 06" -->
    <p class="carrusel-numero">Pieza ${String(i + 1).padStart(2, "0")} de ${total}</p>

    <!-- Encabezado: semana y día -->
    <h3 class="carrusel-semana-dia">Semana ${pieza.semana} · ${pieza.dia}</h3>

    <!-- Grid de metadatos en dos columnas -->
    <div class="carrusel-grid">
      <div class="carrusel-campo">
        <label>Tema</label>
        <p>${pieza.tema}</p>
      </div>
      <div class="carrusel-campo">
        <label>Tipo de pieza</label>
        <p>${pieza.pieza}</p>
      </div>
      <div class="carrusel-campo">
        <label>Canal</label>
        <p>${pieza.canal}</p>
      </div>
      <div class="carrusel-campo">
        <label>Público objetivo</label>
        <p>${pieza.publicoObjetivo}</p>
      </div>
      <!-- grid-column: 1/-1 hace que este campo ocupe las dos columnas -->
      <div class="carrusel-campo" style="grid-column: 1/-1;">
        <label>Propósito</label>
        <p>${pieza.proposito}</p>
      </div>
    </div>

    <!-- Caja destacada con el llamado a la acción -->
    <div class="carrusel-accion">
      <strong>Llamado a la acción:</strong> ${pieza.llamadoAccion}
    </div>
  `
}


// =============================================================
//  SECCIÓN MENSAJES — Cargar datos + Toggle mostrar/ocultar
//
//  Comportamiento del botón "Cargar mensajes":
//    - 1er clic: hace fetch a /api/mensajes, construye el carrusel
//      y muestra el contenedor. El botón pasa a ser "Ocultar".
//    - Clic siguiente: alterna entre ocultar y mostrar el contenedor
//      sin volver a hacer fetch (los datos ya están en el DOM).
// =============================================================
const btnMensajes         = document.getElementById("btnMensajes")
const contenedorMensajes  = document.getElementById("contenedorMensajes")
const mensajesPlaceholder = document.getElementById("mensajesPlaceholder")

// Bandera para saber si ya cargamos los datos alguna vez
let mensajesCargados = false

btnMensajes.addEventListener("click", async () => {

  // --- Toggle (si ya están cargados) ---
  if (mensajesCargados) {
    // classList.toggle añade la clase si no está, la quita si ya estaba.
    // "colapsado" activa la animación de cierre en el CSS (max-height → 0).
    const colapsado = contenedorMensajes.classList.toggle("colapsado")

    // Actualizamos el texto e indicador visual del botón según el estado
    btnMensajes.textContent = colapsado ? "▶ Mostrar mensajes" : "▲ Ocultar mensajes"
    btnMensajes.classList.toggle("abierto", !colapsado)  // gris cuando está abierto
    return  // salimos, no necesitamos hacer fetch
  }

  // --- Primera carga ---
  btnMensajes.disabled = true
  btnMensajes.textContent = "Cargando…"

  try {
    // fetch hace una petición HTTP GET al servidor Express (server.js)
    // El servidor lee /data/mensajes.json y lo devuelve como JSON
    const res      = await fetch("/api/mensajes")
    const mensajes = await res.json()   // convertimos la respuesta a array JS

    // Ocultamos el texto placeholder y mostramos el contenedor del carrusel
    mensajesPlaceholder.style.display = "none"
    contenedorMensajes.style.display  = "block"

    // Construimos el carrusel con la función genérica
    // autoplay: false → el usuario navega manualmente con las flechas
    crearCarrusel(mensajes, renderMensaje, {
      trackId:       "mensajesTrack",        // <div> que se mueve
      indicadoresId: "mensajesIndicadores",  // contenedor de los dots
      btnPrevId:     "btnMsgPrev",           // botón ←
      btnNextId:     "btnMsgNext",           // botón →
      autoplay:      false                   // SIN avance automático
    })

    // Marcamos que los datos ya están cargados para la próxima vez
    mensajesCargados = true
    btnMensajes.disabled = false
    btnMensajes.textContent = "▲ Ocultar mensajes"
    btnMensajes.classList.add("abierto")   // color gris = "está abierto"

  } catch {
    // Si el servidor falla o no responde, mostramos el error al usuario
    mensajesPlaceholder.textContent   = "No fue posible cargar los mensajes. Revisa que el servidor esté funcionando."
    mensajesPlaceholder.style.display = "block"
    btnMensajes.textContent = "Reintentar"
    btnMensajes.disabled    = false
  }
})


// =============================================================
//  SECCIÓN CALENDARIO — Cargar datos + Toggle mostrar/ocultar
//
//  Igual que mensajes, pero con autoplay activo (15 s) y
//  lógica extra para pausar/reanudar el temporizador cuando
//  el usuario colapsa el carrusel.
// =============================================================
const btnCalendario         = document.getElementById("btnCalendario")
const contenedorCalendario  = document.getElementById("contenedorCalendario")
const calendarioPlaceholder = document.getElementById("calendarioPlaceholder")

// Bandera para saber si ya cargamos el calendario
let calendarioCargado = false

btnCalendario.addEventListener("click", async () => {

  // --- Toggle (si ya está cargado) ---
  if (calendarioCargado) {
    const colapsado = contenedorCalendario.classList.toggle("colapsado")
    btnCalendario.textContent = colapsado ? "▶ Mostrar calendario" : "▲ Ocultar calendario"
    btnCalendario.classList.toggle("abierto", !colapsado)

    if (colapsado) {
      // Al colapsar: detenemos la barra de progreso visualmente.
      // El intervalo del autoplay vive dentro de crearCarrusel,
      // pero la barra la podemos congelar directamente desde aquí.
      const barra = document.getElementById("barraRelleno")
      if (barra) {
        barra.style.transition = "none"
        barra.style.width = "0%"
      }
    } else {
      // Al volver a mostrar: simulamos un clic en "siguiente" para que
      // la barra arranque de nuevo desde el slide actual.
      document.getElementById("btnNext").click()
    }
    return
  }

  // --- Primera carga ---
  btnCalendario.disabled = true
  btnCalendario.textContent = "Cargando…"

  try {
    // Pedimos los datos al servidor (lee /data/calendario-editorial.json)
    const res    = await fetch("/api/calendario")
    const piezas = await res.json()

    calendarioPlaceholder.style.display = "none"
    contenedorCalendario.style.display  = "block"

    // Construimos el carrusel con autoplay activado
    // duracionMs: 15000 → cambia de slide cada 15 segundos
    // barraId → la barra que muestra el tiempo restante
    crearCarrusel(piezas, renderCalendario, {
      trackId:       "carruselTrack",   // <div> que se desliza
      indicadoresId: "indicadores",     // contenedor de los dots
      btnPrevId:     "btnPrev",         // botón ←
      btnNextId:     "btnNext",         // botón →
      autoplay:      true,              // CON avance automático
      duracionMs:    15000,             // 15 segundos por slide
      barraId:       "barraRelleno"     // barra de progreso visual
    })

    calendarioCargado = true
    btnCalendario.disabled = false
    btnCalendario.textContent = "▲ Ocultar calendario"
    btnCalendario.classList.add("abierto")

  } catch {
    calendarioPlaceholder.textContent   = "No fue posible cargar el calendario. Revisa que el servidor esté funcionando."
    calendarioPlaceholder.style.display = "block"
    btnCalendario.textContent = "Reintentar"
    btnCalendario.disabled    = false
  }
})
