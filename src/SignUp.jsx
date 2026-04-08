import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldCheck, 
  Smartphone, 
  Mail, 
  Lock 
} from 'lucide-react';
import './SignUp.css';

const API_BASE = '/api';

export default function SignUp({ onSuccess, onBack }) {
  React.useEffect(() => {
    document.title = "Cadastro Gratuito | Revise IA";
  }, []);

  const [formData, setFormData] = useState({
    email: '',
    whatsapp: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Basic mask for WhatsApp if needed (e.g. max length)
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!formData.email || !formData.whatsapp || !formData.password) {
      return setError('Por favor, preencha todos os campos obrigatórios.');
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      return setError('Insira um e-mail válido.');
    }
    if (formData.whatsapp.replace(/\D/g, '').length < 10) {
      return setError('Insira um número de WhatsApp válido com DDD.');
    }
    if (formData.password.length < 6) {
      return setError('A senha deve ter pelo menos 6 caracteres.');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('As senhas não coincidem.');
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Novo Estudante', // Name could be asked later or added to form
          email: formData.email,
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          password_hash: formData.password 
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocorreu um erro ao criar a conta.');
      }

      // Sucesso -> Redireciona para área de inscritos
      onSuccess({ id: data.id, name: formData.email, email: formData.email });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="grid-overlay" />

      <div className="signup-container">
        <motion.button 
          className="back-btn"
          onClick={onBack}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ArrowLeft size={20} /> Voltar
        </motion.button>

        <div className="signup-card glass-card">
          {/* Lado Esquerdo - Proposta de Valor */}
          <div className="signup-left">
            <div className="signup-brand">
              <div className="logo-box">
                 <img src="/logo.png" alt="Revise IA Logo" className="brand-logo" style={{ height: 40 }} />
              </div>
              <div>
                <p className="brand-kicker" style={{ margin: '0 0 4px', fontSize: 10 }}>Inscrição Gratuita</p>
                <h2 className="signup-title-left">Acesso Exclusivo à Área Revise IA</h2>
              </div>
            </div>

            <p className="signup-text-left">
              Faça seu cadastro agora e experimente sem custo a plataforma que transforma esquecimento em aprovação. 
            </p>

            <div className="signup-benefits">
              <div className="benefit-item">
                <CheckCircle2 className="benefit-icon" />
                <span>Trilhas de estudo organizadas.</span>
              </div>
              <div className="benefit-item">
                <CheckCircle2 className="benefit-icon" />
                <span>Materiais em blocos inteligentes.</span>
              </div>
              <div className="benefit-item">
                <CheckCircle2 className="benefit-icon" />
                <span>Checklists de domínio técnico.</span>
              </div>
              <div className="benefit-item">
                <CheckCircle2 className="benefit-icon" />
                <span>Mapeamento de pegadinhas de bancas.</span>
              </div>
            </div>

            <div className="signup-security">
              <ShieldCheck size={20} />
              <span>Plataforma 100% segura. Seus dados estão protegidos e o acesso é imediato.</span>
            </div>
          </div>

          {/* Lado Direito - Formulário */}
          <div className="signup-right">
            <h3 className="form-title">Crie sua conta grátis</h3>
            <p className="form-subtitle">Leva menos de 1 minuto para começar.</p>

            <form onSubmit={handleSubmit} className="signup-form">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="error-box"
                >
                  {error}
                </motion.div>
              )}

              <div className="input-group">
                <label>E-mail *</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="email"
                    name="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>WhatsApp *</label>
                <div className="input-wrapper">
                  <Smartphone className="input-icon" size={18} />
                  <input
                    type="tel"
                    name="whatsapp"
                    placeholder="(11) 99999-9999"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Senha *</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Mínimo de 6 caracteres"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button 
                    type="button" 
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label>Confirmar Senha *</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Repita sua senha"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-submit">
                {loading ? <Loader2 className="spin" size={20} /> : 'Garantir meu acesso gratuito'}
              </button>
            </form>

            <p className="form-footer-text">
              Ao se cadastrar, você ganha acesso imediato à versão gratuita da plataforma e nossas trilhas inaugurais.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
