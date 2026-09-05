import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Eye, Power, RefreshCw, Search, Wrench, X } from 'lucide-react'
import { apiRequest, getAccessToken } from '../api/client'

const statusLabels = {
  disponivel: 'Disponível',
  emprestado: 'Emprestado',
  manutencao: 'Manutenção',
  perdido: 'Perdido',
  baixado: 'Baixado',
}

function statusLabel(status) {
  return statusLabels[status] || status
}

function IndividualLocations({ details, shelves, sections, onSave, saving }) {
  return <div className="individual-locations"><h3>Localização individual dos exemplares</h3>{details.exemplares.map((item) => <div className="individual-location-row" key={item.id}><strong>{item.codigo}</strong><select value={item.prateleira_id || ''} onChange={(event) => onSave(item, Number(event.target.value) || null, null)} disabled={saving}><option value="">Sem prateleira</option>{shelves.map((shelf) => <option key={shelf.id} value={shelf.id}>Prateleira {String(shelf.numero).padStart(2, '0')}</option>)}</select><select value={item.secao_id || ''} onChange={(event) => onSave(item, item.prateleira_id, Number(event.target.value) || null)} disabled={saving || !item.prateleira_id}><option value="">Sem seção</option>{sections.filter((section) => section.prateleira_id === item.prateleira_id).map((section) => <option key={section.id} value={section.id}>Seção {String.fromCharCode(64 + section.numero)}</option>)}</select></div>)}</div>
}

export function Estoque() {
  const hasSession = Boolean(getAccessToken())
  const [books, setBooks] = useState([])
  const [exemplares, setExemplares] = useState([])
  const [query, setQuery] = useState('')
  const [searchField, setSearchField] = useState('titulo')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState([])
  const [shelves, setShelves] = useState([])
  const [sections, setSections] = useState([])
  const [shelfFilter, setShelfFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [purposeFilter, setPurposeFilter] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [details, setDetails] = useState(null)
  const [locationSaving, setLocationSaving] = useState(false)

  async function showDetails(row) {
    setError('')
    try {
      const exemplares = await apiRequest(`/api/estoque/exemplares?livro_id=${row.livro_id}&page=1&page_size=100`)
      setDetails({ ...row, exemplares })
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar os exemplares.')
    }
  }

  async function changeExemplarStatus(item, situacao) {
    if (situacao === 'baixado' && !window.confirm(`Dar baixa no exemplar ${item.codigo}?`)) return
    try {
      await apiRequest(`/api/estoque/exemplares/${item.id}/situacao`, { method: 'PATCH', body: JSON.stringify({ situacao }) })
      await showDetails(details)
      await loadStock()
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível alterar a situação do exemplar.')
    }
  }

  async function changeExemplarLocation(item, prateleira_id, secao_id) {
    setLocationSaving(true)
    try {
      const updated = await apiRequest(`/api/estoque/exemplares/${item.id}/localizacao`, { method: 'PATCH', body: JSON.stringify({ prateleira_id, secao_id }) })
      setDetails((current) => current ? { ...current, exemplares: current.exemplares.map((copy) => copy.id === updated.id ? updated : copy) } : current)
      await loadStock()
    } catch (requestError) { setError(requestError.message || 'Não foi possível alterar a localização.') } finally { setLocationSaving(false) }
  }

  async function loadStock(overrides = {}) {
    setLoading(true)
    setError('')
    try {
      const activeShelf = overrides.shelf ?? shelfFilter
      const activeSection = overrides.section ?? sectionFilter
      const activePurpose = overrides.purpose ?? purposeFilter
      const activeGenre = overrides.genre ?? genreFilter
      const params = new URLSearchParams({ page: '1', page_size: '100' })
      if (activeShelf) params.set('prateleira_id', activeShelf)
      if (activeSection) params.set('secao_id', activeSection)
      if (activePurpose.trim()) params.set('finalidade', activePurpose.trim())
      if (activeGenre.trim()) params.set('genero', activeGenre.trim())
      const [bookPages, categoryList, shelfList, sectionList] = await Promise.all([
        apiRequest(`/api/estoque/resumo?${params}`),
        apiRequest('/api/livros/categorias?page=1&page_size=100'),
        apiRequest('/api/estoque/prateleiras'),
        apiRequest('/api/estoque/secoes'),
      ])
      setBooks(bookPages)
      setCategories(categoryList)
      setShelves(shelfList)
      setSections(sectionList)
      setExemplares([])
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar o estoque.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (getAccessToken()) loadStock()
    else {
      setLoading(false)
      setError('Faça login para consultar o estoque.')
    }
  }, [])

  const rows = useMemo(() => books.map((book) => ({ ...book, total: book.total, available: book.disponiveis, borrowed: book.emprestados, attention: book.manutencao + book.baixados + book.perdidos, availability: book.disponiveis ? (book.disponiveis === book.total ? 'Disponível' : 'Parcialmente disponível') : book.total ? 'Indisponível' : 'Sem exemplares', authors: '—', exemplares: [] })), [books])
  const filteredRows = useMemo(() => rows.filter((row) => {
    const term = query.trim().toLocaleLowerCase()
    const matchesQuery = !term || row.titulo.toLocaleLowerCase().includes(term)
    const matchesCategory = !categoryFilter || String(row.categoria_id) === categoryFilter
    const matchesStatus = statusFilter === 'todos' || (statusFilter === 'disponiveis' && row.available > 0) || (statusFilter === 'emprestados' && row.borrowed > 0) || (statusFilter === 'sem-disponibilidade' && row.available === 0)
    return matchesQuery && matchesCategory && matchesStatus
  }), [rows, query, searchField, categoryFilter, statusFilter])

  const summary = useMemo(() => ({
    total: books.reduce((sum, book) => sum + book.total, 0),
    available: books.reduce((sum, book) => sum + book.disponiveis, 0),
    borrowed: books.reduce((sum, book) => sum + book.emprestados, 0),
    unavailableBooks: rows.filter((row) => row.total > 0 && row.available === 0).length,
  }), [books, rows])

  return (
    <section className="module-page students-page stock-page">
      <div className="module-toolbar"><div><p className="eyebrow">Acervo físico</p><h1>Estoque</h1><p className="page-description">Quantidade, disponibilidade e situação dos exemplares cadastrados.</p></div><button className="icon-button" onClick={loadStock} title="Atualizar estoque" aria-label="Atualizar estoque"><RefreshCw size={16} /></button></div>
      {hasSession && <div className="stock-summary"><div><span>Total no acervo</span><strong>{loading ? '—' : summary.total}</strong></div><div><span>Disponíveis</span><strong>{loading ? '—' : summary.available}</strong></div><div><span>Emprestados</span><strong>{loading ? '—' : summary.borrowed}</strong></div><div><span>Livros sem disponibilidade</span><strong>{loading ? '—' : summary.unavailableBooks}</strong></div></div>}
      <div className="location-filter-row"><label>Finalidade<input value={purposeFilter} onChange={(event) => setPurposeFilter(event.target.value)} placeholder="PNLD ou literatura" /></label><label>Gênero<input value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)} placeholder="Gênero principal" /></label><button className="secondary-button" onClick={() => loadStock()}>Aplicar localização</button></div>
      <div className="books-filters stock-filters"><form className="search-form" onSubmit={(event) => event.preventDefault()}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por título" aria-label="Pesquisar estoque" /><button type="submit">Pesquisar</button></form><select className="filter-select" value={shelfFilter} onChange={(event) => { setShelfFilter(event.target.value); setSectionFilter(''); loadStock({ shelf: event.target.value, section: '' }) }} aria-label="Filtrar por prateleira"><option value="">Todas as prateleiras</option>{shelves.map((shelf) => <option key={shelf.id} value={shelf.id}>Prateleira {String(shelf.numero).padStart(2, '0')}</option>)}</select><select className="filter-select" value={sectionFilter} onChange={(event) => { setSectionFilter(event.target.value); loadStock({ section: event.target.value }) }} disabled={!shelfFilter} aria-label="Filtrar por seção"><option value="">Todas as seções</option>{sections.filter((section) => section.prateleira_id === Number(shelfFilter)).map((section) => <option key={section.id} value={section.id}>Seção {String.fromCharCode(64 + section.numero)}</option>)}</select><select className="filter-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrar por categoria"><option value="">Todas as categorias</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.nome}</option>)}</select><select className="filter-select status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por disponibilidade"><option value="todos">Todas as situações</option><option value="disponiveis">Com disponibilidade</option><option value="emprestados">Com empréstimos</option><option value="sem-disponibilidade">Sem disponibilidade</option></select></div>
      {error && <div className="feedback error" role="alert">{error}</div>}
      <div className="table-frame">{loading ? <div className="table-state">Carregando estoque...</div> : filteredRows.length === 0 ? <div className="table-state empty-state"><BookOpen size={24} /><strong>{rows.length ? 'Nenhum item encontrado.' : 'Nenhum item encontrado no estoque.'}</strong><span>{rows.length ? 'Ajuste a pesquisa ou os filtros.' : 'Cadastre exemplares para acompanhar a disponibilidade.'}</span></div> : <table><thead><tr><th>Título</th><th>Autor(es)</th><th>Categoria</th><th>Localização</th><th>Total</th><th>Disponíveis</th><th>Emprestados</th><th>Situação</th><th className="actions-column">Ações</th></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.livro_id}><td className="student-name">{row.titulo}</td><td>{row.authors}</td><td>{categories.find((category) => category.id === row.categoria_id)?.nome || '—'}</td><td><div className="location-list">{row.localizacoes?.length ? row.localizacoes.map((location) => <span key={location}>📍 {location}</span>) : 'Sem localização definida'}</div></td><td>{row.total}</td><td>{row.available}</td><td>{row.borrowed}</td><td><span className={`stock-badge ${row.availability.toLocaleLowerCase().replaceAll(' ', '-')}`}>{row.availability}</span></td><td className="row-actions"><button className="table-action" onClick={() => showDetails(row)} title="Ver exemplares" aria-label={`Ver exemplares de ${row.titulo}`}><Eye size={16} /></button></td></tr>)}</tbody></table>}</div>
      {details && <div className="modal-backdrop"><div className="modal-panel stock-details-panel" role="dialog" aria-modal="true" aria-labelledby="stock-details-title"><div className="modal-header"><div><p className="eyebrow">Estoque do livro</p><h2 id="stock-details-title">{details.titulo}</h2></div><button className="modal-close" onClick={() => setDetails(null)} aria-label="Fechar detalhes"><X size={19} /></button></div><div className="stock-detail-summary"><span>Total <strong>{details.total}</strong></span><span>Disponíveis <strong>{details.available}</strong></span><span>Emprestados <strong>{details.borrowed}</strong></span></div><div className="exemplar-list">{details.exemplares.map((item) => <div className="exemplar-row" key={item.id}><strong>{item.codigo}</strong><span className={`stock-badge ${item.situacao}`}>{statusLabel(item.situacao)}</span><small>{item.prateleira_id ? `Prateleira ${String(shelves.find((shelf) => shelf.id === item.prateleira_id)?.numero || 0).padStart(2, '0')}` : 'Sem localização definida'}</small></div>)}</div><div className="modal-actions"><button className="secondary-button" onClick={() => setDetails(null)}>Fechar</button></div></div></div>}
      {details && <IndividualLocations details={details} shelves={shelves} sections={sections} onSave={changeExemplarLocation} saving={locationSaving} />}
    </section>
  )
}
