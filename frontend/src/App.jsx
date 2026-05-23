import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './auth/LoginPage';
import GerarMainframe from './gerador/GerarMainframe';
import Configuracoes from './gerador/Configuracoes';
import ListarArquivos from './gerador/ListaArquivos';
import Usuarios from './gerador/Usuarios';
import FluxoAutorizacao from './programas/FluxoAutorizacao';
import Copybook from './programas/Copybook';
import BuscaVariaveis from './programas/BuscaVariaveis';
import RelacaoTabelas from './tabelas/RelacaoTabelas';
import BuscaColunas from './tabelas/BuscaColunas';
import ISO8583 from './decodificadores/ISO8583';
import Antifraude from './decodificadores/Antifraude';
import Projetos from './projetos/Projetos';
import EmAndamento from './projetos/EmAndamento';
import ControlePrazos from './projetos/ControlePrazos';
import Cronogramas from './projetos/Cronogramas';
import EtapasProjetos from './projetos/EtapasProjetos';
import Permissoes from './gerador/Permissoes';
import Home from './Home';

function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/gerar" element={<ProtectedRoute roles={['admin', 'operator']}><GerarMainframe /></ProtectedRoute>} />
        <Route path="/historico" element={<ProtectedRoute roles={['admin', 'operator']}><ListarArquivos /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute roles={['admin', 'operator']}><Configuracoes /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute roles={['admin']}><Usuarios /></ProtectedRoute>} />

        <Route path="/programas/fluxo-autorizacao" element={<ProtectedRoute roles={['admin', 'dev']}><FluxoAutorizacao /></ProtectedRoute>} />
        <Route path="/programas/copybook" element={<ProtectedRoute roles={['admin', 'dev']}><Copybook /></ProtectedRoute>} />
        <Route path="/programas/busca-variaveis" element={<ProtectedRoute roles={['admin', 'dev']}><BuscaVariaveis /></ProtectedRoute>} />

        <Route path="/tabelas" element={<ProtectedRoute roles={['admin', 'dev']}><RelacaoTabelas /></ProtectedRoute>} />
        <Route path="/tabelas/busca" element={<ProtectedRoute roles={['admin', 'dev']}><BuscaColunas /></ProtectedRoute>} />

        <Route path="/decodificadores/iso8583" element={<ProtectedRoute roles={['admin', 'dev', 'negocios']}><ISO8583 /></ProtectedRoute>} />
        <Route path="/decodificadores/antifraude" element={<ProtectedRoute roles={['admin', 'dev', 'negocios']}><Antifraude /></ProtectedRoute>} />

        <Route path="/projetos" element={<ProtectedRoute roles={['admin', 'dev', 'negocios']}><Projetos /></ProtectedRoute>} />
        <Route path="/projetos/em-andamento" element={<ProtectedRoute roles={['admin', 'dev', 'negocios']}><EmAndamento /></ProtectedRoute>} />
        <Route path="/projetos/prazos" element={<ProtectedRoute roles={['admin', 'dev', 'negocios']}><ControlePrazos /></ProtectedRoute>} />
        <Route path="/projetos/cronogramas" element={<ProtectedRoute roles={['admin', 'dev', 'negocios']}><Cronogramas /></ProtectedRoute>} />
        <Route path="/projetos/etapas" element={<ProtectedRoute recurso="projetos"><EtapasProjetos /></ProtectedRoute>} />

        <Route path="/permissoes" element={<ProtectedRoute roles={['admin']}><Permissoes /></ProtectedRoute>} />
      </Routes>
    </Layout>
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
