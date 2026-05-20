import { useState } from 'react';

export default function Configuracoes() {
  const [bandeira, setBandeira] = useState("");
  const [template, setTemplate] = useState("");
  const [siaidcd, setSiaidcd] = useState("");

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-600">Gerenciamento de Templates</p>
        </div>

        {/* Formulário */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow p-8 mb-10">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Cadastrar / Atualizar Template</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bandeira</label>
              <select 
                value={bandeira} 
                onChange={(e) => setBandeira(e.target.value)}
                className="w-full h-11 border border-slate-300 rounded-lg px-4 focus:border-emerald-600"
              >
                <option value="">Selecione a bandeira</option>
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="Elo">Elo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do Template</label>
              <input 
                type="text"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="mpdt004_TEMPLATE_024"
                className="w-full h-11 border border-slate-300 rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">SIAIDCD (19 dígitos)</label>
              <input 
                type="text"
                value={siaidcd}
                onChange={(e) => setSiaidcd(e.target.value.slice(0,19))}
                maxLength={19}
                placeholder="012020807326812880"
                className="w-full h-11 border border-slate-300 rounded-lg px-4 font-mono"
              />
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-medium hover:bg-emerald-700 transition">
              Salvar Template
            </button>
            <button className="flex-1 border border-slate-300 py-3.5 rounded-xl font-medium hover:bg-slate-50 transition">
              Limpar
            </button>
          </div>
        </div>

        {/* Tabela de Templates */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow overflow-hidden">
          <div className="px-8 py-5 border-b bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800">Templates Cadastrados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-4 px-8 text-slate-600 font-medium">Template</th>
                  <th className="text-left py-4 px-8 text-slate-600 font-medium">Bandeira</th>
                  <th className="text-left py-4 px-8 text-slate-600 font-medium">SIAIDCD</th>
                  <th className="w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="hover:bg-slate-50">
                  <td className="px-8 py-5 font-medium">mpdt004_TEMPLATE_024</td>
                  <td className="px-8 py-5 text-emerald-700">Mastercard</td>
                  <td className="px-8 py-5 font-mono text-slate-600">012020807326812880</td>
                  <td className="px-8 py-5 text-right text-red-600 hover:text-red-700 cursor-pointer">Excluir</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}