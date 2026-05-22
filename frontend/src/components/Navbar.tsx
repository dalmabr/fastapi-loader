import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../auth/AuthContext';
import logoUrl from '../logo_inside.svg';


type UserRole = Exclude<Role, null>;

interface NavItem {
  label: string;
  to: string;
  roles: UserRole[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Clearing',
    items: [
      { label: 'Gerar Arquivo', to: '/', roles: ['admin', 'operator'] },
      { label: 'Arquivos de Clearing', to: '/historico', roles: ['admin', 'operator'] },
    ],
  },
  {
    label: 'Programas',
    items: [
      { label: 'Fluxo de Autorização', to: '/programas/fluxo-autorizacao', roles: ['admin', 'dev'] },
      { label: 'Copybook', to: '/programas/copybook', roles: ['admin', 'dev'] },
      { label: 'Busca por variáveis', to: '/programas/busca-variaveis', roles: ['admin', 'dev'] },
    ],
  },
  {
    label: 'Tabelas',
    items: [
      { label: 'Relação de Tabelas', to: '/tabelas', roles: ['admin', 'dev'] },
      { label: 'Busca por colunas', to: '/tabelas/busca', roles: ['admin', 'dev'] },
    ],
  },
  {
    label: 'Decodificadores',
    items: [
      { label: 'ISO 8583', to: '/decodificadores/iso8583', roles: ['admin', 'dev', 'negocios'] },
      { label: 'Antifraude', to: '/decodificadores/antifraude', roles: ['admin', 'dev', 'negocios'] },
    ],
  },
  {
    label: 'Projetos',
    items: [
      { label: 'Todos os Projetos', to: '/projetos', roles: ['admin', 'dev', 'negocios'] },
      { label: 'Em Andamento', to: '/projetos/em-andamento', roles: ['admin', 'dev', 'negocios'] },
      { label: 'Controle de Prazos', to: '/projetos/prazos', roles: ['admin', 'dev', 'negocios'] },
      { label: 'Cronogramas', to: '/projetos/cronogramas', roles: ['admin', 'dev', 'negocios'] },
    ],
  },
  {
    label: 'Administração',
    items: [
      { label: 'Configurações', to: '/configuracoes', roles: ['admin', 'operator'] },
      { label: 'Usuários', to: '/usuarios', roles: ['admin'] },
    ],
  },
];

export default function Navbar() {
  const location = useLocation();
  const { user, role, signOut } = useAuth();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { setOpenMenu(null); }, [location.pathname]);

  if (location.pathname === '/login') return null;

  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => role && item.roles.includes(role as UserRole)),
  })).filter(group => group.items.length > 0);

  function isGroupActive(group: NavGroup) {
    return group.items.some(item =>
      item.to === '/'
        ? location.pathname === '/'
        : location.pathname === item.to || location.pathname.startsWith(item.to + '/')
    );
  }

  return (
    <nav ref={navRef} className="bg-[#2D2D2D] text-white px-6 flex items-center justify-between sticky top-0 z-50 h-12">

      <Link to="/" className="shrink-0 mr-6">
        <img src={logoUrl} alt="AxxioLab" className="h-7 brightness-0 invert" />
      </Link>

      <div className="flex items-center flex-1">
        {visibleGroups.map(group => (
          <div key={group.label} className="relative h-12 flex items-center">
            <button
              onClick={e => {
                e.stopPropagation();
                setOpenMenu(openMenu === group.label ? null : group.label);
              }}
              className={`flex items-center gap-1 px-3 h-12 text-sm transition-colors ${
                isGroupActive(group) || openMenu === group.label
                  ? 'text-white bg-white/10'
                  : 'text-white/65 hover:text-white hover:bg-white/5'
              }`}
            >
              {group.label}
              <svg
                width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-150 ${openMenu === group.label ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {openMenu === group.label && (
              <div className="absolute top-12 left-0 w-52 bg-white border border-[#E5E0DA] shadow-lg rounded-b-lg py-1 z-50">
                {group.items.map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`block px-4 py-2.5 text-sm transition-colors ${
                      location.pathname === item.to
                        ? 'text-[#3C2E26] font-medium bg-[#F5F5F0]'
                        : 'text-[#4A3A30] hover:bg-[#F5F5F0]'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-white/20">
        <span className="text-xs text-white/55">{user?.email}</span>
        <button
          onClick={() => signOut()}
          className="text-xs text-white/55 hover:text-white transition-colors"
        >
          Sair
        </button>
      </div>

    </nav>
  );
}
