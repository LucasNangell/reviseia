import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import "./index.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

function GlassCard({ children, className = "" }) {
  return <div className={`glass-card ${className}`}>{children}</div>;
}

function Pill({ children }) {
  return <span className="pill">{children}</span>;
}

function Stat({ label, value, icon: Icon }) {
  return (
    <GlassCard className="stat-card">
      <div className="stat-top">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
        </div>
        <div className="stat-icon-wrap">
          <Icon className="stat-icon" />
        </div>
      </div>
    </GlassCard>
  );
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="section-title-wrap">
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="section-title">{title}</h2>
      {text ? <p className="section-text">{text}</p> : null}
    </div>
  );
}

function LoadingState({ text = "Carregando..." }) {
  return (
    <div className="loading-state">
      <Loader2 className="spin" />
      <span>{text}</span>
    </div>
  );
}

function EmptyState({ text }) {
  return <GlassCard className="empty-state">{text}</GlassCard>;
}

export default function App() {
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [trackItems, setTrackItems] = useState([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [materialData, setMaterialData] = useState(null);
  const [materialQuestions, setMaterialQuestions] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingMaterial, setLoadingMaterial] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadTracks() {
      try {
        setLoadingTracks(true);
        setApiError("");
        const res = await fetch(`${API_BASE}/tracks`);
        if (!res.ok) throw new Error("Falha ao carregar trilhas");
        const data = await res.json();
        if (!active) return;
        setTracks(data);
        if (data.length) {
          const initial = data.find((t) => t.is_default) || data[0];
          setSelectedTrack(initial);
        }
      } catch {
        if (!active) return;
        setApiError("Não foi possível conectar à API. Verifique se o backend FastAPI está rodando em http://127.0.0.1:8000.");
      } finally {
        if (active) setLoadingTracks(false);
      }
    }
    loadTracks();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadItems() {
      if (!selectedTrack?.id) return;
      try {
        setLoadingItems(true);
        const res = await fetch(`${API_BASE}/tracks/${selectedTrack.id}/items`);
        if (!res.ok) throw new Error("Falha ao carregar itens");
        const data = await res.json();
        if (!active) return;
        setTrackItems(data);
        if (data.length) setSelectedMaterialId(data[0].material_id);
      } catch {
        if (!active) return;
        setApiError("Falha ao carregar os itens da trilha selecionada.");
      } finally {
        if (active) setLoadingItems(false);
      }
    }
    loadItems();
    return () => {
      active = false;
    };
  }, [selectedTrack]);

  useEffect(() => {
    let active = true;
    async function loadMaterial() {
      if (!selectedMaterialId) return;
      try {
        setLoadingMaterial(true);
        const [materialRes, questionsRes] = await Promise.all([
          fetch(`${API_BASE}/materials/${selectedMaterialId}`),
          fetch(`${API_BASE}/materials/${selectedMaterialId}/questions`),
        ]);
        if (!materialRes.ok || !questionsRes.ok) throw new Error("Falha ao carregar material");
        const material = await materialRes.json();
        const questions = await questionsRes.json();
        if (!active) return;
        setMaterialData(material);
        setMaterialQuestions(questions);
      } catch {
        if (!active) return;
        setApiError("Falha ao carregar o material selecionado.");
      } finally {
        if (active) setLoadingMaterial(false);
      }
    }
    loadMaterial();
    return () => {
      active = false;
    };
  }, [selectedMaterialId]);

  const stats = useMemo(() => {
    const materials = trackItems.length;
    const totalMinutes = trackItems.reduce((acc, item) => acc + (item.estimated_minutes || 0), 0);
    const questions = materialQuestions.length;
    const blocks = materialData?.blocks?.length || 0;
    return { materials, totalMinutes, questions, blocks };
  }, [trackItems, materialQuestions, materialData]);

  return (
    <div className="app-shell">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />
      <div className="grid-overlay" />

      <div className="container">
        <motion.header
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.55 }}
          className="hero-top"
        >
          <div className="brand-wrap">
            <div className="logo-box">
              <img src="/logo.png" alt="Revise IA" className="brand-logo" />
            </div>
            <div>
              <p className="brand-kicker">Revise IA</p>
              <h1 className="brand-title">Plataforma de revisão com foco em performance e retenção</h1>
            </div>
          </div>

          <div className="pill-row">
            <Pill>FastAPI + React</Pill>
            <Pill>Visual premium</Pill>
            <Pill>Trilha orientada</Pill>
          </div>
        </motion.header>

        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.08, duration: 0.55 }}
          className="hero-grid"
        >
          <GlassCard className="hero-main">
            <div className="hero-glow" />
            <div className="hero-content">
              <div className="pill-row left">
                <Pill>Foco em CEBRASPE</Pill>
                <Pill>Revisão estruturada</Pill>
                <Pill>Experiência premium</Pill>
              </div>

              <h2 className="hero-title">
                Estude com uma interface projetada para <span className="gradient-text">clareza, foco e evolução</span>.
              </h2>

              <p className="hero-text">
                Seu conteúdo já está no banco. Agora a experiência vira produto: trilha guiada,
                navegação fluida, materiais ricos, questões integradas e sensação visual de plataforma premium.
              </p>

              <div className="hero-actions">
                <button className="btn btn-primary">
                  Explorar trilha
                  <ArrowRight size={16} />
                </button>
                <button className="btn btn-secondary">
                  <PlayCircle size={16} />
                  Ver estrutura
                </button>
              </div>
            </div>
          </GlassCard>

          <div className="stats-grid">
            <Stat label="Materiais na trilha" value={loadingItems ? "..." : stats.materials} icon={Layers3} />
            <Stat label="Tempo estimado" value={loadingItems ? "..." : `${stats.totalMinutes} min`} icon={Clock3} />
            <Stat label="Questões do material" value={loadingMaterial ? "..." : stats.questions} icon={Target} />
            <Stat label="Blocos de estudo" value={loadingMaterial ? "..." : stats.blocks} icon={BookOpen} />
          </div>
        </motion.section>

        {apiError ? <div className="api-error">{apiError}</div> : null}

        <div className="content-grid">
          <motion.section variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.16, duration: 0.55 }}>
            <SectionTitle
              eyebrow="Trilhas"
              title="Escolha a experiência central do aluno"
              text="A estrutura abaixo já conversa com a API e mostra como a trilha se torna o coração da navegação do produto."
            />

            <div className="track-list">
              {loadingTracks ? (
                <LoadingState text="Carregando trilhas..." />
              ) : tracks.length === 0 ? (
                <EmptyState text="Nenhuma trilha cadastrada no banco." />
              ) : (
                tracks.map((track) => {
                  const active = selectedTrack?.id === track.id;
                  return (
                    <motion.button
                      key={track.id}
                      whileHover={{ y: -2, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedTrack(track)}
                      className={`track-card ${active ? "active" : ""}`}
                    >
                      <div className="track-card-top">
                        <div>
                          <div className="pill-row left">
                            {track.is_default ? <Pill>Trilha principal</Pill> : null}
                            <Pill>{track.board_name}</Pill>
                          </div>
                          <h3 className="track-title">{track.name}</h3>
                          <p className="track-text">{track.description || track.exam_edition_title}</p>
                        </div>
                        <ChevronRight className={`track-chevron ${active ? "active" : ""}`} />
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>
          </motion.section>

          <motion.section variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.22, duration: 0.55 }}>
            <SectionTitle
              eyebrow="Conteúdo"
              title="Uma experiência visual que valoriza profundidade"
              text="A área principal combina visão da trilha, navegação por item e leitura de material com blocos, pegadinhas e revisão rápida."
            />

            <div className="study-grid">
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
                    <Pill>Estudo</Pill>
                    <Pill>Questões</Pill>
                    <Pill>Revisão</Pill>
                  </div>
                  <h3 className="study-main-title">
                    {loadingMaterial ? "Carregando material..." : materialData?.material?.title || "Selecione um material"}
                  </h3>
                  <p className="study-main-text">
                    {materialData?.material?.subject_name || "A área principal mostra o conteúdo estruturado vindo direto da API."}
                  </p>
                </div>

                <div className="study-main-body">
                  {loadingMaterial ? (
                    <LoadingState text="Carregando conteúdo do material..." />
                  ) : !materialData ? (
                    <EmptyState text="Nenhum material selecionado." />
                  ) : (
                    <>
                      <div className="mini-stats">
                        <div className="mini-stat">
                          <p>Tópicos</p>
                          <strong>{materialData.topics.length}</strong>
                        </div>
                        <div className="mini-stat">
                          <p>Pegadinhas</p>
                          <strong>{materialData.traps.length}</strong>
                        </div>
                        <div className="mini-stat">
                          <p>Checklist</p>
                          <strong>{materialData.checklist.length}</strong>
                        </div>
                      </div>

                      <div className="material-grid">
                        <div className="blocks-column">
                          <h4 className="column-title">Blocos do material</h4>
                          <div className="blocks-list">
                            {materialData.blocks.slice(0, 5).map((block) => (
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
                              {materialData.traps.slice(0, 3).map((trap) => (
                                <div key={trap.id} className="review-item">
                                  <p className="review-item-title">{trap.title}</p>
                                  <p className="review-item-text">{trap.description}</p>
                                </div>
                              ))}
                              {!materialData.traps.length ? <p className="review-empty">Sem pegadinhas cadastradas.</p> : null}
                            </div>
                          </div>

                          <div className="review-card">
                            <div className="review-head review-head-green">
                              <CheckCircle2 size={18} />
                              <p>Checklist de domínio</p>
                            </div>
                            <div className="review-list">
                              {materialData.checklist.slice(0, 5).map((item) => (
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
          </motion.section>
        </div>

        <motion.section variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.28, duration: 0.55 }} className="dashboard-section">
          <SectionTitle
            eyebrow="Painel"
            title="Visual pensado para transmitir performance, método e sofisticação"
            text="Abaixo está um recorte de dashboard para o aluno perceber progresso, direção e prioridade diária."
          />

          <div className="dashboard-grid">
            <GlassCard className="dashboard-card">
              <div className="dashboard-head cyan">
                <LineChart size={18} />
                <p>Ritmo da trilha</p>
              </div>
              <div className="bar-chart">
                {[38, 52, 48, 66, 71, 84, 78].map((h, i) => (
                  <div key={i} className="bar" style={{ height: `${h}%` }} />
                ))}
              </div>
              <p className="dashboard-text">Gráfico ilustrativo para evolução semanal, taxa de revisão e constância de estudo.</p>
            </GlassCard>

            <GlassCard className="dashboard-card">
              <div className="dashboard-head violet">
                <Brain size={18} />
                <p>Prioridades do dia</p>
              </div>
              <div className="priority-list">
                {[
                  "Revisar pegadinhas críticas de Língua Portuguesa",
                  "Resolver 10 questões do material atual",
                  "Fechar checklist do bloco em estudo",
                  "Registrar progresso e acurácia",
                ].map((task) => (
                  <div key={task} className="priority-item">{task}</div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="dashboard-card">
              <div className="dashboard-head amber">
                <Trophy size={18} />
                <p>Identidade de marca</p>
              </div>
              <div className="brand-card">
                <div className="brand-card-top">
                  <div className="brand-icon-box">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <p className="brand-card-kicker">Visual system</p>
                    <p className="brand-card-title">Azul profundo + cyan tecnológico</p>
                  </div>
                </div>
                <p className="brand-card-text">
                  Paleta alinhada à logo, com contraste premium, profundidade escura e acentos vibrantes
                  para transmitir tecnologia, confiança e alto desempenho.
                </p>
              </div>
            </GlassCard>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
