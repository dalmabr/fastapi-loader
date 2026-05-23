import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { supabase } from './lib/supabase'

type UserRole = 'admin' | 'operator' | 'dev' | 'negocios'

interface QuickCard {
  category: string
  title: string
  description: string
  to: string
  roles: UserRole[]
  color: string
}

const CARDS: QuickCard[] = [
  {
    category: 'Clearing',
    title: 'Gerar Arquivo',
    description: 'Componha registros de transação e exporte arquivos de clearing no formato mainframe.',
    to: '/gerar',
    roles: ['admin', 'operator'],
    color: 'text-blue-500',
  },
  {
    category: 'Clearing',
    title: 'Histórico de Arquivos',
    description: 'Consulte, baixe e gerencie todos os arquivos gerados anteriormente.',
    to: '/historico',
    roles: ['admin', 'operator'],
    color: 'text-blue-500',
  },
  {
    category: 'Projetos',
    title: 'Painel de Projetos',
    description: 'Visão geral de todas as fases, prazos e percentuais de conclusão.',
    to: '/projetos/etapas',
    roles: ['admin', 'dev', 'negocios'],
    color: 'text-amber-500',
  },
  {
    category: 'Projetos',
    title: 'Em Andamento',
    description: 'Projetos ativos com responsáveis, status e próximas entregas.',
    to: '/projetos/em-andamento',
    roles: ['admin', 'dev', 'negocios'],
    color: 'text-amber-500',
  },
  {
    category: 'Projetos',
    title: 'Cronogramas',
    description: 'Planejamento detalhado de prazos, datas e dependências entre tarefas.',
    to: '/projetos/cronogramas',
    roles: ['admin', 'dev', 'negocios'],
    color: 'text-amber-500',
  },
  {
    category: 'Programas',
    title: 'Fluxo de Autorização',
    description: 'Mapeamento visual do fluxo de autorização de transações no sistema.',
    to: '/programas/fluxo-autorizacao',
    roles: ['admin', 'dev'],
    color: 'text-violet-500',
  },
  {
    category: 'Programas',
    title: 'Copybook',
    description: 'Consulte e explore as definições de layout de copybook COBOL.',
    to: '/programas/copybook',
    roles: ['admin', 'dev'],
    color: 'text-violet-500',
  },
  {
    category: 'Tabelas',
    title: 'Relação de Tabelas',
    description: 'Explore a estrutura e o relacionamento das tabelas do banco de dados.',
    to: '/tabelas',
    roles: ['admin', 'dev'],
    color: 'text-teal-500',
  },
  {
    category: 'Decodificadores',
    title: 'ISO 8583',
    description: 'Decodifique e analise mensagens de autorização no padrão ISO 8583.',
    to: '/decodificadores/iso8583',
    roles: ['admin', 'dev', 'negocios'],
    color: 'text-rose-500',
  },
  {
    category: 'Decodificadores',
    title: 'Antifraude',
    description: 'Analise e interprete regras e scores de antifraude em transações.',
    to: '/decodificadores/antifraude',
    roles: ['admin', 'dev', 'negocios'],
    color: 'text-rose-500',
  },
]

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function formatDate(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function displayName(userCode: string | null, email: string | undefined): string {
  if (userCode?.trim()) {
    const name = userCode.trim()
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  if (!email) return 'Usuário'
  const local = email.split('@')[0]
  const parts = local.split(/[._-]/)
  const name = parts[parts.length - 1]
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

// ============================================================
// COMPONENTE
// ============================================================
export default function Home() {
  const { user, role, userCode } = useAuth()
  const [stats, setStats] = useState({ projetos: 0, arquivos: 0, loading: true })

  useEffect(() => {
    async function fetchStats() {
      const [{ count: projCount }, { count: arqCount }] = await Promise.all([
        supabase
          .from('projetos')
          .select('*', { count: 'exact', head: true })
          .in('status', ['planejado', 'em_andamento']),
        supabase
          .from('arquivos_gerados')
          .select('*', { count: 'exact', head: true })
          .neq('status', 'excluido'),
      ])
      setStats({ projetos: projCount ?? 0, arquivos: arqCount ?? 0, loading: false })
    }
    fetchStats()
  }, [])

  const firstName = displayName(userCode, user?.email)

  const visibleCards = CARDS.filter(
    card => role && card.roles.includes(role as UserRole)
  )

  const kpis = [
    ...(role && ['admin', 'dev', 'negocios'].includes(role)
      ? [{ label: 'projetos ativos', value: stats.projetos }]
      : []),
    ...(role && ['admin', 'operator'].includes(role)
      ? [{ label: 'arquivos gerados', value: stats.arquivos }]
      : []),
  ]

  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans" style={{ background: '#F5F0EB' }}>
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1360px] w-full mx-auto px-8 py-10">

          {/* ── Header ── */}
          <div className="flex items-start justify-between mb-10">
            <div>
              <h1 className="font-extrabold text-[#1A1210] leading-tight tracking-tight"
                style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)' }}>
                {greeting()}, {firstName}!
              </h1>
              <p className="text-[#A89B94] mt-1 text-sm capitalize">{formatDate()}</p>
            </div>

            {!stats.loading && kpis.length > 0 && (
              <div className="flex items-start gap-10 pt-1">
                {kpis.map(k => (
                  <div key={k.label} className="text-right">
                    <div
                      className="font-extrabold text-[#1A1210] leading-none"
                      style={{ fontSize: 'clamp(2rem, 3vw, 2.6rem)' }}
                    >
                      {k.value}
                    </div>
                    <div className="text-xs text-[#A89B94] mt-1">{k.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Cards ── */}
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))' }}
          >
            {visibleCards.map(card => (
              <Link
                key={card.to}
                to={card.to}
                className="group bg-white rounded-2xl p-5 border border-[#EDE8E2] shadow-sm hover:shadow-md hover:border-[#D4C9BF] transition-all duration-200 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${card.color}`}>
                    {card.category}
                  </span>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    className="text-[#D4C9BF] group-hover:text-[#3C2E26] transition-colors shrink-0"
                  >
                    <line x1="7" y1="17" x2="17" y2="7"/>
                    <polyline points="7 7 17 7 17 17"/>
                  </svg>
                </div>

                <h3 className="font-bold text-[15px] text-[#1A1210] leading-snug mb-2">
                  {card.title}
                </h3>
                <p className="text-[13px] text-[#A89B94] leading-relaxed flex-1">
                  {card.description}
                </p>
              </Link>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
