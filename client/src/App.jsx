import React from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import Connect from './pages/Connect.jsx'
import Operations from './pages/Operations.jsx'

const s = {
  layout: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: 220, background: '#1a1a1a', borderRight: '1px solid #2a2a2a', padding: '24px 0', display: 'flex', flexDirection: 'column' },
  logo: { padding: '0 24px 32px', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' },
  logoBadge: { display: 'inline-block', background: '#6366f1', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, marginLeft: 8, verticalAlign: 'middle' },
  nav: { display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' },
  link: { display: 'block', padding: '10px 12px', borderRadius: 8, color: '#888', textDecoration: 'none', fontSize: 14, transition: 'all 0.15s' },
  main: { flex: 1, padding: 32, overflow: 'auto' },
}

export default function App() {
  return (
    <div style={s.layout}>
      <aside style={s.sidebar}>
        <div style={s.logo}>
          VariantSync
          <span style={s.logoBadge}>BETA</span>
        </div>
        <nav style={s.nav}>
          <NavLink to="/" end style={({ isActive }) => ({ ...s.link, ...(isActive ? { background: '#252525', color: '#fff' } : {}) })}>
            Dashboard
          </NavLink>
          <NavLink to="/operations" style={({ isActive }) => ({ ...s.link, ...(isActive ? { background: '#252525', color: '#fff' } : {}) })}>
            Operações
          </NavLink>
          <NavLink to="/connect" style={({ isActive }) => ({ ...s.link, ...(isActive ? { background: '#252525', color: '#fff' } : {}) })}>
            Conectar Loja
          </NavLink>
        </nav>
      </aside>
      <main style={s.main}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/operations" element={<Operations />} />
          <Route path="/connect" element={<Connect />} />
        </Routes>
      </main>
    </div>
  )
}
