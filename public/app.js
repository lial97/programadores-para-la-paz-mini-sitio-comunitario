// =============================================================
//  app.js — Lógica principal del Mini-sitio Comunitario
//
//  Este archivo controla tres bloques funcionales:
//    A. LOGIN          → validación de credenciales y scroll al entrar
//    B. CARRUSEL       → función genérica reutilizable por mensajes y calendario
//    C. MENSAJES       → carrusel MANUAL (el usuario navega con flechas)
//    D. CALENDARIO     → carrusel AUTOMÁTICO (cambia cada 15 segundos)
//    E. NAVEGACIÓN     → resalta el link del header de la sección visible
//
//  Dependencias: ninguna. Vanilla JS puro, sin librerías externas.
// =============================================================


// =============================================================
//  BLOQUE A — LOGIN
//
//  Credenciales de demostración hardcodeadas (no hay backend real).
//  En un proyecto real, esto se verificaría en el servidor con HTTPS.
//
//  Flujo:
//    1. Usuario hace clic en #btnLogin (o presiona Enter en los inputs).
//    2. Se leen los valores de #inputUsuario y #inputPassword.
//    3. El servidor compara los hashes y responde { ok: true } o { ok: false }
//    4. Si ok: true:
//       → Feedback verde en el botón + scroll a #mensajes.
//    5. Si ok: false:
//       → Se muestra el mensaje de error rojo.
//       → Se añade la clase "sacudir" a .login-caja para la animación.
//       → La clase se quita 500 ms después para que pueda repetirse.
// =============================================================

// Referencias a los elementos del formulario de login
// NOTA: las credenciales ya no viven aquí — están en server.js como hashes SHA-256
const btnLogin      = document.getElementById("btnLogin")
const inputUsuario  = document.getElementById("inputUsuario")
const inputPassword = document.getElementById("inputPassword")
const loginError    = document.getElementById("loginError")
const loginCaja     = document.querySelector(".login-caja")

// Función que ejecuta la lógica de login — se llama desde el clic del botón
// y también desde el evento "Enter" en los inputs
async function intentarLogin() {
  // Leemos y limpiamos espacios al inicio/fin del valor de cada campo
  const usuario  = inputUsuario.value.trim()
  const password = inputPassword.value

  // Validación básica en el cliente antes de enviar la petición
  if (!usuario || !password) {
    loginError.textContent   = "Por favor completa los dos campos."
    loginError.style.display = "block"
    return
  }

  // Deshabilitamos el botón mientras espera la respuesta del servidor
  btnLogin.disabled    = true
  btnLogin.textContent = "Verificando…"

  try {
    // ==========================================================
    //  fetch POST a /api/login
    //
    //  Enviamos usuario y password en el body como JSON.
    //  El servidor (server.js) los hashea y compara allá.
    //  Aquí NUNCA comparamos nada — solo enviamos y esperamos.
    //
    //  En F12 → Network verás esta petición con los valores
    //  en texto, pero el servidor los hashea antes de comparar.
    // ==========================================================
    const res  = await fetch("/api/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ usuario, password })
    })

    const datos = await res.json()   // parseamos la respuesta del servidor

    if (datos.ok) {
      // Credenciales correctas según el servidor
      loginError.style.display = "none"

      // Feedback visual en el botón: verde + checkmark
      btnLogin.textContent         = "✓ Acceso concedido"
      btnLogin.style.background    = "#16a34a"
      btnLogin.style.pointerEvents = "none"

    
      

    } else {
      // El servidor rechazó las credenciales (401)
      loginError.textContent   = datos.mensaje || "Usuario o contraseña incorrectos."
      loginError.style.display = "block"

      loginCaja.classList.add("sacudir")
      setTimeout(() => loginCaja.classList.remove("sacudir"), 500)

      btnLogin.disabled    = false
      btnLogin.textContent = "Iniciar sesión"
      inputUsuario.focus()
    }

  } catch (err) {
    // Error de red: el servidor no respondió
    console.error("Error al conectar con el servidor:", err)
    loginError.textContent   = "No se pudo conectar con el servidor. ¿Está corriendo npm run sitio?"
    loginError.style.display = "block"
    btnLogin.disabled    = false
    btnLogin.textContent = "Iniciar sesión"
  }
}

// Escuchamos el clic en el botón "Iniciar sesión"
btnLogin.addEventListener("click", intentarLogin)

// También permitimos que el usuario presione Enter desde los campos de texto.
// keydown es más confiable que keyup en formularios para este tipo de acción.
inputUsuario.addEventListener("keydown",  (e) => { if (e.key === "Enter") intentarLogin() })
inputPassword.addEventListener("keydown", (e) => { if (e.key === "Enter") intentarLogin() })


// =============================================================
//  BLOQUE B — FUNCIÓN GENÉRICA: crearCarrusel
//
//  Construye un carrusel deslizable dentro de los elementos del DOM
//  que se le indiquen. Tanto mensajes como calendario la usan.
//
//  Parámetros:
//    items         → array de objetos con los datos a mostrar
//    renderTarjeta → función que convierte un item en HTML string
//    options       → objeto de configuración con los ids y ajustes:
//      trackId       → id del <div> que se desplaza con translateX
//      indicadoresId → id del contenedor de los puntos (dots)
//      btnPrevId     → id del botón ← (anterior)
//      btnNextId     → id del botón → (siguiente)
//      autoplay      → true = avanza solo | false = solo manual
//      duracionMs    → milisegundos entre slides (solo si autoplay: true)
//      barraId       → id de la barra de progreso (solo si autoplay: true)
// =============================================================
function crearCarrusel(items, renderTarjeta, options) {

  // Obtenemos referencias a los elementos del DOM que vamos a manipular
  const track       = document.getElementById(options.trackId)
  const indicadores = document.getElementById(options.indicadoresId)

  // Limpiamos el contenido previo por si la función se llama más de una vez
  track.innerHTML       = ""
  indicadores.innerHTML = ""

  // indice → número de la tarjeta actualmente visible (comienza en 0)
  let indice    = 0
  // intervalo → guarda el temporizador del autoplay para poder cancelarlo
  let intervalo = null

  // ----- Construcción de tarjetas e indicadores -----
  // Por cada item del array, creamos una tarjeta y su punto indicador
  items.forEach((item, i) => {

    // Creamos la tarjeta y le inyectamos el HTML que devuelve renderTarjeta
    const tarjeta = document.createElement("div")
    tarjeta.classList.add("tarjeta-carrusel")
    tarjeta.innerHTML = renderTarjeta(item, i, items.length)
    track.appendChild(tarjeta)

    // Creamos el punto indicador (●) correspondiente a esta tarjeta
    const dot = document.createElement("button")
    dot.classList.add("indicador")
    if (i === 0) dot.classList.add("activo")   // el primer punto arranca activo
    dot.setAttribute("aria-label", `Ir al elemento ${i + 1}`)
    dot.addEventListener("click", () => {
      // Al hacer clic en un punto, reiniciamos el autoplay (si lo hay)
      // para que el contador de 15 s empiece desde cero con el nuevo slide
      if (options.autoplay) reiniciarAutoplay()
      irA(i)
    })
    indicadores.appendChild(dot)
  })


  // ----- irA: mueve el carrusel al índice indicado -----
  function irA(nuevo) {
    indice = nuevo

    // translateX desplaza el track horizontalmente:
    // índice 0 → 0%, índice 1 → -100%, índice 2 → -200%, etc.
    track.style.transform = `translateX(-${indice * 100}%)`

    // Actualizamos cuál punto indicador tiene la clase "activo"
    document.querySelectorAll(`#${options.indicadoresId} .indicador`)
      .forEach((dot, i) => dot.classList.toggle("activo", i === indice))

    // Reiniciamos la barra de progreso al cambiar de slide
    if (options.autoplay && options.barraId) reiniciarBarra()
  }


  // ----- reiniciarBarra: reinicia la animación de la barra de progreso -----
  // La barra va de 0% a 100% en `duracionMs` milisegundos para que
  // el usuario vea cuánto falta para el próximo cambio automático.
  function reiniciarBarra() {
    const barra = document.getElementById(options.barraId)
    if (!barra) return

    // Quitamos la transición brevemente para que el ancho vuelva a 0% sin animación
    barra.style.transition = "none"
    barra.style.width      = "0%"

    // void barra.offsetWidth fuerza al navegador a "leer" el estado actual del DOM
    // antes de aplicar la nueva transición — sin esto, el reset visual no ocurre
    void barra.offsetWidth

    // Reactivamos la transición y la mandamos al 100% (se animará en duracionMs)
    barra.style.transition = `width ${options.duracionMs}ms linear`
    barra.style.width      = "100%"
  }


  // ----- iniciarAutoplay: arranca el temporizador automático -----
  function iniciarAutoplay() {
    if (!options.autoplay) return   // si no tiene autoplay, no hacemos nada

    reiniciarBarra()   // arrancamos la barra desde el principio

    // setInterval ejecuta la función cada duracionMs milisegundos.
    // % items.length hace que al llegar al último slide vuelva al primero (ciclo infinito).
    intervalo = setInterval(() => {
      irA((indice + 1) % items.length)
    }, options.duracionMs)
  }


  // ----- reiniciarAutoplay: cancela el temporizador y lo vuelve a arrancar -----
  // Se llama cuando el usuario navega manualmente para que el conteo
  // de 15 s empiece de cero, evitando saltos inesperados.
  function reiniciarAutoplay() {
    clearInterval(intervalo)   // cancelamos el temporizador actual
    iniciarAutoplay()          // arrancamos uno nuevo desde 0
  }


  // ----- Botones de navegación manual (← y →) -----
  document.getElementById(options.btnPrevId).addEventListener("click", () => {
    if (options.autoplay) reiniciarAutoplay()
    // Si estamos en el primer slide (índice 0) y retrocedemos, vamos al último
    irA((indice - 1 + items.length) % items.length)
  })

  document.getElementById(options.btnNextId).addEventListener("click", () => {
    if (options.autoplay) reiniciarAutoplay()
    // Si estamos en el último slide y avanzamos, volvemos al primero
    irA((indice + 1) % items.length)
  })


  // Iniciamos el autoplay al construir el carrusel (solo si está activado)
  iniciarAutoplay()
}


// =============================================================
//  FUNCIÓN: renderMensaje
//
//  Convierte un objeto `msg` del JSON /api/mensajes en el HTML
//  interno de una tarjeta del carrusel de mensajes.
//
//  Campos esperados del objeto JSON:
//    titulo, mensaje, fecha, categoria, audiencia, tono,
//    revisionEditorial, llamadoAccion, fuente
// =============================================================
function renderMensaje(msg, i, total) {

  // Formateamos la fecha en español colombiano si existe y no es "Pendiente"
  // toLocaleDateString con "es-CO" devuelve p. ej. "15 de mayo de 2025"
  const fechaTexto = msg.fecha && msg.fecha !== "Pendiente por definir"
    ? new Date(msg.fecha).toLocaleDateString("es-CO", {
        year: "numeric", month: "long", day: "numeric"
      })
    : "Fecha por confirmar"

  // Retornamos el HTML completo de la tarjeta como string de plantilla
  return `
    <!-- Contador de posición: "Mensaje 01 de 03" -->
    <p class="carrusel-numero">Mensaje ${String(i + 1).padStart(2, "0")} de ${total}</p>

    <!-- Badge (etiqueta) dorada con la fecha del mensaje -->
    <div class="msg-fecha-badge">📅 ${fechaTexto}</div>

    <!-- Título principal del mensaje -->
    <h3 class="carrusel-semana-dia">${msg.titulo}</h3>

    <!-- Cuerpo del mensaje con línea vertical decorativa a la izquierda -->
    <p class="msg-cuerpo">${msg.mensaje}</p>

    <!-- Grid de metadatos: categoría, audiencia, tono, revisión editorial -->
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
        <!-- ?? "—" significa: si el campo no existe o es undefined, muestra un guión -->
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
//  FUNCIÓN: renderCalendario
//
//  Convierte un objeto `pieza` del JSON /api/calendario en el HTML
//  interno de una tarjeta del carrusel del calendario editorial.
//
//  Campos esperados del objeto JSON:
//    semana, dia, tema, pieza, canal, publicoObjetivo,
//    proposito, llamadoAccion
// =============================================================
function renderCalendario(pieza, i, total) {
  return `
    <!-- Contador de posición: "Pieza 01 de 06" -->
    <p class="carrusel-numero">Pieza ${String(i + 1).padStart(2, "0")} de ${total}</p>

    <!-- Encabezado de la tarjeta: semana y día separados por un punto centrado -->
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
      <!-- grid-column: 1/-1 hace que este campo ocupe las dos columnas del grid -->
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
//  BLOQUE C — SECCIÓN MENSAJES: Cargar datos + Toggle
//
//  Comportamiento del botón "Cargar mensajes":
//    - 1er clic: fetch a /api/mensajes → construye el carrusel → muestra.
//    - Clic siguiente: alterna entre colapsar y expandir el carrusel
//      sin volver a hacer fetch (los datos ya están en el DOM).
//
//  El carrusel de mensajes es MANUAL (autoplay: false).
// =============================================================
const btnMensajes         = document.getElementById("btnMensajes")
const contenedorMensajes  = document.getElementById("contenedorMensajes")
const mensajesPlaceholder = document.getElementById("mensajesPlaceholder")

// Bandera para saber si los datos ya fueron cargados al menos una vez
let mensajesCargados = false

btnMensajes.addEventListener("click", async () => {

  // --- Toggle (solo si los datos ya están cargados) ---
  if (mensajesCargados) {
    // classList.toggle añade la clase si no está, la quita si ya estaba.
    // "colapsado" activa la animación de cierre en el CSS (max-height → 0).
    const colapsado = contenedorMensajes.classList.toggle("colapsado")

    // Actualizamos el texto del botón según el estado actual
    btnMensajes.textContent = colapsado ? "▶ Mostrar mensajes" : "▲ Ocultar mensajes"

    // La clase "abierto" pone el botón gris cuando el carrusel está visible
    btnMensajes.classList.toggle("abierto", !colapsado)
    return   // salimos, no necesitamos hacer fetch de nuevo
  }

  // --- Primera carga ---
  btnMensajes.disabled    = true
  btnMensajes.textContent = "Cargando…"

  try {
    // fetch hace una petición HTTP GET al servidor Express (server.js)
    // El servidor lee /data/mensajes.json y lo devuelve como JSON
    const res      = await fetch("/api/mensajes")
    const mensajes = await res.json()   // parseamos la respuesta a array JS

    // Ocultamos el texto provisional y mostramos el contenedor del carrusel
    mensajesPlaceholder.style.display = "none"
    contenedorMensajes.style.display  = "block"

    // Construimos el carrusel con la función genérica del Bloque B
    // autoplay: false → solo el usuario puede navegar con las flechas
    crearCarrusel(mensajes, renderMensaje, {
      trackId:       "mensajesTrack",       // <div> que se desplaza
      indicadoresId: "mensajesIndicadores", // contenedor de los puntos
      btnPrevId:     "btnMsgPrev",          // botón ←
      btnNextId:     "btnMsgNext",          // botón →
      autoplay:      false                  // SIN avance automático
    })

    // Marcamos que los datos están cargados para que el próximo clic sea un toggle
    mensajesCargados        = true
    btnMensajes.disabled    = false
    btnMensajes.textContent = "▲ Ocultar mensajes"
    btnMensajes.classList.add("abierto")   // botón gris = carrusel abierto

  } catch (err) {
    // Si el servidor falla o no hay conexión, mostramos el error al usuario
    console.error("Error cargando mensajes:", err)
    mensajesPlaceholder.textContent   = "No fue posible cargar los mensajes. Revisa que el servidor esté funcionando."
    mensajesPlaceholder.style.display = "block"
    btnMensajes.textContent = "Reintentar"
    btnMensajes.disabled    = false
  }
})


// =============================================================
//  BLOQUE D — SECCIÓN CALENDARIO: Cargar datos + Toggle
//
//  Igual que mensajes, pero con autoplay activo (15 s) y
//  lógica extra para pausar/reanudar la barra de progreso
//  cuando el usuario colapsa el carrusel.
// =============================================================
const btnCalendario         = document.getElementById("btnCalendario")
const contenedorCalendario  = document.getElementById("contenedorCalendario")
const calendarioPlaceholder = document.getElementById("calendarioPlaceholder")

// Bandera para saber si el calendario ya fue cargado
let calendarioCargado = false

btnCalendario.addEventListener("click", async () => {

  // --- Toggle (solo si el calendario ya está cargado) ---
  if (calendarioCargado) {
    const colapsado = contenedorCalendario.classList.toggle("colapsado")
    btnCalendario.textContent = colapsado ? "▶ Mostrar calendario" : "▲ Ocultar calendario"
    btnCalendario.classList.toggle("abierto", !colapsado)

    if (colapsado) {
      // Al colapsar: detenemos visualmente la barra de progreso.
      // El intervalo del autoplay sigue corriendo internamente en crearCarrusel,
      // pero la barra la podemos congelar directamente desde aquí.
      const barra = document.getElementById("barraRelleno")
      if (barra) {
        barra.style.transition = "none"
        barra.style.width      = "0%"
      }
    } else {
      // Al volver a expandir: simulamos un clic en "siguiente" para que
      // la barra arranque de nuevo desde el slide actual.
      // Esto invoca la lógica de reiniciarAutoplay dentro de crearCarrusel.
      document.getElementById("btnNext").click()
    }
    return
  }

  // --- Primera carga ---
  btnCalendario.disabled    = true
  btnCalendario.textContent = "Cargando…"

  try {
    // Pedimos los datos al servidor (lee /data/calendario-editorial.json)
    const res    = await fetch("/api/calendario")
    const piezas = await res.json()

    calendarioPlaceholder.style.display = "none"
    contenedorCalendario.style.display  = "block"

    // Construimos el carrusel con autoplay activado
    // duracionMs: 15000 → cambia de tarjeta cada 15 segundos
    // barraId → id de la barra que visualiza el tiempo restante
    crearCarrusel(piezas, renderCalendario, {
      trackId:       "carruselTrack",  // <div> que se desplaza
      indicadoresId: "indicadores",    // contenedor de los puntos
      btnPrevId:     "btnPrev",        // botón ←
      btnNextId:     "btnNext",        // botón →
      autoplay:      true,             // CON avance automático
      duracionMs:    15000,            // 15 segundos por tarjeta
      barraId:       "barraRelleno"    // barra de progreso visual
    })

    calendarioCargado         = true
    btnCalendario.disabled    = false
    btnCalendario.textContent = "▲ Ocultar calendario"
    btnCalendario.classList.add("abierto")

  } catch (err) {
    // Si el servidor falla, mostramos el error
    console.error("Error cargando calendario:", err)
    calendarioPlaceholder.textContent   = "No fue posible cargar el calendario. Revisa que el servidor esté funcionando."
    calendarioPlaceholder.style.display = "block"
    btnCalendario.textContent = "Reintentar"
    btnCalendario.disabled    = false
  }
})


// =============================================================
//  BLOQUE E — NAVEGACIÓN ACTIVA (IntersectionObserver)
//
//  Resalta automáticamente el link del header que corresponde
//  a la sección actualmente visible en la pantalla.
//
//  IntersectionObserver es una API nativa del navegador que
//  llama a una función cada vez que un elemento entra o sale
//  del área visible (viewport). Es más eficiente que escuchar
//  el evento "scroll" y calcular posiciones manualmente.
//
//  threshold: 0.3 → la sección debe estar al menos 30% visible
//  para considerarse "activa".
// =============================================================

// Seleccionamos todos los links de navegación del header
const navLinks = document.querySelectorAll(".nav-link")

// Función que actualiza cuál link tiene la clase "activo"
function activarLink(id) {
  navLinks.forEach(link => {
    // El atributo href del link es "#login", "#mensajes" o "#calendario"
    // slice(1) quita el "#" del inicio para comparar con el id de la sección
    link.classList.toggle("activo", link.getAttribute("href").slice(1) === id)
  })
}

// Creamos el observer que vigila las tres secciones principales
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    // Solo actualizamos si la sección está entrando al viewport (isIntersecting: true)
    if (entry.isIntersecting) {
      activarLink(entry.target.id)
    }
  })
}, { threshold: 0.3 })   // 30% de la sección debe ser visible

// Le decimos al observer qué secciones vigilar
document.querySelectorAll("#login, #mensajes, #calendario").forEach(sec => {
  observer.observe(sec)
})
