import { Navigate, Route, Routes } from 'react-router-dom'
import { SessionBootstrap } from './components/SessionBootstrap'
import { AccountPage } from './pages/AccountPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { BanterRoomPage } from './pages/BanterRoomPage'

export default function App() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <SessionBootstrap />
      <main className="container mx-auto py-8 px-4 md:px-8 max-w-7xl">
        <Routes>
          <Route path="/" element={<WorkspacePage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
          <Route path="/room/:joinSlug" element={<BanterRoomPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
