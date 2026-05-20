import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './auth/LoginPage';
import GerarMainframe from './gerador/GerarMainframe';
import Configuracoes from './gerador/Configuracoes';
import ListarArquivos from './gerador/ListaArquivos';
import Usuarios from './gerador/Usuarios';

function Navbar() {
  const location = useLocation();
  const path = location.pathname;
  const { user, role, signOut } = useAuth();

  if (path === '/login') return null;

  return (
    <nav className="bg-[#2D2D2D] text-white px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <span className="text-base font-medium">AxxioLab</span>
      <div className="flex gap-6 text-sm items-center">
        <Link
          to="/"
          className={`transition-opacity ${path === '/' ? 'opacity-100 font-medium' : 'opacity-70 hover:opacity-100'}`}
        >
          Gerar Arquivo
        </Link>
        <Link
          to="/historico"
          className={`transition-opacity ${path === '/historico' ? 'opacity-100 font-medium' : 'opacity-70 hover:opacity-100'}`}
        >
          Arquivos de Clearing
        </Link>
        {role === 'admin' && (
          <>
            <Link
              to="/configuracoes"
              className={`transition-opacity ${path === '/configuracoes' ? 'opacity-100 font-medium' : 'opacity-70 hover:opacity-100'}`}
            >
              Configurações
            </Link>
            <Link
              to="/usuarios"
              className={`transition-opacity ${path === '/usuarios' ? 'opacity-100 font-medium' : 'opacity-70 hover:opacity-100'}`}
            >
              Usuários
            </Link>
          </>
        )}
        <div className="ml-4 pl-4 border-l border-white/30 flex items-center gap-3">
          <span className="text-xs opacity-70">{user?.email}</span>
          <button
            onClick={() => signOut()}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity"
          >
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><GerarMainframe /></ProtectedRoute>} />
        <Route path="/historico" element={<ProtectedRoute><ListarArquivos /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute requiredRole="admin"><Configuracoes /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute requiredRole="admin"><Usuarios /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router basename="/fastapi-loader">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;