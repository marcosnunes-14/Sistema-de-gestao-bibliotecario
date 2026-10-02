const API_BASE_URL = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')

// Remove tokens left by the previous permanent-storage implementation.
localStorage.removeItem('biblioteca_access_token')

export async function apiRequest(path, options = {}) {
  const { skipAuthRedirect = false, ...requestOptions } = options
  const token = sessionStorage.getItem('biblioteca_access_token')
  const headers = new Headers(requestOptions.headers)
  headers.set('Accept', 'application/json')
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...requestOptions, headers })
  } catch (error) {
    throw new Error('Não foi possível conectar à API. Inicie o backend com: uvicorn app.main:app --reload', { cause: error })
  }
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
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error('A API retornou uma página em vez de dados. Verifique a conexão com o backend.')
  }
  return response.json()
}

export function getAccessToken() {
  return sessionStorage.getItem('biblioteca_access_token')
}

// These endpoints return arrays with at most 100 records per page.
export async function apiListAll(path) {
  const url = new URL(path, window.location.origin)
  url.searchParams.set('page_size', '100')
  const items = []
  for (let page = 1; ; page += 1) {
    url.searchParams.set('page', String(page))
    const batch = await apiRequest(`${url.pathname}${url.search}`)
    if (!Array.isArray(batch)) throw new Error('Resposta de listagem inválida.')
    items.push(...batch)
    if (batch.length < 100) return items
  }
}
