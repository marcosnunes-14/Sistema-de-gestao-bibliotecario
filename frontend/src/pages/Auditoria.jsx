import { useEffect, useState } from 'react'
import { ClipboardList, RefreshCw } from 'lucide-react'
import { apiRequest, getAccessToken } from '../api/client'

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
}

export function Auditoria() {
  const [records, setRecords] = useState([])
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadAudit() {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: '1', page_size: '100' })
      if (action) params.set('acao', action)
      if (entity) params.set('entidade', entity)
      setRecords(await apiRequest(`/api/auditoria?${params}`))
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar a auditoria.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (getAccessToken()) loadAudit(); else setLoading(false) }, [action, entity])

  return (
    <section className="module-page students-page users-page">
      <div className="module-toolbar"><div><p className="eyebrow">Administração</p><h1>Auditoria</h1><p className="page-description">Registro das operações relevantes realizadas no sistema.</p></div><button className="icon-button" onClick={loadAudit} title="Atualizar auditoria" aria-label="Atualizar auditoria"><RefreshCw size={16} /></button></div>
      <div className="list-toolbar users-filters"><select className="filter-select" value={action} onChange={(event) => setAction(event.target.value)} aria-label="Filtrar por ação"><option value="">Todas as ações</option><option value="criar">Criação</option><option value="editar">Edição</option><option value="alterar_status">Alteração de status</option><option value="alterar_situacao">Alteração de situação</option><option value="redefinir_senha">Redefinição de senha</option><option value="devolver">Devolução</option></select><select className="filter-select" value={entity} onChange={(event) => setEntity(event.target.value)} aria-label="Filtrar por entidade"><option value="">Todas as entidades</option><option value="usuario">Usuário</option><option value="exemplar">Exemplar</option><option value="emprestimo">Empréstimo</option></select></div>
      {error && <div className="feedback error" role="alert">{error}</div>}
      <div className="table-frame">{loading ? <div className="table-state">Carregando auditoria...</div> : !records.length ? <div className="table-state empty-state"><ClipboardList size={24} /><strong>Nenhum registro encontrado.</strong><span>As operações relevantes aparecerão nesta área.</span></div> : <table><thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Registro</th><th>Detalhes</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{formatDate(record.criado_em)}</td><td>{record.usuario_nome || 'Sistema'}</td><td>{record.acao}</td><td>{record.entidade}</td><td>{record.entidade_id || '—'}</td><td>{record.detalhes || '—'}</td></tr>)}</tbody></table>}</div>
    </section>
  )
}
