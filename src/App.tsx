import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store'
import Layout from '@/components/Layout'
import LoginPage from '@/components/LoginPage'
import Dashboard from '@/pages/Dashboard'
import Students from '@/pages/Students'
import StudentDetail from '@/pages/StudentDetail'
import Scheduling from '@/pages/Scheduling'
import Attendance from '@/pages/Attendance'
import Statistics from '@/pages/Statistics'
import Alerts from '@/pages/Alerts'
import ExportPage from '@/pages/ExportPage'
import CoachPerformance from '@/pages/CoachPerformance'
import Evaluations from '@/pages/Evaluations'
import StudentAnalysis from '@/pages/StudentAnalysis'
import Violations from '@/pages/Violations'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <Navigate to="/" replace /> : <>{children}</>
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/:id" element={<StudentDetail />} />
          <Route path="/scheduling" element={<Scheduling />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/coach-performance" element={<CoachPerformance />} />
          <Route path="/evaluations" element={<Evaluations />} />
          <Route path="/student-analysis" element={<StudentAnalysis />} />
          <Route path="/violations" element={<Violations />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
