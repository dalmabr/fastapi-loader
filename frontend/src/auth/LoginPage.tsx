import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import logoUrl from '../logo.svg';

export default function LoginPage() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : error.message);
    }
    setCarregando(false);
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-8">
          <img src={logoUrl} alt="AxxioLab" className="h-40" />
        </div>

        <div className="bg-white rounded-xl border border-[#EDE8E2] shadow-sm p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-[#3C2E26] block mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => { setErro(''); setEmail(e.target.value); }}
                required
                autoFocus
                className="w-full h-10 px-3 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none focus:border-[#C4A484] focus:ring-1 focus:ring-[#C4A484]/20"
                placeholder="usuario@empresa.com"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#3C2E26] block mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={e => { setErro(''); setSenha(e.target.value); }}
                  required
                  className="w-full h-10 px-3 pr-10 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none focus:border-[#C4A484] focus:ring-1 focus:ring-[#C4A484]/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  tabIndex={-1}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B8B7E] hover:text-[#3C2E26] transition-colors"
                >
                  {mostrarSenha ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {erro && (
              <p className="text-xs text-[#DC2626] bg-[#FEE2E2] border border-[#EF4444] rounded-lg px-3 py-2">{erro}</p>
            )}

            <button
              type="submit"
              disabled={carregando || !email || !senha}
              className="h-10 bg-[#3C2E26] text-white text-sm font-medium rounded-lg hover:bg-[#4a3a30] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {carregando ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
