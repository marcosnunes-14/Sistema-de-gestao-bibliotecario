import { useEffect, useState } from 'react'
import { Eye, Pencil, Plus, Power, RefreshCw, Search, X } from 'lucide-react'
import { apiRequest, getAccessToken } from '../api/client'

const emptyForm = {
  nome_completo: '',
  matricula: '',
  turma: '',
  serie_ano: '',
  turno: '',
  telefone: '',
  nome_responsavel: '',
  telefone_responsavel: '',
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : '—'
}

function apiErrorMessage(error) {
  return error?.message || 'Não foi possível concluir a operação.'
}

export function Alunos() {
  const [alunos, setAlunos] = useState([])
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('nome')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [details, setDetails] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function loadAlunos(searchTerm = search) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: '1', page_size: '50' })
      if (searchTerm) params.set(searchField, searchTerm)
      const result = await apiRequest(`/api/alunos?${params}`)
      setAlunos(result)
    } catch (requestError) {
      setError(apiErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (getAccessToken()) loadAlunos()
    else {
      setLoading(false)
      setError('Faça login para consultar os alunos.')
    }
  }, [])

  function startCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
    setDetails(null)
    setFeedback('')
  }

  function startEdit(aluno) {
    setEditing(aluno)
    setForm({
      nome_completo: aluno.nome_completo,
      matricula: aluno.matricula,
      turma: aluno.turma,
      serie_ano: aluno.serie_ano,
      turno: aluno.turno,
      telefone: aluno.telefone || '',
      nome_responsavel: aluno.nome_responsavel || '',
      telefone_responsavel: aluno.telefone_responsavel || '',
    })
    setFormOpen(true)
    setDetails(null)
    setFeedback('')
  }

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function saveAluno(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const payload = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim() || null]),
    )
    try {
      if (editing) await apiRequest(`/api/alunos/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await apiRequest('/api/alunos', { method: 'POST', body: JSON.stringify(payload) })
      setFormOpen(false)
      setFeedback(editing ? 'Aluno atualizado com sucesso.' : 'Aluno cadastrado com sucesso.')
      await loadAlunos()
    } catch (requestError) {
      setError(apiErrorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(aluno) {
    const action = aluno.ativo ? 'desativar' : 'ativar'
    if (!window.confirm(`Tem certeza que deseja ${action} este aluno?`)) return
    setError('')
    try {
      await apiRequest(`/api/alunos/${aluno.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: !aluno.ativo }),
      })
      setFeedback(`Aluno ${aluno.ativo ? 'desativado' : 'ativado'} com sucesso.`)
      await loadAlunos()
    } catch (requestError) {
      setError(apiErrorMessage(requestError))
    }
  }

  function submitSearch(event) {
    event.preventDefault()
    setSearch(query.trim())
    loadAlunos(query.trim())
  }

  return (
    <section className="module-page students-page">
      <div className="module-toolbar">
        <div>
          <p className="eyebrow">Cadastro</p>
          <h1>Alunos</h1>
          <p className="page-description">Consulta e manutenção do cadastro de alunos da biblioteca.</p>
        </div>
        <button className="primary-button" onClick={startCreate}><Plus size={16} /> Novo aluno</button>
      </div>

      <div className="list-toolbar">
        <form className="search-form" onSubmit={submitSearch}>
          <Search size={17} />
          <select value={searchField} onChange={(event) => setSearchField(event.target.value)} aria-label="Campo da pesquisa"><option value="nome">Nome</option><option value="matricula">Matrícula</option><option value="turma">Turma</option></select>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite para pesquisar" aria-label="Pesquisar alunos" />
          <button type="submit">Pesquisar</button>
        </form>
        <button className="icon-button" onClick={() => loadAlunos()} title="Atualizar lista" aria-label="Atualizar lista"><RefreshCw size={16} /></button>
      </div>

      {feedback && <div className="feedback success" role="status">{feedback}<button onClick={() => setFeedback('')} aria-label="Fechar mensagem"><X size={14} /></button></div>}
      {error && <div className="feedback error" role="alert">{error}</div>}

      <div className="table-frame">
        {loading ? <div className="table-state">Carregando alunos...</div> : alunos.length === 0 ? (
          <div className="table-state empty-state"><strong>{search ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado.'}</strong><span>{search ? 'Tente pesquisar por outro nome.' : 'Cadastre o primeiro aluno para começar.'}</span>{!search && <button className="primary-button" onClick={startCreate}><Plus size={16} /> Cadastrar primeiro aluno</button>}</div>
        ) : (
          <table>
            <thead><tr><th>Nome</th><th>Matrícula</th><th>Turma</th><th>Série/Ano</th><th>Turno</th><th>Status</th><th className="actions-column">Ações</th></tr></thead>
            <tbody>{alunos.map((aluno) => <tr key={aluno.id}>
              <td className="student-name">{aluno.nome_completo}</td><td>{aluno.matricula}</td><td>{aluno.turma}</td><td>{aluno.serie_ano}</td><td>{aluno.turno}</td>
              <td><span className={`status-label ${aluno.ativo ? 'active' : 'inactive'}`}>{aluno.ativo ? 'Ativo' : 'Inativo'}</span></td>
              <td className="row-actions"><button className="table-action" onClick={() => setDetails(aluno)} title="Visualizar" aria-label={`Visualizar ${aluno.nome_completo}`}><Eye size={16} /></button><button className="table-action" onClick={() => startEdit(aluno)} title="Editar" aria-label={`Editar ${aluno.nome_completo}`}><Pencil size={16} /></button><button className="table-action" onClick={() => toggleStatus(aluno)} title={aluno.ativo ? 'Desativar' : 'Ativar'} aria-label={`${aluno.ativo ? 'Desativar' : 'Ativar'} ${aluno.nome_completo}`}><Power size={16} /></button></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>

      {formOpen && <div className="modal-backdrop"><div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="student-form-title"><div className="modal-header"><div><p className="eyebrow">Cadastro</p><h2 id="student-form-title">{editing ? 'Editar aluno' : 'Novo aluno'}</h2></div><button className="modal-close" onClick={() => setFormOpen(false)} aria-label="Fechar formulário"><X size={19} /></button></div><form className="student-form" onSubmit={saveAluno}><div className="form-grid">{[['nome_completo','Nome completo'],['matricula','Matrícula'],['turma','Turma'],['serie_ano','Série/Ano'],['turno','Turno'],['telefone','Telefone'],['nome_responsavel','Nome do responsável'],['telefone_responsavel','Telefone do responsável']].map(([name, label]) => <label key={name} className={name === 'nome_completo' ? 'full-field' : ''}>{label}{['nome_completo','matricula','turma','serie_ano','turno'].includes(name) && <span className="required">*</span>}<input name={name} value={form[name]} onChange={updateField} required={['nome_completo','matricula','turma','serie_ano','turno'].includes(name)} /></label>)}</div><p className="required-note">* Campos obrigatórios</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar aluno'}</button></div></form></div></div>}

      {details && <div className="modal-backdrop"><div className="modal-panel details-panel" role="dialog" aria-modal="true" aria-labelledby="student-details-title"><div className="modal-header"><div><p className="eyebrow">Cadastro de aluno</p><h2 id="student-details-title">{details.nome_completo}</h2></div><button className="modal-close" onClick={() => setDetails(null)} aria-label="Fechar detalhes"><X size={19} /></button></div><dl className="details-grid"><div><dt>Matrícula</dt><dd>{details.matricula}</dd></div><div><dt>Status</dt><dd>{details.ativo ? 'Ativo' : 'Inativo'}</dd></div><div><dt>Turma</dt><dd>{details.turma}</dd></div><div><dt>Série/Ano</dt><dd>{details.serie_ano}</dd></div><div><dt>Turno</dt><dd>{details.turno}</dd></div><div><dt>Telefone</dt><dd>{details.telefone || 'Não informado'}</dd></div><div><dt>Responsável</dt><dd>{details.nome_responsavel || 'Não informado'}</dd></div><div><dt>Telefone do responsável</dt><dd>{details.telefone_responsavel || 'Não informado'}</dd></div><div><dt>Data de cadastro</dt><dd>{formatDate(details.data_cadastro)}</dd></div><div><dt>Última atualização</dt><dd>{formatDate(details.data_atualizacao)}</dd></div></dl><div className="modal-actions"><button className="secondary-button" onClick={() => setDetails(null)}>Fechar</button><button className="primary-button" onClick={() => startEdit(details)}><Pencil size={16} /> Editar aluno</button></div></div></div>}
    </section>
  )
}
