import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================
// TIPOS
// ============================================================
interface Permissao {
  id: string
  role: string
  recurso: string
  pode_ver: boolean
  pode_criar: boolean
  pode_editar: boolean
  pode_excluir: boolean
}

interface Toast {
  id: number
  mensagem: string
  tipo: 'sucesso' | 'erro'
}

// ============================================================
// CONSTANTES
// ============================================================
const ROLES_GERENCIADOS = ['operator', 'dev', 'negocios'] as const
type RoleGerenciado = typeof ROLES_GERENCIADOS[number]

const ROLE_LABEL: Record<RoleGerenciado, string> = {
  operator: 'Operator',
  dev:      'Dev',
  negocios: 'Negócios',
}

const RECURSOS = [
  { key: 'gerador',         label: 'Gerar Arquivo' },
  { key: 'historico',       label: 'Histórico' },
  { key: 'configuracoes',   label: 'Configurações' },
  { key: 'programas',       label: 'Programas' },
  { key: 'tabelas',         label: 'Tabelas' },
  { key: 'decodificadores', label: 'Decodificadores' },
  { key: 'projetos',        label: 'Projetos' },
]

type Campo = 'pode_ver' | 'pode_criar' | 'pode_editar' | 'pode_excluir'
const CAMPOS: { key: Campo; label: string }[] = [
  { key: 'pode_ver',     label: 'Ver' },
  { key: 'pode_criar',   label: 'Criar' },
  { key: 'pode_editar',  label: 'Editar' },
  { key: 'pode_excluir', label: 'Excluir' },
]

let toastCounter = 0

// ============================================================
// COMPONENTE
// ============================================================
export default function Permissoes() {
  const [permissoes, setPermissoes] = useState<Permissao[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState<string | null>(null)
  const [toasts, setToasts]         = useState<Toast[]>([])

  const addToast = useCallback((mensagem: string, tipo: Toast['tipo']) => {
    const id = ++toastCounter
    setToasts(t => [...t, { id, mensagem, tipo }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  const loadPermissoes = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('permissoes')
      .select('*')
      .in('role', ROLES_GERENCIADOS)
      .order('role')
      .order('recurso')
    if (!error) setPermissoes((data ?? []) as Permissao[])
    setLoading(false)
  }, [])

  useEffect(() => { loadPermissoes() }, [loadPermissoes])

  function getPermissao(role: string, recurso: string): Permissao | undefined {
    return permissoes.find(p => p.role === role && p.recurso === recurso)
  }

  async function toggle(role: string, recurso: string, campo: Campo, valorAtual: boolean) {
    const key = `${role}_${recurso}_${campo}`
    setSaving(key)

    const existente = getPermissao(role, recurso)
    const novoValor = !valorAtual

    if (existente) {
      const { error } = await supabase
        .from('permissoes')
        .update({ [campo]: novoValor } as Record<string, boolean>)
        .eq('id', existente.id)

      if (error) {
        addToast('Erro ao atualizar permissão.', 'erro')
      } else {
        setPermissoes(prev =>
          prev.map(p =>
            p.id === existente.id ? { ...p, [campo]: novoValor } : p
          )
        )
      }
    } else {
      const payload = {
        role,
        recurso,
        pode_ver:     campo === 'pode_ver'     ? novoValor : false,
        pode_criar:   campo === 'pode_criar'   ? novoValor : false,
        pode_editar:  campo === 'pode_editar'  ? novoValor : false,
        pode_excluir: campo === 'pode_excluir' ? novoValor : false,
      }
      const { data, error } = await supabase
        .from('permissoes')
        .insert(payload)
        .select()
        .single()

      if (error) {
        addToast('Erro ao criar permissão.', 'erro')
      } else if (data) {
        setPermissoes(prev => [...prev, data as Permissao])
      }
    }

    setSaving(null)
  }

  // --------------------------------------------------------
  // RENDER
  // --------------------------------------------------------
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden font-sans">

      {/* Toasts */}
      <div className="fixed top-14 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm font-medium ${
            t.tipo === 'sucesso'
              ? 'bg-[#D1FAE5] text-[#065F46] border border-[#10B981]'
              : 'bg-[#FEE2E2] text-[#991B1B] border border-[#EF4444]'
          }`}>
            {t.tipo === 'sucesso'
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>}
            {t.mensagem}
          </div>
        ))}
      </div>

      <main className="flex-1 flex flex-col max-w-[1200px] w-full mx-auto px-4 sm:px-6 pt-2 pb-1 overflow-hidden">

        <div className="flex items-center justify-between mb-1.5 shrink-0">
          <h1 className="text-[#3C2E26] font-bold leading-tight" style={{ fontSize: 'clamp(2rem, 3.8vw, 2.7rem)' }}>
            Permissões
          </h1>
          <span className="text-xs text-[#9B8B7E]">Admin sempre tem acesso total</span>
        </div>

        <div className="flex-1 overflow-auto border border-[#EDE8E2] rounded-xl">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3C2E26" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#3C2E26] text-white h-8">
                  <th className="text-left px-4 text-[12px] font-semibold uppercase tracking-wider w-36">Papel</th>
                  <th className="text-left px-4 text-[12px] font-semibold uppercase tracking-wider">Recurso</th>
                  {CAMPOS.map(c => (
                    <th key={c.key} className="text-center px-3 text-[12px] font-semibold uppercase tracking-wider w-20">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES_GERENCIADOS.map((role, ri) =>
                  RECURSOS.map((recurso, rci) => {
                    const perm = getPermissao(role, recurso.key)
                    const isFirstOfRole = rci === 0
                    const rowIdx = ri * RECURSOS.length + rci

                    return (
                      <tr
                        key={`${role}_${recurso.key}`}
                        className={`border-b border-[#EDE8E2] ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#FDFAF7]'} ${
                          isFirstOfRole && ri > 0 ? 'border-t-2 border-t-[#D4D4CE]' : ''
                        }`}
                      >
                        <td className="px-4 py-2">
                          {isFirstOfRole && (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-[#3C2E26] text-white">
                              {ROLE_LABEL[role]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-[#2D2D2D]">{recurso.label}</td>

                        {CAMPOS.map(campo => {
                          const valor = perm?.[campo.key] ?? false
                          const key   = `${role}_${recurso.key}_${campo.key}`
                          const busy  = saving === key

                          return (
                            <td key={campo.key} className="px-3 py-2 text-center">
                              <button
                                onClick={() => toggle(role, recurso.key, campo.key, valor)}
                                disabled={busy}
                                className={`w-8 h-4 rounded-full relative transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                                  valor ? 'bg-[#3C2E26]' : 'bg-[#D4D4CE]'
                                }`}
                                title={valor ? 'Clique para revogar' : 'Clique para conceder'}
                              >
                                <span
                                  className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${
                                    valor ? 'translate-x-4' : 'translate-x-0.5'
                                  }`}
                                />
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="shrink-0 pt-1.5 text-xs text-[#9B8B7E]">
          Alterações têm efeito no próximo login do usuário.
        </div>
      </main>
    </div>
  )
}