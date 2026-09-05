const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// Remove tokens left by the previous permanent-storage implementation.
localStorage.removeItem('biblioteca_access_token')

export async function apiRequest(path, options = {}) {
  const { skipAuthRedirect = false, ...requestOptions } = options
  const token = sessionStorage.getItem('biblioteca_access_token')
  const headers = new Headers(requestOptions.headers)
  headers.set('Accept', 'application/json')
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...requestOptions, headers })
  if (!response.ok) {
    if (response.status === 401 && !skipAuthRedirect && !path.includes('/api/auth/login')) {
      sessionStorage.removeItem('biblioteca_access_token')
      sessionStorage.removeItem('biblioteca_session_user')
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    let detail = `Falha na API: ${response.status}`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') detail = body.detail
      if (Array.isArray(body.detail)) detail = body.detail.map((item) => item.msg).join('. ')
    } catch {
      // Keep the HTTP status when the response is not JSON.
    }
    throw new Error(detail)
  }
  return response.json()
}

export function getAccessToken() {
  return sessionStorage.getItem('biblioteca_access_token')
}
