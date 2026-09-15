import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Emprestimos } from './Emprestimos'

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}))

vi.mock('../api/client', () => ({
  apiRequest: apiRequestMock,
  getAccessToken: () => 'token',
}))

describe('empréstimos', () => {
  beforeEach(() => {
    apiRequestMock.mockReset()
    apiRequestMock.mockImplementation((url) => {
      if (url === '/api/emprestimos?page=1&page_size=50&situacao=ativo') {
        return Promise.resolve([])
      }
      if (url.startsWith('/api/alunos')) {
        return Promise.resolve([
          { id: 1, nome_completo: 'João Silva', matricula: '2024-01', turma: '3A', ativo: true },
          { id: 2, nome_completo: 'Maria Souza', matricula: '2024-02', turma: '3B', ativo: true },
        ])
      }
      if (url.startsWith('/api/livros')) {
        return Promise.resolve([
          { id: 10, titulo: 'O Pequeno Príncipe', autores: [{ nome: 'Antoine de Saint-Exupéry' }] },
        ])
      }
      if (url.startsWith('/api/estoque/exemplares')) {
        return Promise.resolve([
          { id: 77, codigo: 'C-101', livro_id: 10, situacao: 'disponivel', prateleira_id: 1, secao_id: 1 },
        ])
      }
      return Promise.resolve([])
    })
  })

  it('permite buscar aluno e exemplar manualmente no cadastro de empréstimo', async () => {
    render(<Emprestimos />)

    await waitFor(() => expect(screen.getByRole('button', { name: /novo empréstimo/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /novo empréstimo/i }))

    fireEvent.change(screen.getByLabelText(/^Pesquisar aluno/i), { target: { value: 'João' } })
    fireEvent.click(await screen.findByRole('button', { name: /joão silva/i }))

    expect(screen.getAllByText(/joão silva/i).length).toBeGreaterThan(0)

    const exemplarSearch = screen.getByLabelText(/^Pesquisar exemplar ou livro/i)
    fireEvent.change(exemplarSearch, { target: { value: 'C-101' } })

    expect(exemplarSearch).toHaveValue('C-101')
    expect(screen.getByLabelText(/^Exemplar/i)).toBeInTheDocument()
  })
})
