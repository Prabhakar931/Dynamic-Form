require('dotenv').config()
const express = require('express')
const cors = require('cors')
const pool = require('./db')
const morgan = require('morgan');

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ message: 'Dynamic Form API is running' })
})

const organisationRoutes = require('./routes/organisation')
const formRoutes = require('./routes/form')
const sectionRoutes = require('./routes/section')
const fieldRoutes = require('./routes/field')
const optionRoutes = require('./routes/option')
const matrixRoutes = require('./routes/matrix')
const submissionRoutes = require('./routes/submission')

app.use('/api/organisations', organisationRoutes)
app.use('/api/forms', formRoutes)
app.use('/api/sections', sectionRoutes)
app.use('/api/fields', fieldRoutes)
app.use('/api/options', optionRoutes)
app.use('/api/matrix', matrixRoutes)
app.use('/api/submissions', submissionRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app
