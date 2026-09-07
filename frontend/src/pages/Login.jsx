import { useState } from 'react'
import { LogIn, UserRound, X } from 'lucide-react'
import { apiRequest } from '../api/client'
import { forgetUser, getKnownUsers, rememberUser } from '../auth/knownUsers'
import { storeSessionUser } from '../auth/session'

const OTHER_USER = '__other__'

export function Login({ onLogin, notice }) {
  const [knownUsers, setKnownUsers] = useState(getKnownUsers)
  const [selectedUser, setSelectedUser] = useState(knownUsers[0]?.username || OTHER_USER)
  const [username, setUsername] = useState('')
  const [senha, setSenha] = useState('')
  const [error, setError] = useState(notice || '')
  const [loading, setLoading] = useState(false)

  const selectedKnownUser = knownUsers.find((user) => user.username === selectedUser)
  const usingOtherUser = selectedUser === OTHER_USER

  function selectUser(event) {
    const value = event.target.value
    setSelectedUser(value)
    setUsername(value === OTHER_USER ? '' : value)
    setSenha('')
    setError('')
  }

  function removeUser(event, user) {
    event.stopPropagation()
    const nextUsers = forgetUser(user.username)
    setKnownUsers(nextUsers)
    if (selectedUser === user.username) {
      setSelectedUser(nextUsers[0]?.username || OTHER_USER)
      setUsername(nextUsers[0] ? '' : '')
    }
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    const loginUsername = usingOtherUser ? username.trim() : selectedKnownUser?.username
    if (!loginUsername) {
      setError('Informe o usuário para entrar.')
      return
    }
    setLoading(true)
    try {
      const tokenResponse = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: loginUsername, senha }),
        skipAuthRedirect: true,
      })
      sessionStorage.setItem('biblioteca_access_token', tokenResponse.access_token)
      const user = await apiRequest('/api/auth/me')
      storeSessionUser(user)
      rememberUser(user)
      onLogin(user)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível entrar. Verifique usuário e senha.')
      if (requestError.message === 'Usuário inativo.') {
        const nextUsers = forgetUser(loginUsername)
        setKnownUsers(nextUsers)
        setSelectedUser(nextUsers[0]?.username || OTHER_USER)
      }
      sessionStorage.removeItem('biblioteca_access_token')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-heading">
             <img className="login-logo" src="https://imgs.search.brave.com/YWizr6FdbZHDvD2Pv9Dvwn5V-4-th7Rmhe_MlynNMGk/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FkL0JyYXMlQzMl/QTNvX2RvX1BpYXUl/QzMlQUQuc3Zn" alt="Biblioteca Lucimar Gomes" />
          <p className="eyebrow">Sistema de Gestão Bibliotecário</p>
          <h1 id="login-title">Biblioteca Lucimar Gomes</h1>
          <p>Entre para acessar o sistema.</p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label>Usuário</label>
          {knownUsers.length > 0 && (
            <div className="known-user-select">
              <UserRound size={16} />
              <select value={selectedUser} onChange={selectUser} aria-label="Usuário conhecido">
                {knownUsers.map((user) => <option value={user.username} key={user.username}>{user.nome}</option>)}
                <option value={OTHER_USER}>Entrar com outro usuário</option>
              </select>
            </div>
          )}
          {usingOtherUser && <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Informe seu usuário" aria-label="Usuário ou login" required />}
          {selectedKnownUser && <div className="selected-user-note">Login: {selectedKnownUser.username}</div>}
          <label htmlFor="login-password">Senha</label>
          <input id="login-password" type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Digite sua senha" required minLength="8" />
          {error && <div className="feedback error" role="alert">{error}</div>}
          <button className="primary-button login-submit" type="submit" disabled={loading}><LogIn size={16} /> {loading ? 'Entrando...' : 'Entrar'}</button>
          <p className="login-developed-by">Desenvolvido por <img src="/DS%20SYSTEM%202.png" alt="DS System" /></p>
        </form>
        {knownUsers.length > 0 && <div className="known-users-management"><span>Usuários neste computador</span><div>{knownUsers.map((user) => <button key={user.username} onClick={(event) => removeUser(event, user)} title={`Remover ${user.nome}`} aria-label={`Remover ${user.nome} da lista`}><span>{user.nome}</span><X size={13} /></button>)}</div></div>}
      </section>
    </main>
  )
}
