import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Check, Eye, Plus, RefreshCw, Search, X } from 'lucide-react'
import { apiRequest, getAccessToken } from '../api/client'

const statusNames = { ativo: 'Ativo', atrasado: 'Atrasado', devolvido: 'Devolvido', cancelado: 'Cancelado' }
const statusClass = (status) => status === 'atrasado' ? 'overdue' : status
const emptyLoan = { aluno_id: '', exemplar_id: '', data_prevista_devolucao: '', observacoes: '' }

function dateTime(value) {
  return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
}
function dateOnly(value) { return value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : '—' }
function apiMessage(error, fallback) { return error?.message || fallback }

export function Emprestimos() {
  const [loans, setLoans] = useState([])
  const [students, setStudents] = useState([])
  const [books, setBooks] = useState([])
  const [copies, setCopies] = useState([])
  const [query, setQuery] = useState('')
  const [queryField, setQueryField] = useState('aluno')
  const [statusFilter, setStatusFilter] = useState('ativo')
  const [loading, setLoading] = useState(true)
  const [referencesLoading, setReferencesLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loanOpen, setLoanOpen] = useState(false)
  const [returnLoan, setReturnLoan] = useState(null)
  const [details, setDetails] = useState(null)
  const [loanForm, setLoanForm] = useState(emptyLoan)
  const [saving, setSaving] = useState(false)
  const [returning, setReturning] = useState(false)

  const bookById = (id) => books.find((book) => book.id === id)
  const copyById = (id) => copies.find((copy) => copy.id === id)
  const selectedStudent = students.find((student) => student.id === Number(loanForm.aluno_id))
  const availableCopies = copies.filter((copy) => copy.situacao === 'disponivel')
  const filteredCopies = availableCopies.filter((copy) => {
    const book = bookById(copy.livro_id)
    const term = (loanForm.copySearch || '').toLocaleLowerCase()
    return !term || copy.codigo.toLocaleLowerCase().includes(term) || book?.titulo.toLocaleLowerCase().includes(term) || book?.autores?.some((author) => author.nome.toLocaleLowerCase().includes(term))
  })

  async function loadReferences() {
    setReferencesLoading(true)
    try {
      const [studentList, bookList, copyList] = await Promise.all([
        apiRequest('/api/alunos?page=1&page_size=100'),
        apiRequest('/api/livros?page=1&page_size=100'),
        apiRequest('/api/estoque/exemplares?page=1&page_size=100'),
      ])
      setStudents(studentList)
      setBooks(bookList)
      setCopies(copyList)
    } catch (requestError) {
      setError(apiMessage(requestError, 'Não foi possível carregar alunos, livros e exemplares.'))
    } finally { setReferencesLoading(false) }
  }

  async function loadLoans() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: '1', page_size: '50' })
      if (statusFilter !== 'todos') params.set('situacao', statusFilter)
      if (query.trim()) params.set(queryField, query.trim())
      setLoans(await apiRequest(`/api/emprestimos?${params}`))
    } catch (requestError) { setError(apiMessage(requestError, 'Não foi possível carregar os empréstimos.')) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!getAccessToken()) { setLoading(false); setError('Faça login para consultar os empréstimos.'); return }
    loadLoans()
    loadReferences()
  }, [statusFilter])

  const visibleLoans = useMemo(() => loans, [loans])

  function openLoanForm() {
    setLoanForm({ ...emptyLoan, copySearch: '' })
    setLoanOpen(true); setDetails(null); setError('')
  }
  function updateLoanField(event) { setLoanForm((current) => ({ ...current, [event.target.name]: event.target.value })) }

  async function createLoan(event) {
    event.preventDefault()
    if (!loanForm.aluno_id || !loanForm.exemplar_id || !loanForm.data_prevista_devolucao) { setError('Selecione o aluno, o exemplar e a data prevista de devolução.'); return }
    setSaving(true); setError('')
    try {
      await apiRequest('/api/emprestimos', { method: 'POST', body: JSON.stringify({ aluno_id: Number(loanForm.aluno_id), exemplar_id: Number(loanForm.exemplar_id), data_prevista_devolucao: `${loanForm.data_prevista_devolucao}T23:59:00`, observacoes: loanForm.observacoes.trim() || null }) })
      setLoanOpen(false); setFeedback('Empréstimo realizado com sucesso.')
      await Promise.all([loadLoans(), loadReferences()])
    } catch (requestError) { setError(apiMessage(requestError, 'Não foi possível registrar o empréstimo.')) }
    finally { setSaving(false) }
  }

  async function registerReturn() {
    if (!returnLoan || !window.confirm(`Confirmar devolução de "${returnLoan.livro_titulo}" para o exemplar ${returnLoan.exemplar_codigo}?`)) return
    setReturning(true); setError('')
    try {
      await apiRequest(`/api/emprestimos/${returnLoan.id}/devolucao`, { method: 'POST', body: JSON.stringify({}) })
      setReturnLoan(null); setFeedback('Devolução registrada com sucesso.')
      await Promise.all([loadLoans(), loadReferences()])
    } catch (requestError) { setError(apiMessage(requestError, 'Não foi possível registrar a devolução.')) }
    finally { setReturning(false) }
  }

  return (
    <section className="module-page students-page loans-page">
      <div className="module-toolbar"><div><p className="eyebrow">Circulação</p><h1>Empréstimos</h1><p className="page-description">Registro e acompanhamento da circulação de exemplares.</p></div><button className="primary-button" onClick={openLoanForm}><Plus size={16} /> Novo empréstimo</button></div>
      <div className="books-filters loan-filters"><form className="search-form" onSubmit={(event) => { event.preventDefault(); loadLoans() }}><Search size={17} /><select value={queryField} onChange={(event) => setQueryField(event.target.value)} aria-label="Campo da pesquisa"><option value="aluno">Aluno</option><option value="matricula">Matrícula</option><option value="titulo">Livro</option><option value="exemplar">Exemplar</option></select><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite para pesquisar" aria-label="Pesquisar empréstimos" /><button type="submit">Pesquisar</button></form><select className="filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar empréstimos"><option value="ativo">Ativos</option><option value="atrasado">Atrasados</option><option value="devolvido">Devolvidos</option><option value="cancelado">Cancelados</option><option value="todos">Todos</option></select><button className="icon-button" onClick={() => { loadLoans(); loadReferences() }} title="Atualizar empréstimos" aria-label="Atualizar empréstimos"><RefreshCw size={16} /></button></div>
      {feedback && <div className="feedback success" role="status"><Check size={15} /> {feedback}<button onClick={() => setFeedback('')} aria-label="Fechar mensagem"><X size={14} /></button></div>}
      {error && <div className="feedback error" role="alert">{error}</div>}
      <div className="table-frame">{loading ? <div className="table-state">Carregando empréstimos...</div> : !visibleLoans.length ? <div className="table-state empty-state"><ArrowLeftRight size={24} /><strong>{statusFilter === 'ativo' ? 'Nenhum empréstimo ativo no momento.' : 'Nenhum empréstimo encontrado.'}</strong><span>{query ? 'Ajuste a pesquisa e tente novamente.' : 'Os registros aparecerão nesta área.'}</span></div> : <table><thead><tr><th>Aluno</th><th>Matrícula</th><th>Livro</th><th>Exemplar</th><th>Emprestado em</th><th>Previsto</th><th>Situação</th><th className="actions-column">Ações</th></tr></thead><tbody>{visibleLoans.map((loan) => <tr key={loan.id}><td className="student-name">{loan.aluno_nome}</td><td>{students.find((student) => student.id === loan.aluno_id)?.matricula || '—'}</td><td>{loan.livro_titulo}</td><td>{loan.exemplar_codigo}</td><td>{dateOnly(loan.data_emprestimo)}</td><td>{dateOnly(loan.data_prevista_devolucao)}</td><td><span className={`loan-badge ${statusClass(loan.situacao)}`}>{statusNames[loan.situacao] || loan.situacao}</span></td><td className="row-actions"><button className="table-action" onClick={() => setDetails(loan)} title="Visualizar" aria-label={`Visualizar empréstimo de ${loan.aluno_nome}`}><Eye size={16} /></button>{(loan.situacao === 'ativo' || loan.situacao === 'atrasado') && <button className="table-action return-action" onClick={() => setReturnLoan(loan)} title="Registrar devolução" aria-label={`Registrar devolução de ${loan.livro_titulo}`}><Check size={16} /></button>}</td></tr>)}</tbody></table>}</div>
      {loanOpen && <div className="modal-backdrop"><div className="modal-panel loan-form-panel" role="dialog" aria-modal="true" aria-labelledby="loan-form-title"><div className="modal-header"><div><p className="eyebrow">Circulação</p><h2 id="loan-form-title">Novo empréstimo</h2></div><button className="modal-close" onClick={() => setLoanOpen(false)} aria-label="Fechar formulário"><X size={19} /></button></div><form className="student-form" onSubmit={createLoan}><div className="loan-step"><h3>1. Selecione o aluno</h3><label>Aluno <span className="required">*</span><select name="aluno_id" value={loanForm.aluno_id} onChange={updateLoanField} required><option value="">Escolha um aluno</option>{students.filter((student) => student.ativo).map((student) => <option key={student.id} value={student.id}>{student.nome_completo} · {student.matricula}</option>)}</select></label>{selectedStudent && <div className="selection-summary"><strong>{selectedStudent.nome_completo}</strong><span>{selectedStudent.matricula} · Turma {selectedStudent.turma} · {selectedStudent.ativo ? 'Ativo' : 'Inativo'}</span></div>}</div><div className="loan-step"><h3>2. Selecione o exemplar disponível</h3><label>Pesquisar exemplar ou livro<input name="copySearch" value={loanForm.copySearch || ''} onChange={updateLoanField} placeholder="Código, título ou autor" /></label><label>Exemplar <span className="required">*</span><select name="exemplar_id" value={loanForm.exemplar_id} onChange={updateLoanField} required><option value="">Escolha um exemplar</option>{filteredCopies.map((copy) => <option key={copy.id} value={copy.id}>{copy.codigo} · {bookById(copy.livro_id)?.titulo || 'Livro não carregado'}</option>)}</select></label>{loanForm.exemplar_id && <div className="selection-summary"><strong>{bookById(copyById(Number(loanForm.exemplar_id))?.livro_id)?.titulo}</strong><span>{copyById(Number(loanForm.exemplar_id))?.codigo} · Disponível</span></div>}</div><div className="loan-step"><h3>3. Prazo</h3><label>Data prevista de devolução <span className="required">*</span><input type="date" name="data_prevista_devolucao" value={loanForm.data_prevista_devolucao} onChange={updateLoanField} required /></label><label>Observações<textarea name="observacoes" value={loanForm.observacoes} onChange={updateLoanField} rows="2" /></label></div><p className="required-note">A data prevista é informada pela biblioteca. O backend valida o prazo.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setLoanOpen(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving || referencesLoading}>{saving ? 'Registrando...' : 'Confirmar empréstimo'}</button></div></form></div></div>}
      {returnLoan && <div className="modal-backdrop"><div className="modal-panel confirmation-panel" role="dialog" aria-modal="true" aria-labelledby="return-title"><div className="modal-header"><div><p className="eyebrow">Devolução</p><h2 id="return-title">Confirmar devolução</h2></div><button className="modal-close" onClick={() => setReturnLoan(null)} aria-label="Fechar confirmação"><X size={19} /></button></div><div className="confirmation-copy"><p>Confirme a devolução deste exemplar:</p><strong>{returnLoan.livro_titulo}</strong><span>{returnLoan.exemplar_codigo} · {returnLoan.aluno_nome}</span><span>Data prevista: {dateOnly(returnLoan.data_prevista_devolucao)}</span></div><div className="modal-actions"><button className="secondary-button" onClick={() => setReturnLoan(null)}>Cancelar</button><button className="primary-button" onClick={registerReturn} disabled={returning}>{returning ? 'Registrando...' : 'Registrar devolução'}</button></div></div></div>}
      {details && <div className="modal-backdrop"><div className="modal-panel details-panel" role="dialog" aria-modal="true" aria-labelledby="loan-details-title"><div className="modal-header"><div><p className="eyebrow">Registro de circulação</p><h2 id="loan-details-title">{details.livro_titulo}</h2></div><button className="modal-close" onClick={() => setDetails(null)} aria-label="Fechar detalhes"><X size={19} /></button></div><dl className="details-grid"><div><dt>Aluno</dt><dd>{details.aluno_nome}</dd></div><div><dt>Exemplar</dt><dd>{details.exemplar_codigo}</dd></div><div><dt>Data do empréstimo</dt><dd>{dateTime(details.data_emprestimo)}</dd></div><div><dt>Devolução prevista</dt><dd>{dateTime(details.data_prevista_devolucao)}</dd></div><div><dt>Devolução realizada</dt><dd>{dateTime(details.data_devolucao)}</dd></div><div><dt>Situação</dt><dd>{statusNames[details.situacao] || details.situacao}</dd></div><div><dt>Operador do empréstimo</dt><dd>{details.realizado_por_nome || 'Não informado'}</dd></div><div><dt>Operador da devolução</dt><dd>{details.devolvido_por_nome || 'Não informado'}</dd></div></dl><div className="modal-actions"><button className="secondary-button" onClick={() => setDetails(null)}>Fechar</button></div></div></div>}
    </section>
  )
}
