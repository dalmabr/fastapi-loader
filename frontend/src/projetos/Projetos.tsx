import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatBR } from '../lib/businessDays'

// ============================================================
// TIPOS
// ============================================================
type Status = 'planejado' | 'em_andamento' | 'concluido' | 'cancelado' | 'com_impedimento'

interface Projeto {
  id: string
  projeto: string
  nome: string
  status: Status
  responsavel: string | null
  data_apresentacao: string | null
  sprint: string | null
  created_at: string
}

interface Profile {
  id: string
  email: string
}

interface Toast {
  id: number
  mensagem: string
  tipo: 'sucesso' | 'erro'
}

interface EditData {
  projeto: string
  nome: string
  status: Status
  responsavel: string
  data_apresentacao: string
  sprint: string
}

// ============================================================
// HELPERS
// ============================================================
const STATUS_LABEL: Record<Status, string> = {
  planejado:       'Planejado',
  em_andamento:    'Em Andamento',
  concluido:       'Concluído',
  cancelado:       'Cancelado',
  com_impedimento: 'Com Impedimento',
}

const STATUS_COLORS: Record<Status, string> = {
  planejado:       'bg-blue-100 text-blue-700',
  em_andamento:    'bg-amber-100 text-amber-700',
  concluido:       'bg-green-100 text-green-700',
  cancelado:       'bg-red-100 text-red-700',
  com_impedimento: 'bg-orange-100 text-orange-700',
}

const EMPTY_EDIT: EditData = {
  projeto: '', nome: '', status: 'planejado',
  responsavel: '', data_apresentacao: '', sprint: '',
}

let toastCounter = 0

// ============================================================
// COMPONENTE
// ============================================================
export default function Projetos() {
  const navigate = useNavigate()
  const [projetos, setProjetos]   = useState<Projeto[]>([])
  const [profiles, setProfiles]   = useState<Profile[]>([])
  const [loading, setLoading]     = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData]   = useState<EditData>(EMPTY_EDIT)
  const [saving, setSaving]       = useState(false)
  const [toasts, setToasts]       = useState<Toast[]>([])

  const addToast = useCallback((mensagem: string, tipo: Toast['tipo']) => {
    const id = ++toastCounter
    setToasts(t => [...t, { id, mensagem, tipo }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: pj }, { data: pr }] = await Promise.all([
      supabase.from('projetos').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, email').order('email'),
    ])
    setProjetos((pj ?? []) as Projeto[])
    setProfiles((pr ?? []) as Profile[])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function startNew() { setEditingId('new'); setEditData(EMPTY_EDIT) }
  function startEdit(p: Projeto) {
    setEditingId(p.id)
    setEditData({
      projeto: p.projeto, nome: p.nome, status: p.status,
      responsavel: p.responsavel ?? '', data_apresentacao: p.data_apresentacao ?? '', sprint: p.sprint ?? '',
    })
  }
  function cancelEdit() { setEditingId(null); setEditData(EMPTY_EDIT) }

  async function saveEdit() {
    if (!editData.projeto.trim() || !editData.nome.trim()) {
      addToast('Código e nome são obrigatórios.', 'erro'); return
    }
    setSaving(true)
    const payload = {
      projeto: editData.projeto.trim(), nome: editData.nome.trim(), status: editData.status,
      responsavel: editData.responsavel || null,
      data_apresentacao: editData.data_apresentacao || null,
      sprint: editData.sprint.trim() || null,
    }
    if (editingId === 'new') {
      const { error } = await supabase.from('projetos').insert(payload)
      if (error) { addToast('Erro ao criar projeto.', 'erro'); setSaving(false); return }
      addToast('Projeto criado.', 'sucesso')
    } else {
      const { error } = await supabase.from('projetos').update(payload).eq('id', editingId)
      if (error) { addToast('Erro ao salvar.', 'erro'); setSaving(false); return }
      addToast('Projeto salvo.', 'sucesso')
    }
    setSaving(false); setEditingId(null); setEditData(EMPTY_EDIT); loadData()
  }

  async function deleteProjeto(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"? O cronograma associado também será removido.`)) return
    const { error } = await supabase.from('projetos').delete().eq('id', id)
    if (error) { addToast('Erro ao excluir.', 'erro'); return }
    addToast('Projeto excluído.', 'sucesso'); loadData()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  const emailById = (id: string | null) => profiles.find(p => p.id === id)?.email ?? '—'

  const inputCls = 'w-full h-6 px-1.5 text-sm text-[#3C2E26] bg-white border border-[#D4D4CE] rounded outline-none focus:border-[#C4A484] focus:ring-1 focus:ring-[#C4A484]/20'
  const selectCls = inputCls + ' appearance-none cursor-pointer'

  // --------------------------------------------------------
  // RENDER
  // --------------------------------------------------------
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
        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <h1 className="text-[#3C2E26] font-bold leading-tight" style={{ fontSize: 'clamp(2rem, 3.8vw, 2.7rem)' }}>
            Projetos
          </h1>
          <button
            onClick={startNew}
            disabled={editingId !== null}
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[#C4A484] text-[#C4A484] hover:bg-[#FDF8F3] transition-colors disabled:opacity-40"
            title="Novo Projeto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>

        {/* Tabela */}
        <div className="flex-1 flex flex-col bg-white border border-[#EDE8E2] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#3C2E26] text-white h-7">
                <th className="text-left px-3 text-[13px] font-semibold uppercase tracking-wider w-28">Código</th>
                <th className="text-left px-3 text-[13px] font-semibold uppercase tracking-wider">Nome</th>
                <th className="text-left px-3 text-[13px] font-semibold uppercase tracking-wider w-40">Status</th>
                <th className="text-left px-3 text-[13px] font-semibold uppercase tracking-wider w-28">Sprint</th>
                <th className="text-left px-3 text-[13px] font-semibold uppercase tracking-wider w-48">Responsável</th>
                <th className="text-left px-3 text-[13px] font-semibold uppercase tracking-wider w-32">Apresentação</th>
                <th className="w-36" />
              </tr>
            </thead>
            <tbody>
              {/* Linha nova */}
              {editingId === 'new' && (
                <tr className="border-b border-[#EDE8E2] bg-[#FDF8F3]">
                  <EditCells data={editData} profiles={profiles} inputCls={inputCls} selectCls={selectCls}
                    onChange={setEditData} onKey={handleKey} saving={saving} onSave={saveEdit} onCancel={cancelEdit} />
                </tr>
              )}

              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#EDE8E2]">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-3 py-1.5">
                      <div className="h-3.5 bg-[#EDE8E2] rounded animate-pulse" style={{ width: j === 0 ? '60%' : j === 6 ? '0' : '80%' }} />
                    </td>
                  ))}
                </tr>
              ))}

              {!loading && !projetos.length && editingId !== 'new' && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm text-[#9B8B7E]">
                    Nenhum projeto cadastrado.
                  </td>
                </tr>
              )}

              {projetos.map(p => (
                <tr key={p.id} className="border-b border-[#EDE8E2] hover:bg-[#FDFAF7] transition-colors">
                  {editingId === p.id ? (
                    <EditCells data={editData} profiles={profiles} inputCls={inputCls} selectCls={selectCls}
                      onChange={setEditData} onKey={handleKey} saving={saving} onSave={saveEdit} onCancel={cancelEdit} />
                  ) : (
                    <>
                      <td className="px-3 py-1.5 font-mono text-xs text-[#6B5A50]">{p.projeto}</td>
                      <td className="px-3 py-1.5 text-[#2D2D2D] font-medium">{p.nome}</td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-[#4A3A30] text-xs">{p.sprint ?? '—'}</td>
                      <td className="px-3 py-1.5 text-[#4A3A30] text-xs">{emailById(p.responsavel)}</td>
                      <td className="px-3 py-1.5 text-[#4A3A30] text-xs">{formatBR(p.data_apresentacao)}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => navigate(`/projetos/cronogramas?id=${p.id}`)}
                            disabled={editingId !== null}
                            className="text-xs text-[#C4A484] hover:text-[#3C2E26] disabled:opacity-40 transition-colors"
                          >
                            Cronograma
                          </button>
                          <button
                            onClick={() => startEdit(p)}
                            disabled={editingId !== null}
                            className="text-[#9B8B7E] hover:text-[#3C2E26] disabled:opacity-40 transition-colors"
                            title="Editar"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button
                            onClick={() => deleteProjeto(p.id, p.nome)}
                            disabled={editingId !== null}
                            className="text-[#9B8B7E] hover:text-red-500 disabled:opacity-40 transition-colors"
                            title="Excluir"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Rodapé */}
          {!loading && (
            <div className="mt-auto px-3 py-1.5 border-t border-[#EDE8E2] text-xs text-[#9B8B7E]">
              {projetos.length} projeto{projetos.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ============================================================
// CÉLULAS DE EDIÇÃO
// ============================================================
interface EditCellsProps {
  data: EditData
  profiles: Profile[]
  inputCls: string
  selectCls: string
  onChange: (d: EditData) => void
  onKey: (e: React.KeyboardEvent) => void
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

function EditCells({ data, profiles, inputCls, selectCls, onChange, onKey, saving, onSave, onCancel }: EditCellsProps) {
  const set = (field: keyof EditData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...data, [field]: e.target.value })

  return (
    <>
      <td className="px-2 py-1"><input className={inputCls} value={data.projeto} onChange={set('projeto')} onKeyDown={onKey} placeholder="Código" autoFocus /></td>
      <td className="px-2 py-1"><input className={inputCls} value={data.nome} onChange={set('nome')} onKeyDown={onKey} placeholder="Nome do projeto" /></td>
      <td className="px-2 py-1">
        <select className={selectCls} value={data.status} onChange={set('status')}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '16px' }}>
          <option value="planejado">Planejado</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
          <option value="com_impedimento">Com Impedimento</option>
        </select>
      </td>
      <td className="px-2 py-1"><input className={inputCls} value={data.sprint} onChange={set('sprint')} onKeyDown={onKey} placeholder="Sprint" /></td>
      <td className="px-2 py-1">
        <select className={selectCls} value={data.responsavel} onChange={set('responsavel')}
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '16px' }}>
          <option value="">— sem responsável —</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.email}</option>)}
        </select>
      </td>
      <td className="px-2 py-1"><input type="date" className={inputCls} value={data.data_apresentacao} onChange={set('data_apresentacao')} /></td>
      <td className="px-2 py-1">
        <div className="flex items-center justify-end gap-2">
          <button onClick={onSave} disabled={saving}
            className="h-6 px-3 bg-[#3C2E26] text-white text-xs rounded hover:bg-[#5C4A3E] disabled:opacity-40 transition-colors">
            {saving ? '...' : 'Salvar'}
          </button>
          <button onClick={onCancel} className="text-xs text-[#9B8B7E] hover:text-[#3C2E26] transition-colors">Cancelar</button>
        </div>
      </td>
    </>
  )
}
