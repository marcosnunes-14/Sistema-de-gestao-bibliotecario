export function PagePlaceholder({ eyebrow, title, description }) {
  return (
    <section className="module-page">
      <div className="page-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      <div className="empty-workspace">
        <div className="workspace-line" />
        <span>Área de trabalho</span>
        <p>Os recursos deste módulo serão adicionados nas próximas etapas.</p>
      </div>
    </section>
  )
}
