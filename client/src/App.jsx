import React, { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import OperationDetail from './pages/OperationDetail.jsx'

const PURPLE = '#7c3aed'
const PURPLE_LIGHT = '#a855f7'

export default function App() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f0f', color: '#e0e0e0' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/operation/:id" element={<OperationDetail />} />
        </Routes>
      </main>
    </div>
  )
}

function Sidebar({ collapsed, onToggle }) {
  return (
    <aside style={{
      width: collapsed ? 56 : 200,
      minWidth: collapsed ? 56 : 200,
      background: '#141414',
      borderRight: '1px solid #222',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.2s, min-width 0.2s',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #1e1e1e' }}>
        <div style={{
          width: 32, height: 32, minWidth: 32,
          background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_LIGHT})`,
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, color: '#fff',
        }}>
          ✕
        </div>
        {!collapsed && <span style={{ fontWeight: 700, fontSize: 15, color: '#fff', whiteSpace: 'nowrap' }}>VariantSync</span>}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <SidebarLink to="/" icon="▦" label="Dashboard" collapsed={collapsed} />
        <SidebarLink to="/tutorial" icon="□" label="Tutorial" collapsed={collapsed} />
        <SidebarLink to="/conta" icon="○" label="Minha Conta" collapsed={collapsed} />
      </nav>

      {/* Collapse toggle */}
      <button onClick={onToggle} style={{
        background: 'none', border: 'none', color: '#555', cursor: 'pointer',
        padding: '14px 16px', textAlign: collapsed ? 'center' : 'right', fontSize: 13,
      }}>
        {collapsed ? '›' : '‹'}
      </button>
    </aside>
  )
}

function SidebarLink({ to, icon, label, collapsed }) {
  return (
    <NavLink to={to} end style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '9px 10px', borderRadius: 7, textDecoration: 'none',
      color: isActive ? '#fff' : '#666',
      background: isActive ? '#1e1e1e' : 'transparent',
      fontSize: 13, fontWeight: isActive ? 500 : 400,
      whiteSpace: 'nowrap', overflow: 'hidden',
    })}>
      <span style={{ fontSize: 15, minWidth: 18, textAlign: 'center' }}>{icon}</span>
      {!collapsed && label}
    </NavLink>
  )
}
