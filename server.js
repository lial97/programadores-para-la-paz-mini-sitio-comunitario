// =============================================================
//  server.js — Servidor Express del Mini-sitio Comunitario
//
//  Rutas disponibles:
//    GET  /api/mensajes   → devuelve mensajes.json
//    GET  /api/calendario → devuelve calendario-editorial.json
//    POST /api/login      → valida credenciales con hash SHA-256
//
//  El login usa crypto (módulo nativo de Node, sin instalar nada).
//  Las contraseñas NUNCA se guardan en texto plano — solo sus hashes.
// =============================================================

const express = require("express")
const fs      = require("fs")
const crypto  = require("crypto")   // módulo nativo de Node.js, no necesita npm install

const app    = express()
const puerto = 3000

// Middleware para parsear JSON en el body de las peticiones POST
app.use(express.json())
// Sirve los archivos estáticos de la carpeta public/ (index.html, app.js, styles.css)
app.use(express.static("public"))


// =============================================================
//  CREDENCIALES — Solo hashes, nunca texto plano
//
//  Estos valores se generaron con:
//    crypto.createHash('sha256').update('admin').digest('hex')
//    crypto.createHash('sha256').update('paz2025').digest('hex')
//
//  Para cambiar las credenciales, genera nuevos hashes con ese
//  comando en la terminal de Node y reemplaza los valores aquí.
// =============================================================
const HASH_USUARIO = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918"
const HASH_PASS    = "fe7b0d47e1186aff5c5b07d6152a928282bb723ac32da905e3895b69ee654093"

// Función auxiliar: convierte un texto a su hash SHA-256 en hexadecimal
function hashear(texto) {
  return crypto.createHash("sha256").update(texto).digest("hex")
}


// =============================================================
//  POST /api/login
//
//  Recibe: { usuario: "...", password: "..." }
//  Proceso:
//    1. Hashea el usuario y password que llegaron
//    2. Compara con los hashes guardados arriba
//    3. Si coinciden → { ok: true }
//    4. Si no        → 401 { ok: false, mensaje: "..." }
//
//  En el navegador (F12 → Network) solo verás los hashes,
//  nunca el texto original de la contraseña.
// =============================================================
app.post("/api/login", (req, res) => {
  // Extraemos usuario y password del cuerpo de la petición
  const { usuario, password } = req.body

  // Validación básica: los dos campos deben llegar
  if (!usuario || !password) {
    return res.status(400).json({ ok: false, mensaje: "Faltan campos obligatorios." })
  }

  // Hasheamos lo que llegó y comparamos con los hashes almacenados
  const usuarioCorrecto  = hashear(usuario)  === HASH_USUARIO
  const passwordCorrecta = hashear(password) === HASH_PASS

  if (usuarioCorrecto && passwordCorrecta) {
    // Login exitoso
    res.json({ ok: true })
  } else {
    // Credenciales incorrectas — 401 Unauthorized
    res.status(401).json({ ok: false, mensaje: "Usuario o contraseña incorrectos." })
  }
})


// =============================================================
//  GET /api/mensajes
//  Devuelve el contenido de data/mensajes.json
// =============================================================
app.get("/api/mensajes", (req, res) => {
  try {
    const mensajes = JSON.parse(fs.readFileSync("data/mensajes.json", "utf-8"))
    res.json(mensajes)
  } catch (error) {
    res.status(500).json({
      mensaje: "No fue posible cargar los mensajes comunitarios.",
      detalle: error.message
    })
  }
})


// =============================================================
//  GET /api/calendario
//  Devuelve el contenido de data/calendario-editorial.json
// =============================================================
app.get("/api/calendario", (req, res) => {
  try {
    const calendario = JSON.parse(fs.readFileSync("data/calendario-editorial.json", "utf-8"))
    res.json(calendario)
  } catch (error) {
    res.status(500).json({
      mensaje: "No fue posible cargar el calendario editorial.",
      detalle: error.message
    })
  }
})


// Captura cualquier ruta no definida y devuelve 404
app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada. Revisa la dirección solicitada." })
})


app.listen(puerto, () => {
  console.log(`Mini-sitio comunitario funcionando en http://localhost:${puerto}`)
  console.log("Proyecto único de Semana 5")
  console.log("Rutas disponibles:")
  console.log("  GET  /api/mensajes")
  console.log("  GET  /api/calendario")
  console.log("  POST /api/login")
})
