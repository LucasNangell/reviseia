import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Layers3,
  LineChart,
  Loader2,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  LayoutDashboard,
  Compass,
  LogOut,
  FolderOpen
} from "lucide-react";
import "./index.css";

const API_BASE = "/api";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  exit: { opacity: 0, y: -28, transition: { duration: 0.3 } }
};

function GlassCard({ children, className = "", style = {} }) {
  return <div className={`glass-card ${className}`} style={style}>{children}</div>;
}

function Pill({ children, className="" }) {
  return <span className={`pill ${className}`}>{children}</span>;
}

function LoadingState({ text = "Carregando..." }) {
  return (
    <div className="loading-state">
      <Loader2 className="spin" />
      <span>{text}</span>
    </div>
  );
}

function EmptyState({ text, action, actionText }) {
  return (
    <GlassCard className="empty-state" style={{flexDirection: 'column', padding: '40px 20px', textAlign: 'center', gap: 16}}>
      <FolderOpen size={40} style={{ opacity: 0.5, margin: '0 auto' }} />
      <p style={{margin: 0}}>{text}</p>
      {action && (
        <button onClick={action} className="btn-primary" style={{ border: 'none', padding: '10px 20px', borderRadius: 20, cursor: 'pointer', margin: '0 auto' }}>
          {actionText}
        </button>
      )}
    </GlassCard>
  );
}

export default function Dashboard({ user, onNavigateBack }) {
  const [view, setView] = useState("overview"); // overview, explore, study
  const [dashboardData, setDashboardData] = useState(null);
  
  // Study State
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [trackItems, setTrackItems] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [materialData, setMaterialData] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingMaterial, setLoadingMaterial] = useState(false);
  const [error, setError] = useState("");

  const actualUser = user || { id: 1, name: "Estudante" }; // mock fallback if not provided

  // Load Dashboard Data
  useEffect(() => {
    let active = true;
    async function fetchDashboard() {
      if (view !== "overview" && view !== "explore") return;
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/users/${actualUser.id}/dashboard`);
        if (!res.ok) throw new Error("Falha ao carregar dashboard");
        const data = await res.json();
        if (active) setDashboardData(data);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchDashboard();
    return () => { active = false; };
  }, [actualUser.id, view]);

  // Load Track Items for Study View
  useEffect(() => {
    let active = true;
    async function loadItems() {
      if (view !== "study" || !selectedTrack?.id) return;
      try {
        setLoadingItems(true);
        const res = await fetch(`${API_BASE}/tracks/${selectedTrack.id}/items`);
        if (!res.ok) throw new Error("Falha ao carregar itens");
        const data = await res.json();
        if (!active) return;
        setTrackItems(data);
        if (data.length) setSelectedMaterialId(data[0].material_id);
      } catch {
        if (active) setError("Falha ao carregar os itens da trilha selecionada.");
      } finally {
        if (active) setLoadingItems(false);
      }
    }
    loadItems();
    return () => { active = false; };
  }, [selectedTrack, view]);

  // Load Material Data
  useEffect(() => {
    let active = true;
    async function loadMaterial() {
      if (view !== "study" || !selectedMaterialId) return;
      try {
        setLoadingMaterial(true);
        const res = await fetch(`${API_BASE}/materials/${selectedMaterialId}`);
        if (!res.ok) throw new Error("Falha ao carregar material");
        const material = await res.json();
        if (!active) return;
        setMaterialData(material);
      } catch {
        if (active) setError("Falha ao carregar o material selecionado.");
      } finally {
        if (active) setLoadingMaterial(false);
      }
    }
    loadMaterial();
    return () => { active = false; };
  }, [selectedMaterialId, view]);

  const handleSubscribe = async (trackId) => {
    try {
      await fetch(`${API_BASE}/users/${actualUser.id}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learning_track_id: trackId, exam_edition_id: null })
      });
      setView("overview");
      // Force reload by fetching dashboard again or just letting the effect run
    } catch (err) {
      setError("Erro ao assinar trilha.");
    }
  };

  const startStudy = (track) => {
    setSelectedTrack(track);
    setView("study");
  };

  const renderOverview = () => {
    if (loading) return <LoadingState text="Carregando seu painel..." />;
    if (!dashboardData) return <EmptyState text="Erro ao carregar dados." />;

    const { userTracks, availableTracks, stats } = dashboardData;

    return (
      <motion.div variants={fadeUp} initial="hidden" animate="show" exit="exit" className="dashboard-content">
        <div className="dashboard-header-simple">
          <h2 style={{ fontSize: 28, margin: '0 0 8px' }}>Bem-vindo de volta, {actualUser.name.split(' ')[0]}!</h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Aqui está o resumo do seu progresso e os próximos passos.</p>
        </div>

        <div className="mini-stats" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 24 }}>
          <GlassCard className="mini-stat">
            <p>Trilhas Ativas</p>
            <strong style={{ color: 'var(--cyan)' }}>{userTracks.length}</strong>
          </GlassCard>
          <GlassCard className="mini-stat">
            <p>Materiais Concluídos</p>
            <strong style={{ color: 'var(--teal)' }}>{stats.completedMaterials}</strong>
          </GlassCard>
          <GlassCard className="mini-stat">
            <p>Em Andamento</p>
            <strong style={{ color: '#e2d3ff' }}>{stats.activeMaterials}</strong>
          </GlassCard>
          <GlassCard className="mini-stat">
            <p>Questões Resolvidas</p>
            <strong style={{ color: '#ffe4b1' }}>{stats.questionsAttempted}</strong>
          </GlassCard>
        </div>

        <div style={{ marginTop: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 20, margin: 0 }}>Minhas Trilhas</h3>
            {userTracks.length > 0 && (
              <button 
                onClick={() => setView('explore')} 
                style={{ background: 'transparent', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: 14 }}
              >
                Explorar mais
              </button>
            )}
          </div>

          {userTracks.length === 0 ? (
            <EmptyState 
              text="Você ainda não está inscrito em nenhuma trilha." 
              action={() => setView('explore')} 
              actionText="Explorar Trilhas" 
            />
          ) : (
            <div className="track-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {userTracks.map(track => {
                const percent = track.total_items > 0 ? Math.round((track.completed_items / track.total_items) * 100) : 0;
                return (
                  <GlassCard key={track.sub_id} className="track-dashboard-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Pill>{track.board_name || 'Geral'}</Pill>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Iniciado em {new Date(track.started_at).toLocaleDateString()}</span>
                    </div>
                    <h4 style={{ margin: 0, fontSize: 18 }}>{track.name}</h4>
                    
                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>
                        <span>Progresso</span>
                        <span style={{ color: 'var(--white)', fontWeight: 600 }}>{percent}%</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, var(--cyan), var(--teal))', borderRadius: 4 }} />
                      </div>
                    </div>

                    <button 
                      onClick={() => startStudy(track)}
                      style={{ 
                        width: '100%', padding: '12px', background: 'rgba(86, 215, 255, 0.1)', border: '1px solid rgba(86, 215, 255, 0.2)', 
                        color: 'var(--cyan)', borderRadius: 12, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', marginTop: 8
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(86, 215, 255, 0.15)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(86, 215, 255, 0.1)'}
                    >
                      Continuar Estudo
                    </button>
                  </GlassCard>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const renderExplore = () => {
    if (loading) return <LoadingState text="Carregando trilhas..." />;
    const { availableTracks } = dashboardData;

    return (
      <motion.div variants={fadeUp} initial="hidden" animate="show" exit="exit" className="dashboard-content">
        <div className="dashboard-header-simple">
          <h2 style={{ fontSize: 28, margin: '0 0 8px' }}>Explorar Trilhas</h2>
          <p style={{ color: 'var(--muted)', margin: 0 }}>Descubra novos conteúdos e amplie sua preparação.</p>
        </div>

        {availableTracks.length === 0 ? (
          <EmptyState text="Você já está inscrito em todas as trilhas disponíveis!" />
        ) : (
          <div className="track-list" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {availableTracks.map(track => (
              <GlassCard key={track.id} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Pill>{track.board_name}</Pill>
                  {track.is_default && <Pill className="gold">Recomendada</Pill>}
                </div>
                <h4 style={{ margin: 0, fontSize: 18 }}>{track.name}</h4>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>{track.description || "Trilha preparatória completa estruturada por especialistas."}</p>
                
                <div style={{ display: 'flex', gap: 16, marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)'}}>
                    <Layers3 size={14} /> {track.total_items} materiais
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)'}}>
                    <Clock3 size={14} /> {track.total_minutes || 0} min
                  </div>
                </div>

                <button 
                  onClick={() => handleSubscribe(track.id)}
                  style={{ 
                    width: '100%', padding: '12px', background: 'linear-gradient(90deg, var(--cyan), var(--sky))', border: 'none', 
                    color: '#04111f', borderRadius: 12, cursor: 'pointer', fontWeight: 700, marginTop: 12 
                  }}
                >
                  Assinar Gratuitamente
                </button>
              </GlassCard>
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const renderStudy = () => {
    return (
      <motion.div variants={fadeUp} initial="hidden" animate="show" exit="exit" className="dashboard-content study-view">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setView('overview')} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
             <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <h2 style={{ fontSize: 24, margin: 0 }}>{selectedTrack?.name}</h2>
          <Pill>{selectedTrack?.board_name || 'Geral'}</Pill>
        </div>

        <div className="study-grid" style={{ marginTop: 0 }}>
          <GlassCard className="study-sidebar">
            <div className="sidebar-header">
              <h3>Itens da trilha</h3>
              <div className="count-badge">{trackItems.length}</div>
            </div>

            <div className="sidebar-scroll">
              {loadingItems ? (
                <LoadingState text="Carregando itens..." />
              ) : trackItems.length === 0 ? (
                <EmptyState text="A trilha não possui itens." />
              ) : (
                trackItems.map((item) => {
                  const active = selectedMaterialId === item.material_id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedMaterialId(item.material_id)}
                      className={`item-card ${active ? "active" : ""}`}
                    >
                      <div className="item-card-top">
                        <span className="item-order">{String(item.display_order).padStart(2, "0")}</span>
                        <span className="time-badge">{item.estimated_minutes || 0} min</span>
                      </div>
                      <p className="item-subject">{item.subject_name}</p>
                      <h4 className="item-title">{item.material_title}</h4>
                    </button>
                  );
                })
              )}
            </div>
          </GlassCard>

          <GlassCard className="study-main">
            <div className="study-main-header">
              <div className="pill-row left">
                <Pill>Material Base</Pill>
              </div>
              <h3 className="study-main-title">
                {loadingMaterial ? "Carregando material..." : materialData?.material?.title || "Selecione um material"}
              </h3>
            </div>

            <div className="study-main-body">
              {loadingMaterial ? (
                <LoadingState text="Carregando conteúdo do material..." />
              ) : !materialData ? (
                <EmptyState text="Nenhum material selecionado." />
              ) : (
                <>
                  <div className="mini-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="mini-stat">
                      <p>Tópicos</p>
                      <strong>{materialData.topics?.length || 0}</strong>
                    </div>
                    <div className="mini-stat">
                      <p>Pegadinhas</p>
                      <strong>{materialData.traps?.length || 0}</strong>
                    </div>
                    <div className="mini-stat">
                      <p>Checklist</p>
                      <strong>{materialData.checklist?.length || 0}</strong>
                    </div>
                  </div>

                  <div className="material-grid">
                    <div className="blocks-column">
                      <h4 className="column-title">Blocos do material</h4>
                      <div className="blocks-list">
                        {(materialData.blocks || []).slice(0, 5).map((block) => (
                          <motion.div key={block.id} whileHover={{ y: -2 }} className="block-card">
                            <p className="block-type">{block.content_type || "teoria"}</p>
                            <h5 className="block-title">{block.title}</h5>
                            <div
                              className="block-content"
                              dangerouslySetInnerHTML={{
                                __html:
                                  (block.content_html || "").slice(0, 900) +
                                  ((block.content_html || "").length > 900 ? "..." : ""),
                              }}
                            />
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="review-column">
                      <h4 className="column-title">Camadas de revisão</h4>

                      <div className="review-card review-traps">
                        <div className="review-head">
                          <Sparkles size={18} />
                          <p>Pegadinhas da banca</p>
                        </div>
                        <div className="review-list">
                          {(materialData.traps || []).slice(0, 3).map((trap) => (
                            <div key={trap.id} className="review-item">
                              <p className="review-item-title">{trap.title}</p>
                              <p className="review-item-text">{trap.description}</p>
                            </div>
                          ))}
                          {!(materialData.traps || []).length ? <p className="review-empty">Sem pegadinhas cadastradas.</p> : null}
                        </div>
                      </div>

                      <div className="review-card">
                        <div className="review-head review-head-green">
                          <CheckCircle2 size={18} />
                          <p>Checklist de domínio</p>
                        </div>
                        <div className="review-list">
                          {(materialData.checklist || []).slice(0, 5).map((item) => (
                            <div key={item.id} className="check-item">
                              <div className="check-dot" />
                              <p>{item.item_text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </GlassCard>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="app-shell dashboard-layout">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />
      <div className="grid-overlay" />

      <aside className="dashboard-sidebar glass-card">
        <div className="sidebar-brand">
          <img src="/logo.png" alt="Revise IA" style={{ height: 32 }} />
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--white)' }}>Revise IA</span>
        </div>

        <nav className="sidebar-nav">
          <button className={`nav-item ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}>
            <LayoutDashboard size={18} /> Painel Central
          </button>
          <button className={`nav-item ${view === 'explore' ? 'active' : ''}`} onClick={() => setView('explore')}>
            <Compass size={18} /> Explorar Trilhas
          </button>
          {view === 'study' && (
            <button className="nav-item active">
              <BookOpen size={18} /> Sala de Estudos
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={onNavigateBack} style={{ color: '#ff9d9d' }}>
            <LogOut size={18} /> Sair da conta
          </button>
        </div>
      </aside>

      <main className="dashboard-main-area">
        {error && (
          <div className="api-error" style={{ margin: '0 24px 24px' }}>
            {error} <button onClick={() => setError("")} style={{float:'right', background:'none', border:'none', color:'inherit', cursor:'pointer'}}>x</button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {view === "overview" && <React.Fragment key="overview">{renderOverview()}</React.Fragment>}
          {view === "explore" && <React.Fragment key="explore">{renderExplore()}</React.Fragment>}
          {view === "study" && <React.Fragment key="study">{renderStudy()}</React.Fragment>}
        </AnimatePresence>
      </main>
    </div>
  );
}
