import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'operator';
  ativo: boolean;
  created_at: string;
  user_code: string | null;
}

interface Toast {
  id: number;
  mensagem: string;
  tipo: 'sucesso' | 'erro' | 'info';
}

export default function Usuarios() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoRole, setEditandoRole] = useState<'admin' | 'operator'>('operator');
  const [editandoUserCode, setEditandoUserCode] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoSenha, setNovoSenha] = useState('');
  const [novoRole, setNovoRole] = useState<'admin' | 'operator'>('operator');
  const [criando, setCriando] = useState(false);

  const mostrarToast = useCallback((mensagem: string, tipo: Toast['tipo'] = 'sucesso') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    carregarProfiles();
  }, []);

  async function carregarProfiles() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      mostrarToast(err.message || 'Erro ao carregar usuários', 'erro');
    } finally {
      setCarregando(false);
    }
  }

  async function criarUsuario() {
    if (!novoEmail.trim() || !novoSenha.trim()) {
      mostrarToast('Preencha e-mail e senha', 'erro');
      return;
    }

    setCriando(true);
    try {
      const { data, error } = await supabase.functions.invoke('criar-usuario', {
        body: { email: novoEmail.trim(), password: novoSenha.trim(), role: novoRole },
      });

      if (error) throw new Error(error.message || 'Erro ao criar usuário');
      if (data?.detail) throw new Error(data.detail);

      mostrarToast(`Usuário ${novoEmail} criado com sucesso!`);
      setNovoEmail('');
      setNovoSenha('');
      setNovoRole('operator');
      await carregarProfiles();
    } catch (err: any) {
      mostrarToast(err.message || 'Erro ao criar usuário', 'erro');
    } finally {
      setCriando(false);
    }
  }

  async function atualizarPerfil(userId: string, novoRole: 'admin' | 'operator', novoUserCode: string) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: novoRole, user_code: novoUserCode.toUpperCase().slice(0, 8) || null })
        .eq('id', userId);
      if (error) throw error;
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: novoRole, user_code: novoUserCode.toUpperCase().slice(0, 8) || null } : p));
      setEditandoId(null);
      mostrarToast('Perfil atualizado!');
    } catch (err: any) {
      mostrarToast(err.message || 'Erro ao atualizar', 'erro');
    }
  }

  async function toggleAtivo(userId: string, ativo: boolean) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo: !ativo })
        .eq('id', userId);
      if (error) throw error;
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, ativo: !p.ativo } : p));
      mostrarToast(ativo ? 'Usuário desativado' : 'Usuário ativado');
    } catch (err: any) {
      mostrarToast(err.message || 'Erro ao atualizar', 'erro');
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} role="alert" className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-xs font-medium ${
            t.tipo === 'sucesso' ? 'bg-[#D1FAE5] text-[#065F46] border border-[#10B981]' :
            t.tipo === 'erro' ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#EF4444]' :
            'bg-[#DBEAFE] text-[#1E40AF] border border-[#3B82F6]'
          }`}>
            {t.mensagem}
          </div>
        ))}
      </div>

      <main className="flex-1 flex flex-col max-w-[1200px] w-full mx-auto px-4 sm:px-6 pt-4 pb-4">
        <h1 className="text-[#3C2E26] font-bold leading-tight mb-4" style={{ fontSize: 'clamp(2rem, 3.8vw, 2.7rem)' }}>
          Gerenciamento de Usuários
        </h1>

        {/* Card de criar novo usuário */}
        <div className="bg-white border border-[#EDE8E2] rounded-xl p-4 mb-4 shrink-0">
          <h3 className="text-sm font-semibold text-[#3C2E26] mb-3">Novo Usuário</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-[#3C2E26] block mb-1">E-mail</label>
              <input
                type="email"
                value={novoEmail}
                onChange={e => setNovoEmail(e.target.value)}
                placeholder="novo@empresa.com"
                className="w-full h-9 px-3 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none focus:border-[#C4A484]"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-[#3C2E26] block mb-1">Senha</label>
              <input
                type="password"
                value={novoSenha}
                onChange={e => setNovoSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 px-3 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none focus:border-[#C4A484]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#3C2E26] block mb-1">Perfil</label>
              <select
                value={novoRole}
                onChange={e => setNovoRole(e.target.value as 'admin' | 'operator')}
                className="h-9 px-3 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none appearance-none cursor-pointer focus:border-[#C4A484]"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%2710%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23666%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '20px' }}
              >
                <option value="operator">Operador</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              onClick={criarUsuario}
              disabled={criando || !novoEmail || !novoSenha}
              className="h-9 px-4 bg-[#3C2E26] text-white text-sm font-medium rounded-lg hover:bg-[#4a3a30] transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {criando ? (
                <>
                  <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Criando...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                  Criar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tabela de usuários */}
        <div className="flex-1 flex flex-col bg-white border border-[#EDE8E2] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#3C2E26] text-white h-10">
                <th className="text-left px-4 text-xs font-semibold uppercase tracking-wider w-[35%]">E-mail</th>
                <th className="text-left px-4 text-xs font-semibold uppercase tracking-wider w-[15%]">Código</th>
                <th className="text-left px-4 text-xs font-semibold uppercase tracking-wider w-[15%]">Perfil</th>
                <th className="text-left px-4 text-xs font-semibold uppercase tracking-wider w-[15%]">Status</th>
                <th className="text-center px-4 text-xs font-semibold uppercase tracking-wider w-[20%]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-[#EDE8E2]">
                    <td colSpan={5} className="px-4 py-2">
                      <div className="h-4 bg-[#EDE8E2] rounded animate-pulse w-3/4"></div>
                    </td>
                  </tr>
                ))
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#999999]">Nenhum usuário encontrado</td>
                </tr>
              ) : (
                profiles.map(p => (
                  <tr key={p.id} className="border-b border-[#EDE8E2] hover:bg-[#FDF8F3] h-10">
                    <td className="px-4 text-[#3C2E26] font-medium text-sm">{p.email}</td>
                    <td className="px-4">
                      {editandoId === p.id ? (
                        <input
                          value={editandoUserCode}
                          onChange={e => setEditandoUserCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                          maxLength={8}
                          placeholder="8 chars"
                          className="w-24 h-7 px-2 text-xs font-mono text-[#3C2E26] bg-white border border-[#C4A484] rounded outline-none uppercase"
                        />
                      ) : (
                        <span className="text-xs font-mono text-[#6B5744]">{p.user_code ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4">
                      {editandoId === p.id ? (
                        <select
                          value={editandoRole}
                          onChange={e => setEditandoRole(e.target.value as 'admin' | 'operator')}
                          className="h-7 px-2 text-xs text-[#3C2E26] bg-white border border-[#C4A484] rounded outline-none appearance-none cursor-pointer"
                          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%278%27 height=%278%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23666%27 stroke-width=%272%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '16px' }}
                        >
                          <option value="operator">Operador</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.role === 'admin' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#E0E7FF] text-[#1E3A8A]'}`}>
                          {p.role === 'admin' ? 'Admin' : 'Operador'}
                        </span>
                      )}
                    </td>
                    <td className="px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.ativo ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 flex items-center justify-center gap-1.5">
                      {editandoId === p.id ? (
                        <>
                          <button
                            onClick={() => atualizarPerfil(p.id, editandoRole, editandoUserCode)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded text-[#059669] hover:bg-[#D1FAE5] transition-all"
                            title="Confirmar"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          </button>
                          <button
                            onClick={() => setEditandoId(null)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded text-[#999999] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all"
                            title="Cancelar"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => { setEditandoId(p.id); setEditandoRole(p.role); setEditandoUserCode(p.user_code ?? ''); }}
                          className="inline-flex items-center justify-center w-6 h-6 rounded text-[#999999] hover:text-[#C4A484] hover:bg-[#FDF8F3] transition-all"
                          title="Editar"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                      <button
                        onClick={() => toggleAtivo(p.id, p.ativo)}
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-[#999999] hover:text-[#3B82F6] hover:bg-[#DBEAFE] transition-all"
                        title={p.ativo ? 'Desativar' : 'Ativar'}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
