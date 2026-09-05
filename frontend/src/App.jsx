import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, BookOpen, Boxes, ClipboardList, Home, Library, LogOut, Menu, Users, X } from 'lucide-react'
import { apiRequest, getAccessToken } from './api/client'
import { clearSession } from './auth/session'
import { Inicio } from './pages/Inicio'
import { Alunos } from './pages/Alunos'
import { Livros } from './pages/Livros'
import { Estoque } from './pages/Estoque'
import { Login } from './pages/Login'
import { Emprestimos } from './pages/Emprestimos'
import { Usuarios } from './pages/Usuarios'
import { Auditoria } from './pages/Auditoria'
import { Prateleiras } from './pages/Prateleiras'

const navigation = [
  { label: 'Início', path: '/inicio', icon: Home },
  { label: 'Alunos', path: '/alunos', icon: Users },
  { label: 'Livros', path: '/livros', icon: BookOpen },
  { label: 'Empréstimos', path: '/emprestimos', icon: ArrowLeftRight },
  { label: 'Estoque', path: '/estoque', icon: Boxes },
  { label: 'Prateleiras', path: '/prateleiras', icon: Library },
]

function ProtectedRoute({ user, children }) {
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ user, children }) {
  return user?.perfil === 'administrador' ? children : <Navigate to="/inicio" replace />
}

function Shell({ user, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" onClick={() => navigate('/inicio')} role="button" tabIndex="0">
          <span className="brand-mark">BE</span>
          <span className="brand-name">Biblioteca Escolar</span>
        </div>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Menu principal">
          {[...navigation, ...(user?.perfil === 'administrador' ? [{ label: 'Usuários', path: '/usuarios', icon: Users }, { label: 'Auditoria', path: '/auditoria', icon: ClipboardList }] : [])].map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              className={location.pathname === path ? 'nav-item active' : 'nav-item'}
              onClick={() => { navigate(path); setMenuOpen(false) }}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="user-area">
          <span className="connection-status"><span className="status-dot" /><span><strong>{user?.nome || 'Sessão ativa'}</strong><small>{user?.perfil === 'administrador' ? 'Administrador' : 'Bibliotecário'}</small></span></span>
          <button className="logout-button" onClick={onLogout} title="Sair"><LogOut size={17} /><span>Sair</span></button>
        </div>
      </header>
      <main className="page-area">
        <Routes>
          <Route path="/inicio" element={<ProtectedRoute user={user}><Inicio /></ProtectedRoute>} />
          <Route path="/alunos" element={<ProtectedRoute user={user}><Alunos /></ProtectedRoute>} />
          <Route path="/livros" element={<ProtectedRoute user={user}><Livros /></ProtectedRoute>} />
          <Route path="/emprestimos" element={<ProtectedRoute user={user}><Emprestimos /></ProtectedRoute>} />
          <Route path="/estoque" element={<ProtectedRoute user={user}><Estoque /></ProtectedRoute>} />
          <Route path="/prateleiras" element={<ProtectedRoute user={user}><Prateleiras /></ProtectedRoute>} />
          <Route path="/usuarios" element={<AdminRoute user={user}><Usuarios currentUser={user} /></AdminRoute>} />
          <Route path="/auditoria" element={<AdminRoute user={user}><Auditoria /></AdminRoute>} />
          <Route path="/login" element={<Navigate to="/inicio" replace />} />
          <Route path="*" element={<Navigate to={user ? '/inicio' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    function handleUnauthorized() {
      clearSession()
      setUser(null)
      setNotice('Sua sessão expirou. Digite sua senha para entrar novamente.')
      navigate('/login', { replace: true })
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    const token = getAccessToken()
    if (!token) {
      setAuthReady(true)
    } else {
      apiRequest('/api/auth/me').then((currentUser) => {
        setUser(currentUser)
        setAuthReady(true)
      }).catch(() => {
        clearSession()
        setAuthReady(true)
      })
    }
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [navigate])

  function login(currentUser) {
    setUser(currentUser)
    setNotice('')
    navigate('/inicio', { replace: true })
  }

  function logout() {
    clearSession()
    setUser(null)
    setNotice('')
    navigate('/login', { replace: true })
  }

  if (!authReady) return <main className="auth-loading">Verificando sessão...</main>
  if (!user) return <Routes><Route path="*" element={<Login onLogin={login} notice={notice} />} /></Routes>
  return <Shell user={user} onLogout={logout} />
}
