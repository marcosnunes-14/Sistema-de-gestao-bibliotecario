import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Users, ArrowLeftRight, Boxes, AlertTriangle, RefreshCw } from 'lucide-react'
import { apiRequest, getAccessToken } from '../api/client'

const shortcuts = [
  { label: 'Alunos', description: 'Cadastro e consulta', path: '/alunos', icon: Users },
  { label: 'Livros', description: 'Catálogo da biblioteca', path: '/livros', icon: BookOpen },
  { label: 'Empréstimos', description: 'Circulação do acervo', path: '/emprestimos', icon: ArrowLeftRight },
  { label: 'Estoque', description: 'Exemplares do acervo', path: '/estoque', icon: Boxes },
]

export function Inicio() {
  const [summary, setSummary] = useState(null)
  const [overdue, setOverdue] = useState([])
  const [recentLoans, setRecentLoans] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function fetchAll(path) {
    const pageSize = 100
    const records = []
    let page = 1
    let pageRecords
    do {
      const separator = path.includes('?') ? '&' : '?'
      pageRecords = await apiRequest(`${path}${separator}page=${page}&page_size=${pageSize}`)
      records.push(...pageRecords)
      page += 1
    } while (pageRecords.length === pageSize)
    return records
  }

  async function loadOverview() {
    setLoading(true)
    setError('')
    const results = await Promise.allSettled([
      fetchAll('/api/alunos'),
      fetchAll('/api/livros'),
      fetchAll('/api/estoque/exemplares'),
      fetchAll('/api/emprestimos/ativos'),
      fetchAll('/api/emprestimos/atrasados'),
      fetchAll('/api/emprestimos'),
    ])
    const [students, books, copies, active, overdueLoans, loans] = results
    const value = (result) => result.status === 'fulfilled' ? result.value : null
    const studentsValue = value(students)
    const booksValue = value(books)
    const copiesValue = value(copies)
    const activeValue = value(active)
    const overdueValue = value(overdueLoans)
    const loansValue = value(loans)
    setSummary({
      alunos: studentsValue?.length,
      livros: booksValue?.length,
      exemplares: copiesValue?.filter((copy) => copy.situacao === 'disponivel').length,
      emprestimos: activeValue?.length,
      atrasados: overdueValue?.length,
    })
    setOverdue(overdueValue?.slice(0, 5) || [])
    setRecentLoans(loansValue?.slice(0, 5) || [])
    if (results.some((result) => result.status === 'rejected')) setError('Parte da visão geral não pôde ser carregada.')
    setLoading(false)
  }

  useEffect(() => {
    if (getAccessToken()) loadOverview()
  }, [])

  return (
    <section className="home-page">
      <div className="home-intro">
        <p className="eyebrow">Sistema administrativo</p>
        <h1>Biblioteca Escolar</h1>
        <p>Controle diário do acervo e do atendimento da biblioteca.</p>
      </div>
      <div className="home-rule" />
      <div className="home-section-header">
        <h2>Acesso rápido</h2>
        <span>Principais áreas do sistema</span>
      </div>
      <div className="shortcut-list">
        {shortcuts.map(({ label, description, path, icon: Icon }) => (
          <Link className="shortcut" to={path} key={path}>
            <span className="shortcut-icon"><Icon size={19} strokeWidth={1.7} /></span>
            <span className="shortcut-copy"><strong>{label}</strong><small>{description}</small></span>
            <ArrowRight className="shortcut-arrow" size={17} />
          </Link>
        ))}
      </div>
      <div className="home-section-header stats-header">
        <h2>Visão geral</h2>
        <button className="home-refresh" onClick={loadOverview} disabled={loading} title="Atualizar visão geral"><RefreshCw size={14} /> {loading ? 'Atualizando...' : 'Atualizar'}</button>
      </div>
      {error && <div className="feedback error" role="alert">{error}</div>}
      {!getAccessToken() ? <div className="home-note">Faça login para consultar os dados da biblioteca.</div> : <>
        <div className="stats-strip stats-strip-five">
          <div><span>Alunos cadastrados</span><strong>{summary?.alunos ?? '—'}</strong></div>
          <div><span>Livros cadastrados</span><strong>{summary?.livros ?? '—'}</strong></div>
          <div><span>Exemplares disponíveis</span><strong>{summary?.exemplares ?? '—'}</strong></div>
          <div><span>Empréstimos ativos</span><strong>{summary?.emprestimos ?? '—'}</strong></div>
          <div><span>Empréstimos atrasados</span><strong>{summary?.atrasados ?? '—'}</strong></div>
        </div>
        <div className="home-lower-grid">
          <section className="home-list-section">
            <div className="home-section-header"><h2>Empréstimos que precisam de atenção</h2><Link to="/emprestimos?filtro=atrasados">Ver atrasados</Link></div>
            {overdue.length ? <div className="home-loan-list">{overdue.map((loan) => <div className="home-loan-row" key={loan.id}><AlertTriangle size={16} /><div><strong>{loan.aluno_nome}</strong><span>{loan.livro_titulo} · devolução prevista em {new Intl.DateTimeFormat('pt-BR').format(new Date(loan.data_prevista_devolucao))}</span></div><span className="stock-badge indisponível">Atrasado</span></div>)}</div> : <div className="home-empty-line">Nenhum empréstimo atrasado.</div>}
          </section>
          <section className="home-list-section">
            <div className="home-section-header"><h2>Empréstimos recentes</h2><Link to="/emprestimos">Ver todos</Link></div>
            {recentLoans.length ? <div className="home-loan-list">{recentLoans.map((loan) => <div className="home-loan-row" key={loan.id}><ArrowLeftRight size={16} /><div><strong>{loan.livro_titulo}</strong><span>{loan.aluno_nome} · {new Intl.DateTimeFormat('pt-BR').format(new Date(loan.data_emprestimo))}</span></div><span className={`loan-status ${loan.situacao}`}>{loan.situacao}</span></div>)}</div> : <div className="home-empty-line">Nenhum empréstimo registrado.</div>}
          </section>
        </div>
      </>}
    </section>
  )
}
