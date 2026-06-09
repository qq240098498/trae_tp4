import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { initDb } from './db.js'
import authRoutes from './routes/auth.js'
import studentsRoutes from './routes/students.js'
import coachesRoutes from './routes/coaches.js'
import schedulesRoutes from './routes/schedules.js'
import attendanceRoutes from './routes/attendance.js'
import statisticsRoutes from './routes/statistics.js'
import alertsRoutes from './routes/alerts.js'
import exportRoutes from './routes/export.js'
import coachPerformanceRoutes from './routes/coach-performance.js'
import evaluationsRoutes from './routes/evaluations.js'
import studentAnalysisRoutes from './routes/student-analysis.js'
import violationsRoutes from './routes/violations.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/students', studentsRoutes)
app.use('/api/coaches', coachesRoutes)
app.use('/api/schedules', schedulesRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/alerts', alertsRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/coach-performance', coachPerformanceRoutes)
app.use('/api/evaluations', evaluationsRoutes)
app.use('/api/student-analysis', studentAnalysisRoutes)
app.use('/api/violations', violationsRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export { initDb }
export default app
