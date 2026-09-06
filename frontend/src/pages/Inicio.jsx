const logoUrl = 'SGB.png'

export function Inicio() {
  return (
    <section className="home-page">
      <div className="home-branding">
        <img className="home-logo" src={logoUrl} alt="Brasão da Biblioteca Lucimar Gomes" />
        <p className="home-support">Manutenção e Suporte: (86) 99457-7046</p>
        <p className="home-company"><img className="home-company-logo" src="/DS%20SYSTEM.png" alt="DS System" /> <span>| SISTEMAS &amp; TECNOLOGIA</span></p>
      </div>
    </section>
  )
}
