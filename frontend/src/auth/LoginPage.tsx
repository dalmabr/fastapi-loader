import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export default function LoginPage() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

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
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#3C2E26]">AxxioLab</h1>
          <p className="text-sm text-[#6B5744] mt-1">Gerador de Arquivos de Clearing</p>
        </div>
        <div className="bg-white rounded-xl border border-[#EDE8E2] shadow-sm p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-[#3C2E26] block mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full h-10 px-3 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none focus:border-[#C4A484] focus:ring-1 focus:ring-[#C4A484]/20"
                placeholder="usuario@empresa.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#3C2E26] block mb-1.5">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                required
                className="w-full h-10 px-3 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none focus:border-[#C4A484] focus:ring-1 focus:ring-[#C4A484]/20"
                placeholder="••••••••"
              />
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
