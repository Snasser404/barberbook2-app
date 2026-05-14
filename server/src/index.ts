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
import staffRouter from './routes/staff'
import staffExtrasRouter from './routes/staff-extras'
import photosRouter from './routes/photos'
import adminRouter from './routes/admin'
import verificationRouter from './routes/verification'
import supportRouter from './routes/support'
import { ensureAdmin } from './lib/seed-admin'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Upload directory is configurable so production can mount a persistent disk
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')
app.use('/uploads', express.static(uploadDir))

app.use('/api/auth', authRouter)
app.use('/api/shops', shopsRouter)
app.use('/api/appointments', appointmentsRouter)
app.use('/api/favorites', favoritesRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api', staffRouter)
app.use('/api', staffExtrasRouter)
app.use('/api/photos', photosRouter)
app.use('/api/admin', adminRouter)
app.use('/api', verificationRouter)
app.use('/api/support', supportRouter)

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
}

app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`)
  try { await ensureAdmin() } catch (e) { console.error('[admin-seed] failed:', e) }
})
