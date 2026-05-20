import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface Props {
  children: ReactNode;
  requiredRole?: 'admin';
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { session, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3C2E26" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <p className="text-sm text-[#6B5744]">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (requiredRole === 'admin' && role !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
}
