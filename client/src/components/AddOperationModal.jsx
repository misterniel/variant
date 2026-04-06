import React, { useState } from 'react'

const PURPLE = '#7c3aed'
const TOTAL_STEPS = 4

export default function AddOperationModal({ onClose, onCreated, defaultColumn }) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [blackForm, setBlackForm] = useState({ shop_domain: '', client_id: '', client_secret: '' })
  const [whiteForm, setWhiteForm] = useState({ shop_domain: '', client_id: '', client_secret: '' })
  const [blackConnected, setBlackConnected] = useState(false)
  const [whiteConnected, setWhiteConnected] = useState(false)
  const [verifyingBlack, setVerifyingBlack] = useState(false)
  const [verifyingWhite, setVerifyingWhite] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  async function openOAuth(form, role) {
    setError('')
    const res = await fetch('/api/auth/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role }),
    })
    const data = await res.json()
    if (!res.ok) return setError(data.error || 'Erro ao gerar URL de autorização')
    window.open(data.redirect_url, '_blank')
  }

  async function verifyConnection(domain, role, onSuccess, setVerifying) {
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/auth/stores')
      const stores = await res.json()
      const found = stores.find(s =>
        s.role === role &&
        s.shop_domain.replace('.myshopify.com', '').includes(domain.replace('.myshopify.com', ''))
      )
      if (found) onSuccess(true)
      else setError('Loja ainda não conectada. Conclua a autorização na aba aberta e tente novamente.')
    } finally {
      setVerifying(false)
    }
  }

  async function finish() {
    setCreating(true)
    setError('')
    try {
      const storesRes = await fetch('/api/auth/stores')
      const stores = await storesRes.json()

      const blackStore = stores.find(s =>
        s.role === 'black' &&
        s.shop_domain.replace('.myshopify.com', '').includes(blackForm.shop_domain.replace('.myshopify.com', ''))
      )
      const whiteStore = stores.find(s =>
        s.role === 'white' &&
        s.shop_domain.replace('.myshopify.com', '').includes(whiteForm.shop_domain.replace('.myshopify.com', ''))
      )

      if (!blackStore || !whiteStore) {
        setError('Lojas não encontradas. Verifique se as autorizações foram concluídas.')
        return
      }

      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          black_store_id: blackStore.id,
          white_store_id: whiteStore.id,
          column_name: defaultColumn,
        }),
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
  const canGoNext1 = name.trim().length > 0
  const canGoNext2 = blackConnected
  const canGoNext3 = whiteConnected

  return (
    /* Full-screen overlay com fundo purple */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'radial-gradient(ellipse at center, #2d1b69 0%, #1a0a3e 40%, #0a0a1a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 460, background: '#1c1c1c', borderRadius: 16,
        border: '1px solid #2e2e2e', padding: '28px 28px 24px',
        position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Back arrow */}
        {step > 1 && (
          <button
            onClick={() => { setStep(s => s - 1); setError('') }}
            style={{ position: 'absolute', top: 22, left: 22, background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
          >←</button>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
        >✕</button>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <div style={{
            width: 46, height: 46,
            background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: '#fff',
          }}>✕</div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: '#2a2a2a', borderRadius: 2, marginBottom: 26, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: `linear-gradient(90deg, ${PURPLE}, #a855f7)`,
            borderRadius: 2, transition: 'width 0.3s',
          }} />
        </div>

        {error && (
          <div style={{ background: '#2a1a1a', border: '1px solid #4a2a2a', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* ── STEP 1: Nome ── */}
        {step === 1 && (
          <>
            <h2 style={titleStyle}>Nome da Operação</h2>
            <p style={subStyle}>Passo 1 de {TOTAL_STEPS}</p>
            <label style={labelStyle}>Nome da Operação</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canGoNext1 && setStep(2)}
              placeholder="Ex: Operação 01, Operação 02"
              maxLength={100}
              style={inputStyle}
            />
            <p style={{ color: '#555', fontSize: 12, margin: '-8px 0 24px' }}>
              Escolha um nome para identificar esta operação (máx. 100 caracteres)
            </p>
            <PrimaryBtn disabled={!canGoNext1} onClick={() => setStep(2)}>Próximo →</PrimaryBtn>
          </>
        )}

        {/* ── STEP 2: Loja Vitrine ── */}
        {step === 2 && (
          <>
            <h2 style={titleStyle}>Conectar Loja Vitrine</h2>
            <p style={subStyle}>Passo 2 de {TOTAL_STEPS}</p>
            <StoreForm form={blackForm} onChange={setBlackForm} />

            <PrimaryBtn
              disabled={!blackForm.shop_domain || !blackForm.client_id || !blackForm.client_secret}
              onClick={() => openOAuth(blackForm, 'black')}
              style={{ marginBottom: 8 }}
            >
              Simular / Autorizar →
            </PrimaryBtn>

            <button
              onClick={() => verifyConnection(blackForm.shop_domain, 'black', setBlackConnected, setVerifyingBlack)}
              disabled={verifyingBlack}
              style={verifyBtnStyle}
            >
              {verifyingBlack ? 'Verificando...' : blackConnected ? '✓ Conexão verificada' : 'Verificar conexão'}
            </button>

            <PrimaryBtn disabled={!canGoNext2} onClick={() => setStep(3)} style={{ marginTop: 12 }}>
              Próximo →
            </PrimaryBtn>
          </>
        )}

        {/* ── STEP 3: Loja Checkout ── */}
        {step === 3 && (
          <>
            <h2 style={titleStyle}>Conectar Loja Checkout</h2>
            <p style={subStyle}>Passo 3 de {TOTAL_STEPS}</p>
            <StoreForm form={whiteForm} onChange={setWhiteForm} />

            <PrimaryBtn
              disabled={!whiteForm.shop_domain || !whiteForm.client_id || !whiteForm.client_secret}
              onClick={() => openOAuth(whiteForm, 'white')}
              style={{ marginBottom: 8 }}
            >
              Simular / Autorizar →
            </PrimaryBtn>

            <button
              onClick={() => verifyConnection(whiteForm.shop_domain, 'white', setWhiteConnected, setVerifyingWhite)}
              disabled={verifyingWhite}
              style={verifyBtnStyle}
            >
              {verifyingWhite ? 'Verificando...' : whiteConnected ? '✓ Conexão verificada' : 'Verificar conexão'}
            </button>

            <PrimaryBtn disabled={!canGoNext3} onClick={() => setStep(4)} style={{ marginTop: 12 }}>
              Próximo →
            </PrimaryBtn>
          </>
        )}

        {/* ── STEP 4: Finalizar ── */}
        {step === 4 && (
          <>
            <h2 style={titleStyle}>Finalizar</h2>
            <p style={subStyle}>Passo 4 de {TOTAL_STEPS}</p>

            <div style={{ background: '#111', borderRadius: 10, padding: '16px', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 0 }}>
              <SummaryRow icon="✓" label="Nome da Operação" value={name} />
              <SummaryRow icon="✓" label="Loja Vitrine" value={blackForm.shop_domain} sub="Conectada com sucesso" />
              <SummaryRow icon="✓" label="Loja Checkout" value={whiteForm.shop_domain} sub="Conectada com sucesso" />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} style={{ flex: '0 0 auto', background: 'none', border: '1px solid #333', color: '#888', borderRadius: 10, padding: '12px 20px', fontSize: 14, cursor: 'pointer' }}>
                ← Voltar
              </button>
              <PrimaryBtn disabled={creating} onClick={finish} style={{ flex: 1 }}>
                {creating ? 'Criando...' : 'Criar Operação'}
              </PrimaryBtn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StoreForm({ form, onChange }) {
  return (
    <>
      <label style={labelStyle}>Domínio da Loja</label>
      <input value={form.shop_domain} onChange={e => onChange(f => ({ ...f, shop_domain: e.target.value }))} placeholder="minha-loja.myshopify.com" style={{ ...inputStyle, marginBottom: 14 }} />
      <label style={labelStyle}>Client ID</label>
      <input value={form.client_id} onChange={e => onChange(f => ({ ...f, client_id: e.target.value }))} placeholder="Cole o Client ID do seu app Shopify" style={{ ...inputStyle, marginBottom: 14 }} />
      <label style={labelStyle}>Client Secret</label>
      <input value={form.client_secret} type="password" onChange={e => onChange(f => ({ ...f, client_secret: e.target.value }))} placeholder="Cole o Client Secret do seu app Shopify" style={{ ...inputStyle, marginBottom: 16 }} />
    </>
  )
}

function PrimaryBtn({ children, onClick, disabled, style = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '13px', border: 'none', borderRadius: 10,
        background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
        color: '#fff', fontSize: 15, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, ...style,
      }}
    >
      {children}
    </button>
  )
}

function SummaryRow({ icon, label, value, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #1e1e1e' }}>
      <div style={{
        width: 28, height: 28, minWidth: 28, borderRadius: '50%',
        background: '#1a2a1a', border: '1px solid #2a4a2a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#4ade80', fontSize: 12,
      }}>{icon}</div>
      <div>
        <div style={{ color: '#888', fontSize: 12, marginBottom: 2 }}>{label}</div>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{value}</div>
        {sub && <div style={{ color: '#4ade80', fontSize: 11, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

const titleStyle = { color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }
const subStyle = { color: '#666', fontSize: 13, marginBottom: 22 }
const labelStyle = { color: '#ccc', fontSize: 13, display: 'block', marginBottom: 7 }
const inputStyle = {
  width: '100%', background: '#111', border: '1px solid #2e2e2e', borderRadius: 8,
  padding: '11px 13px', color: '#fff', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', marginBottom: 0,
}
const verifyBtnStyle = {
  width: '100%', background: 'none', border: 'none', color: '#7c3aed',
  fontSize: 13, cursor: 'pointer', padding: '4px 0', textAlign: 'center',
  textDecoration: 'underline',
}
