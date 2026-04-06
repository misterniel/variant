import React, { useState } from 'react'

const PURPLE = '#7c3aed'
const TOTAL_STEPS = 4

export default function AddOperationModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [blackForm, setBlackForm] = useState({ shop_domain: '', client_id: '', client_secret: '' })
  const [whiteForm, setWhiteForm] = useState({ shop_domain: '', client_id: '', client_secret: '' })
  const [blackConnected, setBlackConnected] = useState(false)
  const [whiteConnected, setWhiteConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  async function connectStore(form, role, onSuccess) {
    setConnecting(true)
    setError('')
    try {
      const res = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Erro ao conectar')

      // Open OAuth in popup
      const popup = window.open(data.redirect_url, '_blank', 'width=600,height=700')
      const timer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(timer)
          setConnecting(false)
          onSuccess()
        }
      }, 500)
    } catch {
      setError('Erro de conexão com o servidor')
      setConnecting(false)
    }
  }

  async function finish() {
    setCreating(true)
    setError('')
    try {
      // Get latest stores to find the ones we just connected
      const storesRes = await fetch('/api/auth/stores')
      const stores = await storesRes.json()

      const blackStore = stores.find(s => s.role === 'black' && s.shop_domain.includes(blackForm.shop_domain.replace('.myshopify.com', '')))
      const whiteStore = stores.find(s => s.role === 'white' && s.shop_domain.includes(whiteForm.shop_domain.replace('.myshopify.com', '')))

      if (!blackStore || !whiteStore) {
        setError('Lojas não encontradas. Verifique se a autorização foi concluída.')
        setCreating(false)
        return
      }

      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, black_store_id: blackStore.id, white_store_id: whiteStore.id }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Erro ao criar operação')
      onCreated()
    } catch {
      setError('Erro ao criar operação')
    } finally {
      setCreating(false)
    }
  }

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 420, background: '#1a1a1a', borderRadius: 16,
          border: '1px solid #2a2a2a', padding: '28px 28px 24px',
          position: 'relative',
        }}
      >
        {/* Back */}
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, position: 'absolute', top: 22, left: 22 }}>←</button>
        )}

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44,
            background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#fff',
          }}>✕</div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#2a2a2a', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${PURPLE}, #a855f7)`, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>

        {error && (
          <div style={{ background: '#2a1a1a', border: '1px solid #4a2a2a', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Step 1: Nome */}
        {step === 1 && (
          <>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Nome da Operação</h2>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 24 }}>Passo 1 de {TOTAL_STEPS}</p>
            <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 8 }}>Nome da Operação</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Operação 01, Operação 02"
              maxLength={100}
              style={inputStyle}
            />
            <p style={{ color: '#555', fontSize: 12, marginBottom: 24 }}>Escolha um nome para identificar esta operação (máx. 100 caracteres)</p>
            <NextButton disabled={!name.trim()} onClick={() => setStep(2)} />
          </>
        )}

        {/* Step 2: Loja Vitrine */}
        {step === 2 && (
          <>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Conectar Loja Vitrine</h2>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 24 }}>Passo 2 de {TOTAL_STEPS}</p>
            <StoreForm form={blackForm} onChange={setBlackForm} />
            <button
              onClick={() => connectStore(blackForm, 'black', () => setBlackConnected(true))}
              disabled={connecting || !blackForm.shop_domain || !blackForm.client_id || !blackForm.client_secret}
              style={{ ...nextBtnStyle, marginBottom: 10, background: blackConnected ? '#1a3a1a' : `linear-gradient(135deg, ${PURPLE}, #a855f7)` }}
            >
              {blackConnected ? '✓ Conectado' : connecting ? 'Aguardando...' : 'Simular / Autorizar →'}
            </button>
            <NextButton disabled={!blackConnected} onClick={() => setStep(3)} label="Próximo →" />
          </>
        )}

        {/* Step 3: Loja Checkout */}
        {step === 3 && (
          <>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Conectar Loja Checkout</h2>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 24 }}>Passo 3 de {TOTAL_STEPS}</p>
            <StoreForm form={whiteForm} onChange={setWhiteForm} />
            <button
              onClick={() => connectStore(whiteForm, 'white', () => setWhiteConnected(true))}
              disabled={connecting || !whiteForm.shop_domain || !whiteForm.client_id || !whiteForm.client_secret}
              style={{ ...nextBtnStyle, marginBottom: 10, background: whiteConnected ? '#1a3a1a' : `linear-gradient(135deg, ${PURPLE}, #a855f7)` }}
            >
              {whiteConnected ? '✓ Conectado' : connecting ? 'Aguardando...' : 'Simular / Autorizar →'}
            </button>
            <NextButton disabled={!whiteConnected} onClick={() => setStep(4)} label="Próximo →" />
          </>
        )}

        {/* Step 4: Confirmar */}
        {step === 4 && (
          <>
            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Confirmar Operação</h2>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 24 }}>Passo 4 de {TOTAL_STEPS}</p>

            <div style={{ background: '#111', borderRadius: 10, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Row label="Nome" value={name} />
              <Row label="Loja Vitrine" value={blackForm.shop_domain} />
              <Row label="Loja Checkout" value={whiteForm.shop_domain} />
            </div>

            <button
              onClick={finish}
              disabled={creating}
              style={{ ...nextBtnStyle }}
            >
              {creating ? 'Criando...' : 'Criar Operação →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function StoreForm({ form, onChange }) {
  return (
    <>
      <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 6 }}>Domínio da Loja</label>
      <input value={form.shop_domain} onChange={e => onChange(f => ({ ...f, shop_domain: e.target.value }))} placeholder="minha-loja.myshopify.com" style={{ ...inputStyle, marginBottom: 14 }} />
      <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 6 }}>Client ID</label>
      <input value={form.client_id} onChange={e => onChange(f => ({ ...f, client_id: e.target.value }))} placeholder="Cole o Client ID do seu app Shopify" style={{ ...inputStyle, marginBottom: 14 }} />
      <label style={{ color: '#ccc', fontSize: 13, display: 'block', marginBottom: 6 }}>Client Secret</label>
      <input value={form.client_secret} type="password" onChange={e => onChange(f => ({ ...f, client_secret: e.target.value }))} placeholder="Cole o Client Secret do seu app Shopify" style={{ ...inputStyle, marginBottom: 16 }} />
    </>
  )
}

function NextButton({ onClick, disabled, label = 'Próximo →' }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...nextBtnStyle, opacity: disabled ? 0.4 : 1 }}>
      {label}
    </button>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: '#666' }}>{label}</span>
      <span style={{ color: '#ccc' }}>{value}</span>
    </div>
  )
}

const inputStyle = {
  width: '100%', background: '#111', border: '1px solid #333', borderRadius: 8,
  padding: '10px 12px', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 0,
  boxSizing: 'border-box',
}

const nextBtnStyle = {
  width: '100%', padding: '13px', border: 'none', borderRadius: 10,
  background: `linear-gradient(135deg, #7c3aed, #a855f7)`,
  color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
}
