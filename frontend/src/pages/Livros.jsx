import { useEffect, useRef, useState } from 'react'
import { BookOpen, Eye, Pencil, Plus, Power, RefreshCw, Search, X } from 'lucide-react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { apiRequest, getAccessToken } from '../api/client'

const emptyForm = {
  numero_registro: '', numero_exemplares: '1', tipo_obra: '', pi: '', cdd: '', cutter: '', autores: '', titulo: '', subtitulo: '', assunto: '', local: '', edicao: '', editora: '', ano_publicacao: '', numero_paginas: '', volumes: '', serie: '', isbn: '', idioma: 'Português', observacoes: '', prateleira_id: '', secao_id: '',
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
    autor_ids: undefined,
    prateleira_id: form.prateleira_id ? Number(form.prateleira_id) : null,
    secao_id: form.secao_id ? Number(form.secao_id) : null,
  }
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
            } catch { /* Continue while the frame is not readable. */ }
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
  return <section className="isbn-scanner location-fields"><h2>Localização na biblioteca</h2><div className="form-grid catalog-grid"><label>Prateleira<select name="prateleira_id" value={form.prateleira_id} onChange={(event) => { updateField(event); updateField({ target: { name: 'secao_id', value: '' } }) }}><option value="">Sem localização definida</option>{prateleiras.filter((shelf) => shelf.ativa).map((shelf) => <option value={shelf.id} key={shelf.id}>Prateleira {String(shelf.numero).padStart(2, '0')}</option>)}</select></label><label>Seção<select name="secao_id" value={form.secao_id} onChange={updateField} disabled={!form.prateleira_id}><option value="">Sem seção definida</option>{secoes.filter((section) => section.prateleira_id === Number(form.prateleira_id) && section.ativa).map((section) => <option value={section.id} key={section.id}>Seção {section.numero <= 26 ? String.fromCharCode(64 + section.numero) : section.numero}</option>)}</select></label></div></section>
}

export function Livros({ currentUser }) {
  const isAdmin = currentUser?.perfil === 'administrador'
  const [livros, setLivros] = useState([])
  const [autores, setAutores] = useState([])
  const [categorias, setCategorias] = useState([])
  const [editoras, setEditoras] = useState([])
  const [query, setQuery] = useState('')
  const [searchField, setSearchField] = useState('titulo')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [publisherFilter, setPublisherFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [details, setDetails] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [isbnSearch, setIsbnSearch] = useState('')
  const [isbnLoading, setIsbnLoading] = useState(false)
  const [isbnFeedback, setIsbnFeedback] = useState('')
  const [isbnCover, setIsbnCover] = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [prateleiras, setPrateleiras] = useState([])
  const [secoes, setSecoes] = useState([])
  const [quickMode, setQuickMode] = useState(false)
  const [quickCount, setQuickCount] = useState(0)
  const [lastQuickBook, setLastQuickBook] = useState(null)
  const numeroRegistroRef = useRef(null)

  const categoryName = (id) => categorias.find((item) => item.id === id)?.nome || '—'
  const publisherName = (id) => editoras.find((item) => item.id === id)?.nome || '—'
  const authorNames = (book) => book.autores?.map((author) => author.nome).join(', ') || '—'

  async function loadReferences() {
    const [authors, categories, publishers, shelves, sections] = await Promise.all([
      apiRequest('/api/livros/autores?page=1&page_size=100'),
      apiRequest('/api/livros/categorias?page=1&page_size=100'),
      apiRequest('/api/livros/editoras?page=1&page_size=100'),
      apiRequest('/api/estoque/prateleiras'),
      apiRequest('/api/estoque/secoes'),
    ])
    setAutores(authors)
    setCategorias(categories)
    setEditoras(publishers)
    setPrateleiras(shelves)
    setSecoes(sections)
  }

  async function loadLivros(filterOverrides = {}) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: '1', page_size: '50' })
      if (query.trim()) params.set(searchField, filterOverrides.query ?? query.trim())
      if (filterOverrides.category ?? categoryFilter) params.set('categoria_id', filterOverrides.category ?? categoryFilter)
      if (filterOverrides.publisher ?? publisherFilter) params.set('editora_id', filterOverrides.publisher ?? publisherFilter)
      const result = await apiRequest(`/api/livros?${params}`)
      setLivros(result)
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar os livros.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false)
      setError('Faça login para consultar os livros.')
      return
    }
    Promise.all([loadReferences(), loadLivros()]).catch((requestError) => setError(requestError.message || 'Não foi possível carregar o catálogo.'))
  }, [])

  const visibleBooks = statusFilter === 'todos' ? livros : livros.filter((book) => statusFilter === 'ativos' ? book.ativo : !book.ativo)

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function startCreate() {
    setQuickMode(false)
    setEditing(null)
    setDetails(null)
    setForm(emptyForm)
    setIsbnSearch('')
    setIsbnFeedback('')
    setIsbnCover('')
    setFormOpen(true)
    setFeedback('')
  }

  function startQuickCreate() {
    setQuickMode(true)
    setQuickCount(0)
    setLastQuickBook(null)
    setEditing(null)
    setDetails(null)
    setForm({ ...emptyForm, numero_exemplares: '1' })
    setIsbnSearch('')
    setIsbnFeedback('')
    setIsbnCover('')
    setFeedback('')
    setError('')
    setFormOpen(true)
    setTimeout(() => setCameraOpen(true), 150)
  }

  async function searchISBN(event, scannedValue = null) {
    event?.preventDefault()
    const value = (scannedValue || isbnSearch).trim()
    if (!value || isbnLoading) return
    setIsbnLoading(true)
    if (!formOpen || editing) {
      setEditing(null)
      setDetails(null)
      setForm(emptyForm)
      setFormOpen(true)
    }
    setIsbnFeedback('')
    setError('')
    try {
      const result = await apiRequest(`/api/livros/buscar-isbn/${encodeURIComponent(value)}`)
      const found = result.titulo || result.autores?.length || result.editora
      setForm((current) => ({
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
      if (quickMode) setTimeout(() => numeroRegistroRef.current?.focus(), 100)
    } catch (requestError) {
      setIsbnCover('')
      setIsbnFeedback(requestError.message || 'Não foi possível consultar este ISBN. Você pode continuar o cadastro manualmente.')
    } finally {
      setIsbnLoading(false)
    }
  }

  function handleCameraDetected(value) {
    setCameraOpen(false)
    setIsbnSearch(value)
    searchISBN(null, value)
  }

  function startEdit(book) {
    setQuickMode(false)
    setEditing(book)
    setDetails(null)
    setForm({ numero_registro: book.numero_registro || '', numero_exemplares: '1', tipo_obra: book.tipo_obra || '', pi: book.pi || '', cdd: book.cdd || '', cutter: book.cutter || '', autores: book.autores?.map((author) => author.nome).join(', ') || '', titulo: book.titulo || '', subtitulo: book.subtitulo || '', assunto: book.assunto || '', local: book.local || '', edicao: book.edicao || '', editora: publisherName(book.editora_id) === '—' ? '' : publisherName(book.editora_id), ano_publicacao: book.ano_publicacao || '', numero_paginas: book.numero_paginas || '', volumes: book.volumes || '', serie: book.serie || '', isbn: book.isbn || '', idioma: book.idioma || 'Português', observacoes: book.observacoes || book.descricao || '', prateleira_id: '', secao_id: '' })
    setFormOpen(true)
    setFeedback('')
  }

  async function saveBook(event) {
    event.preventDefault()
    if (!form.autores.trim()) {
      setError('Informe ao menos um autor.')
      return
    }
    if (!form.numero_exemplares || Number(form.numero_exemplares) < 1 || !Number.isInteger(Number(form.numero_exemplares))) {
      setError('Informe um número inteiro positivo de exemplares.')
      return
    }
    if (form.ano_publicacao && (Number(form.ano_publicacao) < 1000 || Number(form.ano_publicacao) > 2100)) {
      setError('Informe um ano de publicação entre 1000 e 2100.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = cleanPayload(form)
      if (editing) delete payload.numero_exemplares
      if (!editing && payload.isbn) {
        const existing = await apiRequest(`/api/livros?isbn=${encodeURIComponent(payload.isbn)}`)
        if (existing.length && !window.confirm('Já existe um livro cadastrado com este ISBN. Deseja continuar mesmo assim?')) return
      }
      if (editing) await apiRequest(`/api/livros/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await apiRequest('/api/livros', { method: 'POST', body: JSON.stringify(payload) })

      if (quickMode && !editing) {
        const savedLocation = { prateleira_id: form.prateleira_id, secao_id: form.secao_id }
        setQuickCount((current) => current + 1)
        setLastQuickBook({ titulo: form.titulo, numero_registro: form.numero_registro })
        setForm({ ...emptyForm, ...savedLocation, numero_exemplares: '1' })
        setIsbnSearch('')
        setIsbnFeedback('')
        setIsbnCover('')
        setFeedback('Livro cadastrado. Pronto para o próximo.')
        await loadLivros()
        setTimeout(() => setCameraOpen(true), 150)
      } else {
        setFormOpen(false)
        setFeedback(editing ? 'Livro atualizado com sucesso.' : 'Livro cadastrado com sucesso.')
        await loadLivros()
      }
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
      await loadLivros()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível alterar o status do livro.')
    }
  }

  function searchBooks(event) {
    event.preventDefault()
    loadLivros()
  }

  return (
    <section className="module-page students-page books-page">
      {isAdmin && <ISBNScanner value={isbnSearch} onChange={(event) => setIsbnSearch(event.target.value)} onSearch={searchISBN} loading={isbnLoading} feedback={isbnFeedback} cover={isbnCover} form={form} updateField={updateField} cameraOpen={cameraOpen} onOpenCamera={() => setCameraOpen(true)} onCloseCamera={() => setCameraOpen(false)} onDetected={handleCameraDetected} />}
      {formOpen && !quickMode && <LocationFields form={form} updateField={updateField} prateleiras={prateleiras} secoes={secoes} />}
      <div className="module-toolbar"><div><p className="eyebrow">Catálogo</p><h1>Livros</h1><p className="page-description">Consulta e manutenção das obras cadastradas na biblioteca.</p></div><div className="modal-actions">{isAdmin && <button className="secondary-button" onClick={startQuickCreate}>Cadastro rápido</button>}<button className="primary-button" onClick={startCreate}><Plus size={16} /> Novo livro</button></div></div>
      <div className="books-filters">
        <form className="search-form" onSubmit={searchBooks}><Search size={17} /><select value={searchField} onChange={(event) => setSearchField(event.target.value)} aria-label="Campo da pesquisa"><option value="titulo">Título</option><option value="autor">Autor</option><option value="isbn">ISBN</option></select><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite para pesquisar" aria-label="Pesquisar livros" /><button type="submit">Pesquisar</button></form>
        <select className="filter-select" value={categoryFilter} onChange={(event) => { const value = event.target.value; setCategoryFilter(value); loadLivros({ category: value }) }} aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>{categorias.map((category) => <option value={category.id} key={category.id}>{category.nome}</option>)}</select>
        <select className="filter-select" value={publisherFilter} onChange={(event) => { const value = event.target.value; setPublisherFilter(value); loadLivros({ publisher: value }) }} aria-label="Filtrar por editora"><option value="">Todas as editoras</option>{editoras.map((publisher) => <option value={publisher.id} key={publisher.id}>{publisher.nome}</option>)}</select>
        <select className="filter-select status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por status"><option value="todos">Todos os status</option><option value="ativos">Ativos</option><option value="inativos">Inativos</option></select>
        <button className="icon-button" onClick={() => { loadReferences(); loadLivros() }} title="Atualizar lista" aria-label="Atualizar lista"><RefreshCw size={16} /></button>
      </div>
      {feedback && <div className="feedback success" role="status">{feedback}<button onClick={() => setFeedback('')} aria-label="Fechar mensagem"><X size={14} /></button></div>}
      {error && <div className="feedback error" role="alert">{error}</div>}
      <div className="table-frame">
        {loading ? <div className="table-state">Carregando livros...</div> : visibleBooks.length === 0 ? <div className="table-state empty-state"><BookOpen size={24} /><strong>{query || categoryFilter || publisherFilter || statusFilter !== 'todos' ? 'Nenhum livro encontrado.' : 'Nenhum livro cadastrado no acervo.'}</strong><span>{query || categoryFilter || publisherFilter || statusFilter !== 'todos' ? 'Ajuste os filtros e tente novamente.' : 'Cadastre o primeiro livro para começar.'}</span>{!query && !categoryFilter && !publisherFilter && statusFilter === 'todos' && <button className="primary-button" onClick={startCreate}><Plus size={16} /> Cadastrar primeiro livro</button>}</div> : <table><thead><tr><th>Título</th><th>Autor(es)</th><th>Categoria</th><th>Editora</th><th>Ano</th><th>Status</th><th className="actions-column">Ações</th></tr></thead><tbody>{visibleBooks.map((book) => <tr key={book.id}><td className="student-name">{book.titulo}{book.subtitulo && <small className="cell-subtitle">{book.subtitulo}</small>}</td><td>{authorNames(book)}</td><td>{categoryName(book.categoria_id)}</td><td>{publisherName(book.editora_id)}</td><td>{book.ano_publicacao || '—'}</td><td><span className={`status-label ${book.ativo ? 'active' : 'inactive'}`}>{book.ativo ? 'Ativo' : 'Inativo'}</span></td><td className="row-actions"><button className="table-action" onClick={() => setDetails(book)} title="Visualizar" aria-label={`Visualizar ${book.titulo}`}><Eye size={16} /></button><button className="table-action" onClick={() => startEdit(book)} title="Editar" aria-label={`Editar ${book.titulo}`}><Pencil size={16} /></button><button className="table-action" onClick={() => toggleStatus(book)} title={book.ativo ? 'Desativar' : 'Ativar'} aria-label={`${book.ativo ? 'Desativar' : 'Ativar'} ${book.titulo}`}><Power size={16} /></button></td></tr>)}</tbody></table>}
      </div>
      {formOpen && <div className="modal-backdrop"><div className="modal-panel book-form-panel catalog-form-panel" role="dialog" aria-modal="true" aria-labelledby="book-form-title"><div className="modal-header"><div><p className="eyebrow">Ficha de catalogação</p><h2 id="book-form-title">{editing ? 'Editar livro' : quickMode ? 'Cadastro rápido de livros' : 'Registrar novo livro'}</h2></div><button className="modal-close" onClick={() => setFormOpen(false)} aria-label="Fechar formulário"><X size={19} /></button></div><form className="student-form catalog-form" onSubmit={saveBook}>{quickMode && <><section className="catalog-section"><h3>Leitura do próximo livro</h3><p className="page-description">Escaneie o ISBN e depois informe manualmente o Nº de Registro.</p><div className="isbn-search-row"><input value={isbnSearch} onChange={(event) => setIsbnSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') searchISBN(event) }} placeholder="ISBN / código de barras" /><button type="button" className="secondary-button" onClick={(event) => searchISBN(event)} disabled={isbnLoading}>{isbnLoading ? 'Buscando...' : 'Buscar ISBN'}</button><button type="button" className="secondary-button camera-button" onClick={() => setCameraOpen(true)} disabled={isbnLoading}>Escanear câmera</button></div>{isbnFeedback && <p className={`isbn-status ${isbnFeedback.startsWith('Livro encontrado') ? 'isbn-success' : ''}`}>{isbnFeedback}</p>}<p><strong>Cadastrados nesta sessão:</strong> {quickCount}</p>{lastQuickBook && <p><strong>Último:</strong> {lastQuickBook.numero_registro || 'Sem registro'} — {lastQuickBook.titulo}</p>}</section><LocationFields form={form} updateField={updateField} prateleiras={prateleiras} secoes={secoes} /></>}<section className="catalog-section"><h3>Classificação</h3><div className="form-grid catalog-grid"><label>Nº de Registro<input ref={numeroRegistroRef} name="numero_registro" value={form.numero_registro} onChange={updateField} /></label><label>Nº de Exemplares <span className="required">*</span><input type="number" name="numero_exemplares" value={form.numero_exemplares} onChange={updateField} min="1" step="1" required disabled={quickMode} /></label><label>Tipo da Obra<input name="tipo_obra" value={form.tipo_obra} onChange={updateField} /></label><label>PI<input name="pi" value={form.pi} onChange={updateField} /></label><label>CDD<input name="cdd" value={form.cdd} onChange={updateField} /></label><label>Cutter<input name="cutter" value={form.cutter} onChange={updateField} /></label></div></section><section className="catalog-section"><h3>Identificação da obra</h3><div className="form-grid catalog-grid"><label className="full-field">Autor(es) <span className="required">*</span><input name="autores" value={form.autores} onChange={updateField} placeholder="Nome completo; mais de um autor separado por vírgula" required /></label><label className="full-field">Título <span className="required">*</span><input name="titulo" value={form.titulo} onChange={updateField} required /></label><label className="full-field">Assunto<input name="assunto" value={form.assunto} onChange={updateField} /></label></div></section><section className="catalog-section"><h3>Dados de publicação</h3><div className="form-grid catalog-grid"><label>Local<input name="local" value={form.local} onChange={updateField} /></label><label>Edição<input name="edicao" value={form.edicao} onChange={updateField} /></label><label>Editora<input name="editora" value={form.editora} onChange={updateField} /></label><label>Ano de Publicação<input type="number" name="ano_publicacao" value={form.ano_publicacao} onChange={updateField} min="1000" max="2100" /></label><label>Nº de Páginas<input type="number" name="numero_paginas" value={form.numero_paginas} onChange={updateField} min="1" step="1" /></label><label>Volumes<input type="number" name="volumes" value={form.volumes} onChange={updateField} min="1" step="1" /></label><label>Série<input name="serie" value={form.serie} onChange={updateField} /></label><label>ISBN<input name="isbn" value={form.isbn} onChange={updateField} /></label></div></section><section className="catalog-section"><h3>Observações</h3><label className="full-field"><textarea name="observacoes" value={form.observacoes} onChange={updateField} rows="5" /></label></section><p className="required-note">* Campos obrigatórios. Os exemplares serão criados automaticamente ao salvar um novo livro.</p><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Salvando...' : quickMode ? 'Salvar e próximo' : 'Salvar livro'}</button></div></form></div></div>}
      {details && <div className="modal-backdrop"><div className="modal-panel details-panel book-details-panel" role="dialog" aria-modal="true" aria-labelledby="book-details-title"><div className="modal-header"><div><p className="eyebrow">Registro do catálogo</p><h2 id="book-details-title">{details.titulo}</h2></div><button className="modal-close" onClick={() => setDetails(null)} aria-label="Fechar detalhes"><X size={19} /></button></div><dl className="details-grid"><div><dt>Autor(es)</dt><dd>{authorNames(details)}</dd></div><div><dt>Status</dt><dd>{details.ativo ? 'Ativo' : 'Inativo'}</dd></div><div><dt>Subtítulo</dt><dd>{details.subtitulo || 'Não informado'}</dd></div><div><dt>ISBN</dt><dd>{details.isbn || 'Não informado'}</dd></div><div><dt>Categoria</dt><dd>{categoryName(details.categoria_id)}</dd></div><div><dt>Editora</dt><dd>{publisherName(details.editora_id)}</dd></div><div><dt>Idioma</dt><dd>{details.idioma}</dd></div><div><dt>Ano de publicação</dt><dd>{details.ano_publicacao || 'Não informado'}</dd></div><div><dt>Edição</dt><dd>{details.edicao || 'Não informado'}</dd></div><div><dt>Número de páginas</dt><dd>{details.numero_paginas || 'Não informado'}</dd></div><div><dt>Data de cadastro</dt><dd>{formatDate(details.data_cadastro)}</dd></div><div><dt>Última atualização</dt><dd>{formatDate(details.data_atualizacao)}</dd></div><div className="full-detail"><dt>Descrição/observações</dt><dd>{details.descricao || 'Não informado'}</dd></div></dl><div className="modal-actions"><button className="secondary-button" onClick={() => setDetails(null)}>Fechar</button><button className="primary-button" onClick={() => startEdit(details)}><Pencil size={16} /> Editar livro</button></div></div></div>}
    </section>
  )
}
