import Link from 'next/link';
import { SiteForm } from '@/components/SiteForm';
export default function Home(){
 return <div className="site">
  <header className="site-header wrap">
   <Link className="brand" href="/"><span className="brand-mark">◉</span><span>REALIZA<small>ÁGUASERV • CAMINHÃO-PIPA</small></span></Link>
   <nav><a href="#solucoes">Soluções</a><a href="#como-funciona">Como funciona</a><a href="#orcamento">Orçamento</a><Link className="header-login" href="/login">Área da equipe ↗</Link></nav>
  </header>
  <main>
   <section className="hero wrap"><div className="hero-copy">
    <span className="eyebrow"><span className="live-dot"/> POUSO ALEGRE E REGIÃO • MINAS GERAIS</span>
    <h1>Água onde sua operação <em>precisa.</em></h1>
    <p>Distribuição de água por caminhão-pipa com atendimento planejado, organização logística e acompanhamento de cada solicitação.</p>
    <div className="hero-actions"><a className="btn primary" href="#orcamento">Solicitar orçamento <span>↗</span></a><a href="#solucoes" className="btn light">Conhecer serviços</a></div>
    <div className="hero-facts"><span><strong>Planejamento</strong> comercial e operacional</span><span><strong>Rastreabilidade</strong> do atendimento</span><span><strong>Atendimento</strong> sob consulta</span></div>
   </div><div className="hero-visual"><div className="water-illustration"><div className="orb orb-one"/><div className="orb orb-two"/><div className="water-symbol">≈</div><div className="visual-label"><small>REALIZA • ÁGUASERV</small><strong>Gestão em cada entrega.</strong><span>Pouso Alegre · MG</span></div></div></div></section>
   <section id="solucoes" className="section soft"><div className="wrap"><div className="section-head"><span className="eyebrow">O QUE FAZEMOS</span><h2>Abastecimento pensado para cada necessidade.</h2><p>Volumes, disponibilidade e condições são definidos conforme a localidade e a finalidade de uso.</p></div>
    <div className="feature-grid"><article className="feature"><span className="feature-icon">▧</span><h3>Obras e construção</h3><p>Solicitação de água para atividades e serviços de canteiro, mediante avaliação operacional.</p></article><article className="feature"><span className="feature-icon">◈</span><h3>Demandas industriais</h3><p>Programação de entregas e volumes de acordo com o processo informado pelo contratante.</p></article><article className="feature"><span className="feature-icon">◉</span><h3>Reservatórios e abastecimento</h3><p>Fornecimento conforme disponibilidade, finalidade de uso e requisitos sanitários aplicáveis.</p></article></div>
   </div></section>
   <section id="como-funciona" className="section wrap"><div className="section-head"><span className="eyebrow">ATENDIMENTO ORGANIZADO</span><h2>Do primeiro contato à entrega.</h2></div>
    <div className="steps"><article><span>01</span><h3>Você solicita</h3><p>Informe cidade, volume desejado e finalidade.</p></article><article><span>02</span><h3>Nós avaliamos</h3><p>Confirmamos disponibilidade, modalidade e condições de atendimento.</p></article><article><span>03</span><h3>Programamos</h3><p>Com a proposta aprovada, organizamos veículo, origem e entrega.</p></article></div>
   </section>
   <section id="orcamento" className="section contact-section"><div className="wrap contact-layout"><div className="contact-copy"><span className="eyebrow">SOLICITE UMA PROPOSTA</span><h2>Vamos planejar seu fornecimento?</h2><p>Preencha os dados e nossa equipe avaliará sua demanda. O envio não constitui confirmação automática de disponibilidade nem garantia de adequação da água a uma finalidade específica.</p><div className="contact-tiles"><div><strong>Empresa</strong><span>Realiza Gestão de Serviços Ltda. — Águaserv</span></div><div><strong>CNPJ</strong><span>30.704.904/0001-69</span></div><div><strong>Base</strong><span>Pouso Alegre, Minas Gerais</span></div></div></div><div className="form-panel"><h3>Conte-nos sua demanda</h3><SiteForm/></div></div></section>
  </main>
  <footer className="footer"><div className="wrap footer-inner"><span>© {new Date().getFullYear()} REALIZA Gestão de Serviços Ltda. • Águaserv</span><span>Dados utilizados exclusivamente para atendimento comercial. Solicite exclusão pelos canais oficiais da empresa.</span></div></footer>
 </div>
}
