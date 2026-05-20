import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
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

interface Registro {
  id: number;
  template_id: string;
  bandeira: string;
  siaidcd: string;
  pan: string;
  expiry_date: string;
  tran_amount: number;
  brl_amount: number;
  tran_currency: string;
  currency: string;
  merchant_name: string;
  token: string;
  nr_parcelas: number;
  user_auditoria: string;
}

interface Toast {
  id: number;
  mensagem: string;
  tipo: 'sucesso' | 'erro' | 'info';
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function GerarMainframe() {
  const { userCode, user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroBandeira, setFiltroBandeira] = useState("");
  const [filtroTemplate, setFiltroTemplate] = useState("");

  // Modal salvar arquivo
  const [modalSalvarAberto, setModalSalvarAberto] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Edição inline
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [incluindo, setIncluindo] = useState(false);
  const [form, setForm] = useState({
    template_id: '',
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
  const [errosForm, setErrosForm] = useState<{[key: string]: string}>({});

  const buscaRef = useRef<HTMLInputElement>(null);

  // ============================================
  // CARREGAR TEMPLATES DO SUPABASE
  // ============================================
  useEffect(() => {
    async function carregar() {
      try {
        const { data, error } = await supabase.from('templates').select('*').order('nome');
        if (!error && data) setTemplates(data as Template[]);
      } catch (err) {
        console.error('Erro:', err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const mostrarToast = useCallback((mensagem: string, tipo: Toast['tipo'] = 'sucesso') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, mensagem, tipo }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const templatesFiltradosPorBandeira = useMemo(() => {
    return templates.filter(t => !filtroBandeira || t.bandeira === filtroBandeira);
  }, [templates, filtroBandeira]);

  const templatesCombo = useMemo(() => {
    return templatesFiltradosPorBandeira.filter(t => {
      const matchBusca = !busca || t.nome.toLowerCase().includes(busca.toLowerCase()) || t.siaidcd.includes(busca);
      const matchTemplate = !filtroTemplate || t.id === filtroTemplate;
      return matchBusca && matchTemplate;
    });
  }, [templatesFiltradosPorBandeira, busca, filtroTemplate]);

  const templateSelecionado = useMemo(() => {
    return templates.find(t => t.id === filtroTemplate);
  }, [templates, filtroTemplate]);

  // ============================================
  // Auto-selecionar primeiro template quando bandeira muda
  // ============================================
  const handleMudarBandeira = useCallback((novaBandeira: string) => {
    setFiltroBandeira(novaBandeira);
    setFiltroTemplate('');

    if (novaBandeira) {
      const templatesDaBandeira = templates.filter(t => t.bandeira === novaBandeira);
      if (templatesDaBandeira.length > 0) {
        setFiltroTemplate(templatesDaBandeira[0].id);
      }
    }
  }, [templates]);

  // ============================================
  // FORMULÁRIO INLINE
  // ============================================
  const estaEditando = editandoId !== null || incluindo;
  const podeSalvar = form.pan && form.expiry_date && form.tran_amount && form.brl_amount && form.merchant_name;
  const resetForm = useCallback(() => {
    setForm({
      template_id: filtroTemplate || (templatesFiltradosPorBandeira[0]?.id ?? ''),
      pan: '', expiry_date: '', tran_amount: '', brl_amount: '',
      tran_currency: '986', currency: '986',
      merchant_name: '', token: '', nr_parcelas: '',
    });
    setEditandoId(null);
    setIncluindo(false);
    setErrosForm({});
  }, [filtroTemplate, templatesFiltradosPorBandeira]);

  const validarForm = useCallback((): boolean => {
    const erros: {[key: string]: string} = {};
    if (!form.template_id) erros.template_id = 'Selecione';
    if (!form.pan || form.pan.length !== 19) erros.pan = '19 dígitos obrigatórios';
    if (!form.expiry_date || form.expiry_date.length !== 4) erros.expiry_date = 'MMYY obrigatório';
    if (!form.tran_amount || parseFloat(form.tran_amount) <= 0) erros.tran_amount = 'Valor inválido';
    if (!form.merchant_name.trim()) erros.merchant_name = 'Obrigatório';
    setErrosForm(erros);
    return Object.keys(erros).length === 0;
  }, [form]);

  const handleIncluir = useCallback(() => {
    resetForm();
    setIncluindo(true);
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('[data-form-input="pan"]')?.focus();
    }, 50);
  }, [resetForm]);

  const handleEditar = useCallback((reg: Registro) => {
    setEditandoId(reg.id);
    setForm({
      template_id: reg.template_id,
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
    setIncluindo(false);
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('[data-form-input="pan"]')?.focus();
    }, 50);
  }, []);

  const handleDuplicar = useCallback((reg: Registro) => {
    if (estaEditando) {
      mostrarToast('Finalize a edição atual primeiro', 'erro');
      return;
    }
    const novoId = Date.now();
    const duplicado: Registro = {
      ...reg,
      id: novoId,
    };
    setRegistros(prev => [...prev, duplicado]);
    mostrarToast('Registro duplicado!');
  }, [estaEditando, mostrarToast]);

  const handleCancelar = useCallback(() => {
    resetForm();
    buscaRef.current?.focus();
  }, [resetForm]);

  const handleSalvar = useCallback(() => {
    if (!validarForm()) return;

    const tpl = templates.find(t => t.id === form.template_id);
    const dados: Registro = {
      id: incluindo ? Date.now() : editandoId!,
      template_id: form.template_id,
      bandeira: tpl?.bandeira || '',
      siaidcd: tpl?.siaidcd || '',
      pan: form.pan,
      expiry_date: form.expiry_date,
      tran_amount: parseFloat(form.tran_amount),
      brl_amount: parseFloat(form.brl_amount) || parseFloat(form.tran_amount),
      tran_currency: form.tran_currency,
      currency: form.currency,
      merchant_name: form.merchant_name.toUpperCase(),
      token: form.token.padStart(19, '0'),
      nr_parcelas: parseInt(form.nr_parcelas) || 0,
      user_auditoria: userCode ?? user?.email ?? 'CLRGUSR',
    };

    if (incluindo) {
      setRegistros(prev => [...prev, dados]);
      mostrarToast('Registro incluído!');
    } else if (editandoId !== null) {
      setRegistros(prev => prev.map(r => r.id === editandoId ? dados : r));
      mostrarToast('Registro alterado!');
    }
    resetForm();
  }, [form, incluindo, editandoId, validarForm, resetForm, mostrarToast, templates]);

  const handleExcluir = useCallback((id: number) => {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      setRegistros(prev => prev.filter(r => r.id !== id));
      mostrarToast('Registro excluído!', 'info');
    }
  }, [mostrarToast]);

  const handleKeyDownForm = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSalvar(); }
    else if (e.key === 'Escape') handleCancelar();
  }, [handleSalvar, handleCancelar]);

  // ============================================
  // SALVAR ARQUIVO NO SUPABASE
  // ============================================
  const abrirModalSalvar = useCallback(() => {
    if (registros.length === 0) {
      mostrarToast('Adicione pelo menos um registro', 'erro');
      return;
    }
    const semPan = registros.filter(r => !r.pan || r.pan.length !== 19);
    if (semPan.length > 0) {
      mostrarToast(`${semPan.length} registro(s) sem PAN preenchido. Complete antes de salvar.`, 'erro');
      return;
    }
    const sugerido = `transacoes_${new Date().toISOString().slice(0,10)}_${templateSelecionado?.bandeira?.toLowerCase() || 'mainframe'}`;
    setNomeArquivo(sugerido);
    setModalSalvarAberto(true);
  }, [registros, templateSelecionado, mostrarToast]);

  const handleSalvarArquivo = useCallback(async () => {
    if (!nomeArquivo.trim()) {
      mostrarToast('Informe um nome para o arquivo', 'erro');
      return;
    }
    if (!filtroTemplate || !templateSelecionado) {
      mostrarToast('Selecione um template', 'erro');
      return;
    }

    setSalvando(true);
    try {
      const { data: existente, error: erroBusca } = await supabase
        .from('arquivos_gerados')
        .select('id')
        .eq('nome_arquivo', nomeArquivo.trim())
        .eq('status', 'ativo')
        .maybeSingle();

      if (erroBusca) throw erroBusca;
      if (existente) {
        mostrarToast('Já existe um arquivo com este nome. Use um nome diferente.', 'erro');
        setSalvando(false);
        return;
      }

      const { data: arquivoData, error: arquivoError } = await supabase
        .from('arquivos_gerados')
        .insert({
          nome_arquivo: nomeArquivo.trim(),
          bandeira: templateSelecionado.bandeira,
          template_id: filtroTemplate,
          usuario: user?.email ?? 'CLRGUSR',
        })
        .select()
        .single();

      if (arquivoError || !arquivoData) {
        throw new Error(arquivoError?.message || 'Erro ao criar arquivo');
      }

      const now = new Date();
      const p2 = (n: number) => String(n).padStart(2, '0');
      const dataTransacao = p2(now.getDate()) + p2(now.getMonth() + 1) + String(now.getFullYear());
      const horaTransacao = p2(now.getHours()) + p2(now.getMinutes()) + p2(now.getSeconds());

      const registrosInsert = registros.map((reg, idx) => ({
        arquivo_id: arquivoData.id,
        siaidcd: reg.siaidcd,
        bandeira: reg.bandeira,
        pan: reg.pan,
        expiry_date: reg.expiry_date,
        tran_amount: reg.tran_amount,
        brl_amount: reg.brl_amount,
        tran_currency: reg.tran_currency,
        currency: reg.currency,
        merchant_name: reg.merchant_name,
        token: reg.token,
        nr_parcelas: reg.nr_parcelas,
        data_transacao: dataTransacao,
        hora_transacao: horaTransacao,
        user_auditoria: reg.user_auditoria,
        ordem: idx + 1,
      }));

      const { error: registrosError } = await supabase
        .from('registros_arquivo')
        .insert(registrosInsert);

      if (registrosError) {
        await supabase.from('arquivos_gerados').delete().eq('id', arquivoData.id);
        throw new Error(registrosError.message);
      }

      mostrarToast(`Arquivo "${nomeArquivo}" salvo com ${registros.length} registros!`);
      setRegistros([]);
      setModalSalvarAberto(false);
      setNomeArquivo('');
    } catch (err: any) {
      mostrarToast(err.message || 'Erro ao salvar arquivo', 'erro');
    } finally {
      setSalvando(false);
    }
  }, [nomeArquivo, filtroTemplate, templateSelecionado, registros, mostrarToast]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} role="alert"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-xs font-medium ${
              t.tipo === 'sucesso' ? 'bg-[#D1FAE5] text-[#065F46] border border-[#10B981]' : 
              t.tipo === 'erro' ? 'bg-[#FEE2E2] text-[#991B1B] border border-[#EF4444]' :
              'bg-[#DBEAFE] text-[#1E40AF] border border-[#3B82F6]'
            }`}>
            {t.tipo === 'sucesso' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            ) : t.tipo === 'erro' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            )}
            {t.mensagem}
          </div>
        ))}
      </div>

      {/* Modal Salvar Arquivo */}
      {modalSalvarAberto && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-5 border border-[#EDE8E2]">
            <h3 className="text-sm font-bold text-[#3C2E26] mb-3">Salvar Arquivo no Banco</h3>
            <p className="text-xs text-[#6B5744] mb-3">
              {registros.length} registros serão salvos. Confirme o nome do arquivo:
            </p>
            <input
              type="text"
              value={nomeArquivo}
              onChange={(e) => setNomeArquivo(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSalvarArquivo(); if (e.key === 'Escape') setModalSalvarAberto(false); }}
              className="w-full h-8 px-3 text-xs text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none focus:border-[#C4A484] focus:ring-1 focus:ring-[#C4A484]/20 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalSalvarAberto(false)}
                className="h-8 px-3 rounded-lg text-xs font-medium text-[#6B5744] hover:bg-[#F5F5F0] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarArquivo}
                disabled={salvando || !nomeArquivo.trim()}
                className="h-8 px-4 rounded-lg bg-[#3C2E26] text-white text-xs font-medium hover:bg-[#4a3a30] transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                {salvando ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-4 pb-4">

        {/* Título */}
        <h1 className="text-[#3C2E26] font-bold leading-tight mb-4 shrink-0" style={{ fontSize: 'clamp(2rem, 3.8vw, 2.7rem)' }}>
          Gerador de Transações
        </h1>

        {/* Linha de filtros */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <select
            value={filtroBandeira}
            onChange={(e) => handleMudarBandeira(e.target.value)}
            className="h-9 px-3 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none min-w-[140px] appearance-none cursor-pointer focus:border-[#C4A484]"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
          >
            <option value="">Todas Bandeiras</option>
            <option value="Visa">Visa</option>
            <option value="Mastercard">Mastercard</option>
            <option value="Elo">Elo</option>
          </select>

          <select
            value={filtroTemplate}
            onChange={(e) => setFiltroTemplate(e.target.value)}
            disabled={!filtroBandeira}
            className="h-9 px-3 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded-lg outline-none min-w-[220px] appearance-none cursor-pointer focus:border-[#C4A484] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '28px' }}
          >
            {filtroBandeira ? (
              templatesFiltradosPorBandeira.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))
            ) : (
              <option value="">Selecione uma bandeira</option>
            )}
          </select>

          <button
            onClick={handleIncluir}
            disabled={estaEditando || !filtroTemplate}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#C4A484] text-[#C4A484] hover:bg-[#FDF8F3] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:ring-1 focus:ring-[#C4A484]/30 focus:outline-none ml-1"
            title="Novo Registro"
            aria-label="Incluir novo registro"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>

        {/* Botão Salvar Arquivo */}
        <div className="flex justify-end mb-4 shrink-0">
          <button
            onClick={abrirModalSalvar}
            disabled={registros.length === 0}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-lg bg-[#3C2E26] text-white text-sm font-medium hover:bg-[#4a3a30] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Salvar Arquivo
          </button>
        </div>

        {/* Tabela de Registros */}
        <div className="flex-1 flex flex-col bg-white border border-[#EDE8E2] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE8E2] shrink-0">
            <h2 className="text-sm font-semibold text-[#3C2E26] uppercase tracking-wider">
              Registros ({registros.length})
            </h2>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#3C2E26] text-white h-10">
                <th className="text-left px-3 text-xs font-semibold uppercase tracking-wider w-[16%]">Template</th>
                <th className="text-left px-3 text-xs font-semibold uppercase tracking-wider w-[15%]">PAN</th>
                <th className="text-left px-3 text-xs font-semibold uppercase tracking-wider w-12">Val</th>
                <th className="text-right px-3 text-xs font-semibold uppercase tracking-wider w-24">Tran Amt</th>
                <th className="text-right px-3 text-xs font-semibold uppercase tracking-wider w-24">BRL Amt</th>
                <th className="text-center px-3 text-xs font-semibold uppercase tracking-wider w-12">T.CCY</th>
                <th className="text-center px-3 text-xs font-semibold uppercase tracking-wider w-10">CCY</th>
                <th className="text-left px-3 text-xs font-semibold uppercase tracking-wider w-[13%]">Merchant</th>
                <th className="text-left px-3 text-xs font-semibold uppercase tracking-wider w-36">Token</th>
                <th className="text-center px-3 text-xs font-semibold uppercase tracking-wider w-14">Parc</th>
                <th className="text-center px-3 text-xs font-semibold uppercase tracking-wider w-20"></th>
              </tr>
            </thead>
            <tbody>
              {(incluindo || editandoId !== null) && (
                <tr className="border-b border-[#EDE8E2] bg-[#FDF8F3] h-10" onKeyDown={handleKeyDownForm}>
                  <td className="px-2 py-1">
                    <select
                      value={form.template_id}
                      onChange={(e) => setForm({...form, template_id: e.target.value})}
                      data-form-input="template"
                      className={`w-full h-8 px-2 text-xs text-[#3C2E26] bg-white border rounded outline-none appearance-none cursor-pointer focus:border-[#C4A484] ${errosForm.template_id ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`}
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '18px' }}
                    >
                      <option value="">Selecione</option>
                      {templatesFiltradosPorBandeira.map(t => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input
                      data-form-input="pan"
                      value={form.pan}
                      onChange={(e) => setForm({...form, pan: e.target.value.replace(/\D/g, '').slice(0,19)})}
                      maxLength={19}
                      placeholder="0000000000000000000"
                      className={`w-full h-8 px-2 text-xs text-[#3C2E26] bg-white border rounded outline-none font-mono focus:border-[#C4A484] ${errosForm.pan ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`}
                      autoFocus
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={form.expiry_date}
                      onChange={(e) => setForm({...form, expiry_date: e.target.value.replace(/\D/g, '').slice(0,4)})}
                      maxLength={4}
                      placeholder="MMYY"
                      className={`w-full h-8 px-2 text-xs text-[#3C2E26] bg-white border rounded outline-none font-mono focus:border-[#C4A484] ${errosForm.expiry_date ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number" step="0.01"
                      value={form.tran_amount}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm(prev => ({ ...prev, tran_amount: v, brl_amount: prev.brl_amount === prev.tran_amount ? v : prev.brl_amount }));
                      }}
                      placeholder="0.00"
                      className={`w-full h-8 px-2 text-xs text-[#3C2E26] bg-white border rounded outline-none text-right font-mono focus:border-[#C4A484] ${errosForm.tran_amount ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number" step="0.01"
                      value={form.brl_amount}
                      onChange={(e) => setForm({...form, brl_amount: e.target.value})}
                      placeholder="0.00"
                      className={`w-full h-8 px-2 text-xs text-[#3C2E26] bg-white border rounded outline-none text-right font-mono focus:border-[#C4A484] ${errosForm.brl_amount ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={form.tran_currency}
                      onChange={(e) => setForm({...form, tran_currency: e.target.value.replace(/\D/g, '').slice(0,3)})}
                      maxLength={3} placeholder="986"
                      className="w-full h-8 px-2 text-xs text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none text-center font-mono focus:border-[#C4A484]"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={form.currency}
                      onChange={(e) => setForm({...form, currency: e.target.value.replace(/\D/g, '').slice(0,3)})}
                      maxLength={3} placeholder="986"
                      className="w-full h-8 px-2 text-xs text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none text-center font-mono focus:border-[#C4A484]"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={form.merchant_name}
                      onChange={(e) => setForm({...form, merchant_name: e.target.value.toUpperCase()})}
                      maxLength={50} placeholder="MERCHANT"
                      className={`w-full h-8 px-2 text-xs text-[#3C2E26] bg-white border rounded outline-none uppercase focus:border-[#C4A484] ${errosForm.merchant_name ? 'border-[#EF4444]' : 'border-[#D4D4CE]'}`}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={form.token}
                      onChange={(e) => setForm({...form, token: e.target.value.replace(/\D/g, '').slice(0,19)})}
                      maxLength={19} placeholder="0000000000000000000"
                      className="w-full h-8 px-2 text-xs text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none font-mono focus:border-[#C4A484]"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      value={form.nr_parcelas}
                      onChange={(e) => setForm({...form, nr_parcelas: e.target.value.replace(/\D/g, '').slice(0,2)})}
                      maxLength={2} placeholder="00"
                      className="w-full h-8 px-2 text-xs text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none text-center font-mono focus:border-[#C4A484]"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={handleSalvar} disabled={!podeSalvar}
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-[#059669] hover:bg-[#D1FAE5] transition-all disabled:opacity-40"
                        title="Confirmar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      </button>
                      <button onClick={handleCancelar}
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-[#999999] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all"
                        title="Cancelar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {registros.length === 0 && !estaEditando && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-[#999999]">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#D4D4CE]">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      </svg>
                      <p className="text-sm">Nenhum registro adicionado</p>
                    </div>
                  </td>
                </tr>
              )}

              {registros.map(reg => {
                const template = templates.find(t => t.id === reg.template_id);
                return (
                  <tr key={reg.id} className="border-b border-[#EDE8E2] hover:bg-[#FDF8F3] transition-colors h-10">
                    <td className="px-3 text-[#C4A484] text-xs font-medium truncate max-w-[180px]" title={template?.nome || '-'}>{template?.nome || '-'}</td>
                    <td className="px-3 font-mono text-[#6B5744] text-xs truncate max-w-[160px]">{reg.pan}</td>
                    <td className="px-3 font-mono text-[#6B5744] text-xs">{reg.expiry_date}</td>
                    <td className="px-3 text-right font-mono text-[#1A1A1A] text-xs">
                      {reg.tran_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-3 text-right font-mono text-[#1A1A1A] text-xs">
                      {reg.brl_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-3 text-center font-mono text-[#6B5744] text-xs">{reg.tran_currency}</td>
                    <td className="px-3 text-center font-mono text-[#6B5744] text-xs">{reg.currency}</td>
                    <td className="px-3 text-[#999999] text-xs truncate max-w-[130px]" title={reg.merchant_name}>{reg.merchant_name}</td>
                    <td className="px-3 font-mono text-[#6B5744] text-xs truncate max-w-[140px]" title={reg.token}>{reg.token || '—'}</td>
                    <td className="px-3 text-center font-mono text-[#6B5744] text-xs">{reg.nr_parcelas || '—'}</td>
                    <td className="px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleEditar(reg)} disabled={estaEditando}
                          className="inline-flex items-center justify-center w-6 h-6 rounded text-[#999999] hover:text-[#C4A484] hover:bg-[#FDF8F3] transition-all disabled:opacity-30"
                          title="Editar">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => handleDuplicar(reg)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded text-[#999999] hover:text-[#3B82F6] hover:bg-[#DBEAFE] transition-all"
                          title="Duplicar">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button onClick={() => handleExcluir(reg.id)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded text-[#999999] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all"
                          title="Excluir">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
