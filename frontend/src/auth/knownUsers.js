const KNOWN_USERS_KEY = 'biblioteca_known_users'

function readKnownUsers() {
  try {
    const value = JSON.parse(localStorage.getItem(KNOWN_USERS_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function getKnownUsers() {
  return readKnownUsers()
}

export function rememberUser(user) {
  const users = readKnownUsers().filter((item) => item.username !== user.username)
  const nextUsers = [{ id: user.id, nome: user.nome, username: user.username }, ...users]
  localStorage.setItem(KNOWN_USERS_KEY, JSON.stringify(nextUsers.slice(0, 10)))
  return nextUsers.slice(0, 10)
}

export function forgetUser(username) {
  const users = readKnownUsers().filter((item) => item.username !== username)
  localStorage.setItem(KNOWN_USERS_KEY, JSON.stringify(users))
  return users
}
