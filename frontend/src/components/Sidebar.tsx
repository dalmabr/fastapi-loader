import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { Role } from '../auth/AuthContext'
import logoUrl from '../logo_inside.svg'

type UserRole = Exclude<Role, null>
interface NavItem { label: string; to: string; roles: UserRole[] }
interface NavGroup { label: string; icon: React.ReactNode; items: NavItem[] }

// ============================================================
// ÍCONES
// ============================================================
function IcoFile() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}
function IcoCode() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  )
}
function IcoTable() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M3 15h18M9 3v18"/>
    </svg>
  )
}
function IcoDecode() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  )
}
function IcoFolder() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function IcoSettings() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
function IcoLogout() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

// ============================================================
// GRUPOS DE NAVEGAÇÃO
// ============================================================
const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Clearing',
    icon: <IcoFile />,
    items: [
      { label: 'Gerar Arquivo',        to: '/gerar',     roles: ['admin', 'operator'] },
      { label: 'Arquivos de Clearing', to: '/historico', roles: ['admin', 'operator'] },
    ],
  },
  {
    label: 'Programas',
    icon: <IcoCode />,
    items: [
      { label: 'Fluxo de Autorização', to: '/programas/fluxo-autorizacao', roles: ['admin', 'dev'] },
      { label: 'Copybook',             to: '/programas/copybook',          roles: ['admin', 'dev'] },
      { label: 'Busca por variáveis',  to: '/programas/busca-variaveis',   roles: ['admin', 'dev'] },
    ],
  },
  {
    label: 'Tabelas',
    icon: <IcoTable />,
    items: [
      { label: 'Relação de Tabelas', to: '/tabelas',       roles: ['admin', 'dev'] },
      { label: 'Busca por colunas',  to: '/tabelas/busca', roles: ['admin', 'dev'] },
    ],
  },
  {
    label: 'Decodificadores',
    icon: <IcoDecode />,
    items: [
      { label: 'ISO 8583',    to: '/decodificadores/iso8583',    roles: ['admin', 'dev', 'negocios'] },
      { label: 'Antifraude', to: '/decodificadores/antifraude', roles: ['admin', 'dev', 'negocios'] },
    ],
  },
  {
    label: 'Projetos',
    icon: <IcoFolder />,
    items: [
      { label: 'Todos os Projetos',  to: '/projetos',              roles: ['admin', 'dev', 'negocios'] },
      { label: 'Painel de Projetos', to: '/projetos/etapas',       roles: ['admin', 'dev', 'negocios'] },
      { label: 'Em Andamento',       to: '/projetos/em-andamento', roles: ['admin', 'dev', 'negocios'] },
      { label: 'Controle de Prazos', to: '/projetos/prazos',       roles: ['admin', 'dev', 'negocios'] },
      { label: 'Cronogramas',        to: '/projetos/cronogramas',  roles: ['admin', 'dev', 'negocios'] },
    ],
  },
  {
    label: 'Administração',
    icon: <IcoSettings />,
    items: [
      { label: 'Configurações', to: '/configuracoes', roles: ['admin', 'operator'] },
      { label: 'Usuários',      to: '/usuarios',      roles: ['admin'] },
      { label: 'Permissões',    to: '/permissoes',    roles: ['admin'] },
    ],
  },
]

// ============================================================
// COMPONENTE
// ============================================================
export default function Sidebar() {
  const location = useLocation()
  const { user, role, signOut } = useAuth()
  const [expanded, setExpanded] = useState(false)

  if (location.pathname === '/login') return null

  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => role && item.roles.includes(role as UserRole)),
  })).filter(group => group.items.length > 0)

  function isItemActive(item: NavItem) {
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  }

  function isGroupActive(group: typeof visibleGroups[0]) {
    return group.items.some(item => isItemActive(item))
  }

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className="fixed top-0 left-0 h-screen z-40 flex flex-col bg-white border-r border-[#EDE8E2] overflow-hidden"
      style={{
        width: expanded ? '232px' : '56px',
        transition: 'width 180ms ease, box-shadow 180ms ease',
        boxShadow: expanded ? '4px 0 20px rgba(0,0,0,0.07)' : 'none',
      }}
    >
      {/* ── Logo ── */}
      <div className="h-14 flex items-center shrink-0 border-b border-[#EDE8E2] px-3.5">
        <div className="w-7 h-7 rounded-lg bg-[#3C2E26] flex items-center justify-center text-white font-bold text-sm shrink-0">
          A
        </div>
        {expanded && (
          <Link to="/" className="ml-2.5 overflow-hidden">
            <img src={logoUrl} alt="AxxioLab" className="h-5 shrink-0" style={{ minWidth: 'max-content' }} />
          </Link>
        )}
      </div>

      {/* ── Navegação ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        <div className="flex flex-col px-2 gap-0.5">
          {visibleGroups.map(group => {
            const groupActive = isGroupActive(group)

            return (
              <div key={group.label}>
                {/* Cabeçalho do grupo */}
                <div
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg ${
                    groupActive ? 'text-[#3C2E26]' : 'text-[#B0A59E]'
                  }`}
                >
                  <span className={`shrink-0 ${groupActive ? 'text-[#3C2E26]' : 'text-[#C4B8B0]'}`}>
                    {group.icon}
                  </span>
                  {expanded && (
                    <span className="text-[10.5px] font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden">
                      {group.label}
                    </span>
                  )}
                </div>

                {/* Sub-itens — só aparecem quando expandido */}
                {expanded && (
                  <div className="mb-1 ml-4 flex flex-col gap-0.5 border-l border-[#EDE8E2] pl-3">
                    {group.items.map(item => {
                      const active = isItemActive(item)
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`block py-1.5 px-2 rounded-md text-[13px] leading-snug whitespace-nowrap transition-colors ${
                            active
                              ? 'bg-[#3C2E26] text-white font-medium'
                              : 'text-[#6B5A52] hover:text-[#3C2E26] hover:bg-[#F5F0EB]'
                          }`}
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>

      {/* ── Usuário ── */}
      <div className="shrink-0 border-t border-[#EDE8E2] p-2">
        <div className="flex items-center gap-2.5 px-1.5 py-1">
          <div className="w-7 h-7 rounded-full bg-[#3C2E26] flex items-center justify-center text-white text-[11px] font-bold shrink-0 uppercase">
            {user?.email?.charAt(0) ?? '?'}
          </div>
          {expanded && (
            <>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="text-[12px] text-[#3C2E26] font-medium truncate leading-snug whitespace-nowrap">{user?.email}</div>
                <div className="text-[10px] text-[#A89B94] capitalize leading-snug">{role}</div>
              </div>
              <button
                onClick={() => signOut()}
                title="Sair"
                className="shrink-0 text-[#C4B8B0] hover:text-[#3C2E26] p-1 rounded hover:bg-[#F5F0EB] transition-colors"
              >
                <IcoLogout />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
