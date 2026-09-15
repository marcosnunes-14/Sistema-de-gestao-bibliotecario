import { useEffect, useState } from 'react'
import { ArrowLeftRight, Check, Eye, Plus, RefreshCw, Search, X } from 'lucide-react'
import { apiRequest, getAccessToken } from '../api/client'

const statusNames = { ativo: 'Ativo', atrasado: 'Atrasado', devolvido: 'Devolvido', cancelado: 'Cancelado' }
const emptyLoan = { nome_aluno: '', serie_aluno: '', codigo_livro: '', nome_livro: '', autor_livro: '', data_entrega: '', data_prevista_devolucao: '', observacoes: '' }
const dateOnly = (value) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : '—'
const apiMessage = (error, fallback) => error instanceof TypeError ? 'Não foi possível conectar à API. Inicie o backend com: uvicorn app.main:app --reload' : error?.message || fallback

export function Emprestimos() {
  const [loans, setLoans] = useState([])
  const [query, setQuery] = useState('')
  const [queryField, setQueryField] = useState('aluno')
  const [statusFilter, setStatusFilter] = useState('ativo')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loanOpen, setLoanOpen] = useState(false)
  const [loanForm, setLoanForm] = useState(emptyLoan)
  const [saving, setSaving] = useState(false)
  const [details, setDetails] = useState(null)
  const [returnLoan, setReturnLoan] = useState(null)
  const [returning, setReturning] = useState(false)

  async function loadLoans() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: '1', page_size: '50' })
      if (statusFilter !== 'todos') params.set('situacao', statusFilter)
      if (query.trim()) params.set(queryField, query.trim())
      setLoans(await apiRequest(`/api/emprestimos?${params}`))
    } catch (requestError) {
      setError(apiMessage(requestError, 'Não foi possível carregar os empréstimos.'))
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false)
      setError('Faça login para consultar os empréstimos.')
      return
    }
    loadLoans()
  }, [statusFilter])

  function updateLoanField(event) {
    setLoanForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function createLoan(event) {
    event.preventDefault()
    const required = [['Nome do aluno', 'nome_aluno'], ['Série', 'serie_aluno'], ['Código do livro', 'codigo_livro'], ['Nome do livro', 'nome_livro'], ['Autor', 'autor_livro'], ['Data de entrega', 'data_entrega'], ['Data de devolução', 'data_prevista_devolucao']]
    const missing = required.find(([label, field]) => !String(loanForm[field] || '').trim())
    if (missing) { setError(`${missing[0]} é obrigatório.`); return }
    if (loanForm.data_prevista_devolucao <= loanForm.data_entrega) { setError('A data de devolução deve ser posterior à data de entrega.'); return }
    setSaving(true)
    setError('')
    try {
      await apiRequest('/api/emprestimos', { method: 'POST', body: JSON.stringify({
        nome_aluno: loanForm.nome_aluno.trim(), serie_aluno: loanForm.serie_aluno.trim(), codigo_livro: loanForm.codigo_livro.trim(), nome_livro: loanForm.nome_livro.trim(), autor_livro: loanForm.autor_livro.trim(), data_entrega: `${loanForm.data_entrega}T00:00:00`, data_prevista_devolucao: `${loanForm.data_prevista_devolucao}T23:59:00`, observacoes: loanForm.observacoes.trim() || null,
      }) })
      setLoanOpen(false)
      setLoanForm({ ...emptyLoan })
      setFeedback('Empréstimo realizado com sucesso.')
      await loadLoans()
    } catch (requestError) { setError(apiMessage(requestError, 'Não foi possível registrar o empréstimo.')) }
    finally { setSaving(false) }
  }

  async function registerReturn() {
    if (!returnLoan || !window.confirm(`Confirmar devolução de "${returnLoan.livro_titulo}"?`)) return
    setReturning(true)
    try {
      await apiRequest(`/api/emprestimos/${returnLoan.id}/devolucao`, { method: 'POST', body: JSON.stringify({}) })
      setReturnLoan(null); setFeedback('Devolução registrada com sucesso.'); await loadLoans()
    } catch (requestError) { setError(apiMessage(requestError, 'Não foi possível registrar a devolução.')) }
    finally { setReturning(false) }
  }

  return <section className="module-page students-page loans-page">
    <div className="module-toolbar"><div><p className="eyebrow">Circulação</p><h1>Empréstimos</h1><p className="page-description">Registro e acompanhamento da circulação de exemplares.</p></div><button className="primary-button" onClick={() => { setLoanForm({ ...emptyLoan }); setLoanOpen(true); setError('') }}><Plus size={16} /> Novo empréstimo</button></div>
    <div className="books-filters loan-filters"><form className="search-form" onSubmit={(event) => { event.preventDefault(); loadLoans() }}><Search size={17} /><select value={queryField} onChange={(event) => setQueryField(event.target.value)} aria-label="Campo da pesquisa"><option value="aluno">Aluno</option><option value="matricula">Matrícula</option><option value="titulo">Livro</option><option value="exemplar">Exemplar</option></select><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite para pesquisar" aria-label="Pesquisar empréstimos" /><button type="submit">Pesquisar</button></form><select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar empréstimos"><option value="ativo">Ativos</option><option value="atrasado">Atrasados</option><option value="devolvido">Devolvidos</option><option value="cancelado">Cancelados</option><option value="todos">Todos</option></select><button className="icon-button" onClick={loadLoans} title="Atualizar empréstimos" aria-label="Atualizar empréstimos"><RefreshCw size={16} /></button></div>
    {feedback && <div className="feedback success" role="status"><Check size={15} /> {feedback}<button onClick={() => setFeedback('')} aria-label="Fechar mensagem"><X size={14} /></button></div>}
    {error && <div className="feedback error" role="alert">{error}</div>}
    <div className="table-frame">{loading ? <div className="table-state">Carregando empréstimos...</div> : !loans.length ? <div className="table-state empty-state"><ArrowLeftRight size={24} /><strong>Nenhum empréstimo encontrado.</strong></div> : <table><thead><tr><th>Nome do aluno</th><th>Série</th><th>Código do livro</th><th>Nome do livro</th><th>Autor</th><th>Entrega</th><th>Devolução</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{loans.map((loan) => <tr key={loan.id}><td className="student-name">{loan.aluno_nome}</td><td>{loan.serie_aluno || '—'}</td><td>{loan.codigo_livro || loan.exemplar_codigo || '—'}</td><td>{loan.nome_livro || loan.livro_titulo || '—'}</td><td>{loan.autor_livro || '—'}</td><td>{dateOnly(loan.data_entrega || loan.data_emprestimo)}</td><td>{dateOnly(loan.data_prevista_devolucao)}</td><td><span className={`loan-badge ${loan.situacao === 'atrasado' ? 'overdue' : loan.situacao}`}>{statusNames[loan.situacao] || loan.situacao}</span></td><td className="row-actions"><button className="table-action" onClick={() => setDetails(loan)} title="Visualizar" aria-label="Visualizar empréstimo"><Eye size={16} /></button>{loan.exemplar_id && (loan.situacao === 'ativo' || loan.situacao === 'atrasado') && <button className="table-action return-action" onClick={() => setReturnLoan(loan)} title="Registrar devolução" aria-label="Registrar devolução"><Check size={16} /></button>}</td></tr>)}</tbody></table>}</div>
    {loanOpen && <div className="modal-backdrop"><div className="modal-panel loan-form-panel" role="dialog" aria-modal="true" aria-labelledby="loan-form-title"><div className="modal-header"><div><p className="eyebrow">Circulação</p><h2 id="loan-form-title">Novo empréstimo</h2></div><button className="modal-close" onClick={() => setLoanOpen(false)} aria-label="Fechar formulário"><X size={19} /></button></div><form className="student-form" onSubmit={createLoan}><div className="loan-step"><h3>Dados do empréstimo</h3><div className="manual-loan-grid"><label>Nome do aluno <span className="required">*</span><input type="text" name="nome_aluno" value={loanForm.nome_aluno} onChange={updateLoanField} required /></label><label>Série <span className="required">*</span><input type="text" name="serie_aluno" value={loanForm.serie_aluno} onChange={updateLoanField} required /></label><label>Código do livro <span className="required">*</span><input type="text" name="codigo_livro" value={loanForm.codigo_livro} onChange={updateLoanField} required /></label><label>Nome do livro <span className="required">*</span><input type="text" name="nome_livro" value={loanForm.nome_livro} onChange={updateLoanField} required /></label><label>Autor <span className="required">*</span><input type="text" name="autor_livro" value={loanForm.autor_livro} onChange={updateLoanField} required /></label><label>Data de entrega <span className="required">*</span><input type="date" name="data_entrega" value={loanForm.data_entrega} onChange={updateLoanField} required /></label><label>Data de devolução <span className="required">*</span><input type="date" name="data_prevista_devolucao" value={loanForm.data_prevista_devolucao} onChange={updateLoanField} required /></label><label className="full-width">Observações<textarea name="observacoes" value={loanForm.observacoes} onChange={updateLoanField} rows="3" /></label></div></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setLoanOpen(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar empréstimo'}</button></div></form></div></div>}
    {returnLoan && <div className="modal-backdrop"><div className="modal-panel confirmation-panel" role="dialog" aria-modal="true"><div className="modal-header"><h2>Confirmar devolução</h2><button className="modal-close" onClick={() => setReturnLoan(null)} aria-label="Fechar confirmação"><X size={19} /></button></div><div className="confirmation-copy"><strong>{returnLoan.livro_titulo}</strong><span>{returnLoan.exemplar_codigo} · {returnLoan.aluno_nome}</span></div><div className="modal-actions"><button className="secondary-button" onClick={() => setReturnLoan(null)}>Cancelar</button><button className="primary-button" onClick={registerReturn} disabled={returning}>{returning ? 'Registrando...' : 'Registrar devolução'}</button></div></div></div>}
    {details && <div className="modal-backdrop"><div className="modal-panel details-panel" role="dialog" aria-modal="true"><div className="modal-header"><h2>{details.livro_titulo}</h2><button className="modal-close" onClick={() => setDetails(null)} aria-label="Fechar detalhes"><X size={19} /></button></div><dl className="details-grid"><div><dt>Aluno</dt><dd>{details.aluno_nome}</dd></div><div><dt>Série</dt><dd>{details.serie_aluno || '—'}</dd></div><div><dt>Código do livro</dt><dd>{details.codigo_livro || details.exemplar_codigo || '—'}</dd></div><div><dt>Autor</dt><dd>{details.autor_livro || '—'}</dd></div><div><dt>Data de entrega</dt><dd>{dateOnly(details.data_entrega || details.data_emprestimo)}</dd></div><div><dt>Data de devolução</dt><dd>{dateOnly(details.data_prevista_devolucao)}</dd></div></dl><div className="modal-actions"><button className="secondary-button" onClick={() => setDetails(null)}>Fechar</button></div></div></div>}
  </section>
}
