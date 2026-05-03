import express from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

import authRouter from './routes/auth'
import shopsRouter from './routes/shops'
import appointmentsRouter from './routes/appointments'
import favoritesRouter from './routes/favorites'
import uploadsRouter from './routes/uploads'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

app.use('/api/auth', authRouter)
app.use('/api/shops', shopsRouter)
app.use('/api/appointments', appointmentsRouter)
app.use('/api/favorites', favoritesRouter)
app.use('/api/uploads', uploadsRouter)

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
