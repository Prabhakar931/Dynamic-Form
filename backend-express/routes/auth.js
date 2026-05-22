const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const auth = require('../middleware/auth')
const router = express.Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' })
  }

  try {
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1',
      [username]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return res.status(401).json({ error: 'Invalid username or password.' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      token,
      user: { id: user.id, username: user.username, name: user.name }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/me', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, name, created_at FROM admin_users WHERE id = $1',
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' })
    }

    res.json({ user: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
