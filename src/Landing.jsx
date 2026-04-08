import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Target,
  Brain,
  Zap,
  Repeat,
  CheckCircle2,
  XCircle,
  Layout,
  ListTodo,
  ShieldCheck,
  TrendingUp,
  Clock3,
  Award
} from 'lucide-react';
import './Landing.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Landing({ onEnterApp }) {
  useEffect(() => {
    document.title = "Revise IA | Plataforma de Revisão Inteligente para Concursos";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Estudar muito e reter pouco acabou. O Revise IA organiza seu estudo com trilhas, pegadinhas de banca e revisões inteligentes. Cadastre-se grátis.");
    }
  }, []);

  return (
    <div className="landing-page app-shell">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />
      <div className="grid-overlay" />

      {/* HEADER / NAV */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <a href="#" className="landing-logo">
            <img src="/logo.png" alt="Revise IA Logo" />
            <span>Revise IA</span>
          </a>
          <div className="landing-nav-links">
            <a href="#como-funciona" className="landing-nav-link">Método</a>
            <a href="#funcionalidades" className="landing-nav-link">Funcionalidades</a>
            <a href="#diferenciais" className="landing-nav-link">Por que nós</a>
          </div>
          <div>
            <button onClick={onEnterApp} className="landing-btn-free">
              Começar Grátis <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section className="landing-hero" id="inicio">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} className="landing-pill">
            <Award size={14} /> Cadastro 100% gratuito e sem risco
          </motion.div>
          <motion.h1 className="landing-headline" variants={fadeUp}>
            Você não precisa estudar mais.<br /> Precisa revisar do jeito certo.
          </motion.h1>
          <motion.p className="landing-subhead" variants={fadeUp}>
            Transforme conteúdo em retenção real. Pare de se perder em PDFs infinitos e comece a estudar com trilhas estruturadas, checklists de domínio e mapeamento inteligente de pegadinhas.
          </motion.p>
          <motion.div className="landing-cta-group" variants={fadeUp}>
            <button onClick={onEnterApp} className="landing-btn-primary">
              Criar Conta Grátis <ArrowRight size={20} />
            </button>
            <a href="#como-funciona" className="landing-btn-secondary">
              Entender o Sistema
            </a>
          </motion.div>

          <motion.div className="landing-hero-mockup" variants={fadeUp} style={{ transitionDelay: '0.2s' }}>
            {/* Trocamos por um mockup da própria plataforma que construímos. Puxando a div do dashboard aqui seria complexo, vamos simular ou deixar uma área premium */}
            <div style={{ background: '#07152e', padding: '10px 10px 0', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', gap: '8px', padding: '0 8px 12px' }}>
                <div style={{width: 12, height: 12, borderRadius: '50%', background: '#ff5f56'}}></div>
                <div style={{width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e'}}></div>
                <div style={{width: 12, height: 12, borderRadius: '50%', background: '#27c93f'}}></div>
              </div>
              <div style={{
                height: '400px', 
                background: 'linear-gradient(135deg, rgba(86,215,255,0.05), rgba(67,184,255,0.02))', 
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{position: 'absolute', top: 20, left: 20, bottom: 0, width: '25%', background: 'rgba(255,255,255,0.02)', borderRadius: '8px'}}></div>
                <div style={{position: 'absolute', top: 20, left: 'calc(25% + 40px)', bottom: 20, right: 20, background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: 20}}>
                   <div style={{width: '60%', height: 30, background: 'rgba(86,215,255,0.1)', borderRadius: 4, marginBottom: 20}}></div>
                   <div style={{width: '40%', height: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 10}}></div>
                   <div style={{width: '90%', height: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 10}}></div>
                   <div style={{width: '80%', height: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 30}}></div>
                   
                   <div style={{display: 'flex', gap: 20}}>
                     <div style={{flex: 1, height: 120, background: 'rgba(86,215,255,0.05)', borderRadius: 8, border: '1px solid rgba(86,215,255,0.1)'}}></div>
                     <div style={{flex: 1, height: 120, background: 'rgba(98,255,211,0.05)', borderRadius: 8, border: '1px solid rgba(98,255,211,0.1)'}}></div>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* 2. SEÇÃO DE DORES */}
      <section className="landing-section">
        <div className="section-inner">
          <div className="landing-section-header">
            <h2 className="landing-section-title">O ciclo da frustração no estudo para concursos</h2>
            <p className="landing-section-text">A maioria dos estudantes não falha por falta de esforço. Falha porque estuda sem direção e assiste ao próprio esquecimento apagando meses de dedicação.</p>
          </div>
          
          <div className="pain-grid">
            <div className="pain-card">
              <div className="pain-icon"><Repeat size={24} /></div>
              <h3 className="pain-title">Estuda muito, retém pouco</h3>
              <p className="pain-text">Você lê centenas de PDFs, grifa, assiste aulas, mas semanas depois sente que não lembra nem de 20% do que viu.</p>
            </div>
            <div className="pain-card">
              <div className="pain-icon"><Target size={24} /></div>
              <h3 className="pain-title">Desorganização no edital</h3>
              <p className="pain-text">A sensação constante de que esqueceu etapas, pulou tópicos essenciais e não faz ideia de qual assunto deveria revisar hoje.</p>
            </div>
            <div className="pain-card">
              <div className="pain-icon"><Brain size={24} /></div>
              <h3 className="pain-title">O caos das revisões avulsas</h3>
              <p className="pain-text">Revisar lendo novamente o PDF grifado não é revisar. É gerar a falsa sensação de fluência sem testar a memória de forma ativa.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. POR QUE A REVISÃO BEM FEITA IMPORTA */}
      <section className="landing-section alt-bg">
        <div className="section-inner">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Revisar com método é multiplicar seu tempo</h2>
            <p className="landing-section-text">Uma plataforma que elimina o achismo. Com a estrutura do Revise IA, você passa a enxergar suas lacunas de conhecimento e a fixar o conteúdo que a banca de fato cobra, convertendo estudo em aprovação.</p>
          </div>
        </div>
      </section>

      {/* 4 & 5. COMO FUNCIONA E FUNCIONALIDADES */}
      <section className="landing-section" id="como-funciona">
        <div className="section-inner">
          <div className="landing-section-header">
             <h2 className="landing-section-title">Inteligência, organização e método</h2>
             <p className="landing-section-text">Como o Revise IA transforma seu conteúdo bruto numa máquina de retenção estruturada focada em resultados reais.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrap"><Layout size={24} /></div>
              <h3 className="feature-title">Trilhas de Estudo</h3>
              <p className="feature-text">Chega de montar cronogramas amadores. Organizamos sua jornada por banca e disciplina de forma sequencial e lógica.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap"><Zap size={24} /></div>
              <h3 className="feature-title">Pegadinhas da Banca</h3>
              <p className="feature-text">Mapeamento estruturado das armadilhas mais comuns. Você revisa exatamente o ponto de confusão que tira pontos na prova.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap"><ListTodo size={24} /></div>
              <h3 className="feature-title">Checklists de Domínio</h3>
              <p className="feature-text">Não avance no escuro. Nossos checklists garantem que você dominou a essência do tópico antes de pular para o próximo.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap"><Clock3 size={24} /></div>
              <h3 className="feature-title">Blocos Teóricos Diretos</h3>
              <p className="feature-text">Teoria fracionada em blocos lógicos. Nada de paredes de texto cansativas. Layout desenhado para escaneabilidade e foco contínuo.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap"><TrendingUp size={24} /></div>
              <h3 className="feature-title">Visão de Progresso</h3>
              <p className="feature-text">Acompanhamento claro da sua evolução cronológica e de proficiência, gerando o gatilho de recompensa imediata a cada avanço.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrap"><ShieldCheck size={24} /></div>
              <h3 className="feature-title">Interface Premium SaaS</h3>
              <p className="feature-text">Projetada não para ser um cursinho, mas sim uma ferramenta de alto desempenho comparável aos melhores produtos tech globais.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. DIFERENCIAÇÃO */}
      <section className="landing-section alt-bg" id="diferenciais">
        <div className="section-inner">
          <div className="landing-section-header">
             <h2 className="landing-section-title">Por que você deveria abandonar o modo antigo</h2>
             <p className="landing-section-text">A forma tradicional de estudar pune estudantes consistentes com a desorganização.</p>
          </div>

          <div className="compare-grid">
            <div className="compare-col compare-old">
              <h3 className="compare-title">
                <XCircle size={28} /> O método antigo
              </h3>
              <ul className="compare-list">
                <li className="compare-item"><XCircle size={20} /> O aluno tem que criar planilhas complexas para não se perder.</li>
                <li className="compare-item"><XCircle size={20} /> Relê PDFs grifados achando que está aprendendo.</li>
                <li className="compare-item"><XCircle size={20} /> Descobre pegadinhas da banca apenas errando na prova.</li>
                <li className="compare-item"><XCircle size={20} /> Fica mentalmente sobrecarregado só para organizar o estudo.</li>
                <li className="compare-item"><XCircle size={20} /> Usa plataformas confusas com designs de 10 anos atrás.</li>
              </ul>
            </div>
            <div className="compare-col compare-new">
              <h3 className="compare-title">
                <CheckCircle2 size={28} /> A experiência Revise IA
              </h3>
              <ul className="compare-list">
                <li className="compare-item"><CheckCircle2 size={20} /> Trilha pronta, o único trabalho é sentar e estudar.</li>
                <li className="compare-item"><CheckCircle2 size={20} /> Revisão ativa através de blocos e perguntas direcionadas.</li>
                <li className="compare-item"><CheckCircle2 size={20} /> Pegadinhas mapeadas no material logo após a teoria.</li>
                <li className="compare-item"><CheckCircle2 size={20} /> Interface baseada em checklists e evolução constante.</li>
                <li className="compare-item"><CheckCircle2 size={20} /> Design Premium SaaS para aumentar o foco e reduzir a fadiga.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. VERSÃO GRATUITA E 7. BENEFÍCIOS */}
      <section className="landing-section">
        <div className="section-inner" style={{ textAlign: 'center', maxWidth: '800px' }}>
          <h2 className="landing-section-title">Não requer cartão. Risco zero para conhecer.</h2>
          <p className="landing-section-text" style={{ marginBottom: 40 }}>
            Temos tanta certeza de que o método estruturado do Revise IA vai mudar a forma como você enxerga a sua preparação, que desenvolvemos uma modalidade 100% gratuita para você testar a experiência. Comece hoje, veja a dinâmica das trilhas, explore os blocos de teoria e as camadas de revisão sem pagar absolutamente nada.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px' }}>
             <div style={{ textAlign: 'center' }}>
               <h4 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 8px', color: 'var(--cyan)' }}>0 R$</h4>
               <p style={{ color: 'var(--muted)', fontSize: 14 }}>Custo para se inscrever</p>
             </div>
             <div style={{ width: 1, backgroundColor: 'var(--border)' }}></div>
             <div style={{ textAlign: 'center' }}>
               <h4 style={{ fontSize: 40, fontWeight: 800, margin: '0 0 8px', color: 'var(--cyan)' }}>100%</h4>
               <p style={{ color: 'var(--muted)', fontSize: 14 }}>Interface liberada</p>
             </div>
          </div>
        </div>
      </section>

      {/* 9. CTA FINAL */}
      <section className="section-inner">
        <div className="cta-section">
          <div className="cta-inner">
            <h2 className="cta-title">A revisão certa transforma esforço em resultado</h2>
            <p className="cta-text">Pessoas consistentes reprovam porque falham em reter o conhecimento. Não corra esse risco. Cadastre-se na versão gratuita, conheça a plataforma por dentro e assuma o controle do seu edital de forma definitiva.</p>
            <button onClick={onEnterApp} className="landing-btn-primary" style={{ padding: '20px 48px', fontSize: 20 }}>
              Criar minha conta gratuita agora
            </button>
            <p style={{ marginTop: 24, fontSize: 14, color: 'var(--muted)' }}><Award size={14} style={{ position: 'relative', top: 2 }} /> Leva menos de 1 minuto. Comece imediatamente.</p>
          </div>
        </div>
      </section>

      {/* 10. RODAPÉ */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="landing-logo">
              <img src="/logo.png" alt="Revise IA Logo" />
              <span>Revise IA</span>
            </div>
            <p>
              Plataforma de inteligência e retenção para estudantes de alto desempenho. Ajudamos a converter estudos exaustivos em evolução direcionada e mensurável.
            </p>
          </div>
          <div className="footer-links">
             <div className="footer-col">
               <h4>Produto</h4>
               <a href="#">Trilhas</a>
               <a href="#">Revisão Ativa</a>
               <a href="#">Recursos</a>
             </div>
             <div className="footer-col">
               <h4>Plataforma</h4>
               <a href="#">Cadastre-se</a>
               <a href="#">Entrar</a>
               <a href="#">Suporte</a>
             </div>
             <div className="footer-col">
               <h4>Legal</h4>
               <a href="#">Termos de Uso</a>
               <a href="#">Privacidade</a>
             </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Revise IA. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
