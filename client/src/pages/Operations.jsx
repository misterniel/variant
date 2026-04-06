import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const s = {
  heading: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 },
  sub: { color: '#666', marginBottom: 32, fontSize: 14 },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 24, marginBottom: 16 },
  flex: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  label: { color: '#666', fontSize: 12, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },
  value: { color: '#fff', fontSize: 15 },
  badge: (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 4, fontSize: 12, background: color === 'green' ? '#1a2a1a' : color === 'blue' ? '#1a1a2a' : '#2a2a1a', color: color === 'green' ? '#4ade80' : color === 'blue' ? '#818cf8' : '#fbbf24' }),
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: (color) => ({ padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, background: color === 'primary' ? '#6366f1' : color === 'danger' ? '#3a1a1a' : '#252525', color: color === 'danger' ? '#f87171' : '#ccc' }),
  newOpCard: { background: '#1a1a1a', border: '1px dashed #333', borderRadius: 12, padding: 24, marginBottom: 24 },
  input: { background: '#111', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, outline: 'none' },
  select: { background: '#111', border: '1px solid #333', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 14, outline: 'none' },
  row: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 0 },
  logs: { marginTop: 16, background: '#111', borderRadius: 8, padding: 12, maxHeight: 180, overflowY: 'auto' },
  log: (status) => ({ fontSize: 12, color: status === 'success' ? '#4ade80' : '#f87171', marginBottom: 4 }),
  emptyState: { textAlign: 'center', padding: '48px 24px', color: '#666' },
  cta: { display: 'inline-block', marginTop: 16, padding: '10px 20px', background: '#6366f1', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14 },
}

export default function Operations() {
  const [operations, setOperations] = useState([])
  const [stores, setStores] = useState([])
  const [form, setForm] = useState({ name: '', black_store_id: '', white_store_id: '' })
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState({})
  const [installingScript, setInstallingScript] = useState({})
  const [logs, setLogs] = useState({})
  const [showLogs, setShowLogs] = useState({})
  const [error, setError] = useState('')

  const blackStores = stores.filter(s => s.role === 'black')
  const whiteStores = stores.filter(s => s.role === 'white')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [ops, sts] = await Promise.all([
      fetch('/api/operations').then(r => r.json()),
      fetch('/api/auth/stores').then(r => r.json()),
    ])
    setOperations(ops)
    setStores(sts)
  }

  async function createOperation(e) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) return setError(data.error)
    setForm({ name: '', black_store_id: '', white_store_id: '' })
    loadData()
  }

  async function toggleStatus(op) {
    const newStatus = op.status === 'active' ? 'paused' : 'active'
    await fetch(`/api/operations/${op.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    loadData()
  }

  async function syncOp(opId) {
    setSyncing(s => ({ ...s, [opId]: true }))
    try {
      const res = await fetch(`/api/operations/${opId}/sync`, { method: 'POST' })
      const data = await res.json()
      if (data.error) alert('Erro: ' + data.error)
      else alert(`Sincronização concluída! ${data.productsSynced} produtos sincronizados.${data.errors?.length ? '\n\nErros:\n' + data.errors.join('\n') : ''}`)
      loadData()
    } catch {
      alert('Erro de conexão')
    } finally {
      setSyncing(s => ({ ...s, [opId]: false }))
    }
  }

  async function installScript(opId) {
    setInstallingScript(s => ({ ...s, [opId]: true }))
    try {
      const res = await fetch(`/api/operations/${opId}/install-script`, { method: 'POST' })
      const data = await res.json()
      if (data.error) alert('Erro: ' + data.error)
      else alert('Script de checkout instalado na loja Black!')
    } catch {
      alert('Erro de conexão')
    } finally {
      setInstallingScript(s => ({ ...s, [opId]: false }))
    }
  }

  async function loadLogs(opId) {
    const res = await fetch(`/api/operations/${opId}/logs`)
    const data = await res.json()
    setLogs(l => ({ ...l, [opId]: data }))
    setShowLogs(s => ({ ...s, [opId]: !s[opId] }))
  }

  async function deleteOp(opId) {
    if (!confirm('Excluir esta operação? Os mapeamentos de produtos serão removidos.')) return
    await fetch(`/api/operations/${opId}`, { method: 'DELETE' })
    loadData()
  }

  return (
    <div>
      <h1 style={s.heading}>Operações</h1>
      <p style={s.sub}>Gerencie as conexões entre lojas Black e White</p>

      {blackStores.length === 0 || whiteStores.length === 0 ? (
        <div style={{ ...s.card, ...s.emptyState }}>
          <div>Você precisa conectar pelo menos uma loja Black e uma loja White</div>
          <Link to="/connect" style={s.cta}>Conectar Loja</Link>
        </div>
      ) : (
        <div style={s.newOpCard}>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 14 }}>Nova Operação</p>
          {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <form onSubmit={createOperation}>
            <div style={s.row}>
              <input style={s.input} placeholder="Nome da operação" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <select style={s.select} value={form.black_store_id} onChange={e => setForm(f => ({ ...f, black_store_id: e.target.value }))} required>
                <option value="">Loja Black</option>
                {blackStores.map(s => <option key={s.id} value={s.id}>{s.shop_domain}</option>)}
              </select>
              <select style={s.select} value={form.white_store_id} onChange={e => setForm(f => ({ ...f, white_store_id: e.target.value }))} required>
                <option value="">Loja White</option>
                {whiteStores.map(s => <option key={s.id} value={s.id}>{s.shop_domain}</option>)}
              </select>
              <button type="submit" style={s.btn('primary')}>Criar</button>
            </div>
          </form>
        </div>
      )}

      {operations.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: '32px', color: '#555', fontSize: 14 }}>
          Nenhuma operação criada
        </div>
      ) : operations.map(op => (
        <div key={op.id} style={s.card}>
          <div style={s.flex}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{op.name}</span>
                <span style={s.badge(op.status === 'active' ? 'green' : 'yellow')}>
                  {op.status === 'active' ? 'Ativo' : 'Pausado'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                <div><div style={s.label}>Loja Black</div><div style={s.value}>{op.black_store}</div></div>
                <div><div style={s.label}>Loja White</div><div style={s.value}>{op.white_store}</div></div>
                <div><div style={s.label}>Produtos Sinc.</div><div style={s.value}>{op.products_synced}</div></div>
                <div><div style={s.label}>Última Sync</div><div style={s.value}>{op.last_sync ? new Date(op.last_sync).toLocaleString('pt-BR') : '—'}</div></div>
              </div>
            </div>
          </div>

          <div style={{ ...s.actions, marginTop: 16 }}>
            <button style={s.btn('primary')} onClick={() => syncOp(op.id)} disabled={syncing[op.id]}>
              {syncing[op.id] ? 'Sincronizando...' : 'Sincronizar Produtos'}
            </button>
            <button style={s.btn()} onClick={() => installScript(op.id)} disabled={installingScript[op.id]}>
              {installingScript[op.id] ? 'Instalando...' : 'Instalar Script Checkout'}
            </button>
            <button style={s.btn()} onClick={() => toggleStatus(op)}>
              {op.status === 'active' ? 'Pausar' : 'Ativar'}
            </button>
            <button style={s.btn()} onClick={() => loadLogs(op.id)}>
              {showLogs[op.id] ? 'Ocultar Logs' : 'Ver Logs'}
            </button>
            <button style={s.btn('danger')} onClick={() => deleteOp(op.id)}>Excluir</button>
          </div>

          {showLogs[op.id] && (
            <div style={s.logs}>
              {(logs[op.id] || []).length === 0 ? (
                <div style={{ color: '#555', fontSize: 12 }}>Nenhum log ainda</div>
              ) : (logs[op.id] || []).map(log => (
                <div key={log.id} style={s.log(log.status)}>
                  [{new Date(log.created_at).toLocaleString('pt-BR')}] {log.status.toUpperCase()} — {log.products_synced} produtos{log.message ? ` — ${log.message}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
