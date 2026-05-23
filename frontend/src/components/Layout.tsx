import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()

  if (location.pathname === '/login') return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Espaço reservado para a sidebar recolhida (56px fixo) */}
      <div className="w-14 shrink-0" />
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}
