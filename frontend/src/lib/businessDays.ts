// ============================================================
// businessDays.ts
// Cálculo de datas baseado em dias úteis (sem feriados, apenas seg-sex)
// e propagação via DAG (topological sort)
// ============================================================

export interface ItemForCalc {
  id: string
  duracao_dias_uteis: number
  data_inicio_manual: string | null  // YYYY-MM-DD; obrigatório quando dependencias está vazio
  dependencias: string[]             // ids dos predecessores
}

export interface DateRange {
  inicio: string  // YYYY-MM-DD
  fim: string     // YYYY-MM-DD
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

// Avança N dias úteis a partir de `start` (sem contar o próprio start)
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start)
  let remaining = days
  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    if (!isWeekend(result)) remaining--
  }
  return result
}

// Próximo dia útil após `date` (não inclui o próprio date)
function nextWorkDay(date: Date): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  while (isWeekend(next)) next.setDate(next.getDate() + 1)
  return next
}

function toDate(iso: string): Date {
  return new Date(iso + 'T12:00:00')
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

// Verifica se adicionar `newDep` a `targetId` criaria um ciclo
export function wouldCreateCycle(
  targetId: string,
  newDep: string,
  allItems: { id: string; dependencias: string[] }[]
): boolean {
  const map = new Map(allItems.map(i => [i.id, i.dependencias]))
  // Verifica se targetId é alcançável a partir de newDep
  const visited = new Set<string>()
  function dfs(id: string): boolean {
    if (id === targetId) return true
    if (visited.has(id)) return false
    visited.add(id)
    for (const dep of map.get(id) ?? []) {
      if (dfs(dep)) return true
    }
    return false
  }
  return dfs(newDep)
}

// Calcula datas de início e fim para todos os itens via ordenação topológica
export function calculateDates(itens: ItemForCalc[]): Record<string, DateRange | null> {
  const result: Record<string, DateRange | null> = {}
  const done = new Set<string>()
  const map = new Map(itens.map(i => [i.id, i]))

  function calc(id: string, stack: Set<string>): void {
    if (done.has(id)) return
    if (stack.has(id)) {
      result[id] = null  // ciclo detectado
      done.add(id)
      return
    }

    const item = map.get(id)
    if (!item) { result[id] = null; done.add(id); return }

    const nextStack = new Set(stack)
    nextStack.add(id)

    for (const depId of item.dependencias) calc(depId, nextStack)

    let inicio: Date

    if (item.dependencias.length === 0) {
      if (!item.data_inicio_manual) {
        result[id] = null
        done.add(id)
        return
      }
      inicio = toDate(item.data_inicio_manual)
      // Garante que o início é dia útil
      while (isWeekend(inicio)) inicio.setDate(inicio.getDate() + 1)
    } else {
      let maxFim: Date | null = null
      for (const depId of item.dependencias) {
        const dep = result[depId]
        if (!dep) { result[id] = null; done.add(id); return }
        const d = toDate(dep.fim)
        if (!maxFim || d > maxFim) maxFim = d
      }
      inicio = nextWorkDay(maxFim!)
    }

    const fim = item.duracao_dias_uteis <= 1
      ? new Date(inicio)
      : addBusinessDays(inicio, item.duracao_dias_uteis - 1)

    result[id] = { inicio: fmtDate(inicio), fim: fmtDate(fim) }
    done.add(id)
  }

  for (const item of itens) calc(item.id, new Set())
  return result
}

export function formatBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}