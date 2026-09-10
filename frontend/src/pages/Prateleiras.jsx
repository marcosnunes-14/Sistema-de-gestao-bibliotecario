import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Eye, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { apiRequest, getAccessToken } from '../api/client'

const emptyForm = { descricao: '', finalidade: '', genero_principal: '', observacoes: '' }

function sectionName(number) {
  return number > 0 && number <= 26 ? String.fromCharCode(64 + number) : String(number)
}

export function Prateleiras() {
  const [shelves, setShelves] = useState([])
  const [sections, setSections] = useState([])
  const [copies, setCopies] = useState([])
  const [books, setBooks] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [copyToAdd, setCopyToAdd] = useState('')
  const [bookToAdd, setBookToAdd] = useState('')
  const [sectionToAdd, setSectionToAdd] = useState('')
  const [addingCopy, setAddingCopy] = useState(false)
  const [removingBook, setRemovingBook] = useState(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [shelfList, sectionList, copyList, bookList] = await Promise.all([
        apiRequest('/api/estoque/prateleiras'),
        apiRequest('/api/estoque/secoes'),
        apiRequest('/api/estoque/exemplares?page=1&page_size=100'),
        apiRequest('/api/livros?page=1&page_size=100'),
      ])
      setShelves(shelfList)
      setSections(sectionList)
      setCopies(copyList)
      setBooks(bookList)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar as prateleiras.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (getAccessToken()) load()
    else { setLoading(false); setError('Faça login para consultar as prateleiras.') }
  }, [])

  const visibleShelves = useMemo(() => shelves.filter((shelf) => {
    const term = query.trim().toLocaleLowerCase()
    return !term || [shelf.descricao, shelf.finalidade, shelf.genero_principal].some((value) => value?.toLocaleLowerCase().includes(term))
  }), [shelves, query])

  function shelfCopies(shelf) { return copies.filter((copy) => copy.prateleira_id === shelf.id) }
  function shelfBooks(shelf) { return [...new Set(shelfCopies(shelf).map((copy) => copy.livro_id))].map((id) => books.find((book) => book.id === id)).filter(Boolean) }
  function openEdit(shelf) { setEditing(shelf); setForm({ descricao: shelf.descricao || '', finalidade: shelf.finalidade || '', genero_principal: shelf.genero_principal || '', observacoes: shelf.observacoes || '' }); setSelected(null) }

  function openShelf(shelf) {
    setSelected(shelf)
    setCopyToAdd('')
    setBookToAdd('')
    setSectionToAdd('')
  }

  const booksAvailableForShelf = selected ? books.filter((book) => {
    const bookCopies = copies.filter((copy) => copy.livro_id === book.id)
    return bookCopies.length > 0 && !bookCopies.every((copy) => copy.prateleira_id === selected.id)
  }) : []

  function selectBookToAdd(event) {
    const bookId = event.target.value
    setBookToAdd(bookId)
    const candidate = copies.find((copy) => copy.livro_id === Number(bookId) && copy.prateleira_id !== selected?.id)
    setCopyToAdd(candidate?.id ? String(candidate.id) : '')
  }

  async function addCopyToShelf(event) {
    event.preventDefault()
    if (!copyToAdd || !selected) return
    setAddingCopy(true)
    setError('')
    try {
      await apiRequest(`/api/estoque/exemplares/${copyToAdd}/localizacao`, { method: 'PATCH', body: JSON.stringify({ prateleira_id: selected.id, secao_id: sectionToAdd ? Number(sectionToAdd) : null }) })
      setFeedback('Livro adicionado à prateleira com sucesso.')
      setCopyToAdd('')
      setSectionToAdd('')
      await load()
      setSelected((current) => current ? { ...current } : current)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível adicionar o livro à prateleira.')
    } finally { setAddingCopy(false) }
  }

  async function removeBookFromShelf(book) {
    if (!selected || !window.confirm(`Remover todos os exemplares de "${book.titulo}" desta prateleira?`)) return
    setRemovingBook(book.id)
    setError('')
    try {
      const bookCopies = shelfCopies(selected).filter((copy) => copy.livro_id === book.id)
      await Promise.all(bookCopies.map((copy) => apiRequest(`/api/estoque/exemplares/${copy.id}/localizacao`, { method: 'PATCH', body: JSON.stringify({ prateleira_id: null, secao_id: null }) })))
      setFeedback('Livro removido da prateleira com sucesso.')
      await load()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível remover o livro da prateleira.')
    } finally { setRemovingBook(null) }
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/api/estoque/prateleiras/${editing.id}`, { method: 'PUT', body: JSON.stringify({ ...form, numero: editing.numero }) })
      setEditing(null)
      setFeedback('Prateleira atualizada com sucesso.')
      await load()
    } catch (requestError) { setError(requestError.message || 'Não foi possível salvar a prateleira.') } finally { setSaving(false) }
  }

  return <section className="module-page students-page shelves-page"><div className="module-toolbar"><div><p className="eyebrow">Organização física</p><h1>Prateleiras</h1><p className="page-description">As 12 prateleiras do acervo e suas finalidades configuráveis.</p></div><button className="icon-button" onClick={load} title="Atualizar prateleiras" aria-label="Atualizar prateleiras"><RefreshCw size={16} /></button></div><div className="list-toolbar shelves-toolbar"><form className="search-form" onSubmit={(event) => event.preventDefault()}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por finalidade ou gênero" aria-label="Pesquisar prateleiras" /><button type="submit">Pesquisar</button></form></div>{feedback && <div className="feedback success" role="status">{feedback}<button onClick={() => setFeedback('')} aria-label="Fechar mensagem"><X size={14} /></button></div>}{error && <div className="feedback error" role="alert">{error}</div>}{loading ? <div className="table-state">Carregando prateleiras...</div> : <div className="shelf-grid">{visibleShelves.map((shelf) => { const shelfCopyList = shelfCopies(shelf); const shelfBookList = shelfBooks(shelf); return <article className="shelf-card" key={shelf.id}><div className="shelf-card-heading"><div><p>Prateleira {String(shelf.numero).padStart(2, '0')}</p><h2>{shelf.descricao || 'Sem nome definido'}</h2></div><button className="table-action" onClick={() => openEdit(shelf)} title="Editar prateleira" aria-label={`Editar prateleira ${shelf.numero}`}><Pencil size={16} /></button></div><strong className="shelf-purpose">{shelf.finalidade || 'Finalidade não definida'}</strong><span className="shelf-genre">{shelf.genero_principal || 'Gênero não definido'}</span><div className="shelf-metrics"><span><strong>{shelfBookList.length}</strong> livros</span><span><strong>{shelfCopyList.length}</strong> exemplares</span></div><div className="shelf-sections">{sections.filter((section) => section.prateleira_id === shelf.id && section.ativa).map((section) => <span key={section.id}>Seção {sectionName(section.numero)}</span>)}</div><button className="shelf-open" onClick={() => openShelf(shelf)}><Eye size={15} /> Ver detalhes</button></article>})}</div>}{selected && <div className="modal-backdrop"><div className="modal-panel details-panel shelf-details-panel"><div className="modal-header"><div><p className="eyebrow">Localização física</p><h2>Prateleira {String(selected.numero).padStart(2, '0')}</h2></div><button className="modal-close" onClick={() => setSelected(null)} aria-label="Fechar detalhes"><X size={19} /></button></div><dl className="details-grid"><div><dt>Nome / apelido</dt><dd>{selected.descricao || 'Não definido'}</dd></div><div><dt>Finalidade</dt><dd>{selected.finalidade || 'Não definida'}</dd></div><div><dt>Gênero principal</dt><dd>{selected.genero_principal || 'Não definido'}</dd></div><div><dt>Exemplares</dt><dd>{shelfCopies(selected).length}</dd></div></dl><div className="shelf-book-manager"><h3><BookOpen size={16} /> Livros nesta prateleira</h3><form className="shelf-add-book" onSubmit={addCopyToShelf}><select value={bookToAdd} onChange={selectBookToAdd} aria-label="Livro para adicionar"><option value="">Adicionar livro existente...</option>{booksAvailableForShelf.map((book) => <option value={book.id} key={book.id}>{book.titulo}</option>)}</select><select value={sectionToAdd} onChange={(event) => setSectionToAdd(event.target.value)} aria-label="Seção do livro"><option value="">Sem seção</option>{sections.filter((section) => section.prateleira_id === selected.id && section.ativa).map((section) => <option value={section.id} key={section.id}>Seção {sectionName(section.numero)}</option>)}</select><button className="primary-button" type="submit" disabled={!copyToAdd || addingCopy}><Plus size={15} /> {addingCopy ? 'Adicionando...' : 'Adicionar'}</button></form><div className="shelf-book-list">{shelfBooks(selected).map((book) => <div className="shelf-book-row" key={book.id}><span>{book.titulo}</span><button className="table-action" onClick={() => removeBookFromShelf(book)} disabled={removingBook === book.id} title="Remover livro da prateleira" aria-label={`Remover ${book.titulo}`}><Trash2 size={15} /></button></div>)}{!shelfBooks(selected).length && <p>Nenhum livro localizado nesta prateleira.</p>}</div></div><div className="modal-actions"><button className="secondary-button" onClick={() => setSelected(null)}>Fechar</button><button className="primary-button" onClick={() => openEdit(selected)}><Pencil size={16} /> Editar prateleira</button></div></div></div>}{editing && <div className="modal-backdrop"><div className="modal-panel" role="dialog" aria-modal="true"><div className="modal-header"><div><p className="eyebrow">Configuração física</p><h2>Editar Prateleira {String(editing.numero).padStart(2, '0')}</h2></div><button className="modal-close" onClick={() => setEditing(null)} aria-label="Fechar edição"><X size={19} /></button></div><form className="student-form" onSubmit={save}><div className="form-grid"><label className="full-field">Nome / apelido<input value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} maxLength="200" /></label><label>Tipo / finalidade<input value={form.finalidade} onChange={(event) => setForm({ ...form, finalidade: event.target.value })} maxLength="100" /></label><label>Gênero principal<input value={form.genero_principal} onChange={(event) => setForm({ ...form, genero_principal: event.target.value })} maxLength="150" /></label><label className="full-field">Observações<textarea value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} rows="4" /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditing(null)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button></div></form></div></div>}</section>
}
