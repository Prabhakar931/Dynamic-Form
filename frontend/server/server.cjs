const express = require('express')
const cors = require('cors')
const { createProxyMiddleware } = require('http-proxy-middleware')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3001
const API_URL = 'https://dynamic-from-backend.onrender.com'

app.use(cors())
app.use(express.json())

app.use('/api', createProxyMiddleware({
  target: API_URL,
  changeOrigin: true,
  // pathRewrite: { '^/api': '/api' },
}))

app.use(express.static(path.join(__dirname, '../dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`)
  console.log(`Proxying API requests to ${API_URL}`)
})
