import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { calculateDates } from '../lib/businessDays'

// ============================================================
// TIPOS
// ============================================================
type Status = 'planejado' | 'em_andamento' | 'concluido' | 'cancelado' | 'com_impedimento'

interface ProjetoRow {
  id: string
  projeto: string
  nome: string
  status: Status
}

interface CronogramaItem {
  id: string
  projeto_id: string
  nome: string
  duracao_dias_uteis: number
  data_inicio_manual: string | null
  percentual: number
  ordem: number
}

interface FaseInfo {
  dataFim: string | null
  percentual: number
}

// projetoId → faseNomeNorm → FaseInfo
type PainelMap = Record<string, Record<string, FaseInfo>>

// ============================================================
// CONSTANTES
// ============================================================
const FASES = [
  'Preparado', 'Requisitos', 'Estruturar', 'Impedimento',
  'Codificar', 'Executar', 'Apresentação', 'Pronto',
  'Aceite', 'Esteira', 'Produção', 'Sprint',
] as const

const STATUS_COLORS: Record<Status, string> = {
  planejado:       'bg-blue-50 text-blue-600',
  em_andamento:    'bg-amber-50 text-amber-600',
  concluido:       'bg-green-50 text-green-700',
  cancelado:       'bg-red-50 text-red-600',
  com_impedimento: 'bg-orange-50 text-orange-600',
}

const STATUS_LABEL: Record<Status, string> = {
  planejado:       'Planejado',
  em_andamento:    'Em Andamento',
  concluido:       'Concluído',
  cancelado:       'Cancelado',
  com_impedimento: 'Impedimento',
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function formatDDMM(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

// ============================================================
// COMPONENTE
// ============================================================
export default function EtapasProjetos() {
  const [projetos, setProjetos] = useState<ProjetoRow[]>([])
  const [painel, setPainel]     = useState<PainelMap>({})
  const [loading, setLoading]   = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: pjs } = await supabase
      .from('projetos')
      .select('id, projeto, nome, status')
      .order('projeto')

    if (!pjs || pjs.length === 0) { setLoading(false); return }

    const projetoIds = pjs.map((p: ProjetoRow) => p.id)

    const [{ data: itens }, { data: deps }] = await Promise.all([
      supabase
        .from('cronograma_itens')
        .select('id, projeto_id, nome, duracao_dias_uteis, data_inicio_manual, percentual, ordem')
        .in('projeto_id', projetoIds)
        .order('ordem'),
      supabase
        .from('cronograma_dependencias')
        .select('item_id, depende_de'),
    ])

    const todosItens = (itens ?? []) as CronogramaItem[]
    const todasDeps  = (deps ?? []) as { item_id: string; depende_de: string }[]

    // monta mapa de dependências
    const depsMap: Record<string, string[]> = {}
    for (const dep of todasDeps) {
      if (!depsMap[dep.item_id]) depsMap[dep.item_id] = []
      depsMap[dep.item_id].push(dep.depende_de)
    }

    const result: PainelMap = {}

    for (const pj of pjs as ProjetoRow[]) {
      const itensProj = todosItens.filter(i => i.projeto_id === pj.id)

      const datas = calculateDates(
        itensProj.map(i => ({
          id: i.id,
          duracao_dias_uteis: i.duracao_dias_uteis,
          data_inicio_manual: i.data_inicio_manual,
          dependencias: depsMap[i.id] ?? [],
        }))
      )

      result[pj.id] = {}
      for (const item of itensProj) {
        const key = norm(item.nome)
        const dr  = datas[item.id]
        result[pj.id][key] = {
          dataFim:    dr?.fim ?? null,
          percentual: item.percentual,
        }
      }
    }

    setProjetos(pjs as ProjetoRow[])
    setPainel(result)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const todayStr = today()

  // ============================================================
  // CÉLULA
  // ============================================================
  function renderCell(projetoId: string, fase: string) {
    const info = painel[projetoId]?.[norm(fase)]

    if (!info || (!info.dataFim && info.percentual === 0)) {
      return <span className="text-[#D4D4CE] text-[11px]">—</span>
    }

    const { dataFim, percentual } = info
    const atrasada = dataFim ? dataFim < todayStr && percentual < 100 : false
    const concluida = percentual === 100
    const emAndamento = percentual > 0 && percentual < 100

    let bg = 'bg-[#F5F0EB] text-[#9B8B7E]'
    if (concluida)   bg = 'bg-green-100 text-green-700'
    if (emAndamento) bg = 'bg-amber-100 text-amber-700'
    if (atrasada)    bg = 'bg-red-100 text-red-600'

    return (
      <div className={`inline-flex flex-col items-center rounded px-1 py-0.5 ${bg}`}>
        {dataFim && (
          <span className="text-[11px] font-semibold leading-tight">{formatDDMM(dataFim)}</span>
        )}
        <span className="text-[9px] leading-tight opacity-75">{percentual}%</span>
      </div>
    )
  }

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">
      <main className="flex-1 flex flex-col max-w-[1600px] w-full mx-auto px-4 sm:px-6 pt-2 pb-2 overflow-hidden">

        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <h1 className="text-[#3C2E26] font-bold leading-tight" style={{ fontSize: 'clamp(2rem, 3.8vw, 2.7rem)' }}>
            Painel de Projetos
          </h1>

          <div className="flex items-center gap-4 text-xs text-[#9B8B7E]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300 inline-block" />concluída
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-300 inline-block" />em andamento
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-300 inline-block" />atrasada
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto border border-[#EDE8E2] rounded-xl">
          <table className="border-collapse" style={{ minWidth: 'max-content', width: '100%' }}>
            <thead style={{ overflow: 'visible' }}>
              <tr style={{ overflow: 'visible' }}>
                {/* Coluna projeto — sticky */}
                <th
                  className="sticky left-0 z-20 bg-[#3C2E26] text-left text-white border-r border-white/20"
                  style={{ minWidth: '260px', height: '150px', verticalAlign: 'bottom', padding: '0 12px 12px' }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Projeto</span>
                </th>

                {/* Cabeçalhos diagonais */}
                {FASES.map(fase => (
                  <th
                    key={fase}
                    className="bg-[#3C2E26] border-r border-white/10"
                    style={{ width: '56px', minWidth: '56px', height: '150px', position: 'relative', verticalAlign: 'bottom', padding: 0, overflow: 'visible' }}
                  >
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '50%',
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'left bottom',
                      whiteSpace: 'nowrap',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.85)',
                      letterSpacing: '0.02em',
                    }}>
                      {fase}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#EDE8E2]">
                  <td className="sticky left-0 bg-white px-3 py-2.5 border-r border-[#EDE8E2]">
                    <div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse w-48 mb-1.5" />
                    <div className="h-2.5 bg-[#EDE8E2] rounded animate-pulse w-20" />
                  </td>
                  {FASES.map(f => (
                    <td key={f} className="border-r border-[#EDE8E2] py-2.5 text-center">
                      <div className="h-7 w-10 bg-[#EDE8E2] rounded animate-pulse mx-auto" />
                    </td>
                  ))}
                </tr>
              ))}

              {!loading && projetos.length === 0 && (
                <tr>
                  <td colSpan={FASES.length + 1} className="px-4 py-12 text-center text-sm text-[#9B8B7E]">
                    Nenhum projeto com cronograma cadastrado.
                  </td>
                </tr>
              )}

              {projetos.map((p, idx) => (
                <tr
                  key={p.id}
                  className={`border-b border-[#EDE8E2] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FDFAF7]'}`}
                >
                  <td
                    className="sticky left-0 z-10 px-3 py-2 border-r border-[#EDE8E2]"
                    style={{ background: idx % 2 === 0 ? 'white' : '#FDFAF7' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-[13px] text-[#2D2D2D] leading-snug truncate">{p.nome}</div>
                        <div className="text-[10px] text-[#9B8B7E] font-mono mt-0.5">{p.projeto}</div>
                      </div>
                      <span className={`shrink-0 inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </div>
                  </td>

                  {FASES.map(fase => (
                    <td
                      key={fase}
                      className="border-r border-[#EDE8E2] text-center"
                      style={{ width: '52px', minWidth: '52px', padding: '4px 2px' }}
                    >
                      {renderCell(p.id, fase)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="shrink-0 pt-1.5 text-xs text-[#9B8B7E]">
            {projetos.length} projeto{projetos.length !== 1 ? 's' : ''} · datas calculadas pelo cronograma
          </div>
        )}
      </main>
    </div>
  )
}
