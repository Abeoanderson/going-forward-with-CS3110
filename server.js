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
const db = new sqlite3.Database('./users.db', (err) => {
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
app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/views'))
app.use(express.urlencoded({ extended: true })) // Fix for req.body
app.use(express.json())
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false
}))

// Home page
app.get('/', (req, res) => {
    const user = req.session.user
    if (!user) return res.redirect('/login')

    db.all(`SELECT * FROM meals WHERE user_id = ?`, [user.id], (err, meals) => {
        if (err) return res.status(500).send("DB error")

        const totalCalories = meals.reduce((acc, meal) => acc + parseInt(meal.cal), 0)
        res.render('index', { user: user.name, meals, totalCalories })
    })
})

// Register page
app.get('/register', (req, res) => {
    db.all('SELECT * FROM users', (err, rows) => {
        if (err) return res.status(500).send("Database error")
        res.render('new', { users: rows })
    })
})

// Login page
app.get('/login', (req, res) => {
    res.render('login')
})

// Register POST
app.post('/register', async (req, res) => {
    const { name, password } = req.body
    if (!name || !password) {
        return res.redirect('/register')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    db.run(`INSERT INTO users (name, password) VALUES (?, ?)`, [name, hashedPassword], function (err) {
        if (err) {
            console.error("Register error:", err.message)
            return res.redirect('/register')
        }
        console.log("User registered:", name)
        res.redirect('/login')
    })
})

// Delete user
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

// Login POST
app.post('/login', (req, res) => {
    console.log(req.body)
    const { name, password } = req.body

    if (!name || !password) {
        return res.status(400).send("Missing login fields")
    }

    db.get(`SELECT * FROM users WHERE name = ?`, [name], async (err, user) => {
        if (err) {
            console.error("DB error:", err.message)
            return res.status(500).send("Database error")
        }
        if (!user) {
            return res.status(400).send("Cannot find user")
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
                console.log("User logged in:", name)
                req.session.user = { id: user.id, name: user.name } // Save in session
                res.redirect("/")
            } else {
                res.send('Incorrect password')
            }
        } catch (err) {
            console.error("Login error:", err)
            res.status(500).send("Login failed")
        }
    })
})
//logout function
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.send("Logout error")
        res.redirect('/login')
    })
})
//meal push 

app.post('/meals', (req, res) => {
    console.log(req.body)
    const user = req.session.user
    if (!user) return res.redirect('/login')

    const { Meal, Cal } = req.body
    const id = uuidv4()

    db.run(`INSERT INTO meals (id, name, cal, user_id) VALUES (?, ?, ?, ?)`, [id, Meal, Cal, user.id], (err) => {
        if (err) return res.status(500).send("Error adding meal")
    
        broadcast({ type: 'new_meal', userId: user.id }) // 👈 notify others
        res.redirect('/')
    })
})
// Server start
server.listen(3000, () => console.log("http://localhost:3000"))


