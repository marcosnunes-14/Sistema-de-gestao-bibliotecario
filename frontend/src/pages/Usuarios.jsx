import { useEffect, useState } from 'react'
import { Eye, KeyRound, Pencil, Plus, Power, RefreshCw, Search, X } from 'lucide-react'
import { apiRequest, getAccessToken } from '../api/client'

const emptyForm = { nome: '', username: '', senha: '', perfil: 'bibliotecario' }

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—'
}

function apiErrorMessage(error) {
  return error?.message || 'Não foi possível concluir a operação.'
}

export function Usuarios({ currentUser }) {
  const [usuarios, setUsuarios] = useState([])
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [perfil, setPerfil] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(null)
  const [details, setDetails] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [passwordForm, setPasswordForm] = useState({ senha_atual: '', nova_senha: '', confirmacao: '' })
  const [saving, setSaving] = useState(false)

  async function loadUsuarios(overrides = {}) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: '1', page_size: '50' })
      const activeSearch = overrides.search ?? search
      const activePerfil = overrides.perfil ?? perfil
      const activeStatus = overrides.status ?? status
      if (activeSearch) params.set('search', activeSearch)
      if (activePerfil) params.set('perfil', activePerfil)
      if (activeStatus) params.set('ativo', activeStatus)
      setUsuarios(await apiRequest(`/api/usuarios?${params}`))
    } catch (requestError) {
      setError(apiErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (getAccessToken()) loadUsuarios()
    else { setLoading(false); setError('Faça login para consultar os usuários.') }
  }, [])

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function openCreate() {
    setEditing(null); setDetails(null); setForm(emptyForm); setFormOpen(true); setFeedback(''); setError('')
  }

  function openEdit(usuario) {
    setEditing(usuario); setDetails(null); setForm({ nome: usuario.nome, username: usuario.username, senha: '', perfil: usuario.perfil }); setFormOpen(true); setFeedback(''); setError('')
  }

  async function saveUsuario(event) {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      if (editing) {
        await apiRequest(`/api/usuarios/${editing.id}`, { method: 'PUT', body: JSON.stringify({ nome: form.nome.trim(), perfil: form.perfil }) })
      } else {
        await apiRequest('/api/usuarios', { method: 'POST', body: JSON.stringify({ nome: form.nome.trim(), username: form.username.trim(), senha: form.senha, perfil: form.perfil }) })
      }
      setFormOpen(false); setFeedback(editing ? 'Usuário atualizado com sucesso.' : 'Usuário cadastrado com sucesso.'); await loadUsuarios()
    } catch (requestError) { setError(apiErrorMessage(requestError)) } finally { setSaving(false) }
  }

  async function toggleStatus(usuario) {
    const action = usuario.ativo ? 'desativar' : 'ativar'
    if (usuario.id === currentUser.id && usuario.ativo && !window.confirm('Desativar seu próprio acesso encerrará sua sessão. Deseja continuar?')) return
    if (!window.confirm(`${action === 'desativar' ? 'Desativar o acesso de' : 'Ativar'} ${usuario.nome}?`)) return
    setError('')
    try {
      await apiRequest(`/api/usuarios/${usuario.id}/status`, { method: 'PATCH', body: JSON.stringify({ ativo: !usuario.ativo }) })
      setFeedback(`Usuário ${usuario.ativo ? 'desativado' : 'ativado'} com sucesso.`); await loadUsuarios()
    } catch (requestError) { setError(apiErrorMessage(requestError)) }
  }

  async function changePassword(event) {
    event.preventDefault()
    if (passwordForm.nova_senha !== passwordForm.confirmacao) { setError('A confirmação da nova senha não confere.'); return }
    setSaving(true); setError('')
    try {
      const passwordPath = passwordOpen.id === currentUser.id ? `/api/usuarios/${passwordOpen.id}/senha` : `/api/usuarios/${passwordOpen.id}/senha/admin`
      const passwordPayload = passwordOpen.id === currentUser.id ? { senha_atual: passwordForm.senha_atual, nova_senha: passwordForm.nova_senha } : { nova_senha: passwordForm.nova_senha }
      await apiRequest(passwordPath, { method: 'PATCH', body: JSON.stringify(passwordPayload) })
      setPasswordOpen(null); setPasswordForm({ senha_atual: '', nova_senha: '', confirmacao: '' }); setFeedback('Senha alterada com sucesso.')
    } catch (requestError) { setError(apiErrorMessage(requestError)) } finally { setSaving(false) }
  }

  function submitSearch(event) { event.preventDefault(); const next = query.trim(); setSearch(next); loadUsuarios({ search: next }) }

  return (
    <section className="module-page students-page users-page">
      <div className="module-toolbar"><div><p className="eyebrow">Administração</p><h1>Usuários</h1><p className="page-description">Funcionários com acesso ao sistema e seus perfis de operação.</p></div><button className="primary-button" onClick={openCreate}><Plus size={16} /> Novo usuário</button></div>
      <div className="list-toolbar users-filters"><form className="search-form" onSubmit={submitSearch}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou login" aria-label="Pesquisar usuários" /><button type="submit">Pesquisar</button></form><select className="filter-select" value={perfil} onChange={(event) => { setPerfil(event.target.value); loadUsuarios({ perfil: event.target.value }) }} aria-label="Filtrar por perfil"><option value="">Todos os perfis</option><option value="administrador">Administrador</option><option value="bibliotecario">Bibliotecário</option></select><select className="filter-select" value={status} onChange={(event) => { setStatus(event.target.value); loadUsuarios({ status: event.target.value }) }} aria-label="Filtrar por situação"><option value="">Todas as situações</option><option value="true">Ativos</option><option value="false">Inativos</option></select><button className="icon-button" onClick={() => loadUsuarios()} title="Atualizar lista" aria-label="Atualizar lista"><RefreshCw size={16} /></button></div>
      {feedback && <div className="feedback success" role="status">{feedback}<button onClick={() => setFeedback('')} aria-label="Fechar mensagem"><X size={14} /></button></div>}
      {error && <div className="feedback error" role="alert">{error}</div>}
      <div className="table-frame">{loading ? <div className="table-state">Carregando usuários...</div> : usuarios.length === 0 ? <div className="table-state empty-state"><strong>{search || perfil || status ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}</strong><span>Ajuste os filtros ou cadastre um usuário.</span></div> : <table><thead><tr><th>Nome</th><th>Login</th><th>Perfil</th><th>Situação</th><th>Último acesso</th><th className="actions-column">Ações</th></tr></thead><tbody>{usuarios.map((usuario) => <tr key={usuario.id}><td className="student-name">{usuario.nome}</td><td>{usuario.username}</td><td>{usuario.perfil === 'administrador' ? 'Administrador' : 'Bibliotecário'}</td><td><span className={`status-label ${usuario.ativo ? 'active' : 'inactive'}`}>{usuario.ativo ? 'Ativo' : 'Inativo'}</span></td><td>{formatDate(usuario.ultimo_login)}</td><td className="row-actions"><button className="table-action" onClick={() => setDetails(usuario)} title="Visualizar" aria-label={`Visualizar ${usuario.nome}`}><Eye size={16} /></button><button className="table-action" onClick={() => openEdit(usuario)} title="Editar" aria-label={`Editar ${usuario.nome}`}><Pencil size={16} /></button>{usuario.id === currentUser.id && <button className="table-action" onClick={() => { setPasswordOpen(usuario); setError('') }} title="Alterar senha" aria-label="Alterar minha senha"><KeyRound size={16} /></button>}<button className="table-action" onClick={() => toggleStatus(usuario)} title={usuario.ativo ? 'Desativar' : 'Ativar'} aria-label={`${usuario.ativo ? 'Desativar' : 'Ativar'} ${usuario.nome}`}><Power size={16} /></button></td></tr>)}</tbody></table>}</div>
      {formOpen && <div className="modal-backdrop"><div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="user-form-title"><div className="modal-header"><div><p className="eyebrow">Administração</p><h2 id="user-form-title">{editing ? 'Editar usuário' : 'Novo usuário'}</h2></div><button className="modal-close" onClick={() => setFormOpen(false)} aria-label="Fechar formulário"><X size={19} /></button></div><form className="student-form" onSubmit={saveUsuario}><div className="form-grid"><label className="full-field">Nome <span className="required">*</span><input name="nome" value={form.nome} onChange={updateField} required maxLength="200" /></label><label>Login <span className="required">*</span><input name="username" value={form.username} onChange={updateField} required minLength="3" maxLength="80" disabled={Boolean(editing)} /></label>{!editing && <label>Senha inicial <span className="required">*</span><input type="password" name="senha" value={form.senha} onChange={updateField} required minLength="8" placeholder="Letra e número" /></label>}<label>Perfil <span className="required">*</span><select name="perfil" value={form.perfil} onChange={updateField}><option value="administrador">Administrador</option><option value="bibliotecario">Bibliotecário</option></select></label></div><p className="required-note">* Campos obrigatórios. A senha deve ter pelo menos uma letra e um número.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar usuário'}</button></div></form></div></div>}
      {passwordOpen && <div className="modal-backdrop"><div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="password-title"><div className="modal-header"><div><p className="eyebrow">Segurança da conta</p><h2 id="password-title">{passwordOpen.id === currentUser.id ? 'Alterar senha' : 'Redefinir senha'}</h2></div><button className="modal-close" onClick={() => setPasswordOpen(null)} aria-label="Fechar alteração de senha"><X size={19} /></button></div><form className="student-form" onSubmit={changePassword}><p className="page-description">{passwordOpen.id === currentUser.id ? 'A senha atual nunca é exibida.' : `Defina uma nova senha para ${passwordOpen.nome}.`}</p><div className="form-grid">{passwordOpen.id === currentUser.id && <label className="full-field">Senha atual <span className="required">*</span><input type="password" value={passwordForm.senha_atual} onChange={(event) => setPasswordForm({ ...passwordForm, senha_atual: event.target.value })} required autoComplete="current-password" /></label>}<label>Nova senha <span className="required">*</span><input type="password" value={passwordForm.nova_senha} onChange={(event) => setPasswordForm({ ...passwordForm, nova_senha: event.target.value })} required minLength="8" autoComplete="new-password" /></label><label>Confirmar nova senha <span className="required">*</span><input type="password" value={passwordForm.confirmacao} onChange={(event) => setPasswordForm({ ...passwordForm, confirmacao: event.target.value })} required minLength="8" autoComplete="new-password" /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setPasswordOpen(null)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar senha'}</button></div></form></div></div>}
      {details && <div className="modal-backdrop"><div className="modal-panel details-panel" role="dialog" aria-modal="true" aria-labelledby="user-details-title"><div className="modal-header"><div><p className="eyebrow">Conta de funcionário</p><h2 id="user-details-title">{details.nome}</h2></div><button className="modal-close" onClick={() => setDetails(null)} aria-label="Fechar detalhes"><X size={19} /></button></div><dl className="details-grid"><div><dt>Login</dt><dd>{details.username}</dd></div><div><dt>Perfil</dt><dd>{details.perfil === 'administrador' ? 'Administrador' : 'Bibliotecário'}</dd></div><div><dt>Situação</dt><dd>{details.ativo ? 'Ativo' : 'Inativo'}</dd></div><div><dt>Último acesso</dt><dd>{formatDate(details.ultimo_login)}</dd></div><div><dt>Cadastro</dt><dd>{formatDate(details.data_criacao)}</dd></div><div><dt>Atualização</dt><dd>{formatDate(details.data_atualizacao)}</dd></div></dl><div className="modal-actions"><button className="secondary-button" onClick={() => setDetails(null)}>Fechar</button><button className="primary-button" onClick={() => openEdit(details)}><Pencil size={16} /> Editar usuário</button></div></div></div>}
    </section>
  )
}
