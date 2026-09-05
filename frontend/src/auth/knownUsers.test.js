import { beforeEach, describe, expect, it } from 'vitest'
import { forgetUser, getKnownUsers, rememberUser } from './knownUsers'

describe('usuários conhecidos', () => {
  beforeEach(() => localStorage.clear())

  it('guarda somente identificação, nunca senha ou token', () => {
    rememberUser({ id: 1, nome: 'Maria', username: 'maria', senha: 'segredo', access_token: 'token' })
    const stored = JSON.parse(localStorage.getItem('biblioteca_known_users'))
    expect(stored).toEqual([{ id: 1, nome: 'Maria', username: 'maria' }])
  })

  it('permite remover uma conta conhecida', () => {
    rememberUser({ id: 1, nome: 'Maria', username: 'maria' })
    expect(forgetUser('maria')).toEqual([])
    expect(getKnownUsers()).toEqual([])
  })
})