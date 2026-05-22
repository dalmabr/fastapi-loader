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
  projeto: '',
  nome: '',
  status: 'planejado',
  responsavel: '',
  data_apresentacao: '',
  sprint: '',
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

  function startNew() {
    setEditingId('new')
    setEditData(EMPTY_EDIT)
  }

  function startEdit(p: Projeto) {
    setEditingId(p.id)
    setEditData({
      projeto:           p.projeto,
      nome:              p.nome,
      status:            p.status,
      responsavel:       p.responsavel ?? '',
      data_apresentacao: p.data_apresentacao ?? '',
      sprint:            p.sprint ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditData(EMPTY_EDIT)
  }

  async function saveEdit() {
    if (!editData.projeto.trim() || !editData.nome.trim()) {
      addToast('Código e nome são obrigatórios.', 'erro')
      return
    }
    setSaving(true)
    const payload = {
      projeto:           editData.projeto.trim(),
      nome:              editData.nome.trim(),
      status:            editData.status,
      responsavel:       editData.responsavel || null,
      data_apresentacao: editData.data_apresentacao || null,
      sprint:            editData.sprint.trim() || null,
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

    setSaving(false)
    setEditingId(null)
    setEditData(EMPTY_EDIT)
    loadData()
  }

  async function deleteProjeto(id: string, nome: string) {
    if (!confirm(`Excluir o projeto "${nome}"? Esta ação também remove o cronograma associado.`)) return
    const { error } = await supabase.from('projetos').delete().eq('id', id)
    if (error) { addToast('Erro ao excluir.', 'erro'); return }
    addToast('Projeto excluído.', 'sucesso')
    loadData()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter')  saveEdit()
    if (e.key === 'Escape') cancelEdit()
  }

  const emailById = (id: string | null) => profiles.find(p => p.id === id)?.email ?? '—'

  // --------------------------------------------------------
  // RENDER
  // --------------------------------------------------------
  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Toasts */}
      <div className="fixed top-14 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2.5 rounded shadow text-sm text-white ${t.tipo === 'sucesso' ? 'bg-green-600' : 'bg-red-600'}`}>
            {t.mensagem}
          </div>
        ))}
      </div>

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#3C2E26]">Projetos</h1>
          <p className="text-sm text-[#9B8B7E] mt-0.5">{projetos.length} projeto{projetos.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={startNew}
          disabled={editingId !== null}
          className="px-4 py-2 bg-[#3C2E26] text-white text-sm rounded hover:bg-[#5C4A3E] disabled:opacity-40 transition-colors"
        >
          + Novo Projeto
        </button>
      </div>

      {/* Tabela */}
      <div className="border border-[#EDE8E2] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F0EB]">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-[#6B5A50] w-28">Código</th>
              <th className="px-3 py-2.5 text-left font-medium text-[#6B5A50]">Nome</th>
              <th className="px-3 py-2.5 text-left font-medium text-[#6B5A50] w-40">Status</th>
              <th className="px-3 py-2.5 text-left font-medium text-[#6B5A50] w-28">Sprint</th>
              <th className="px-3 py-2.5 text-left font-medium text-[#6B5A50] w-44">Responsável</th>
              <th className="px-3 py-2.5 text-left font-medium text-[#6B5A50] w-32">Apresentação</th>
              <th className="px-3 py-2.5 text-right font-medium text-[#6B5A50] w-40">Ações</th>
            </tr>
          </thead>
          <tbody>
            {/* Linha nova */}
            {editingId === 'new' && (
              <tr className="border-b border-[#EDE8E2] bg-[#FDFAF7]">
                <EditCells
                  data={editData}
                  profiles={profiles}
                  onChange={d => setEditData(d)}
                  onKey={handleKey}
                  saving={saving}
                  onSave={saveEdit}
                  onCancel={cancelEdit}
                />
              </tr>
            )}

            {loading && !projetos.length && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-[#9B8B7E] text-sm">Carregando...</td></tr>
            )}

            {!loading && !projetos.length && editingId !== 'new' && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-[#9B8B7E] text-sm">Nenhum projeto cadastrado.</td></tr>
            )}

            {projetos.map(p => (
              <tr key={p.id} className="border-b border-[#EDE8E2] hover:bg-[#FDFAF7] transition-colors">
                {editingId === p.id ? (
                  <EditCells
                    data={editData}
                    profiles={profiles}
                    onChange={d => setEditData(d)}
                    onKey={handleKey}
                    saving={saving}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                  />
                ) : (
                  <>
                    <td className="px-3 py-2 text-[#2D2D2D] font-mono text-xs">{p.projeto}</td>
                    <td className="px-3 py-2 text-[#2D2D2D] font-medium">{p.nome}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[#4A3A30]">{p.sprint ?? '—'}</td>
                    <td className="px-3 py-2 text-[#4A3A30] text-xs">{emailById(p.responsavel)}</td>
                    <td className="px-3 py-2 text-[#4A3A30]">{formatBR(p.data_apresentacao)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/projetos/cronogramas?id=${p.id}`)}
                          className="px-2.5 py-1 text-xs rounded bg-[#EDE8E2] text-[#3C2E26] hover:bg-[#DDD8D2] transition-colors"
                        >
                          Cronograma
                        </button>
                        <button
                          onClick={() => startEdit(p)}
                          disabled={editingId !== null}
                          className="text-xs text-[#6B5A50] hover:text-[#3C2E26] disabled:opacity-40 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteProjeto(p.id, p.nome)}
                          disabled={editingId !== null}
                          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// SUB-COMPONENTE: células de edição (reutilizado para new + edit)
// ============================================================
interface EditCellsProps {
  data: EditData
  profiles: Profile[]
  onChange: (d: EditData) => void
  onKey: (e: React.KeyboardEvent) => void
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

function EditCells({ data, profiles, onChange, onKey, saving, onSave, onCancel }: EditCellsProps) {
  const set = (field: keyof EditData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...data, [field]: e.target.value })

  const inputCls = 'w-full px-2 py-1 border border-[#C8BEB6] rounded text-sm focus:outline-none focus:border-[#3C2E26]'

  return (
    <>
      <td className="px-2 py-1.5">
        <input className={inputCls} value={data.projeto} onChange={set('projeto')} onKeyDown={onKey} placeholder="Código" autoFocus />
      </td>
      <td className="px-2 py-1.5">
        <input className={inputCls} value={data.nome} onChange={set('nome')} onKeyDown={onKey} placeholder="Nome do projeto" />
      </td>
      <td className="px-2 py-1.5">
        <select className={inputCls} value={data.status} onChange={set('status')}>
          <option value="planejado">Planejado</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
          <option value="com_impedimento">Com Impedimento</option>
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input className={inputCls} value={data.sprint} onChange={set('sprint')} onKeyDown={onKey} placeholder="Sprint" />
      </td>
      <td className="px-2 py-1.5">
        <select className={inputCls} value={data.responsavel} onChange={set('responsavel')}>
          <option value="">— sem responsável —</option>
          {profiles.map(p => <option key={p.id} value={p.id}>{p.email}</option>)}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input type="date" className={inputCls} value={data.data_apresentacao} onChange={set('data_apresentacao')} />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-3 py-1 bg-[#3C2E26] text-white text-xs rounded hover:bg-[#5C4A3E] disabled:opacity-40 transition-colors"
          >
            {saving ? '...' : 'Salvar'}
          </button>
          <button
            onClick={onCancel}
            className="text-xs text-[#9B8B7E] hover:text-[#3C2E26] transition-colors"
          >
            Cancelar
          </button>
        </div>
      </td>
    </>
  )
}
