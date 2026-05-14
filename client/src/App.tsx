import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { SessionBootstrap } from './components/SessionBootstrap'
import { AccountPage } from './pages/AccountPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { authClient } from './lib/auth-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, BarChart, PlusCircle } from 'lucide-react'

function Navbar() {
  const { data: session } = authClient.useSession()
  const location = useLocation()
  
  const isAuthPage = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password'
  ].includes(location.pathname)

  if (isAuthPage) return null

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8 mx-auto max-w-7xl">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center space-x-2">
            <BarChart className="h-6 w-6 text-primary" />
            <span className="inline-block font-bold text-xl tracking-tight">POLL.IO</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="transition-colors hover:text-primary">Events</Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {session && !session.user.isAnonymous ? (
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                <Link to="/" className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  New Poll
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border transition-all hover:ring-2 hover:ring-primary/20">
                      <AvatarImage src={session.user.image || ''} alt={session.user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {session.user.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="flex items-center cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>Account</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => authClient.signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <SessionBootstrap />
      <Navbar />
      <main className="container mx-auto py-8 px-4 md:px-8 max-w-7xl">
        <Routes>
          <Route path="/" element={<WorkspacePage />} />
          <Route path="/events/:eventId" element={<EventDetailPage />} />
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
