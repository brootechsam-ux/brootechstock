import { useEffect, useState } from 'react'
import { Route, Switch, useLocation } from 'wouter'
import { supabase } from '@/lib/supabase'
import { InventoryProvider } from '@/contexts/InventoryContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import Products from '@/pages/Products'
import Movements from '@/pages/Movements'
import Reports from '@/pages/Reports'
import UpdatePassword from '@/pages/UpdatePassword'
import VerifyOTP from '@/pages/VerifyOTP'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'
import { Toaster } from 'sonner'

function Router() {
  const [, navigate] = useLocation()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
      
      // Se não houver usuário e não estivermos na página de login ou recuperação, redireciona
      const currentPath = window.location.pathname
      if (!user && currentPath !== '/login' && currentPath !== '/update-password' && currentPath !== '/verify-otp' && currentPath !== '/forgot-password' && currentPath !== '/reset-password') {
        navigate('/login')
      }
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user)
      
      // Caso especial: o evento PASSWORD_RECOVERY redireciona para a página de update
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password')
      } else if (!session?.user && window.location.pathname !== '/update-password' && window.location.pathname !== '/verify-otp' && window.location.pathname !== '/forgot-password' && window.location.pathname !== '/reset-password') {
        navigate('/login')
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [navigate])

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Broo Stock...</p>
      </div>
    )
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/verify-otp" component={VerifyOTP} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/update-password" component={UpdatePassword} />
      {isAuthenticated && (
        <>
          <Route path="/" component={Home} />
          <Route path="/products" component={Products} />
          <Route path="/movements" component={Movements} />
          <Route path="/reports" component={Reports} />
        </>
      )}
      <Route path="*" component={() => <div className="p-6">Página não encontrada</div>} />
    </Switch>
  )
}

function App() {
  return (
    <ThemeProvider>
      <InventoryProvider>
        <Toaster richColors position="top-right" />
        <Router />
      </InventoryProvider>
    </ThemeProvider>
  )
}

export default App
