import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import GerarMainframe from './gerador/GerarMainframe';
import Configuracoes from './gerador/Configuracoes';

function App() {
  return (
    <Router>
      {/* Navbar */}
      <nav className="bg-zinc-900 border-b border-zinc-700 py-4">
        <div className="max-w-5xl mx-auto px-8 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">FastAPI Loader</h2>
          
          <div className="flex gap-8 text-white">
            <Link to="/" className="hover:text-emerald-400 transition-colors">Gerar Arquivo</Link>
            <Link to="/configuracoes" className="hover:text-emerald-400 transition-colors">Configurações</Link>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<GerarMainframe />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Routes>
    </Router>
  );
}

export default App;