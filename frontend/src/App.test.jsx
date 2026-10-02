import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'

const user = { id: 1, nome: 'Leila Teste', username: 'leila', perfil: 'bibliotecario' }

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: 'reload' }])
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    let body = []
    if (url === '/api/auth/login') body = { access_token: 'test-token', user }
    else if (url === '/api/auth/me') body = user
    else {
      expect(options.headers.get('Authorization')).toBe('Bearer test-token')
      if (url === '/api/estoque/prateleiras') body = [{ id: 1, numero: 1, ativa: true }]
    }
    return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
  }))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('login after reload keeps its token when navigating to shelves and stock', async () => {
  sessionStorage.setItem('biblioteca_access_token', 'expired-token')
  render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>)
  expect(sessionStorage.getItem('biblioteca_access_token')).toBeNull()
  fireEvent.change(screen.getByLabelText('Usuário ou login'), { target: { value: 'leila' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaTeste1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  await screen.findByRole('button', { name: 'Prateleiras' })
  fireEvent.click(screen.getByRole('button', { name: 'Prateleiras' }))
  await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/estoque/prateleiras', expect.any(Object)))
  expect(sessionStorage.getItem('biblioteca_access_token')).toBe('test-token')
  expect(screen.queryByText('Faça login para consultar as prateleiras.')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Estoque' }))
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/estoque/resumo?'), expect.any(Object)))
  expect(sessionStorage.getItem('biblioteca_access_token')).toBe('test-token')
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
  await screen.findByRole('button', { name: 'Entrar' })
  expect(sessionStorage.getItem('biblioteca_access_token')).toBeNull()
})
