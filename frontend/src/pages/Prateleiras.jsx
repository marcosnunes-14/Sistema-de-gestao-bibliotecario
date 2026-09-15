import { useEffect, useState } from 'react'
import { Eye, Pencil, Plus, RefreshCw, X } from 'lucide-react'
import { apiRequest, getAccessToken } from '../api/client'

const emptyBook = { titulo: '', autores: '', isbn: '', numero_exemplares: '1', prateleira_id: '' }

function bookAuthors(book) {
  return book.autores?.map((author) => author.nome).join(', ') || '—'
}

export function Prateleiras() {
  const [shelves, setShelves] = useState([])
  const [books, setBooks] = useState([])
  const [copies, setCopies] = useState([])
  const [selected, setSelected] = useState(null)
  const [bookDetails, setBookDetails] = useState(null)
  const [bookFormOpen, setBookFormOpen] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [bookForm, setBookForm] = useState(emptyBook)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [shelfList, bookList, copyList] = await Promise.all([
        apiRequest('/api/estoque/prateleiras'),
        apiRequest('/api/livros?page=1&page_size=100'),
        apiRequest('/api/estoque/exemplares?page=1&page_size=100'),
      ])
      setShelves(shelfList.sort((left, right) => left.numero - right.numero))
      setBooks(bookList)
      setCopies(copyList)
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

  function shelfBooks(shelf) {
    const bookIds = new Set(copies.filter((copy) => copy.prateleira_id === shelf.id).map((copy) => copy.livro_id))
    return books.filter((book) => bookIds.has(book.id))
  }

  function openShelf(shelf) {
    setSelected(shelf)
    setError('')
  }

  function openNewBook() {
    setEditingBook(null)
    setBookForm({ ...emptyBook, prateleira_id: String(selected.id) })
    setBookFormOpen(true)
    setError('')
  }

  function openEditBook(book) {
    const copy = copies.find((item) => item.livro_id === book.id && item.prateleira_id === selected.id)
    setEditingBook(book)
    setBookForm({
      titulo: book.titulo || '',
      autores: bookAuthors(book) === '—' ? '' : bookAuthors(book),
      isbn: book.isbn || '',
      numero_exemplares: String(copies.filter((item) => item.livro_id === book.id).length || 1),
      prateleira_id: String(copy?.prateleira_id || selected.id),
    })
    setBookFormOpen(true)
    setError('')
  }

  function updateBookField(event) {
    setBookForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function saveBook(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        titulo: bookForm.titulo.trim(),
        autores: bookForm.autores.trim(),
        isbn: bookForm.isbn.trim() || null,
        numero_exemplares: Number(bookForm.numero_exemplares),
        prateleira_id: Number(bookForm.prateleira_id),
      }
      if (editingBook) await apiRequest(`/api/livros/${editingBook.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await apiRequest('/api/livros', { method: 'POST', body: JSON.stringify(payload) })
      setBookFormOpen(false)
      setFeedback(editingBook ? 'Livro atualizado com sucesso.' : 'Livro cadastrado com sucesso.')
      await load()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível salvar o livro.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="module-page students-page shelves-page">
    <div className="module-toolbar"><div><p className="eyebrow">Acervo físico</p><h1>Prateleiras</h1><p className="page-description">Escolha uma prateleira para consultar e cadastrar seus livros.</p></div><button className="icon-button" onClick={load} title="Atualizar prateleiras" aria-label="Atualizar prateleiras"><RefreshCw size={16} /></button></div>
    {feedback && <div className="feedback success" role="status">{feedback}<button onClick={() => setFeedback('')} aria-label="Fechar mensagem"><X size={14} /></button></div>}
    {error && <div className="feedback error" role="alert">{error}</div>}
    {loading ? <div className="table-state">Carregando prateleiras...</div> : <div className="shelf-grid">{shelves.map((shelf) => { const count = shelfBooks(shelf).length; return <article className="shelf-card" key={shelf.id}><div className="shelf-card-heading"><div><p>Prateleira {String(shelf.numero).padStart(2, '0')}</p><h2>Prateleira {String(shelf.numero).padStart(2, '0')}</h2></div></div><div className="shelf-metrics"><span><strong>{count}</strong> {count === 1 ? 'livro' : 'livros'}</span></div><button className="shelf-open" onClick={() => openShelf(shelf)}><Eye size={15} /> Ver livros</button></article>})}</div>}
    {selected && <div className="modal-backdrop"><div className="modal-panel details-panel shelf-details-panel" role="dialog" aria-modal="true" aria-labelledby="shelf-books-title"><div className="modal-header"><div><p className="eyebrow">Acervo físico</p><h2 id="shelf-books-title">Prateleira {String(selected.numero).padStart(2, '0')}</h2></div><button className="modal-close" onClick={() => setSelected(null)} aria-label="Fechar livros da prateleira"><X size={19} /></button></div><div className="module-toolbar shelf-books-toolbar"><div><strong>{shelfBooks(selected).length} {shelfBooks(selected).length === 1 ? 'livro cadastrado' : 'livros cadastrados'}</strong></div><button className="primary-button" onClick={openNewBook}><Plus size={16} /> Novo Livro</button></div>{!shelfBooks(selected).length ? <div className="table-state">Esta prateleira ainda não possui livros.</div> : <div className="table-frame"><table><thead><tr><th>Livro</th><th>Autor</th><th>ISBN</th><th>Quantidade</th><th>Ações</th></tr></thead><tbody>{shelfBooks(selected).map((book) => <tr key={book.id} className="clickable-row" onClick={() => setBookDetails(book)}><td className="student-name">{book.titulo}</td><td>{bookAuthors(book)}</td><td>{book.isbn || '—'}</td><td>{copies.filter((copy) => copy.livro_id === book.id).length}</td><td><button className="table-action" onClick={(event) => { event.stopPropagation(); openEditBook(book) }} title="Editar livro" aria-label={`Editar ${book.titulo}`}><Pencil size={16} /></button></td></tr>)}</tbody></table></div>}<div className="modal-actions"><button className="secondary-button" onClick={() => setSelected(null)}>Fechar</button></div></div></div>}
    {bookDetails && <div className="modal-backdrop" onClick={() => setBookDetails(null)}><div className="modal-panel details-panel shelf-book-detail-panel" role="dialog" aria-modal="true" aria-labelledby="shelf-book-detail-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Ficha do livro</p><h2 id="shelf-book-detail-title">{bookDetails.titulo}</h2></div><button className="modal-close" onClick={() => setBookDetails(null)} aria-label="Fechar detalhes do livro"><X size={19} /></button></div><dl className="details-grid"><div><dt>Autor(es)</dt><dd>{bookAuthors(bookDetails)}</dd></div><div><dt>Nº de registro</dt><dd>{bookDetails.numero_registro || 'Não informado'}</dd></div><div><dt>Tipo da obra</dt><dd>{bookDetails.tipo_obra || 'Não informado'}</dd></div><div><dt>PI / CUTTER</dt><dd>{[bookDetails.pi, bookDetails.cutter].filter(Boolean).join(' / ') || 'Não informado'}</dd></div><div><dt>Assunto</dt><dd>{bookDetails.assunto || 'Não informado'}</dd></div><div><dt>Local</dt><dd>{bookDetails.local || 'Não informado'}</dd></div><div><dt>Edição</dt><dd>{bookDetails.edicao || 'Não informado'}</dd></div><div><dt>Editora</dt><dd>{bookDetails.editora || 'Não informado'}</dd></div><div><dt>Ano / páginas</dt><dd>{[bookDetails.ano_publicacao, bookDetails.numero_paginas].filter(Boolean).join(' / ') || 'Não informado'}</dd></div><div><dt>Volumes / série</dt><dd>{[bookDetails.volumes, bookDetails.serie].filter(Boolean).join(' / ') || 'Não informado'}</dd></div></dl><div className="modal-actions"><button className="secondary-button" onClick={() => setBookDetails(null)}>Fechar</button></div></div></div>}
    {bookFormOpen && <div className="modal-backdrop"><div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="shelf-book-form-title"><div className="modal-header"><div><p className="eyebrow">Prateleira {String(selected.numero).padStart(2, '0')}</p><h2 id="shelf-book-form-title">{editingBook ? 'Editar livro' : 'Novo Livro'}</h2></div><button className="modal-close" onClick={() => setBookFormOpen(false)} aria-label="Fechar formulário"><X size={19} /></button></div><form className="student-form" onSubmit={saveBook}><div className="form-grid"><label className="full-field">Nome do livro <span className="required">*</span><input name="titulo" value={bookForm.titulo} onChange={updateBookField} required /></label><label className="full-field">Autor <span className="required">*</span><input name="autores" value={bookForm.autores} onChange={updateBookField} required /></label><label>ISBN<input name="isbn" value={bookForm.isbn} onChange={updateBookField} /></label><label>Quantidade <span className="required">*</span><input type="number" name="numero_exemplares" value={bookForm.numero_exemplares} onChange={updateBookField} min="1" step="1" required /></label>{editingBook && <label className="full-field">Prateleira<select name="prateleira_id" value={bookForm.prateleira_id} onChange={updateBookField} required>{shelves.map((shelf) => <option value={shelf.id} key={shelf.id}>Prateleira {String(shelf.numero).padStart(2, '0')}</option>)}</select></label>}</div>{!editingBook && <p className="required-note">Prateleira: Prateleira {String(selected.numero).padStart(2, '0')}</p>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setBookFormOpen(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Salvar livro'}</button></div></form></div></div>}
  </section>
}
