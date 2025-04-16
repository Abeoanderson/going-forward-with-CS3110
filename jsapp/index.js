const express = require('express')
const bcrypt = require('bcrypt')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const flash = require('express-flash')
const session = require('express-session')
const { v4: uuidv4 } = require('uuid')
const http = require('http')
const WebSocket = require('ws')

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

// DB Setup
const db = new sqlite3.Database('../users.db', (err) => {
    if (err) return console.error(err.message)
    console.log("Connected to SQLite database.")
})

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data))
        }
    })
}

db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    password TEXT
)`)

db.run(`CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY,
    name TEXT,
    cal TEXT,
    user_id INTEGER
)`)

// Middleware
app.use(express.static(path.join(__dirname, '..', 'html')))
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}))

// Pages (Static HTML)
app.get('/', (req, res) => {
    app.use(express.static(path.join(__dirname, '..', 'html')));
})

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'html', 'register.html'))
})

app.get('/login', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'html', 'login.html'))
})

// API routes
app.get('/api/users', (req, res) => {
    db.all('SELECT id, name FROM users', (err, rows) => {
        if (err) return res.status(500).json({ error: "Database error" })
        res.json(rows)
    })
})

app.post('/register', async (req, res) => {
    const { name, password } = req.body
    if (!name || !password) return res.status(400).send("Missing fields")

    const hashedPassword = await bcrypt.hash(password, 10)
    db.run(`INSERT INTO users (name, password) VALUES (?, ?)`, [name, hashedPassword], function (err) {
        if (err) {
            console.error("Register error:", err.message)
            return res.status(400).send("Username already exists")
        }
        console.log("User registered:", name)
        res.redirect('/login')
    })
})

app.post('/delete-user', (req, res) => {
    const { name } = req.body
    db.run(`DELETE FROM users WHERE name = ?`, [name], function (err) {
        if (err) {
            console.error("Delete error:", err.message)
            return res.status(500).send("Error deleting user")
        }
        console.log("User deleted:", name)
        res.redirect('/register')
    })
})

app.post('/api/login', (req, res) => {
    const { name, password } = req.body
    if (!name || !password) return res.status(400).send("Missing login fields")

    db.get(`SELECT * FROM users WHERE name = ?`, [name], async (err, user) => {
        if (err) return res.status(500).send("Database error")
        if (!user) return res.status(400).send("User not found")

        try {
            if (await bcrypt.compare(password, user.password)) {
                req.session.user = { id: user.id, name: user.name }
                res.redirect('/')
            } else {
                res.status(400).send("Incorrect password")
            }
        } catch (err) {
            console.error("Login error:", err)
            res.status(500).send("Login failed")
        }
    })
})

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.send("Logout error")
        res.redirect('/login')
    })
})

app.post('/api/meals', (req, res) => {
    const user = req.session.user
    if (!user) return res.status(401).send("Not logged in")

    const { Meal, Cal } = req.body
    const id = uuidv4()

    db.run(`INSERT INTO meals (id, name, cal, user_id) VALUES (?, ?, ?, ?)`, [id, Meal, Cal, user.id], (err) => {
        if (err) return res.status(500).send("Error adding meal")
        broadcast({ type: 'new_meal', userId: user.id })
        res.redirect('/')
    })
})

app.get('/api/meals', (req, res) => {
    const user = req.session.user
    if (!user || !user.id) return res.status(401).json({ error: 'Not logged in' })

    db.all(`SELECT * FROM meals WHERE user_id = ?`, [user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' })
        res.json(rows)
    })
})

// Server start
server.listen(3000, () => console.log("http://localhost:3000"))
