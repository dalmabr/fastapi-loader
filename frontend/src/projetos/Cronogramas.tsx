import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { calculateDates, wouldCreateCycle, formatBR } from '../lib/businessDays'

// ============================================================
// TIPOS
// ============================================================
type Status = 'planejado' | 'em_andamento' | 'concluido' | 'cancelado' | 'com_impedimento'

interface Projeto {
  id: string
  projeto: string
  nome: string
  status: Status
}

interface Profile {
  id: string
  email: string
}

interface LocalItem {
  id: string
  nome: string
  duracao_dias_uteis: number
  data_inicio_manual: string
  responsavel: string
  percentual: number
  ordem: number
  dependencias: string[]
  isNew: boolean
}

interface Toast {
  id: number
  mensagem: string
  tipo: 'sucesso' | 'erro'
}

// ============================================================
// CONSTANTES
// ============================================================
const ETAPAS_SUGERIDAS = [
  'Preparado', 'Requisitos', 'Estruturar', 'Codificar',
  'Executar', 'Pronto', 'Aceite', 'Esteira', 'Produção',
]

const STATUS_LABEL: Record<Status, string> = {
  planejado: 'Planejado', em_andamento: 'Em Andamento',
  concluido: 'Concluído', cancelado: 'Cancelado', com_impedimento: 'Com Impedimento',
}

const STATUS_COLORS: Record<Status, string> = {
  planejado:       'bg-blue-100 text-blue-700',
  em_andamento:    'bg-amber-100 text-amber-700',
  concluido:       'bg-green-100 text-green-700',
  cancelado:       'bg-red-100 text-red-700',
  com_impedimento: 'bg-orange-100 text-orange-700',
}

let toastCounter = 0
let localIdCounter = 0
function newLocalId() { return `local-${++localIdCounter}` }

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function Cronogramas() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const projetoId = params.get('id')

  const [projeto, setProjeto]       = useState<Projeto | null>(null)
  const [itens, setItens]           = useState<LocalItem[]>([])
  const [deletedIds, setDeletedIds] = useState<string[]>([])   // ids de DB excluídos localmente
  const [profiles, setProfiles]     = useState<Profile[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [toasts, setToasts]         = useState<Toast[]>([])
  const [openDep, setOpenDep]       = useState<string | null>(null)
  const depDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (depDropRef.current && !depDropRef.current.contains(e.target as Node)) setOpenDep(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const addToast = useCallback((mensagem: string, tipo: Toast['tipo']) => {
    const id = ++toastCounter
    setToasts(t => [...t, { id, mensagem, tipo }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  // --------------------------------------------------------
  // CARREGAMENTO
  // --------------------------------------------------------
  const loadData = useCallback(async (pid: string) => {
    setLoading(true)
    setDeletedIds([])  // reset ao recarregar
    const [{ data: pj }, { data: ci }, { data: cd }, { data: pr }] = await Promise.all([
      supabase.from('projetos').select('id, projeto, nome, status').eq('id', pid).single(),
      supabase.from('cronograma_itens').select('*').eq('projeto_id', pid).order('ordem'),
      supabase.from('cronograma_dependencias').select('item_id, depende_de'),
      supabase.from('profiles').select('id, email').order('email'),
    ])

    if (!pj) { setLoading(false); return }
    setProjeto(pj as Projeto)
    setProfiles((pr ?? []) as Profile[])

    const itemIds = new Set((ci ?? []).map((i: { id: string }) => i.id))
    const depsMap: Record<string, string[]> = {}
    for (const dep of (cd ?? []) as { item_id: string; depende_de: string }[]) {
      if (itemIds.has(dep.item_id) && itemIds.has(dep.depende_de)) {
        if (!depsMap[dep.item_id]) depsMap[dep.item_id] = []
        depsMap[dep.item_id].push(dep.depende_de)
      }
    }

    setItens((ci ?? []).map((i: {
      id: string; nome: string; duracao_dias_uteis: number;
      data_inicio_manual: string | null; responsavel: string | null;
      percentual: number; ordem: number
    }) => ({
      id: i.id, nome: i.nome, duracao_dias_uteis: i.duracao_dias_uteis,
      data_inicio_manual: i.data_inicio_manual ?? '',
      responsavel: i.responsavel ?? '', percentual: i.percentual,
      ordem: i.ordem, dependencias: depsMap[i.id] ?? [], isNew: false,
    })))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (projetoId) loadData(projetoId)
    else setLoading(false)
  }, [projetoId, loadData])

  // --------------------------------------------------------
  // CÁLCULO DE DATAS
  // --------------------------------------------------------
  const datas = useMemo(() => calculateDates(
    itens.map(i => ({
      id: i.id, duracao_dias_uteis: i.duracao_dias_uteis,
      data_inicio_manual: i.data_inicio_manual || null,
      dependencias: i.dependencias,
    }))
  ), [itens])

  // --------------------------------------------------------
  // EDIÇÃO LOCAL
  // --------------------------------------------------------
  function updateItem(id: string, patch: Partial<LocalItem>) {
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  function addEtapa() {
    const novaOrdem = itens.length ? Math.max(...itens.map(i => i.ordem)) + 1 : 0
    setItens(prev => [...prev, {
      id: newLocalId(), nome: '', duracao_dias_uteis: 1, data_inicio_manual: '',
      responsavel: '', percentual: 0, ordem: novaOrdem, dependencias: [], isNew: true,
    }])
  }

  function removeItem(id: string) {
    const item = itens.find(i => i.id === id)
    if (item && !item.isNew) {
      // Registra para deleção no banco ao salvar
      setDeletedIds(prev => [...prev, id])
    }
    setItens(prev => {
      const sem = prev.filter(i => i.id !== id)
      return sem.map(i => ({ ...i, dependencias: i.dependencias.filter(d => d !== id) }))
    })
  }

  function toggleDep(itemId: string, depId: string) {
    const item = itens.find(i => i.id === itemId)
    if (!item) return
    if (item.dependencias.includes(depId)) {
      updateItem(itemId, { dependencias: item.dependencias.filter(d => d !== depId) })
    } else {
      const allForCheck = itens.map(i =>
        i.id === itemId
          ? { id: i.id, dependencias: [...i.dependencias, depId] }
          : { id: i.id, dependencias: i.dependencias }
      )
      if (wouldCreateCycle(itemId, depId, allForCheck)) {
        addToast('Esta dependência criaria um ciclo.', 'erro'); return
      }
      updateItem(itemId, { dependencias: [...item.dependencias, depId] })
    }
  }

  // --------------------------------------------------------
  // SALVAR
  // --------------------------------------------------------
  async function salvar() {
    if (!projetoId) return

    if (itens.some(i => !i.nome.trim())) {
      addToast('Todas as etapas precisam de um nome.', 'erro'); return
    }
    const semData = itens.filter(i => i.dependencias.length === 0 && !i.data_inicio_manual)
    if (semData.length) {
      addToast(`Etapas sem predecessores precisam de data de início: ${semData.map(i => i.nome || 'sem nome').join(', ')}`, 'erro')
      return
    }

    setSaving(true)

    // 1. Deleta do banco os itens removidos localmente
    if (deletedIds.length) {
      const { error } = await supabase.from('cronograma_itens').delete().in('id', deletedIds)
      if (error) { addToast('Erro ao remover etapas excluídas.', 'erro'); setSaving(false); return }
    }

    // 2. Insere itens novos e mapeia localId → realId
    const novos = itens.filter(i => i.isNew)
    const existentes = itens.filter(i => !i.isNew)
    const idMap: Record<string, string> = {}

    for (const item of novos) {
      const { data, error } = await supabase
        .from('cronograma_itens')
        .insert({
          projeto_id: projetoId, nome: item.nome.trim(),
          duracao_dias_uteis: item.duracao_dias_uteis,
          data_inicio_manual: item.data_inicio_manual || null,
          responsavel: item.responsavel || null,
          percentual: item.percentual, ordem: item.ordem,
        })
        .select('id').single()
      if (error || !data) { addToast('Erro ao salvar novas etapas.', 'erro'); setSaving(false); return }
      idMap[item.id] = data.id
    }

    // 3. Atualiza itens existentes
    for (const item of existentes) {
      const { error } = await supabase
        .from('cronograma_itens')
        .update({
          nome: item.nome.trim(), duracao_dias_uteis: item.duracao_dias_uteis,
          data_inicio_manual: item.data_inicio_manual || null,
          responsavel: item.responsavel || null,
          percentual: item.percentual, ordem: item.ordem,
        })
        .eq('id', item.id)
      if (error) { addToast('Erro ao atualizar etapas.', 'erro'); setSaving(false); return }
    }

    // 4. Reconstrói dependências (delete + insert)
    function realId(id: string) { return idMap[id] ?? id }
    const todosIds = itens.map(i => realId(i.id))
    if (todosIds.length) {
      await supabase.from('cronograma_dependencias').delete().in('item_id', todosIds)
    }
    const depsParaInserir = itens.flatMap(item =>
      item.dependencias.map(depId => ({ item_id: realId(item.id), depende_de: realId(depId) }))
    )
    if (depsParaInserir.length) {
      const { error } = await supabase.from('cronograma_dependencias').insert(depsParaInserir)
      if (error) { addToast('Erro ao salvar dependências.', 'erro'); setSaving(false); return }
    }

    addToast('Cronograma salvo.', 'sucesso')
    setSaving(false)
    loadData(projetoId)
  }

  // --------------------------------------------------------
  // SEM ID → SELETOR
  // --------------------------------------------------------
  if (!projetoId) {
    return <ProjetoSeletor onSelect={id => navigate(`/projetos/cronogramas?id=${id}`)} />
  }

  // --------------------------------------------------------
  // RENDER
  // --------------------------------------------------------
  const inputCls = 'w-full h-6 px-1.5 text-xs text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none focus:border-[#C4A484] focus:ring-1 focus:ring-[#C4A484]/20'

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">

      {/* Toasts */}
      <div className="fixed top-14 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium ${
            t.tipo === 'sucesso' ? 'bg-[#D1FAE5] text-[#065F46] border border-[#10B981]' : 'bg-[#FEE2E2] text-[#991B1B] border border-[#EF4444]'
          }`}>
            {t.tipo === 'sucesso'
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>}
            {t.mensagem}
          </div>
        ))}
      </div>

      <main className="flex-1 flex flex-col max-w-[1400px] w-full mx-auto px-4 sm:px-6 pt-2 pb-1">

        {/* Cabeçalho */}
        <div className="flex items-start justify-between mb-1.5 shrink-0">
          <div>
            <button
              onClick={() => navigate('/projetos')}
              className="text-xs text-[#9B8B7E] hover:text-[#3C2E26] mb-0.5 flex items-center gap-1 transition-colors"
            >
              ← Projetos
            </button>
            {loading ? (
              <div className="h-8 w-64 bg-[#EDE8E2] rounded animate-pulse" />
            ) : projeto ? (
              <>
                <h1 className="text-[#3C2E26] font-bold leading-tight" style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)' }}>
                  {projeto.nome}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#9B8B7E] font-mono">{projeto.projeto}</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[projeto.status]}`}>
                    {STATUS_LABEL[projeto.status]}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-[#9B8B7E]">Projeto não encontrado.</p>
            )}
          </div>

          {!loading && projeto && (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={addEtapa}
                className="inline-flex items-center gap-1.5 h-7 px-3 text-sm border border-[#D4D4CE] text-[#3C2E26] rounded-lg hover:bg-[#F5F0EB] transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                Etapa
              </button>
              <button
                onClick={salvar}
                disabled={saving || itens.length === 0}
                className="h-7 px-4 bg-[#3C2E26] text-white text-sm rounded-lg hover:bg-[#5C4A3E] disabled:opacity-40 transition-colors"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}
        </div>

        {loading && <div className="text-sm text-[#9B8B7E]">Carregando cronograma...</div>}

        {!loading && projeto && (
          itens.length === 0 ? (
            <div className="flex-1 flex items-center justify-center border border-dashed border-[#C8BEB6] rounded-xl">
              <div className="text-center">
                <p className="text-[#9B8B7E] text-sm mb-3">Nenhuma etapa cadastrada.</p>
                <button onClick={addEtapa}
                  className="h-7 px-4 bg-[#3C2E26] text-white text-sm rounded-lg hover:bg-[#5C4A3E] transition-colors">
                  + Adicionar primeira etapa
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-white border border-[#EDE8E2] rounded-xl overflow-hidden" ref={depDropRef}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#3C2E26] text-white h-7">
                    <th className="text-left px-3 text-[13px] font-semibold uppercase tracking-wider w-44">Etapa</th>
                    <th className="text-center px-3 text-[13px] font-semibold uppercase tracking-wider w-24">Dias úteis</th>
                    <th className="text-left px-3 text-[13px] font-semibold uppercase tracking-wider w-56">Depende de</th>
                    <th className="text-left px-3 text-[13px] font-semibold uppercase tracking-wider w-36">Data início</th>
                    <th className="text-left px-3 text-[13px] font-semibold uppercase tracking-wider w-28">Data fim</th>
                    <th className="text-left px-3 text-[13px] font-semibold uppercase tracking-wider w-44">Responsável</th>
                    <th className="text-center px-3 text-[13px] font-semibold uppercase tracking-wider w-16">%</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {itens.map(item => {
                    const dr = datas[item.id]
                    const isRoot = item.dependencias.length === 0
                    const outros = itens.filter(i => i.id !== item.id)

                    return (
                      <tr key={item.id} className="border-b border-[#EDE8E2] hover:bg-[#FDFAF7] transition-colors">

                        {/* Nome */}
                        <td className="px-2 py-1">
                          <input
                            list="etapas-lista"
                            className={inputCls}
                            value={item.nome}
                            onChange={e => updateItem(item.id, { nome: e.target.value })}
                            placeholder="Nome da etapa"
                          />
                        </td>

                        {/* Dias úteis */}
                        <td className="px-2 py-1">
                          <input
                            type="number" min={1}
                            className={`${inputCls} text-center`}
                            value={item.duracao_dias_uteis}
                            onChange={e => updateItem(item.id, { duracao_dias_uteis: Math.max(1, parseInt(e.target.value) || 1) })}
                          />
                        </td>

                        {/* Depende de */}
                        <td className="px-2 py-1">
                          <div className="relative">
                            <div className="flex flex-wrap gap-1 items-center min-h-6">
                              {item.dependencias.map(depId => {
                                const dep = itens.find(i => i.id === depId)
                                return dep ? (
                                  <span key={depId} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#EDE8E2] text-[#3C2E26] rounded text-xs">
                                    {dep.nome || <em className="text-[#9B8B7E]">sem nome</em>}
                                    <button onClick={() => toggleDep(item.id, depId)} className="ml-0.5 text-[#9B8B7E] hover:text-red-500 leading-none">×</button>
                                  </span>
                                ) : null
                              })}
                              {outros.length > 0 && (
                                <button
                                  onClick={() => setOpenDep(openDep === item.id ? null : item.id)}
                                  className="px-1.5 py-0.5 text-xs border border-dashed border-[#C8BEB6] text-[#9B8B7E] rounded hover:border-[#C4A484] hover:text-[#3C2E26] transition-colors"
                                >
                                  {item.dependencias.length === 0 ? '+ dependência' : '+'}
                                </button>
                              )}
                            </div>

                            {openDep === item.id && (
                              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#EDE8E2] rounded-lg shadow-lg z-30 py-1 max-h-48 overflow-y-auto">
                                {outros.map(outro => (
                                  <label key={outro.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#F5F0EB] cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={item.dependencias.includes(outro.id)}
                                      onChange={() => toggleDep(item.id, outro.id)}
                                      className="accent-[#3C2E26]"
                                    />
                                    <span className="text-xs text-[#2D2D2D]">
                                      {outro.nome || <em className="text-[#9B8B7E]">sem nome</em>}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Data início */}
                        <td className="px-2 py-1">
                          {isRoot ? (
                            <input
                              type="date"
                              className={inputCls}
                              value={item.data_inicio_manual}
                              onChange={e => updateItem(item.id, { data_inicio_manual: e.target.value })}
                            />
                          ) : (
                            <span className={`text-xs ${dr ? 'text-[#2D2D2D]' : 'text-[#C8BEB6]'}`}>
                              {dr ? formatBR(dr.inicio) : '—'}
                            </span>
                          )}
                        </td>

                        {/* Data fim */}
                        <td className="px-2 py-1">
                          <span className={`text-xs ${dr ? 'text-[#2D2D2D]' : 'text-[#C8BEB6]'}`}>
                            {dr ? formatBR(dr.fim) : '—'}
                          </span>
                        </td>

                        {/* Responsável */}
                        <td className="px-2 py-1">
                          <select
                            className={`${inputCls} appearance-none`}
                            value={item.responsavel}
                            onChange={e => updateItem(item.id, { responsavel: e.target.value })}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '16px' }}
                          >
                            <option value="">—</option>
                            {profiles.map(p => <option key={p.id} value={p.id}>{p.email}</option>)}
                          </select>
                        </td>

                        {/* Percentual */}
                        <td className="px-2 py-1">
                          <input
                            type="number" min={0} max={100}
                            className={`${inputCls} text-center`}
                            value={item.percentual}
                            onChange={e => updateItem(item.id, { percentual: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                          />
                        </td>

                        {/* Excluir */}
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-[#C8BEB6] hover:text-red-500 transition-colors"
                            title="Remover etapa"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="mt-auto px-3 py-1.5 border-t border-[#EDE8E2] text-xs text-[#9B8B7E]">
                Etapas sem predecessores: informe a data de início manualmente. · Datas calculadas automaticamente (seg–sex).
              </div>
            </div>
          )
        )}
      </main>

      {/* datalist global */}
      <datalist id="etapas-lista">
        {ETAPAS_SUGERIDAS.map(e => <option key={e} value={e} />)}
      </datalist>
    </div>
  )
}

// ============================================================
// SELETOR DE PROJETO
// ============================================================
function ProjetoSeletor({ onSelect }: { onSelect: (id: string) => void }) {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.from('projetos').select('id, projeto, nome, status')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setProjetos((data ?? []) as Projeto[]); setLoading(false) })
  }, [])

  return (
    <div className="h-screen flex flex-col bg-white font-sans">
      <main className="flex-1 flex flex-col max-w-[800px] w-full mx-auto px-6 pt-2 pb-4">
        <h1 className="text-[#3C2E26] font-bold leading-tight mb-1" style={{ fontSize: 'clamp(2rem, 3.8vw, 2.7rem)' }}>
          Cronogramas
        </h1>
        <p className="text-sm text-[#9B8B7E] mb-4">Selecione um projeto para ver ou editar o cronograma.</p>

        {loading && <p className="text-sm text-[#9B8B7E]">Carregando...</p>}
        {!loading && projetos.length === 0 && (
          <p className="text-sm text-[#9B8B7E]">Nenhum projeto cadastrado.</p>
        )}

        <div className="flex flex-col gap-1.5">
          {projetos.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="flex items-center justify-between px-4 py-2.5 border border-[#EDE8E2] rounded-lg hover:bg-[#FDF8F3] hover:border-[#C4A484] text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-[#2D2D2D] text-sm">{p.nome}</span>
                <span className="font-mono text-xs text-[#9B8B7E]">{p.projeto}</span>
              </div>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                {STATUS_LABEL[p.status]}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
