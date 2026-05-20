import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

// ============================================
// TIPOS
// ============================================
interface Arquivo {
  id: string;
  nome_arquivo: string;
  data_geracao: string;
  data_atualizacao: string;
  bandeira: string;
  template_id: string;
  quantidade_registros: number;
  usuario: string;
  status: string;
  valor_total: number;
}

interface RegistroArquivo {
  id: string;
  arquivo_id: string;
  siaidcd: string;
  bandeira: string;
  pan: string;
  expiry_date: string;
  tran_amount: number;
  brl_amount: number;
  tran_currency: string;
  currency: string;
  merchant_name: string;
  token: string;
  nr_parcelas: number;
  data_transacao: string | null;
  hora_transacao: string | null;
  user_auditoria: string;
  ordem: number;
}

interface Template {
  id: string;
  nome: string;
  bandeira: string;
  siaidcd: string;
}

type Ordem = 'asc' | 'desc';
type ColunaOrdenavel = 'nome_arquivo' | 'bandeira' | 'data_geracao' | 'quantidade_registros';

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
// COMPONENTE: SKELETON ROW
// ============================================
function SkeletonRow() {
  return (
    <tr className="border-b border-[#EDE8E2]">
      <td className="px-3 py-1"><div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-3/4"></div></td>
      <td className="px-3 py-1"><div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-16"></div></td>
      <td className="px-3 py-1"><div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-32"></div></td>
      <td className="px-3 py-1"><div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-10"></div></td>
      <td className="px-3 py-1"><div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-20"></div></td>
      <td className="px-3 py-1"><div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-24"></div></td>
      <td className="px-3 py-1"><div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-20"></div></td>
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
export default function ListarArquivos() {
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [registros, setRegistros] = useState<RegistroArquivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroBandeira, setFiltroBandeira] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<ColunaOrdenavel>('data_geracao');
  const [ordem, setOrdem] = useState<Ordem>('desc');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [arquivosBaixados, setArquivosBaixados] = useState<Set<string>>(new Set());

  // Detalhes / Edição
  const [arquivoSelecionado, setArquivoSelecionado] = useState<Arquivo | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [registroEditando, setRegistroEditando] = useState<string | null>(null);
  const [formRegistro, setFormRegistro] = useState({
    pan: '',
    expiry_date: '',
    tran_amount: '',
    brl_amount: '',
    tran_currency: '986',
    currency: '986',
    merchant_name: '',
    token: '',
    nr_parcelas: '',
  });

  const buscaRef = useRef<HTMLInputElement>(null);
  const buscaDebounced = useDebounce(busca, 300);

  const mostrarToast = useCallback((mensagem: string, tipo: Toast['tipo'] = 'sucesso') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ============================================
  // CARREGAR DADOS
  // ============================================
  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      try {
        const [arquivosRes, templatesRes] = await Promise.all([
          supabase.from('arquivos_gerados').select('*').eq('status', 'ativo').order('data_geracao', { ascending: false }),
          supabase.from('templates').select('*').order('nome'),
        ]);

        if (!arquivosRes.error && arquivosRes.data) setArquivos(arquivosRes.data as Arquivo[]);
        if (!templatesRes.error && templatesRes.data) setTemplates(templatesRes.data as Template[]);
      } catch (err) {
        console.error('Erro:', err);
        mostrarToast('Erro ao carregar dados', 'erro');
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [mostrarToast]);

  const carregarRegistros = useCallback(async (arquivoId: string) => {
    const { data, error } = await supabase
      .from('registros_arquivo')
      .select('*')
      .eq('arquivo_id', arquivoId)
      .order('ordem');
    if (!error && data) setRegistros(data as RegistroArquivo[]);
  }, []);

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
  // FILTROS E PAGINAÇÃO
  // ============================================
  const arquivosFiltrados = useMemo(() => {
    let filtrados = arquivos.filter(a => {
      const termo = buscaDebounced.toLowerCase();
      const matchBusca = !termo || 
        a.nome_arquivo.toLowerCase().includes(termo) ||
        a.usuario.toLowerCase().includes(termo);
      const matchBandeira = !filtroBandeira || a.bandeira === filtroBandeira;
      return matchBusca && matchBandeira;
    });
    filtrados.sort((a, b) => {
      let va: string | number, vb: string | number;
      if (ordenarPor === 'quantidade_registros') {
        va = a[ordenarPor]; vb = b[ordenarPor];
      } else if (ordenarPor === 'data_geracao') {
        va = new Date(a[ordenarPor]).getTime(); vb = new Date(b[ordenarPor]).getTime();
      } else {
        va = (a[ordenarPor] as string).toLowerCase(); vb = (b[ordenarPor] as string).toLowerCase();
      }
      if (va < vb) return ordem === 'asc' ? -1 : 1;
      if (va > vb) return ordem === 'asc' ? 1 : -1;
      return 0;
    });
    return filtrados;
  }, [arquivos, buscaDebounced, filtroBandeira, ordenarPor, ordem]);

  const totalPaginas = Math.ceil(arquivosFiltrados.length / ITENS_POR_PAGINA) || 1;
  const indiceInicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indiceFim = indiceInicio + ITENS_POR_PAGINA;

  const arquivosPaginados = useMemo(() => 
    arquivosFiltrados.slice(indiceInicio, indiceFim),
  [arquivosFiltrados, indiceInicio, indiceFim]);

  const handlePaginaAnterior = () => { if (paginaAtual > 1) setPaginaAtual(p => p - 1); };
  const handlePaginaProxima = () => { if (paginaAtual < totalPaginas) setPaginaAtual(p => p + 1); };

  const todosDaPaginaSelecionados = arquivosPaginados.length > 0 && arquivosPaginados.every(a => selecionados.has(a.id));
  const algumDaPaginaSelecionado = arquivosPaginados.some(a => selecionados.has(a.id));
  const algumSelecionado = selecionados.size > 0;

  // ============================================
  // SELEÇÃO MÚLTIPLA
  // ============================================
  const toggleSelecionado = useCallback((id: string) => {
    setSelecionados(prev => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }, []);

  const toggleTodos = useCallback(() => {
    const idsPagina = new Set(arquivosPaginados.map(a => a.id));
    const todosSelecionados = arquivosPaginados.every(a => selecionados.has(a.id));
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (todosSelecionados) idsPagina.forEach(id => novo.delete(id));
      else idsPagina.forEach(id => novo.add(id));
      return novo;
    });
  }, [arquivosPaginados, selecionados]);

  // ============================================
  // AÇÕES
  // ============================================
  const handleVerDetalhes = useCallback(async (arquivo: Arquivo) => {
    setArquivoSelecionado(arquivo);
    setModoEdicao(false);
    setRegistroEditando(null);
    await carregarRegistros(arquivo.id);
  }, [carregarRegistros]);

  const handleFecharDetalhes = useCallback(() => {
    setArquivoSelecionado(null);
    setRegistros([]);
    setModoEdicao(false);
    setRegistroEditando(null);
  }, []);

  const handleExcluirArquivo = useCallback(async (arquivo: Arquivo) => {
    if (!confirm(`Tem certeza que deseja excluir o arquivo "${arquivo.nome_arquivo}"?\nIsso removerá ${arquivo.quantidade_registros} registros permanentemente.`)) return;

    try {
      const { error } = await supabase
        .from('arquivos_gerados')
        .update({ status: 'excluido' })
        .eq('id', arquivo.id);

      if (error) throw error;

      setArquivos(prev => prev.filter(a => a.id !== arquivo.id));
      if (arquivoSelecionado?.id === arquivo.id) handleFecharDetalhes();
      mostrarToast('Arquivo excluído com sucesso', 'info');
    } catch (err: any) {
      mostrarToast(err.message || 'Erro ao excluir arquivo', 'erro');
    }
  }, [arquivoSelecionado, handleFecharDetalhes, mostrarToast]);

  const handleExcluirEmLote = useCallback(async () => {
    if (selecionados.size === 0) return;
    if (confirm(`Excluir ${selecionados.size} arquivo(s)?`)) {
      try {
        const { error } = await supabase
          .from('arquivos_gerados')
          .update({ status: 'excluido' })
          .in('id', Array.from(selecionados));
        if (error) throw error;
        setArquivos(prev => prev.filter(a => !selecionados.has(a.id)));
        mostrarToast(`${selecionados.size} arquivo(s) excluído(s)!`);
        setSelecionados(new Set());
      } catch (err: any) {
        mostrarToast(err.message || 'Erro ao excluir', 'erro');
      }
    }
  }, [selecionados, mostrarToast]);

  // ============================================
  // BAIXAR TXT - NA LISTA (busca do banco)
  // ============================================
  const handleBaixarTxtLista = useCallback(async (arquivo: Arquivo) => {
    try {
      const { data: regs, error } = await supabase
        .from('registros_arquivo')
        .select('*')
        .eq('arquivo_id', arquivo.id)
        .order('ordem');

      if (error || !regs || regs.length === 0) {
        mostrarToast('Nenhum registro encontrado para download', 'erro');
        return;
      }

      let conteudo = '';
      (regs as RegistroArquivo[]).forEach(reg => {
        const linha = [
          reg.siaidcd.padEnd(19, ' '),
          reg.pan.padEnd(19, '0'),
          reg.expiry_date,
          reg.tran_amount.toFixed(2).replace('.', '').padStart(12, '0'),
          (reg.brl_amount ?? reg.tran_amount).toFixed(2).replace('.', '').padStart(12, '0'),
          reg.tran_currency,
          reg.currency,
          reg.merchant_name.padEnd(50, ' '),
          (reg.token ?? '').padStart(19, '0'),
          String(reg.nr_parcelas ?? 0).padStart(2, '0'),
          (reg.data_transacao ?? '00000000'),
          (reg.hora_transacao ?? '000000'),
          reg.user_auditoria,
        ].join('');
        conteudo += linha + '\n';
      });

      const blob = new Blob([conteudo], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${arquivo.nome_arquivo}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      setArquivosBaixados(prev => new Set(prev).add(arquivo.id));
      mostrarToast(`Arquivo "${arquivo.nome_arquivo}.txt" baixado`);
    } catch (err: any) {
      mostrarToast(err.message || 'Erro ao baixar arquivo', 'erro');
    }
  }, [mostrarToast]);

  // ============================================
  // BAIXAR TXT - NO DRAWER (usa registros em memória)
  // ============================================
  const handleBaixarTxtDrawer = useCallback((arquivo: Arquivo, regs: RegistroArquivo[]) => {
    if (regs.length === 0) {
      mostrarToast('Nenhum registro para download', 'erro');
      return;
    }

    let conteudo = '';
    regs.forEach(reg => {
      const linha = [
        reg.siaidcd.padEnd(19, ' '),
        reg.pan.padEnd(19, '0'),
        reg.expiry_date,
        reg.tran_amount.toFixed(2).replace('.', '').padStart(12, '0'),
        (reg.brl_amount ?? reg.tran_amount).toFixed(2).replace('.', '').padStart(12, '0'),
        reg.tran_currency,
        reg.currency,
        reg.merchant_name.padEnd(50, ' '),
        (reg.token ?? '').padStart(19, '0'),
        String(reg.nr_parcelas ?? 0).padStart(2, '0'),
        (reg.data_transacao ?? '00000000'),
        (reg.hora_transacao ?? '000000'),
        reg.user_auditoria,
      ].join('');
      conteudo += linha + '\n';
    });

    const blob = new Blob([conteudo], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${arquivo.nome_arquivo}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setArquivosBaixados(prev => new Set(prev).add(arquivo.id));
    mostrarToast(`Arquivo "${arquivo.nome_arquivo}.txt" baixado`);
  }, [mostrarToast]);

  // ============================================
  // EDIÇÃO DE REGISTROS
  // ============================================
  const handleEditarRegistro = useCallback((reg: RegistroArquivo) => {
    setRegistroEditando(reg.id);
    setFormRegistro({
      pan: reg.pan,
      expiry_date: reg.expiry_date,
      tran_amount: reg.tran_amount.toString(),
      brl_amount: reg.brl_amount.toString(),
      tran_currency: reg.tran_currency,
      currency: reg.currency,
      merchant_name: reg.merchant_name,
      token: reg.token || '',
      nr_parcelas: reg.nr_parcelas ? reg.nr_parcelas.toString() : '',
    });
  }, []);

  const handleSalvarRegistro = useCallback(async (regId: string) => {
    if (!formRegistro.pan || formRegistro.pan.length !== 19) {
      mostrarToast('PAN deve ter 19 dígitos', 'erro'); return;
    }
    if (!formRegistro.expiry_date || formRegistro.expiry_date.length !== 4) {
      mostrarToast('Validade deve ter 4 dígitos (MMYY)', 'erro'); return;
    }
    if (!formRegistro.tran_amount || parseFloat(formRegistro.tran_amount) <= 0) {
      mostrarToast('Valor inválido', 'erro'); return;
    }
    if (!formRegistro.merchant_name.trim()) {
      mostrarToast('Merchant é obrigatório', 'erro'); return;
    }

    try {
      const { error } = await supabase
        .from('registros_arquivo')
        .update({
          pan: formRegistro.pan,
          expiry_date: formRegistro.expiry_date,
          tran_amount: parseFloat(formRegistro.tran_amount),
          brl_amount: parseFloat(formRegistro.brl_amount) || parseFloat(formRegistro.tran_amount),
          tran_currency: formRegistro.tran_currency,
          currency: formRegistro.currency,
          merchant_name: formRegistro.merchant_name.toUpperCase(),
          token: formRegistro.token.padStart(19, '0'),
          nr_parcelas: parseInt(formRegistro.nr_parcelas) || 0,
        })
        .eq('id', regId);

      if (error) throw error;

      setRegistros(prev => prev.map(r =>
        r.id === regId ? { ...r,
          pan: formRegistro.pan,
          expiry_date: formRegistro.expiry_date,
          tran_amount: parseFloat(formRegistro.tran_amount),
          brl_amount: parseFloat(formRegistro.brl_amount) || parseFloat(formRegistro.tran_amount),
          tran_currency: formRegistro.tran_currency,
          currency: formRegistro.currency,
          merchant_name: formRegistro.merchant_name.toUpperCase(),
          token: formRegistro.token.padStart(19, '0'),
          nr_parcelas: parseInt(formRegistro.nr_parcelas) || 0,
        } : r
      ));
      setRegistroEditando(null);
      mostrarToast('Registro atualizado!');
    } catch (err: any) {
      mostrarToast(err.message || 'Erro ao atualizar', 'erro');
    }
  }, [formRegistro, mostrarToast]);

  const handleExcluirRegistro = useCallback(async (regId: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      const { error } = await supabase.from('registros_arquivo').delete().eq('id', regId);
      if (error) throw error;

      setRegistros(prev => prev.filter(r => r.id !== regId));
      if (arquivoSelecionado) {
        setArquivos(prev => prev.map(a => 
          a.id === arquivoSelecionado.id 
            ? { ...a, quantidade_registros: a.quantidade_registros - 1 }
            : a
        ));
      }
      mostrarToast('Registro excluído', 'info');
    } catch (err: any) {
      mostrarToast(err.message || 'Erro ao excluir', 'erro');
    }
  }, [arquivoSelecionado, mostrarToast]);

  const handleCancelarEdicao = useCallback(() => {
    setRegistroEditando(null);
    setFormRegistro({
      pan: '', expiry_date: '', tran_amount: '', brl_amount: '',
      tran_currency: '986', currency: '986',
      merchant_name: '', token: '', nr_parcelas: '',
    });
  }, []);

  const getTemplateNome = useCallback((templateId: string) => {
    return templates.find(t => t.id === templateId)?.nome || templateId;
  }, [templates]);

  const getBadgeBandeira = (bandeira: string) => {
    const cores: Record<string, string> = {
      'Visa': 'bg-[#1A1F71] text-white',
      'Mastercard': 'bg-[#EB001B] text-white',
      'Elo': 'bg-[#00A4E0] text-white',
    };
    return cores[bandeira] || 'bg-[#D4D4CE] text-[#3C2E26]';
  };

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

      <main className="flex-1 flex flex-col max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-2 pb-1">

        {/* Título compacto */}
        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <h1 className="text-[#3C2E26] font-bold leading-tight" style={{ fontSize: 'clamp(2rem, 3.8vw, 2.7rem)' }}>
            Arquivos de Clearing
          </h1>
        </div>

        {/* Barra de filtros */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1.5 mb-1.5 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            <div className="relative">
              <input 
                ref={buscaRef}
                type="text" 
                value={busca} 
                onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }}
                placeholder="Buscar..." 
                aria-label="Buscar arquivos"
                className="h-7 pl-7 pr-2 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none focus:border-[#C4A484] focus:ring-1 focus:ring-[#C4A484]/20 w-[260px]" 
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
          </div>

          <div className="flex items-center gap-1.5">
            {algumSelecionado && (
              <button 
                onClick={handleExcluirEmLote}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-lg border border-[#EF4444] text-[#DC2626] hover:bg-[#FEE2E2] transition-colors text-sm font-medium"
                aria-label={`Excluir ${selecionados.size} arquivos`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Excluir ({selecionados.size})
              </button>
            )}
          </div>
        </div>

        {/* Tabela: SEM SCROLL INTERNO */}
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
                <th className="text-left px-2 text-[14px] font-semibold uppercase tracking-wider w-[35%] cursor-pointer select-none hover:bg-[#4a3a30] transition-colors" onClick={() => handleOrdenar('nome_arquivo')}>
                  <span className="flex items-center">Arquivo <OrdenacaoIcon coluna="nome_arquivo" /></span>
                </th>
                <th className="text-center px-2 text-[14px] font-semibold uppercase tracking-wider w-16 cursor-pointer select-none hover:bg-[#4a3a30] transition-colors" onClick={() => handleOrdenar('quantidade_registros')}>
                  <span className="flex items-center justify-center">Regs <OrdenacaoIcon coluna="quantidade_registros" /></span>
                </th>
                <th className="text-right px-2 text-[14px] font-semibold uppercase tracking-wider w-28">Valor Total</th>
                <th className="text-left px-2 text-[14px] font-semibold uppercase tracking-wider w-28 cursor-pointer select-none hover:bg-[#4a3a30] transition-colors" onClick={() => handleOrdenar('data_geracao')}>
                  <span className="flex items-center">Gerado em <OrdenacaoIcon coluna="data_geracao" /></span>
                </th>
                <th className="text-left px-2 text-[14px] font-semibold uppercase tracking-wider w-20">Usuário</th>
                <th className="w-14"></th>
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {carregando && Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={`sk-${i}`} />)}

              {/* Empty state */}
              {!carregando && arquivosPaginados.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center">
                    <div className="flex flex-col items-center gap-2 text-[#999999]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#D4D4CE]">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                      </svg>
                      <p className="text-sm font-medium text-[#3C2E26]">Nenhum arquivo encontrado</p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Dados */}
              {!carregando && arquivosPaginados.map(arquivo => (
                <tr key={arquivo.id} className="border-b border-[#EDE8E2] hover:bg-[#FDF8F3] transition-colors h-7">
                  <td className="px-2">
                    <Checkbox 
                      checked={selecionados.has(arquivo.id)} 
                      onChange={() => toggleSelecionado(arquivo.id)} 
                      ariaLabel={`Selecionar ${arquivo.nome_arquivo}`} 
                    />
                  </td>
                  <td className="px-2 font-medium text-[#1A1A1A] text-sm truncate max-w-[400px]" title={arquivo.nome_arquivo}>
                    <div className="flex items-center gap-1.5">
                      {arquivo.nome_arquivo}
                      {arquivosBaixados.has(arquivo.id) && (
                        <span className="flex-shrink-0" title="Arquivo baixado">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 text-center font-mono text-[#1A1A1A] text-[14px]">
                    {arquivo.quantidade_registros}
                  </td>
                  <td className="px-2 text-right font-mono text-[#1A1A1A] text-[14px]">
                    {arquivo.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-2 text-[#999999] text-[14px]">
                    {new Date(arquivo.data_geracao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-2 text-[#999999] text-[14px] font-mono">
                    {arquivo.usuario}
                  </td>
                  <td className="px-2">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => handleVerDetalhes(arquivo)}
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-[#999999] hover:text-[#C4A484] hover:bg-[#FDF8F3] transition-all"
                        title="Ver detalhes" aria-label="Ver detalhes"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                      <button 
                        onClick={() => handleBaixarTxtLista(arquivo)}
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-[#999999] hover:text-[#059669] hover:bg-[#D1FAE5] transition-all"
                        title="Baixar TXT" aria-label="Baixar TXT"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>
                      <button 
                        onClick={() => handleExcluirArquivo(arquivo)}
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-[#999999] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all"
                        title="Excluir arquivo" aria-label="Excluir arquivo"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação SIMPLES */}
          <div className="flex justify-between items-center px-4 py-1.5 border-t border-[#EDE8E2] shrink-0 bg-white">
            <span className="text-[14px] text-[#999999]">
              {arquivosFiltrados.length > 0 
                ? `${indiceInicio + 1}-${Math.min(indiceFim, arquivosFiltrados.length)} de ${arquivosFiltrados.length}`
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

      {/* Drawer de Detalhes */}
      {arquivoSelecionado && (
        <div className="fixed inset-0 z-[9997] flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleFecharDetalhes} />
          <div className="relative w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col animate-slideInRight">
            {/* Header do drawer */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#EDE8E2] shrink-0">
              <div>
                <h2 className="text-sm font-bold text-[#3C2E26]">{arquivoSelecionado.nome_arquivo}</h2>
                <p className="text-[10px] text-[#999999]">
                  {arquivoSelecionado.bandeira} · {getTemplateNome(arquivoSelecionado.template_id)} · {arquivoSelecionado.quantidade_registros} registros
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBaixarTxtDrawer(arquivoSelecionado, registros)}
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-[#D4D4CE] text-[#3C2E26] text-[10px] font-medium hover:bg-[#F5F5F0] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Baixar TXT
                </button>
                <button
                  onClick={() => setModoEdicao(!modoEdicao)}
                  className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-[10px] font-medium transition-colors ${
                    modoEdicao 
                      ? 'bg-[#3C2E26] text-white hover:bg-[#4a3a30]' 
                      : 'border border-[#D4D4CE] text-[#3C2E26] hover:bg-[#F5F5F0]'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {modoEdicao ? 'Concluir Edição' : 'Editar Registros'}
                </button>
                <button
                  onClick={handleFecharDetalhes}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[#999999] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* Tabela de registros do arquivo */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#F5F5F0] text-[#3C2E26] h-7 border-b border-[#EDE8E2]">
                    <th className="text-left px-2 text-[10px] font-semibold uppercase tracking-wider w-8">#</th>
                    <th className="text-left px-2 text-[10px] font-semibold uppercase tracking-wider w-[12%]">SIAIDCD</th>
                    <th className="text-left px-2 text-[10px] font-semibold uppercase tracking-wider w-12">Band.</th>
                    <th className="text-left px-2 text-[10px] font-semibold uppercase tracking-wider w-[14%]">PAN</th>
                    <th className="text-left px-2 text-[10px] font-semibold uppercase tracking-wider w-10">Val</th>
                    <th className="text-right px-2 text-[10px] font-semibold uppercase tracking-wider w-20">Tran Amt</th>
                    <th className="text-right px-2 text-[10px] font-semibold uppercase tracking-wider w-20">BRL Amt</th>
                    <th className="text-center px-2 text-[10px] font-semibold uppercase tracking-wider w-10">T.CCY</th>
                    <th className="text-center px-2 text-[10px] font-semibold uppercase tracking-wider w-10">CCY</th>
                    <th className="text-left px-2 text-[10px] font-semibold uppercase tracking-wider w-[12%]">Merchant</th>
                    <th className="text-left px-2 text-[10px] font-semibold uppercase tracking-wider w-28">Token</th>
                    <th className="text-center px-2 text-[10px] font-semibold uppercase tracking-wider w-10">Parc</th>
                    <th className="text-left px-2 text-[10px] font-semibold uppercase tracking-wider w-14">Audit.</th>
                    {modoEdicao && <th className="text-center px-2 text-[10px] font-semibold uppercase tracking-wider w-14"></th>}
                  </tr>
                </thead>
                <tbody>
                  {registros.length === 0 ? (
                    <tr>
                      <td colSpan={modoEdicao ? 15 : 14} className="py-8 text-center text-[#999999]">
                        <p className="text-xs">Nenhum registro neste arquivo</p>
                      </td>
                    </tr>
                  ) : (
                    registros.map((reg, idx) => (
                      <tr key={reg.id} className="border-b border-[#EDE8E2] hover:bg-[#FDF8F3] transition-colors h-7">
                        <td className="px-3 font-mono text-[#999999] text-[10px]">{reg.ordem}</td>

                        {registroEditando === reg.id && modoEdicao ? (
                          <>
                            <td className="px-2 py-0.5 text-[10px] font-mono text-[#999999]">{reg.siaidcd}</td>
                            <td className="px-2 py-0.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${getBadgeBandeira(reg.bandeira || '')}`}>{reg.bandeira || '-'}</span>
                            </td>
                            <td className="px-2 py-0.5">
                              <input value={formRegistro.pan} onChange={(e) => setFormRegistro({...formRegistro, pan: e.target.value.replace(/\D/g, '').slice(0,19)})} maxLength={19} autoFocus
                                className="w-full h-6 px-1.5 text-[10px] text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none font-mono focus:border-[#C4A484]" />
                            </td>
                            <td className="px-2 py-0.5">
                              <input value={formRegistro.expiry_date} onChange={(e) => setFormRegistro({...formRegistro, expiry_date: e.target.value.replace(/\D/g, '').slice(0,4)})} maxLength={4}
                                className="w-full h-6 px-1.5 text-[10px] text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none font-mono focus:border-[#C4A484]" />
                            </td>
                            <td className="px-2 py-0.5">
                              <input type="number" step="0.01" value={formRegistro.tran_amount}
                                onChange={(e) => { const v = e.target.value; setFormRegistro(prev => ({...prev, tran_amount: v, brl_amount: prev.brl_amount === prev.tran_amount ? v : prev.brl_amount})); }}
                                className="w-full h-6 px-1.5 text-[10px] text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none text-right font-mono focus:border-[#C4A484]" />
                            </td>
                            <td className="px-2 py-0.5">
                              <input type="number" step="0.01" value={formRegistro.brl_amount} onChange={(e) => setFormRegistro({...formRegistro, brl_amount: e.target.value})}
                                className="w-full h-6 px-1.5 text-[10px] text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none text-right font-mono focus:border-[#C4A484]" />
                            </td>
                            <td className="px-2 py-0.5">
                              <input value={formRegistro.tran_currency} onChange={(e) => setFormRegistro({...formRegistro, tran_currency: e.target.value.replace(/\D/g, '').slice(0,3)})} maxLength={3}
                                className="w-full h-6 px-1.5 text-[10px] text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none text-center font-mono focus:border-[#C4A484]" />
                            </td>
                            <td className="px-2 py-0.5">
                              <input value={formRegistro.currency} onChange={(e) => setFormRegistro({...formRegistro, currency: e.target.value.replace(/\D/g, '').slice(0,3)})} maxLength={3}
                                className="w-full h-6 px-1.5 text-[10px] text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none text-center font-mono focus:border-[#C4A484]" />
                            </td>
                            <td className="px-2 py-0.5">
                              <input value={formRegistro.merchant_name} onChange={(e) => setFormRegistro({...formRegistro, merchant_name: e.target.value.toUpperCase()})}
                                className="w-full h-6 px-1.5 text-[10px] text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none uppercase focus:border-[#C4A484]" />
                            </td>
                            <td className="px-2 py-0.5">
                              <input value={formRegistro.token} onChange={(e) => setFormRegistro({...formRegistro, token: e.target.value.replace(/\D/g, '').slice(0,19)})} maxLength={19}
                                className="w-full h-6 px-1.5 text-[10px] text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none font-mono focus:border-[#C4A484]" />
                            </td>
                            <td className="px-2 py-0.5">
                              <input value={formRegistro.nr_parcelas} onChange={(e) => setFormRegistro({...formRegistro, nr_parcelas: e.target.value.replace(/\D/g, '').slice(0,2)})} maxLength={2}
                                className="w-full h-6 px-1.5 text-[10px] text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none text-center font-mono focus:border-[#C4A484]" />
                            </td>
                            <td className="px-2 py-0.5 text-[10px] font-mono text-[#999999]">{reg.user_auditoria}</td>
                            <td className="px-2">
                              <div className="flex items-center justify-center gap-0.5">
                                <button onClick={() => handleSalvarRegistro(reg.id)} className="inline-flex items-center justify-center w-5 h-5 rounded text-[#059669] hover:bg-[#D1FAE5] transition-all" title="Confirmar">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                                </button>
                                <button onClick={handleCancelarEdicao} className="inline-flex items-center justify-center w-5 h-5 rounded text-[#999999] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all" title="Cancelar">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 font-mono text-[#6B5744] text-[10px] truncate max-w-[120px]">{reg.siaidcd}</td>
                            <td className="px-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${getBadgeBandeira(reg.bandeira || '')}`}>{reg.bandeira || '-'}</span>
                            </td>
                            <td className="px-2 font-mono text-[#1A1A1A] text-[10px] truncate max-w-[160px]">{reg.pan}</td>
                            <td className="px-2 font-mono text-[#6B5744] text-[10px]">{reg.expiry_date}</td>
                            <td className="px-2 text-right font-mono text-[#1A1A1A] text-[10px]">
                              {reg.tran_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-2 text-right font-mono text-[#1A1A1A] text-[10px]">
                              {(reg.brl_amount ?? reg.tran_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-2 text-center font-mono text-[#6B5744] text-[10px]">{reg.tran_currency}</td>
                            <td className="px-2 text-center font-mono text-[#6B5744] text-[10px]">{reg.currency}</td>
                            <td className="px-2 text-[#999999] text-[10px] truncate max-w-[130px]" title={reg.merchant_name}>{reg.merchant_name}</td>
                            <td className="px-2 font-mono text-[#6B5744] text-[10px] truncate max-w-[110px]" title={reg.token}>{reg.token || '—'}</td>
                            <td className="px-2 text-center font-mono text-[#6B5744] text-[10px]">{reg.nr_parcelas || '—'}</td>
                            <td className="px-2 font-mono text-[#999999] text-[10px]">{reg.user_auditoria}</td>
                            {modoEdicao && (
                              <td className="px-2">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button onClick={() => handleEditarRegistro(reg)} className="inline-flex items-center justify-center w-5 h-5 rounded text-[#999999] hover:text-[#C4A484] hover:bg-[#FDF8F3] transition-all" title="Editar">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </button>
                                  <button onClick={() => handleExcluirRegistro(reg.id)} className="inline-flex items-center justify-center w-5 h-5 rounded text-[#999999] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all" title="Excluir">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                  </button>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer do drawer */}
            <div className="flex items-center justify-between px-5 py-2 border-t border-[#EDE8E2] shrink-0 bg-[#FAFAF8]">
              <span className="text-[10px] text-[#999999]">
                Total: {registros.length} registros · {arquivoSelecionado.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <button
                onClick={() => handleExcluirArquivo(arquivoSelecionado)}
                className="inline-flex items-center gap-1 h-7 px-3 rounded-lg text-[10px] font-medium text-[#DC2626] hover:bg-[#FEE2E2] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                Excluir Arquivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
