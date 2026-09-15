import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Eye, Pencil, Plus, Power, RefreshCw, Search, X } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { apiRequest, getAccessToken } from '../api/client'

const emptyForm = {
  numero_registro: '', numero_exemplares: '1', tipo_obra: '', pi: '', cdd: '', cutter: '', autores: '', titulo: '', subtitulo: '', assunto: '', local: '', edicao: '', editora: '', ano_publicacao: '', numero_paginas: '', volumes: '', serie: '', isbn: '', idioma: 'Português', observacoes: '', prateleira_id: '', secao_id: '', categoria_id: '', editora_id: '',
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : '—'
}

function cleanPayload(form) {
  return {
    numero_registro: form.numero_registro.trim() || null,
    titulo: form.titulo.trim(),
    subtitulo: form.subtitulo.trim() || null,
    autores: form.autores.trim() || null,
    isbn: form.isbn.trim() || null,
    ano_publicacao: form.ano_publicacao ? Number(form.ano_publicacao) : null,
    edicao: form.edicao.trim() || null,
    numero_paginas: form.numero_paginas ? Number(form.numero_paginas) : null,
    numero_exemplares: Number(form.numero_exemplares),
    tipo_obra: form.tipo_obra.trim() || null,
    pi: form.pi.trim() || null,
    cdd: form.cdd.trim() || null,
    cutter: form.cutter.trim() || null,
    assunto: form.assunto.trim() || null,
    local: form.local.trim() || null,
    volumes: form.volumes ? Number(form.volumes) : null,
    serie: form.serie.trim() || null,
    idioma: form.idioma.trim() || 'Português',
    observacoes: form.observacoes.trim() || null,
    prateleira_id: form.prateleira_id ? Number(form.prateleira_id) : null,
    secao_id: form.secao_id ? Number(form.secao_id) : null,
    categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
    editora_id: form.editora_id ? Number(form.editora_id) : null,
    editora: form.editora?.trim() || null,
  }
}

function bookAuthors(book) {
  return book.autores?.map((author) => author.nome).join(', ') || '—'
}

function CameraScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const readerRef = useRef(null)
  const onDetectedRef = useRef(onDetected)
  const [devices, setDevices] = useState([])
  const [deviceId, setDeviceId] = useState('')
  const [cameraError, setCameraError] = useState('')
  const detectedRef = useRef(false)

  useEffect(() => { onDetectedRef.current = onDetected }, [onDetected])
  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    readerRef.current?.reset()
    readerRef.current = null
  }

  useEffect(() => {
    let cancelled = false
    async function startCamera() {
      stopCamera()
      detectedRef.current = false
      setCameraError('')
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }, audio: false })
        if (cancelled) return stream.getTracks().forEach((track) => track.stop())
        streamRef.current = stream
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const available = await navigator.mediaDevices.enumerateDevices()
        const cameras = available.filter((device) => device.kind === 'videoinput')
        setDevices(cameras)
        if (!deviceId && cameras.length) setDeviceId(cameras.find((camera) => /back|traseira|environment/i.test(camera.label))?.deviceId || cameras[0].deviceId)
        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8'] })
          const scan = async () => {
            if (cancelled || detectedRef.current) return
            try {
              const results = await detector.detect(videoRef.current)
              const code = results.find((result) => result.rawValue)?.rawValue
              if (code) { detectedRef.current = true; onDetectedRef.current(code); return }
            } catch { }
            requestAnimationFrame(scan)
          }
          requestAnimationFrame(scan)
        } else {
          const reader = new BrowserMultiFormatReader()
          readerRef.current = reader
          reader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result && !detectedRef.current) { detectedRef.current = true; onDetectedRef.current(result.getText()) }
          })
        }
      } catch (error) {
        setCameraError(error.name === 'NotAllowedError' ? 'Permissão para usar a câmera foi negada.' : error.name === 'NotFoundError' ? 'Este aparelho não possui uma câmera disponível.' : 'Não foi possível iniciar a câmera.')
      }
    }
    if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(window.location.hostname)) setCameraError('A câmera exige uma conexão segura. Abra o sistema usando HTTPS no celular.')
    else if (!navigator.mediaDevices?.getUserMedia) setCameraError('Este navegador não oferece acesso à câmera. Use um navegador atualizado.')
    else startCamera()
    return () => { cancelled = true; stopCamera() }
  }, [deviceId])

  const switchCamera = () => { const currentIndex = devices.findIndex((device) => device.deviceId === deviceId); setDeviceId(devices[(currentIndex + 1) % devices.length].deviceId) }
  return <div className="camera-backdrop"><div className="camera-panel" role="dialog" aria-modal="true" aria-labelledby="camera-title"><div className="modal-header"><div><p className="eyebrow">Leitura pelo celular</p><h2 id="camera-title">Escanear código de barras</h2></div><button className="modal-close" onClick={onClose} aria-label="Fechar scanner"><X size={19} /></button></div><div className="camera-view"><video ref={videoRef} playsInline muted /><div className="scan-frame" /><p>Aponte a câmera para o código de barras do livro</p></div>{cameraError && <div className="feedback error" role="alert">{cameraError}</div>}{devices.length > 1 && <div className="camera-choice"><span>{devices.find((device) => device.deviceId === deviceId)?.label || 'Câmera atual'}</span><button type="button" className="secondary-button" onClick={switchCamera}>Trocar câmera</button></div>}<div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancelar</button></div></div></div>
}

function ISBNScanner({ value, onChange, onSearch, loading, feedback, cover, form, updateField, cameraOpen, onOpenCamera, onCloseCamera, onDetected }) {
  return <section className="isbn-scanner page-isbn-scanner"><div><h2>Escanear código de barras</h2><p>Digite o ISBN, use um leitor USB ou escaneie com a câmera do celular.</p></div><form className="isbn-search-row" onSubmit={onSearch}><input value={value} onChange={onChange} placeholder="Código de barras / ISBN" aria-label="Código de barras / ISBN" /><button type="submit" className="secondary-button" disabled={loading}>{loading ? 'Buscando...' : 'Buscar livro'}</button><button type="button" className="secondary-button camera-button" onClick={onOpenCamera} disabled={loading}>Escanear com a câmera</button></form>{loading && <p className="isbn-status">Buscando informações do livro...</p>}{feedback && <p className={`isbn-status ${feedback.startsWith('Livro encontrado') ? 'isbn-success' : ''}`}>{feedback}</p>}{cover && <img className="isbn-cover" src={cover} alt="Capa encontrada para o livro" />}{(feedback || loading) && <div className="scanner-edit-fields"><label>Subtítulo<input name="subtitulo" value={form.subtitulo} onChange={updateField} /></label><label>Idioma<input name="idioma" value={form.idioma} onChange={updateField} /></label></div>}{cameraOpen && <CameraScanner onDetected={onDetected} onClose={onCloseCamera} />}</section>
}

function LocationFields({ form, updateField, prateleiras, secoes }) {
  return <section className="isbn-scanner location-fields"><h2>Localização na biblioteca</h2><div className="form-grid catalog-grid"><label>Prateleira <span className="required">*</span><select name="prateleira_id" value={form.prateleira_id} onChange={(event) => { updateField(event); updateField({ target: { name: 'secao_id', value: '' } }) }} required><option value="">Escolha uma prateleira</option>{prateleiras.filter((shelf) => shelf.ativa).sort((left, right) => left.numero - right.numero).map((shelf) => <option value={shelf.id} key={shelf.id}>Prateleira {String(shelf.numero).padStart(2, '0')}</option>)}</select></label><label>Seção<select name="secao_id" value={form.secao_id} onChange={updateField} disabled={!form.prateleira_id}><option value="">Sem seção definida</option>{secoes.filter((section) => section.prateleira_id === Number(form.prateleira_id) && section.ativa).map((section) => <option value={section.id} key={section.id}>Seção {section.numero <= 26 ? String.fromCharCode(64 + section.numero) : section.numero}</option>)}</select></label></div></section>
}

export function Prateleiras() {
  const [shelves, setShelves] = useState([])
  const [books, setBooks] = useState([])
  const [copies, setCopies] = useState([])
  const [autores, setAutores] = useState([])
  const [categorias, setCategorias] = useState([])
  const [editoras, setEditoras] = useState([])
  const [secoes, setSecoes] = useState([])
  const [selected, setSelected] = useState(null)
  const [bookDetails, setBookDetails] = useState(null)
  const [bookFormOpen, setBookFormOpen] = useState(false)
  const [editingBook, setEditingBook] = useState(null)
  const [isCloneMode, setIsCloneMode] = useState(false)
  const [bookForm, setBookForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [query, setQuery] = useState('')
  const [searchField, setSearchField] = useState('titulo')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [publisherFilter, setPublisherFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [isbnSearch, setIsbnSearch] = useState('')
  const [isbnLoading, setIsbnLoading] = useState(false)
  const [isbnFeedback, setIsbnFeedback] = useState('')
  const [isbnCover, setIsbnCover] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cloneSourceBook, setCloneSourceBook] = useState(null)
  const numeroRegistroRef = useRef(null)

  const categoryName = (id) => categorias.find((item) => item.id === id)?.nome || '—'
  const publisherName = (id) => editoras.find((item) => item.id === id)?.nome || '—'

  async function loadReferences() {
    const [shelfList, bookList, copyList, authors, categories, publishers, sections] = await Promise.all([
      apiRequest('/api/estoque/prateleiras'),
      apiRequest('/api/livros?page=1&page_size=100'),
      apiRequest('/api/estoque/exemplares?page=1&page_size=100'),
      apiRequest('/api/livros/autores?page=1&page_size=100'),
      apiRequest('/api/livros/categorias?page=1&page_size=100'),
      apiRequest('/api/livros/editoras?page=1&page_size=100'),
      apiRequest('/api/estoque/secoes'),
    ])
    setShelves(shelfList.sort((left, right) => left.numero - right.numero))
    setBooks(bookList)
    setCopies(copyList)
    setAutores(authors)
    setCategorias(categories)
    setEditoras(publishers)
    setSecoes(sections)
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      await loadReferences()
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

  const visibleBooks = useMemo(() => {
    const filtered = books.filter((book) => {
      const matchesQuery = !query || (searchField === 'titulo' ? book.titulo?.toLowerCase().includes(query.toLowerCase()) : searchField === 'autor' ? book.autores?.some((author) => author.nome.toLowerCase().includes(query.toLowerCase())) : book.isbn?.toLowerCase().includes(query.toLowerCase()))
      const matchesCategory = !categoryFilter || String(book.categoria_id) === String(categoryFilter)
      const matchesPublisher = !publisherFilter || String(book.editora_id) === String(publisherFilter)
      const matchesStatus = statusFilter === 'todos' ? true : statusFilter === 'ativos' ? book.ativo : !book.ativo
      return matchesQuery && matchesCategory && matchesPublisher && matchesStatus
    })
    return filtered
  }, [books, categoryFilter, publisherFilter, query, searchField, statusFilter])

  function shelfBooks(shelf) {
    const bookIds = new Set(copies.filter((copy) => copy.prateleira_id === shelf.id).map((copy) => copy.livro_id))
    return visibleBooks.filter((book) => bookIds.has(book.id))
  }

  function openShelf(shelf) {
    setSelected(shelf)
    setError('')
  }

  function updateBookField(event) {
    setBookForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function openNewBook() {
    setEditingBook(null)
    setCloneSourceBook(null)
    setIsCloneMode(false)
    setBookForm({ ...emptyForm, prateleira_id: selected ? String(selected.id) : '', secao_id: '' })
    setBookFormOpen(true)
    setError('')
    setFeedback('')
    setTimeout(() => numeroRegistroRef.current?.focus(), 100)
  }

  function openEditBook(book) {
    const copy = copies.find((item) => item.livro_id === book.id && item.prateleira_id === selected.id)
    setEditingBook(book)
    setCloneSourceBook(null)
    setIsCloneMode(false)
    setBookForm({
      numero_registro: book.numero_registro || '',
      numero_exemplares: String(copies.filter((item) => item.livro_id === book.id).length || 1),
      tipo_obra: book.tipo_obra || '',
      pi: book.pi || '',
      cdd: book.cdd || '',
      cutter: book.cutter || '',
      autores: book.autores?.map((author) => author.nome).join(', ') || '',
      titulo: book.titulo || '',
      subtitulo: book.subtitulo || '',
      assunto: book.assunto || '',
      local: book.local || '',
      edicao: book.edicao || '',
      editora: book.editora?.nome || publisherName(book.editora_id) || '',
      ano_publicacao: book.ano_publicacao || '',
      numero_paginas: book.numero_paginas || '',
      volumes: book.volumes || '',
      serie: book.serie || '',
      isbn: book.isbn || '',
      idioma: book.idioma || 'Português',
      observacoes: book.observacoes || book.descricao || '',
      prateleira_id: copy?.prateleira_id ? String(copy.prateleira_id) : selected ? String(selected.id) : '',
      secao_id: copy?.secao_id ? String(copy.secao_id) : '',
      categoria_id: book.categoria_id ? String(book.categoria_id) : '',
      editora_id: book.editora_id ? String(book.editora_id) : '',
    })
    setBookFormOpen(true)
    setError('')
    setFeedback('')
  }

  function openCloneBook(book) {
    const copy = copies.find((item) => item.livro_id === book.id && item.prateleira_id === selected.id)
    setEditingBook(null)
    setCloneSourceBook(book)
    setIsCloneMode(true)
    setBookForm({
      numero_registro: '',
      numero_exemplares: '1',
      tipo_obra: book.tipo_obra || '',
      pi: book.pi || '',
      cdd: book.cdd || '',
      cutter: book.cutter || '',
      autores: book.autores?.map((author) => author.nome).join(', ') || '',
      titulo: book.titulo || '',
      subtitulo: book.subtitulo || '',
      assunto: book.assunto || '',
      local: book.local || '',
      edicao: book.edicao || '',
      editora: book.editora?.nome || publisherName(book.editora_id) || '',
      ano_publicacao: book.ano_publicacao || '',
      numero_paginas: book.numero_paginas || '',
      volumes: book.volumes || '',
      serie: book.serie || '',
      isbn: book.isbn || '',
      idioma: book.idioma || 'Português',
      observacoes: book.observacoes || book.descricao || '',
      prateleira_id: copy?.prateleira_id ? String(copy.prateleira_id) : selected ? String(selected.id) : '',
      secao_id: copy?.secao_id ? String(copy.secao_id) : '',
      categoria_id: book.categoria_id ? String(book.categoria_id) : '',
      editora_id: book.editora_id ? String(book.editora_id) : '',
    })
    setBookFormOpen(true)
    setError('')
    setFeedback('')
    setTimeout(() => numeroRegistroRef.current?.focus(), 100)
  }

  async function searchISBN(event, scannedValue = null) {
    event?.preventDefault()
    const value = (scannedValue || isbnSearch).trim()
    if (!value || isbnLoading) return
    setIsbnLoading(true)
    setError('')
    setIsbnFeedback('')
    try {
      const result = await apiRequest(`/api/livros/buscar-isbn/${encodeURIComponent(value)}`)
      const found = result.titulo || result.autores?.length || result.editora
      setBookForm((current) => ({
        ...current,
        isbn: result.isbn || current.isbn,
        titulo: result.titulo || current.titulo,
        subtitulo: result.subtitulo || current.subtitulo,
        autores: result.autores?.join(', ') || current.autores,
        editora: result.editora || current.editora,
        ano_publicacao: result.ano_publicacao || current.ano_publicacao,
        numero_paginas: result.numero_paginas || current.numero_paginas,
        idioma: result.idioma || current.idioma,
        assunto: result.categorias?.join(', ') || current.assunto,
        observacoes: result.descricao || current.observacoes,
      }))
      setIsbnCover(result.capa_url || '')
      setIsbnFeedback(found ? 'Livro encontrado pelo ISBN.' : 'Não encontramos informações para este ISBN. Você pode continuar o cadastro manualmente.')
      setTimeout(() => numeroRegistroRef.current?.focus(), 150)
    } catch (requestError) {
      setIsbnCover('')
      setIsbnFeedback(requestError.message || 'Não foi possível consultar este ISBN. Você pode continuar o cadastro manualmente.')
    } finally {
      setIsbnLoading(false)
    }
  }

  async function saveBook(event) {
    event.preventDefault()
    if (!bookForm.autores.trim()) {
      setError('Informe ao menos um autor.')
      return
    }
    if (!bookForm.titulo.trim()) {
      setError('Informe o título do livro.')
      return
    }
    if (!bookForm.prateleira_id) {
      setError('Selecione uma prateleira para o livro.')
      return
    }
    if (!bookForm.numero_exemplares || Number(bookForm.numero_exemplares) < 1 || !Number.isInteger(Number(bookForm.numero_exemplares))) {
      setError('Informe um número inteiro positivo de exemplares.')
      return
    }
    if (bookForm.ano_publicacao && (Number(bookForm.ano_publicacao) < 1000 || Number(bookForm.ano_publicacao) > 2100)) {
      setError('Informe um ano de publicação entre 1000 e 2100.')
      return
    }
    if (bookForm.numero_registro && bookForm.numero_registro.trim()) {
      const existing = books.find((item) => item.numero_registro && item.numero_registro.toLowerCase() === bookForm.numero_registro.trim().toLowerCase() && (!editingBook || item.id !== editingBook.id))
      if (existing) {
        setError('Este número de registro já está sendo utilizado por outro livro.')
        return
      }
    }
    setSaving(true)
    setError('')
    try {
      const payload = cleanPayload(bookForm)
      if (editingBook) delete payload.numero_exemplares
      if (isCloneMode && cloneSourceBook) {
        delete payload.numero_registro
      }
      if (isCloneMode && cloneSourceBook) {
        const clonePayload = { ...payload, numero_registro: null }
        const response = await apiRequest('/api/livros', { method: 'POST', body: JSON.stringify(clonePayload) })
        setBookFormOpen(false)
        setFeedback('Livro clonado com sucesso.')
        setSelected(shelves.find((shelf) => shelf.id === Number(clonePayload.prateleira_id)) || selected)
        await load()
        return response
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

  async function toggleStatus(book) {
    const action = book.ativo ? 'desativar' : 'ativar'
    if (!window.confirm(`Tem certeza que deseja ${action} este livro?`)) return
    try {
      await apiRequest(`/api/livros/${book.id}/status`, { method: 'PATCH', body: JSON.stringify({ ativo: !book.ativo }) })
      setFeedback(`Livro ${book.ativo ? 'desativado' : 'ativado'} com sucesso.`)
      await load()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível alterar o status do livro.')
    }
  }

  function searchBooks(event) {
    event.preventDefault()
    setError('')
  }

  return <section className="module-page students-page shelves-page">
    <div className="module-toolbar"><div><p className="eyebrow">Acervo físico</p><h1>Prateleiras</h1><p className="page-description">Escolha uma prateleira para consultar, localizar e cadastrar livros completos com ficha catalográfica.</p></div><button className="icon-button" onClick={load} title="Atualizar prateleiras" aria-label="Atualizar prateleiras"><RefreshCw size={16} /></button></div>
    <div className="books-filters">
      <form className="search-form" onSubmit={searchBooks}><Search size={17} /><select value={searchField} onChange={(event) => setSearchField(event.target.value)} aria-label="Campo da pesquisa"><option value="titulo">Título</option><option value="autor">Autor</option><option value="isbn">ISBN</option></select><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite para pesquisar" aria-label="Pesquisar livros" /><button type="submit">Pesquisar</button></form>
      <select className="filter-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>{categorias.map((category) => <option value={category.id} key={category.id}>{category.nome}</option>)}</select>
      <select className="filter-select" value={publisherFilter} onChange={(event) => setPublisherFilter(event.target.value)} aria-label="Filtrar por editora"><option value="">Todas as editoras</option>{editoras.map((publisher) => <option value={publisher.id} key={publisher.id}>{publisher.nome}</option>)}</select>
      <select className="filter-select status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por status"><option value="todos">Todos os status</option><option value="ativos">Ativos</option><option value="inativos">Inativos</option></select>
    </div>
    {feedback && <div className="feedback success" role="status">{feedback}<button onClick={() => setFeedback('')} aria-label="Fechar mensagem"><X size={14} /></button></div>}
    {error && <div className="feedback error" role="alert">{error}</div>}
    {loading ? <div className="table-state">Carregando prateleiras...</div> : <div className="shelf-grid">{shelves.map((shelf) => { const count = shelfBooks(shelf).length; return <article className="shelf-card" key={shelf.id}><div className="shelf-card-heading"><div><p>Prateleira {String(shelf.numero).padStart(2, '0')}</p><h2>Prateleira {String(shelf.numero).padStart(2, '0')}</h2></div></div><div className="shelf-metrics"><span><strong>{count}</strong> {count === 1 ? 'livro' : 'livros'}</span></div><button className="shelf-open" onClick={() => openShelf(shelf)}><Eye size={15} /> Ver livros</button></article>})}</div>}
    {selected && <div className="modal-backdrop"><div className="modal-panel details-panel shelf-details-panel" role="dialog" aria-modal="true" aria-labelledby="shelf-books-title"><div className="modal-header"><div><p className="eyebrow">Acervo físico</p><h2 id="shelf-books-title">Prateleira {String(selected.numero).padStart(2, '0')}</h2></div><button className="modal-close" onClick={() => setSelected(null)} aria-label="Fechar livros da prateleira"><X size={19} /></button></div><div className="module-toolbar shelf-books-toolbar"><div><strong>{shelfBooks(selected).length} {shelfBooks(selected).length === 1 ? 'livro cadastrado' : 'livros cadastrados'}</strong></div><button className="primary-button" onClick={openNewBook}><Plus size={16} /> Novo Livro</button></div>{!shelfBooks(selected).length ? <div className="table-state">Esta prateleira ainda não possui livros.</div> : <div className="table-frame"><table><thead><tr><th>Livro</th><th>Autor</th><th>ISBN</th><th>Registro</th><th>Prateleira</th><th>Ações</th></tr></thead><tbody>{shelfBooks(selected).map((book) => <tr key={book.id} className="clickable-row" onClick={() => setBookDetails(book)}><td className="student-name">{book.titulo}</td><td>{book.autores?.map((author) => author.nome).join(', ') || '—'}</td><td>{book.isbn || '—'}</td><td>{book.numero_registro || '—'}</td><td>{shelves.find((shelf) => shelf.id === Number(book.prateleira_id || selected.id)) ? `Prateleira ${String(shelves.find((shelf) => shelf.id === Number(book.prateleira_id || selected.id)).numero).padStart(2, '0')}` : '—'}</td><td className="row-actions"><button className="table-action" onClick={(event) => { event.stopPropagation(); openEditBook(book) }} title="Editar livro" aria-label={`Editar ${book.titulo}`}><Pencil size={16} /></button><button className="table-action" onClick={(event) => { event.stopPropagation(); openCloneBook(book) }} title="Clonar livro" aria-label={`Clonar ${book.titulo}`}><BookOpen size={16} /></button></td></tr>)}</tbody></table></div>}<div className="modal-actions"><button className="secondary-button" onClick={() => setSelected(null)}>Fechar</button></div></div></div>}
    {bookDetails && <div className="modal-backdrop" onClick={() => setBookDetails(null)}><div className="modal-panel details-panel shelf-book-detail-panel" role="dialog" aria-modal="true" aria-labelledby="shelf-book-detail-title" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Ficha do livro</p><h2 id="shelf-book-detail-title">{bookDetails.titulo}</h2></div><button className="modal-close" onClick={() => setBookDetails(null)} aria-label="Fechar detalhes do livro"><X size={19} /></button></div><dl className="details-grid"><div><dt>Autor(es)</dt><dd>{bookAuthors(bookDetails)}</dd></div><div><dt>Nº de registro</dt><dd>{bookDetails.numero_registro || 'Não informado'}</dd></div><div><dt>Tipo da obra</dt><dd>{bookDetails.tipo_obra || 'Não informado'}</dd></div><div><dt>PI / CUTTER</dt><dd>{[bookDetails.pi, bookDetails.cutter].filter(Boolean).join(' / ') || 'Não informado'}</dd></div><div><dt>Assunto</dt><dd>{bookDetails.assunto || 'Não informado'}</dd></div><div><dt>Local</dt><dd>{bookDetails.local || 'Não informado'}</dd></div><div><dt>ISBN</dt><dd>{bookDetails.isbn || 'Não informado'}</dd></div><div><dt>Editora</dt><dd>{publisherName(bookDetails.editora_id) || bookDetails.editora?.nome || 'Não informado'}</dd></div><div><dt>Categoria</dt><dd>{categoryName(bookDetails.categoria_id) || 'Não informado'}</dd></div><div><dt>Ano / páginas</dt><dd>{[bookDetails.ano_publicacao, bookDetails.numero_paginas].filter(Boolean).join(' / ') || 'Não informado'}</dd></div><div><dt>Edição / volumes</dt><dd>{[bookDetails.edicao, bookDetails.volumes].filter(Boolean).join(' / ') || 'Não informado'}</dd></div><div><dt>Idioma</dt><dd>{bookDetails.idioma || 'Não informado'}</dd></div><div><dt>Subtítulo</dt><dd>{bookDetails.subtitulo || 'Não informado'}</dd></div><div><dt>Seção</dt><dd>{bookDetails.secao_id ? `Seção ${bookDetails.secao_id}` : 'Não informado'}</dd></div><div className="full-detail"><dt>Descrição/observações</dt><dd>{bookDetails.observacoes || bookDetails.descricao || 'Não informado'}</dd></div></dl><div className="modal-actions"><button className="secondary-button" onClick={() => setBookDetails(null)}>Fechar</button></div></div></div>}
    {bookFormOpen && <div className="modal-backdrop"><div className="modal-panel book-form-panel catalog-form-panel" role="dialog" aria-modal="true" aria-labelledby="book-form-title"><div className="modal-header"><div><p className="eyebrow">Ficha de catalogação</p><h2 id="book-form-title">{editingBook ? 'Editar livro' : isCloneMode ? 'Clonar Livro' : 'Novo Livro'}</h2></div><button className="modal-close" onClick={() => setBookFormOpen(false)} aria-label="Fechar formulário"><X size={19} /></button></div><form className="student-form catalog-form" onSubmit={saveBook}><section className="catalog-section"><h3>ISBN e identificação</h3><div className="form-grid catalog-grid"><label>ISBN<input name="isbn" value={bookForm.isbn} onChange={updateBookField} /></label><label>Nº de Registro<input ref={numeroRegistroRef} name="numero_registro" value={bookForm.numero_registro} onChange={updateBookField} placeholder={isCloneMode ? 'Será informado no clone' : ''} /></label></div><div className="isbn-search-row"><input value={isbnSearch} onChange={(event) => setIsbnSearch(event.target.value)} placeholder="Código de barras / ISBN" aria-label="Código de barras / ISBN" /><button type="button" className="secondary-button" onClick={(event) => searchISBN(event)} disabled={isbnLoading}>{isbnLoading ? 'Buscando...' : 'Buscar livro'}</button><button type="button" className="secondary-button camera-button" onClick={() => setCameraOpen(true)} disabled={isbnLoading}>Escanear câmera</button></div>{isbnFeedback && <p className={`isbn-status ${isbnFeedback.startsWith('Livro encontrado') ? 'isbn-success' : ''}`}>{isbnFeedback}</p>}{isbnCover && <img className="isbn-cover" src={isbnCover} alt="Capa encontrada para o livro" />}</section><section className="catalog-section"><h3>Dados bibliográficos</h3><div className="form-grid catalog-grid"><label className="full-field">Título <span className="required">*</span><input name="titulo" value={bookForm.titulo} onChange={updateBookField} required /></label><label className="full-field">Subtítulo<input name="subtitulo" value={bookForm.subtitulo} onChange={updateBookField} /></label><label className="full-field">Autor(es) <span className="required">*</span><input name="autores" value={bookForm.autores} onChange={updateBookField} required /></label><label>Categoria<select name="categoria_id" value={bookForm.categoria_id} onChange={updateBookField}><option value="">Selecione</option>{categorias.map((category) => <option value={category.id} key={category.id}>{category.nome}</option>)}</select></label><label>Editora<select name="editora_id" value={bookForm.editora_id} onChange={updateBookField}><option value="">Selecione</option>{editoras.map((publisher) => <option value={publisher.id} key={publisher.id}>{publisher.nome}</option>)}</select></label><label>Nome da Editora<input name="editora" value={bookForm.editora} onChange={updateBookField} /></label><label>Tipo da obra<input name="tipo_obra" value={bookForm.tipo_obra} onChange={updateBookField} /></label><label>PI / Cutter<input name="pi" value={bookForm.pi} onChange={updateBookField} /></label><label>CDD<input name="cdd" value={bookForm.cdd} onChange={updateBookField} /></label><label>Cutter<input name="cutter" value={bookForm.cutter} onChange={updateBookField} /></label><label>Assunto<input name="assunto" value={bookForm.assunto} onChange={updateBookField} /></label><label>Local<input name="local" value={bookForm.local} onChange={updateBookField} /></label><label>Edição<input name="edicao" value={bookForm.edicao} onChange={updateBookField} /></label><label>Ano de publicação<input type="number" name="ano_publicacao" value={bookForm.ano_publicacao} onChange={updateBookField} min="1000" max="2100" /></label><label>Número de páginas<input type="number" name="numero_paginas" value={bookForm.numero_paginas} onChange={updateBookField} min="1" /></label><label>Volumes<input type="number" name="volumes" value={bookForm.volumes} onChange={updateBookField} min="1" /></label><label>Série<input name="serie" value={bookForm.serie} onChange={updateBookField} /></label><label>Idioma<input name="idioma" value={bookForm.idioma} onChange={updateBookField} /></label><label>Nº de Exemplares <span className="required">*</span><input type="number" name="numero_exemplares" value={bookForm.numero_exemplares} onChange={updateBookField} min="1" step="1" required /></label></div></section><LocationFields form={bookForm} updateField={updateBookField} prateleiras={shelves} secoes={secoes} /><section className="catalog-section"><h3>Observações</h3><div className="form-grid catalog-grid"><label className="full-field">Observações<textarea name="observacoes" value={bookForm.observacoes} onChange={updateBookField} /></label></div></section><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setBookFormOpen(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : isCloneMode ? 'Salvar clone' : 'Salvar livro'}</button></div></form>{cameraOpen && <CameraScanner onDetected={(value) => { setCameraOpen(false); setIsbnSearch(value); searchISBN(null, value) }} onClose={() => setCameraOpen(false)} />}</div></div>}
  </section>
}
