import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, BookOpen, Boxes, CircleHelp, ClipboardList, Home, Library, LogOut, Menu, Users, X } from 'lucide-react'
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
  const [helpOpen, setHelpOpen] = useState(false)
  const [dsSystemOpen, setDsSystemOpen] = useState(false)

  return (
    <div className={`app-shell ${location.pathname === '/inicio' ? 'home-shell' : ''}`}>
      <header className="app-header">
        <div className="topbar">
          <button className="help-button" onClick={() => setHelpOpen(true)} title="Sobre o sistema" aria-label="Sobre o sistema">
            <CircleHelp size={18} strokeWidth={2.5} />
          </button>
          <img className="demerval-logo" src="/DEMERVAL.png" alt="Demerval" />
          <div className="brand" onClick={() => navigate('/inicio')} role="button" tabIndex="0">
            <span className="brand-name">• BLG - Biblioteca Lucimar Gomes</span>
          </div>
          <div className="user-area">
            <span className="connection-status"><span className="status-dot" /><span><small>Perfil conectado</small><strong>{user?.nome || 'Sessão ativa'} · {user?.perfil === 'administrador' ? 'Administrador' : 'Bibliotecário'}</strong></span></span>
            <button className="logout-button" onClick={onLogout} title="Sair"><LogOut size={16} /><span>Sair</span></button>
          </div>
        </div>
        <div className="navigation-bar">
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
                <Icon size={21} strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
        {helpOpen && <div className="help-backdrop" role="presentation" onClick={() => setHelpOpen(false)}>
          <section className="help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setHelpOpen(false)} aria-label="Fechar explicação"><X size={18} /></button>
            <img className="help-logo" src="/SGB.png" alt="SGB" />
            <h2 id="help-title">• SGB - Sistema de Gestão Bibliotecária •</h2>
            <p className="help-lead">O SGB foi inicialmente projetado como um trabalho escolar. No entanto, o desejo de desenvolver algo 100% funcional, capaz de contribuir de verdade para a nossa instituição, falou mais alto. Assim, o projeto evoluiu para um sistema desenvolvido para facilitar e modernizar o gerenciamento da biblioteca.</p>
            <p>O SGB reúne em um só lugar o controle de livros, alunos, empréstimos, devoluções e estoque, tornando as tarefas do dia a dia mais rápidas e organizadas.</p>
            <div className="help-section">
              <h3>Agradecimentos</h3>
              <p>Deixo aqui meus sinceros agradecimentos à nossa bibliotecária pelo enorme incentivo para continuarmos desenvolvendo este projeto, sempre contribuindo com ideias, sugestões e apoio. Sua participação foi essencial para nos motivar a transformar uma simples ideia em algo realmente funcional para a nossa instituição.</p>
              <p className="help-signature">Marcos, 2º A DS</p>
            </div>
            <div className="help-section">
              <h3>Equipe de Desenvolvimento</h3>
              <ul className="help-team">
                <li><strong>Marcos</strong><span>Líder e desenvolvedor do projeto</span></li>
                <li><strong>Benedito</strong><span>Planejamento e Organização do Acervo</span></li>
                <li><strong>Davi</strong><span>Contribuição de Ideias</span></li>
              </ul>
              <button className="ds-system-button" onClick={() => setDsSystemOpen(true)}>Conheça o DS SYSTEM</button>
            </div>
            <button className="primary-button" onClick={() => setHelpOpen(false)}>Entendi</button>
          </section>
        </div>}
        {dsSystemOpen && <div className="help-backdrop" role="presentation" onClick={() => setDsSystemOpen(false)}>
          <section className="help-dialog ds-system-dialog" role="dialog" aria-modal="true" aria-labelledby="ds-system-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setDsSystemOpen(false)} aria-label="Fechar apresentação do DS System"><X size={18} /></button>
            <img className="help-logo" src="/DS SYSTEM 2.png" alt="DS System" />
            <h2 id="ds-system-title">Conheça o DS SYSTEM</h2>
            <p>O <strong>DS SYSTEM</strong> foi criado inicialmente e exclusivamente para o desenvolvimento do <strong>SGB - Sistema de Gestão Bibliotecária</strong>. Porém, durante o desenvolvimento, percebemos que o projeto poderia representar o início de algo maior.</p>
            <p>Nosso objetivo agora é expandir o <strong>DS SYSTEM</strong> para novos projetos, desenvolvendo <strong>sistemas, sites e outras soluções tecnológicas</strong>, colocando em prática os conhecimentos adquiridos no curso de Desenvolvimento de Sistemas.</p>
            <p>Mais do que um grupo criado para um único trabalho escolar, queremos que o <strong>DS SYSTEM</strong> seja a identidade por trás dos nossos projetos atuais e futuros, sempre buscando transformar ideias e necessidades reais em soluções funcionais.</p>
            <button className="primary-button" onClick={() => setDsSystemOpen(false)}>Fechar</button>
          </section>
        </div>}
      </header>
      <main className="page-area">
        <Routes>
          <Route path="/inicio" element={<ProtectedRoute user={user}><Inicio /></ProtectedRoute>} />
          <Route path="/alunos" element={<ProtectedRoute user={user}><Alunos /></ProtectedRoute>} />
          <Route path="/livros" element={<ProtectedRoute user={user}><Livros currentUser={user} /></ProtectedRoute>} />
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
