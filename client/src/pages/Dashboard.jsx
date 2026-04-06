import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

const s = {
  heading: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 },
  sub: { color: '#666', marginBottom: 32, fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 20 },
  cardLabel: { color: '#666', fontSize: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' },
  cardValue: { color: '#fff', fontSize: 28, fontWeight: 700 },
  alert: { background: '#1a2a1a', border: '1px solid #2a4a2a', borderRadius: 8, padding: '12px 16px', color: '#4ade80', fontSize: 14, marginBottom: 24 },
  alertError: { background: '#2a1a1a', border: '1px solid #4a2a2a', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 24 },
  section: { marginBottom: 32 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px 12px', color: '#666', fontSize: 12, borderBottom: '1px solid #2a2a2a', textTransform: 'uppercase' },
  td: { padding: '12px 12px', fontSize: 14, borderBottom: '1px solid #1e1e1e', color: '#ccc' },
  badge: (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 12, background: color === 'green' ? '#1a2a1a' : color === 'blue' ? '#1a1a2a' : '#2a2a1a', color: color === 'green' ? '#4ade80' : color === 'blue' ? '#818cf8' : '#fbbf24' }),
  emptyState: { textAlign: 'center', padding: '48px 24px', color: '#666' },
  cta: { display: 'inline-block', marginTop: 16, padding: '10px 20px', background: '#6366f1', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14 },
}

export default function Dashboard() {
  const [stores, setStores] = useState([])
  const [operations, setOperations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()

  const connected = searchParams.get('connected')
  const error = searchParams.get('error')

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/stores').then(r => r.json()),
      fetch('/api/operations').then(r => r.json()),
    ]).then(([s, o]) => {
      setStores(s)
      setOperations(o)
      setLoading(false)
    })
  }, [])

  const blackStores = stores.filter(s => s.role === 'black')
  const whiteStores = stores.filter(s => s.role === 'white')
  const activeOps = operations.filter(o => o.status === 'active')

  return (
    <div>
      <h1 style={s.heading}>Dashboard</h1>
      <p style={s.sub}>Visão geral das suas operações</p>

      {connected && <div style={s.alert}>Loja conectada com sucesso!</div>}
      {error === 'oauth_failed' && <div style={s.alertError}>Falha na autenticação. Verifique o Client ID e Secret.</div>}

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardLabel}>Lojas Black</div>
          <div style={s.cardValue}>{blackStores.length}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Lojas White</div>
          <div style={s.cardValue}>{whiteStores.length}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Operações Ativas</div>
          <div style={s.cardValue}>{activeOps.length}</div>
        </div>
        <div style={s.card}>
          <div style={s.cardLabel}>Produtos Sincronizados</div>
          <div style={s.cardValue}>{operations.reduce((acc, o) => acc + (o.products_synced || 0), 0)}</div>
        </div>
      </div>

      {loading ? null : operations.length === 0 ? (
        <div style={{ ...s.card, ...s.emptyState }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
          <div>Nenhuma operação criada ainda</div>
          <Link to="/connect" style={s.cta}>Conectar primeira loja</Link>
        </div>
      ) : (
        <div style={s.section}>
          <div style={s.sectionTitle}>Operações Recentes</div>
          <div style={s.card}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Nome</th>
                  <th style={s.th}>Loja Black</th>
                  <th style={s.th}>Loja White</th>
                  <th style={s.th}>Produtos</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {operations.map(op => (
                  <tr key={op.id}>
                    <td style={s.td}>{op.name}</td>
                    <td style={s.td}>{op.black_store}</td>
                    <td style={s.td}>{op.white_store}</td>
                    <td style={s.td}>{op.products_synced}</td>
                    <td style={s.td}>
                      <span style={s.badge(op.status === 'active' ? 'green' : 'yellow')}>
                        {op.status === 'active' ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
