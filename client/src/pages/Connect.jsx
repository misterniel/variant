import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const s = {
  heading: { fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 8 },
  sub: { color: '#666', marginBottom: 32, fontSize: 14 },
  card: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 28, maxWidth: 520 },
  label: { display: 'block', color: '#ccc', fontSize: 13, marginBottom: 6 },
  input: { width: '100%', background: '#111', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, marginBottom: 16, outline: 'none' },
  select: { width: '100%', background: '#111', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, marginBottom: 16, outline: 'none' },
  btn: { width: '100%', padding: '12px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  hint: { color: '#555', fontSize: 12, marginTop: -12, marginBottom: 16 },
  tabs: { display: 'flex', gap: 8, marginBottom: 28 },
  tab: (active) => ({ padding: '8px 16px', borderRadius: 8, fontSize: 14, cursor: 'pointer', border: 'none', background: active ? '#6366f1' : '#252525', color: active ? '#fff' : '#888', fontWeight: active ? 600 : 400 }),
  info: { background: '#1a1a2a', border: '1px solid #2a2a4a', borderRadius: 8, padding: '12px 16px', color: '#818cf8', fontSize: 13, marginBottom: 24 },
  steps: { marginBottom: 24 },
  step: { display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  stepNum: { width: 24, height: 24, minWidth: 24, background: '#252525', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#888', marginTop: 1 },
  stepText: { color: '#999', fontSize: 13, lineHeight: 1.5 },
}

export default function Connect() {
  const [role, setRole] = useState('black')
  const [form, setForm] = useState({ shop_domain: '', client_id: '', client_secret: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Erro desconhecido')
      window.location.href = data.redirect_url
    } catch (err) {
      setError('Erro de conexão com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={s.heading}>Conectar Loja</h1>
      <p style={s.sub}>Adicione uma loja Shopify à sua conta</p>

      <div style={s.tabs}>
        <button style={s.tab(role === 'black')} onClick={() => setRole('black')}>Loja Black (Vitrine)</button>
        <button style={s.tab(role === 'white')} onClick={() => setRole('white')}>Loja White (Checkout)</button>
      </div>

      <div style={s.card}>
        <div style={s.info}>
          {role === 'black'
            ? 'A loja Black é a vitrine onde os produtos são exibidos. O checkout será redirecionado para a loja White.'
            : 'A loja White é onde o checkout acontece de fato. Os produtos serão sincronizados da loja Black.'}
        </div>

        <div style={s.steps}>
          <p style={{ color: '#666', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Como criar o app no Shopify</p>
          {[
            'No admin da loja, vá em Configurações → Apps → Desenvolver apps',
            'Clique em "Create app" e dê o nome VariantSync',
            'Em Access, ative: read_products, write_products, read_inventory, write_script_tags',
            'Defina a Redirect URL como a URL de callback abaixo',
            'Clique em Release e copie o Client ID e Secret',
          ].map((step, i) => (
            <div key={i} style={s.step}>
              <div style={s.stepNum}>{i + 1}</div>
              <div style={s.stepText}>{step}</div>
            </div>
          ))}
        </div>

        <div style={{ ...s.info, marginBottom: 20, wordBreak: 'break-all', fontSize: 12 }}>
          Redirect URL: <strong>{window.location.origin}/api/auth/callback</strong>
        </div>

        {error && <div style={{ background: '#2a1a1a', border: '1px solid #4a2a2a', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={s.label}>Domínio da loja</label>
          <input style={s.input} name="shop_domain" placeholder="minha-loja.myshopify.com" value={form.shop_domain} onChange={handleChange} required />
          <p style={s.hint}>Sem https://, apenas o domínio .myshopify.com</p>

          <label style={s.label}>Client ID</label>
          <input style={s.input} name="client_id" placeholder="Cole aqui o Client ID" value={form.client_id} onChange={handleChange} required />

          <label style={s.label}>Client Secret</label>
          <input style={s.input} name="client_secret" type="password" placeholder="Cole aqui o Client Secret" value={form.client_secret} onChange={handleChange} required />

          <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }} disabled={loading}>
            {loading ? 'Redirecionando...' : `Conectar Loja ${role === 'black' ? 'Black' : 'White'}`}
          </button>
        </form>
      </div>
    </div>
  )
}
