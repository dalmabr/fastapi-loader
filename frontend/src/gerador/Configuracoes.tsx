import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

// ============================================
// TIPOS
// ============================================
interface Template {
  id: string;
  nome: string;
  bandeira: string;
  siaidcd: string;
}

type Ordem = 'asc' | 'desc';
type ColunaOrdenavel = 'nome' | 'bandeira' | 'siaidcd';

interface Toast {
  id: number;
  mensagem: string;
  tipo: 'sucesso' | 'erro' | 'info';
}

// ============================================
// CONFIG: 20 LINHAS POR PÁGINA, SEM SCROLL
// ============================================
const ITENS_POR_PAGINA = 20;

// ============================================
// HOOK CUSTOMIZADO: DEBOUNCE
// ============================================
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ============================================
// COMPONENTE: SKELETON ROW (compacto)
// ============================================
function SkeletonRow() {
  return (
    <tr className="border-b border-[#EDE8E2]">
      <td className="px-3 py-1"><div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-3/4"></div></td>
      <td className="px-3 py-1"><div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-16"></div></td>
      <td className="px-3 py-1"><div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-32"></div></td>
      <td className="px-3 py-1"><div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-10"></div></td>
    </tr>
  );
}

// ============================================
// COMPONENTE: CHECKBOX
// ============================================
function Checkbox({ checked, onChange, indeterminate = false, ariaLabel }: { 
  checked: boolean; 
  onChange: () => void; 
  indeterminate?: boolean;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={ariaLabel}
      className="w-3.5 h-3.5 rounded border-[#D4D4CE] text-[#3C2E26] focus:ring-1 focus:ring-[#C4A484] cursor-pointer"
    />
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function Configuracoes() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [incluindo, setIncluindo] = useState(false);
  const [form, setForm] = useState({ nome: '', bandeira: '', siaidcd: '' });
  const [busca, setBusca] = useState("");
  const [filtroBandeira, setFiltroBandeira] = useState("");
  const [filtroTemplate, setFiltroTemplate] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<ColunaOrdenavel>('nome');
  const [ordem, setOrdem] = useState<Ordem>('asc');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [errosForm, setErrosForm] = useState<{nome?: string; bandeira?: string; siaidcd?: string}>({});
  const [usandoMock, setUsandoMock] = useState(false);

  const buscaRef = useRef<HTMLInputElement>(null);
  const buscaDebounced = useDebounce(busca, 300);

  // ============================================
  // CARREGAMENTO — SUPABASE
  // ============================================
  useEffect(() => {
    async function carregarTemplates() {
      try {
        setCarregando(true);
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .order('nome', { ascending: true });

        if (error) {
          console.warn('Erro Supabase:', error.message);
          setUsandoMock(true);
        } else if (data && data.length > 0) {
          setTemplates(data);
          setUsandoMock(false);
        }
      } catch (err) {
        console.warn('Erro de conexão:', err);
        setUsandoMock(true);
      } finally {
        setCarregando(false);
      }
    }
    const timer = setTimeout(carregarTemplates, 400);
    return () => clearTimeout(timer);
  }, []);

  // ============================================
  // TOAST
  // ============================================
  const mostrarToast = useCallback((mensagem: string, tipo: Toast['tipo'] = 'sucesso') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ============================================
  // FORMULÁRIO
  // ============================================
  const resetForm = useCallback(() => {
    setForm({ nome: '', bandeira: '', siaidcd: '' });
    setEditandoId(null);
    setIncluindo(false);
    setErrosForm({});
  }, []);

  const validarForm = useCallback((): boolean => {
    const erros: typeof errosForm = {};

    if (!form.nome.trim()) erros.nome = 'Nome é obrigatório';

    if (!form.bandeira) erros.bandeira = 'Selecione uma bandeira';
    if (!form.siaidcd) erros.siaidcd = 'SIAIDCD é obrigatório';
    else if (form.siaidcd.length !== 19) erros.siaidcd = 'Deve ter 19 dígitos';

    const duplicadoNome = templates.some(t => t.nome.toLowerCase() === form.nome.toLowerCase() && t.id !== editandoId);
    const duplicadoSiaidcd = templates.some(t => t.siaidcd === form.siaidcd && t.id !== editandoId);

    if (duplicadoNome) erros.nome = 'Este nome já existe';
    if (duplicadoSiaidcd) erros.siaidcd = 'Este SIAIDCD já existe';

    setErrosForm(erros);
    return Object.keys(erros).length === 0;
  }, [form, templates, editandoId]);

  const handleIncluir = useCallback(() => {
    resetForm();
    setIncluindo(true);
    setPaginaAtual(1);
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('[data-form-input="nome"]')?.focus();
    }, 50);
  }, [resetForm]);

  const handleEditar = useCallback((t: Template) => {
    resetForm();
    setEditandoId(t.id);
    setForm({ nome: t.nome, bandeira: t.bandeira, siaidcd: t.siaidcd });
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('[data-form-input="nome"]')?.focus();
    }, 50);
  }, [resetForm]);

  const handleCancelar = useCallback(() => {
    resetForm();
    buscaRef.current?.focus();
  }, [resetForm]);

  const handleSalvar = useCallback(async () => {
    if (!validarForm()) return;

    if (incluindo) {
      const novo: Template = { id: Date.now().toString(), ...form };
      if (!usandoMock) {
        try {
          const { error } = await supabase.from('templates').insert([{
            nome: novo.nome, bandeira: novo.bandeira, siaidcd: novo.siaidcd
          }]);
          if (error) throw error;
        } catch (err) {
          mostrarToast('Erro ao salvar no servidor', 'erro');
          return;
        }
      }
      setTemplates(prev => [...prev, novo]);
      mostrarToast('Template incluído com sucesso!');
    } else if (editandoId) {
      if (!usandoMock) {
        try {
          const { error } = await supabase.from('templates')
            .update({ nome: form.nome, bandeira: form.bandeira, siaidcd: form.siaidcd })
            .eq('id', editandoId);
          if (error) throw error;
        } catch (err) {
          mostrarToast('Erro ao atualizar no servidor', 'erro');
          return;
        }
      }
      setTemplates(prev => prev.map(t => t.id === editandoId ? { ...t, ...form } : t));
      mostrarToast('Template alterado com sucesso!');
    }
    resetForm();
  }, [form, incluindo, editandoId, validarForm, resetForm, mostrarToast, usandoMock]);

  const handleKeyDownForm = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSalvar(); }
    else if (e.key === 'Escape') handleCancelar();
  }, [handleSalvar, handleCancelar]);

  // ============================================
  // EXCLUSÃO
  // ============================================
  const handleExcluir = useCallback(async (id: string) => {
    const t = templates.find(x => x.id === id);
    if (confirm(`Excluir "${t?.nome}"?`)) {
      if (!usandoMock) {
        try { await supabase.from('templates').delete().eq('id', id); }
        catch { mostrarToast('Erro ao excluir', 'erro'); return; }
      }
      setTemplates(prev => prev.filter(x => x.id !== id));
      setSelecionados(prev => { const n = new Set(prev); n.delete(id); return n; });
      mostrarToast('Template excluído!');
    }
  }, [templates, mostrarToast, usandoMock]);

  const handleExcluirEmLote = useCallback(async () => {
    if (selecionados.size === 0) return;
    if (confirm(`Excluir ${selecionados.size} template(s)?`)) {
      if (!usandoMock) {
        try { await supabase.from('templates').delete().in('id', Array.from(selecionados)); }
        catch { mostrarToast('Erro ao excluir', 'erro'); return; }
      }
      setTemplates(prev => prev.filter(t => !selecionados.has(t.id)));
      mostrarToast(`${selecionados.size} excluído(s)!`);
      setSelecionados(new Set());
    }
  }, [selecionados, mostrarToast, usandoMock]);

  // ============================================
  // ORDENAÇÃO
  // ============================================
  const handleOrdenar = useCallback((coluna: ColunaOrdenavel) => {
    setOrdenarPor(prev => {
      if (prev === coluna) { setOrdem(o => o === 'asc' ? 'desc' : 'asc'); return prev; }
      setOrdem('asc'); return coluna;
    });
    setPaginaAtual(1);
  }, []);

  // ============================================
  // FILTROS E PAGINAÇÃO (useMemo para performance)
  // ============================================
  const templatesFiltrados = useMemo(() => {
    let filtrados = templates.filter(t => {
      const termo = buscaDebounced.toLowerCase();
      const matchBusca = !termo || t.nome.toLowerCase().includes(termo) || t.siaidcd.includes(termo);
      const matchBandeira = !filtroBandeira || t.bandeira === filtroBandeira;
      const matchTemplate = !filtroTemplate || t.nome === filtroTemplate;
      return matchBusca && matchBandeira && matchTemplate;
    });
    filtrados.sort((a, b) => {
      const va = a[ordenarPor].toLowerCase(), vb = b[ordenarPor].toLowerCase();
      return va < vb ? (ordem === 'asc' ? -1 : 1) : va > vb ? (ordem === 'asc' ? 1 : -1) : 0;
    });
    return filtrados;
  }, [templates, buscaDebounced, filtroBandeira, filtroTemplate, ordenarPor, ordem]);

  const totalPaginas = Math.ceil(templatesFiltrados.length / ITENS_POR_PAGINA) || 1;
  const indiceInicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indiceFim = indiceInicio + ITENS_POR_PAGINA;

  // templatesPaginados declarado ANTES de toggleTodos
  const templatesPaginados = useMemo(() => 
    templatesFiltrados.slice(indiceInicio, indiceFim),
  [templatesFiltrados, indiceInicio, indiceFim]);

  const handlePaginaAnterior = () => { if (paginaAtual > 1) setPaginaAtual(p => p - 1); };
  const handlePaginaProxima = () => { if (paginaAtual < totalPaginas) setPaginaAtual(p => p + 1); };

  const podeSalvar = form.bandeira && form.nome && form.siaidcd.length === 19;
  const estaEditando = editandoId !== null || incluindo;
  const algumSelecionado = selecionados.size > 0;
  const todosDaPaginaSelecionados = templatesPaginados.length > 0 && templatesPaginados.every(t => selecionados.has(t.id));
  const algumDaPaginaSelecionado = templatesPaginados.some(t => selecionados.has(t.id));

  // ============================================
  // SELEÇÃO MÚLTIPLA (agora templatesPaginados já existe)
  // ============================================
  const toggleSelecionado = useCallback((id: string) => {
    setSelecionados(prev => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }, []);

  const toggleTodos = useCallback(() => {
    const idsPagina = new Set(templatesPaginados.map(t => t.id));
    const todosSelecionados = templatesPaginados.every(t => selecionados.has(t.id));
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (todosSelecionados) idsPagina.forEach(id => novo.delete(id));
      else idsPagina.forEach(id => novo.add(id));
      return novo;
    });
  }, [templatesPaginados, selecionados]);

  // ============================================
  // RENDER
  // ============================================
  const OrdenacaoIcon = ({ coluna }: { coluna: ColunaOrdenavel }) => {
    if (ordenarPor !== coluna) return <span className="inline-block w-3 h-3 opacity-30 ml-1 text-[14px]">↕</span>;
    return <span className="inline-block w-3 h-3 ml-1 text-white text-[14px]">{ordem === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2" role="region" aria-label="Notificações">
        {toasts.map(t => (
          <div key={t.id} role="alert"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium ${
              t.tipo === 'sucesso' ? 'bg-[#D1FAE5] text-[#065F46] border border-[#10B981]' : 
              t.tipo === 'erro' ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#EF4444]' :
              'bg-[#DBEAFE] text-[#1E40AF] border border-[#3B82F6]'
            }`}>
            {t.tipo === 'sucesso' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            : t.tipo === 'erro' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>}
            {t.mensagem}
          </div>
        ))}
      </div>

      {/* SEM SCROLL: tudo em h-screen com flex */}
      <main className="flex-1 flex flex-col max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-2 pb-1">

        {/* Título compacto */}
        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <h1 className="text-[#3C2E26] font-bold leading-tight" style={{ fontSize: 'clamp(2rem, 3.8vw, 2.7rem)' }}>
            Configurações
          </h1>
          {usandoMock && (
            <span className="text-[14px] text-[#999999] bg-[#FDF8F3] px-2 py-0.5 rounded border border-[#EDE8E2]">Offline</span>
          )}
        </div>

        {/* Barra de ações compacta */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 mb-1.5 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            <div className="relative">
              <input 
                ref={buscaRef}
                type="text" 
                value={busca} 
                onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }}
                placeholder="Buscar..." 
                aria-label="Buscar templates"
                className="h-7 pl-7 pr-2 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none focus:border-[#C4A484] focus:ring-1 focus:ring-[#C4A484]/20 w-[200px]" 
              />
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-[#999999]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>

            <select 
              value={filtroBandeira} 
              onChange={(e) => { setFiltroBandeira(e.target.value); setPaginaAtual(1); }}
              aria-label="Filtrar por bandeira"
              className="h-7 px-2 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none min-w-[120px] appearance-none cursor-pointer focus:border-[#C4A484]" 
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '20px' }}
            >
              <option value="">Todas Bandeiras</option>
              <option value="Visa">Visa</option>
              <option value="Mastercard">Mastercard</option>
              <option value="Elo">Elo</option>
            </select>

            <select 
              value={filtroTemplate} 
              onChange={(e) => { setFiltroTemplate(e.target.value); setPaginaAtual(1); }}
              aria-label="Filtrar por template"
              className="h-7 px-2 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none min-w-[140px] appearance-none cursor-pointer focus:border-[#C4A484]" 
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '20px' }}
            >
              <option value="">Todos Templates</option>
              {templates.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            {algumSelecionado && (
              <button 
                onClick={handleExcluirEmLote}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-[#EF4444] text-[#DC2626] hover:bg-[#FEE2E2] transition-colors text-sm font-medium"
                aria-label={`Excluir ${selecionados.size} templates`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Excluir ({selecionados.size})
              </button>
            )}
            <button 
              onClick={handleIncluir} 
              disabled={estaEditando} 
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[#C4A484] text-[#C4A484] hover:bg-[#FDF8F3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:ring-1 focus:ring-[#C4A484]/30 focus:outline-none" 
              title="Novo Template"
              aria-label="Incluir novo template"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
        </div>

        {/* Tabela: SEM SCROLL INTERNO, ocupa espaço restante */}
        <div className="flex-1 flex flex-col bg-white border border-[#EDE8E2] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#3C2E26] text-white h-7">
                <th className="px-2 w-6">
                  <Checkbox 
                    checked={todosDaPaginaSelecionados}
                    indeterminate={algumDaPaginaSelecionado && !todosDaPaginaSelecionados}
                    onChange={toggleTodos}
                    ariaLabel="Selecionar todos"
                  />
                </th>
                <th className="text-left px-2 text-[14px] font-semibold uppercase tracking-wider w-[38%] cursor-pointer select-none hover:bg-[#4a3a30] transition-colors" onClick={() => handleOrdenar('nome')}>
                  <span className="flex items-center">Template <OrdenacaoIcon coluna="nome" /></span>
                </th>
                <th className="text-left px-2 text-[14px] font-semibold uppercase tracking-wider w-[16%] cursor-pointer select-none hover:bg-[#4a3a30] transition-colors" onClick={() => handleOrdenar('bandeira')}>
                  <span className="flex items-center">Bandeira <OrdenacaoIcon coluna="bandeira" /></span>
                </th>
                <th className="text-left px-2 text-[14px] font-semibold uppercase tracking-wider w-[30%] cursor-pointer select-none hover:bg-[#4a3a30] transition-colors" onClick={() => handleOrdenar('siaidcd')}>
                  <span className="flex items-center">SIAIDCD <OrdenacaoIcon coluna="siaidcd" /></span>
                </th>
                <th className="w-14"></th>
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {carregando && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={`sk-${i}`} />)}

              {/* Linha de inclusão */}
              {!carregando && incluindo && (
                <tr className="border-b border-[#EDE8E2] bg-[#FDF8F3]" onKeyDown={handleKeyDownForm}>
                  <td className="px-2"></td>
                  <td className="px-2 py-0.5">
                    <input 
                      data-form-input="nome"
                      type="text" 
                      value={form.nome} 
                      onChange={(e) => setForm({...form, nome: e.target.value})} 
                      placeholder="Nome do template" 
                      aria-label="Nome do template"
                      aria-invalid={!!errosForm.nome}
                      className={`w-full h-6 px-1.5 text-sm text-[#3C2E26] bg-white border rounded outline-none focus:border-[#C4A484] ${errosForm.nome ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`} 
                      autoFocus 
                    />
                    {errosForm.nome && <span className="text-[9px] text-[#EF4444] block">{errosForm.nome}</span>}
                  </td>
                  <td className="px-2 py-0.5">
                    <select 
                      value={form.bandeira} 
                      onChange={(e) => setForm({...form, bandeira: e.target.value})} 
                      aria-label="Bandeira"
                      className={`w-full h-6 px-1.5 text-sm text-[#3C2E26] bg-white border rounded outline-none appearance-none cursor-pointer focus:border-[#C4A484] ${errosForm.bandeira ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`} 
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '16px' }}
                    >
                      <option value="">Selecione</option>
                      <option value="Visa">Visa</option>
                      <option value="Mastercard">Mastercard</option>
                      <option value="Elo">Elo</option>
                    </select>
                  </td>
                  <td className="px-2 py-0.5">
                    <input 
                      type="text" 
                      value={form.siaidcd} 
                      onChange={(e) => setForm({...form, siaidcd: e.target.value.replace(/\D/g, '').slice(0,19)})} 
                      maxLength={19} 
                      placeholder="012020807326812880" 
                      aria-label="SIAIDCD"
                      aria-invalid={!!errosForm.siaidcd}
                      className={`w-full h-6 px-1.5 text-sm text-[#3C2E26] bg-white border rounded outline-none font-mono focus:border-[#C4A484] ${errosForm.siaidcd ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`} 
                    />
                    {errosForm.siaidcd && <span className="text-[9px] text-[#EF4444] block">{errosForm.siaidcd}</span>}
                  </td>
                  <td className="px-2">
                    <div className="flex items-center justify-center gap-0.5">
                      <button onClick={handleSalvar} disabled={!podeSalvar} 
                        className="inline-flex items-center justify-center w-5 h-5 rounded text-[#059669] hover:bg-[#D1FAE5] transition-all disabled:opacity-40" 
                        title="Confirmar" aria-label="Salvar">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      </button>
                      <button onClick={handleCancelar} 
                        className="inline-flex items-center justify-center w-5 h-5 rounded text-[#999999] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all" 
                        title="Cancelar" aria-label="Cancelar">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!carregando && templatesPaginados.length === 0 && !incluindo && (
                <tr>
                  <td colSpan={5} className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-[#999999]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#D4D4CE]">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      </svg>
                      <p className="text-sm font-medium text-[#3C2E26]">Nenhum template encontrado</p>
                      <button onClick={handleIncluir}
                        className="mt-1 inline-flex items-center gap-1 h-6 px-2.5 rounded-lg bg-[#3C2E26] text-white text-sm hover:bg-[#4a3a30] transition-colors">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                        Incluir
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Dados */}
              {!carregando && templatesPaginados.map(t => (
                <tr key={t.id} className={`border-b border-[#EDE8E2] transition-colors h-7 ${editandoId === t.id ? 'bg-[#FDF8F3]' : 'hover:bg-[#FDF8F3]'}`}>
                  {editandoId === t.id ? (
                    <>
                      <td className="px-2"></td>
                      <td className="px-2 py-0.5">
                        <input data-form-input="nome" type="text" value={form.nome} 
                          onChange={(e) => setForm({...form, nome: e.target.value})} 
                          aria-label="Nome" aria-invalid={!!errosForm.nome}
                          className={`w-full h-6 px-1.5 text-sm text-[#3C2E26] bg-white border rounded outline-none focus:border-[#C4A484] ${errosForm.nome ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`} autoFocus />
                        {errosForm.nome && <span className="text-[9px] text-[#EF4444] block">{errosForm.nome}</span>}
                      </td>
                      <td className="px-2 py-0.5">
                        <select value={form.bandeira} onChange={(e) => setForm({...form, bandeira: e.target.value})} 
                          aria-label="Bandeira"
                          className={`w-full h-6 px-1.5 text-sm text-[#3C2E26] bg-white border rounded outline-none appearance-none cursor-pointer focus:border-[#C4A484] ${errosForm.bandeira ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`}
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '16px' }}>
                          <option value="">Selecione</option><option value="Visa">Visa</option><option value="Mastercard">Mastercard</option><option value="Elo">Elo</option>
                        </select>
                      </td>
                      <td className="px-2 py-0.5">
                        <input type="text" value={form.siaidcd} 
                          onChange={(e) => setForm({...form, siaidcd: e.target.value.replace(/\D/g, '').slice(0,19)})} maxLength={19} 
                          aria-label="SIAIDCD" aria-invalid={!!errosForm.siaidcd}
                          className={`w-full h-6 px-1.5 text-sm text-[#3C2E26] bg-white border rounded outline-none font-mono focus:border-[#C4A484] ${errosForm.siaidcd ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`} />
                        {errosForm.siaidcd && <span className="text-[9px] text-[#EF4444] block">{errosForm.siaidcd}</span>}
                      </td>
                      <td className="px-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <button onClick={handleSalvar} disabled={!podeSalvar} 
                            className="inline-flex items-center justify-center w-5 h-5 rounded text-[#059669] hover:bg-[#D1FAE5] transition-all disabled:opacity-40" title="Salvar" aria-label="Salvar">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          </button>
                          <button onClick={handleCancelar} 
                            className="inline-flex items-center justify-center w-5 h-5 rounded text-[#999999] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all" title="Cancelar" aria-label="Cancelar">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2">
                        <Checkbox checked={selecionados.has(t.id)} onChange={() => toggleSelecionado(t.id)} ariaLabel={`Selecionar ${t.nome}`} />
                      </td>
                      <td className="px-2 font-medium text-[#1A1A1A] text-sm">{t.nome}</td>
                      <td className="px-2 text-[#C4A484] font-medium text-sm">{t.bandeira}</td>
                      <td className="px-2 font-mono text-[#6B5744] text-[14px]">{t.siaidcd}</td>
                      <td className="px-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <button onClick={() => handleEditar(t)} disabled={estaEditando} 
                            className="inline-flex items-center justify-center w-5 h-5 rounded text-[#999999] hover:text-[#C4A484] hover:bg-[#FDF8F3] transition-all disabled:opacity-30" title="Editar" aria-label={`Editar ${t.nome}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => handleExcluir(t.id)} disabled={estaEditando} 
                            className="inline-flex items-center justify-center w-5 h-5 rounded text-[#999999] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all disabled:opacity-30" title="Excluir" aria-label={`Excluir ${t.nome}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação SIMPLES: só Anterior/Próximo + contador */}
          <div className="flex justify-between items-center px-4 py-1.5 border-t border-[#EDE8E2] shrink-0 bg-white">
            <span className="text-[14px] text-[#999999]">
              {templatesFiltrados.length > 0 
                ? `${indiceInicio + 1}-${Math.min(indiceFim, templatesFiltrados.length)} de ${templatesFiltrados.length}`
                : '0 resultados'
              }
            </span>
            <div className="flex gap-1 items-center">
              <button 
                onClick={handlePaginaAnterior} 
                disabled={paginaAtual === 1} 
                className="h-6 px-2 text-[14px] font-medium text-[#3C2E26] bg-white border border-[#D4D4CE] rounded hover:bg-[#FDF8F3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Anterior"
              >
                ← Anterior
              </button>
              <span className="text-[14px] text-[#999999] px-1">{paginaAtual} / {totalPaginas}</span>
              <button 
                onClick={handlePaginaProxima} 
                disabled={paginaAtual >= totalPaginas} 
                className="h-6 px-2 text-[14px] font-medium text-[#3C2E26] bg-[#FDF8F3] border border-[#C4A484] rounded hover:bg-[#F3E5D4] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Próximo"
              >
                Próximo →
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
