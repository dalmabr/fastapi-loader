import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Role = 'admin' | 'operator' | 'dev' | 'negocios' | null;

export type PermissionSet = {
  pode_ver: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
};

export type Permissions = Record<string, PermissionSet>;

const ALL_RESOURCES = [
  'gerador', 'historico', 'configuracoes', 'usuarios',
  'programas', 'tabelas', 'decodificadores', 'projetos', 'permissoes',
];

const FULL_ACCESS: PermissionSet = {
  pode_ver: true, pode_criar: true, pode_editar: true, pode_excluir: true,
};

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  role: Role;
  userCode: string | null;
  permissions: Permissions;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
  userCode: null,
  permissions: {},
  loading: true,
  signOut: async () => {},
});

async function fetchProfileAndPermissions(userId: string): Promise<{
  role: Role;
  userCode: string | null;
  permissions: Permissions;
}> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, user_code')
    .eq('id', userId)
    .single();

  const role = (profile?.role as Role) ?? null;
  const userCode = profile?.user_code ?? null;

  if (role === 'admin') {
    const permissions = Object.fromEntries(ALL_RESOURCES.map(r => [r, { ...FULL_ACCESS }]));
    return { role, userCode, permissions };
  }

  if (role) {
    const { data: rows } = await supabase
      .from('permissoes')
      .select('recurso, pode_ver, pode_criar, pode_editar, pode_excluir')
      .eq('role', role);

    const permissions = Object.fromEntries(
      (rows ?? []).map(p => [
        p.recurso,
        {
          pode_ver: p.pode_ver,
          pode_criar: p.pode_criar,
          pode_editar: p.pode_editar,
          pode_excluir: p.pode_excluir,
        },
      ])
    );
    return { role, userCode, permissions };
  }

  return { role: null, userCode: null, permissions: {} };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const result = await fetchProfileAndPermissions(userId);
    setRole(result.role);
    setUserCode(result.userCode);
    setPermissions(result.permissions);
  }

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setRole(null);
        setUserCode(null);
        setPermissions({});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, userCode, permissions, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function usePermission(recurso: string): PermissionSet {
  const { permissions } = useAuth();
  return permissions[recurso] ?? { pode_ver: false, pode_criar: false, pode_editar: false, pode_excluir: false };
}