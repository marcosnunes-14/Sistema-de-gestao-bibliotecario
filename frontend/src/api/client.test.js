import { afterEach, expect, test, vi } from 'vitest'
import { apiListAll, apiRequest } from './client'

afterEach(() => vi.unstubAllGlobals())

test('loads records beyond page one, preserving filters', async () => {
  vi.stubGlobal('fetch', vi.fn(async (path) => {
    const url = new URL(path, 'http://localhost')
    expect(url.searchParams.get('livro_id')).toBe('17')
    expect(url.searchParams.get('page_size')).toBe('100')
    const page = Number(url.searchParams.get('page'))
    return new Response(JSON.stringify(page === 1 ? Array.from({ length: 100 }, (_, id) => ({ id })) : [{ id: 100 }]), { headers: { 'Content-Type': 'application/json' } })
  }))
  expect(await apiListAll('/api/estoque/exemplares?livro_id=17')).toHaveLength(101)
  expect(fetch).toHaveBeenCalledTimes(2)
})

test('reports an HTML response as a backend connection problem', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } })))
  await expect(apiRequest('/api/auth/me')).rejects.toThrow('A API retornou uma página em vez de dados')
})
