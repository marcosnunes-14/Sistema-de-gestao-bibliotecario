const SESSION_USER_KEY = 'biblioteca_session_user'

export function getStoredSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function storeSessionUser(user) {
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify({
    id: user.id,
    nome: user.nome,
    username: user.username,
    perfil: user.perfil,
  }))
}

export function clearSession() {
  sessionStorage.removeItem('biblioteca_access_token')
  sessionStorage.removeItem(SESSION_USER_KEY)
  localStorage.removeItem('biblioteca_access_token')
}
