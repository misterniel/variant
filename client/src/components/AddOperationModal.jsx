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

  const APP_URL = window.location.origin
  const REDIRECT_URL = `${APP_URL}/api/auth/callback`

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
      const blackStore = stores.find(s => s.role === 'black' && s.shop_domain.includes(blackForm.shop_domain.replace('.myshopify.com', '')))
      const whiteStore = stores.find(s => s.role === 'white' && s.shop_domain.includes(whiteForm.shop_domain.replace('.myshopify.com', '')))
      if (!blackStore || !whiteStore) return setError('Lojas não encontradas. Verifique se as autorizações foram concluídas.')
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, black_store_id: blackStore.id, white_store_id: whiteStore.id, column_name: defaultColumn }),
      })
      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Erro ao criar operação')
      onCreated()
    } catch { setError('Erro ao criar operação') }
    finally { setCreating(false) }
  }

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'radial-gradient(ellipse at center, #2d1b69 0%, #1a0a3e 40%, #0a0a1a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflowY: 'auto', padding: '20px 0',
    }}>
      <div style={{
        width: 500, background: '#1c1c1c', borderRadius: 16,
        border: '1px solid #2e2e2e', padding: '28px 28px 24px',
        position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        margin: 'auto',
      }}>
        {step > 1 && (
          <button onClick={() => { setStep(s => s - 1); setError('') }}
            style={{ position: 'absolute', top: 22, left: 22, background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 20 }}>←</button>
        )}
        <button onClick={onClose}
          style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 20 }}>✕</button>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <div style={{ width: 46, height: 46, background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff' }}>✕</div>
        </div>

        {/* Progress */}
        <div style={{ height: 3, background: '#2a2a2a', borderRadius: 2, marginBottom: 26, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${PURPLE}, #a855f7)`, borderRadius: 2, transition: 'width 0.3s' }} />
        </div>

        {error && (
          <div style={{ background: '#2a1a1a', border: '1px solid #4a2a2a', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <>
            <h2 style={titleStyle}>Nome da Operação</h2>
            <p style={subStyle}>Passo 1 de {TOTAL_STEPS}</p>
            <label style={labelStyle}>Nome da Operação</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(2)}
              placeholder="Ex: Operação 01, Operação 02" maxLength={100} style={inputStyle} />
            <p style={{ color: '#555', fontSize: 12, margin: '-8px 0 24px' }}>Escolha um nome para identificar esta operação (máx. 100 caracteres)</p>
            <PrimaryBtn disabled={!name.trim()} onClick={() => setStep(2)}>Próximo →</PrimaryBtn>
          </>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <>
            <h2 style={titleStyle}>Conectar Loja Vitrine</h2>
            <p style={subStyle}>Passo 2 de {TOTAL_STEPS}</p>
            <StoreForm form={blackForm} onChange={setBlackForm} />
            <PrimaryBtn
              disabled={!blackForm.shop_domain || !blackForm.client_id || !blackForm.client_secret}
              onClick={() => openOAuth(blackForm, 'black')}
              style={{ marginBottom: 8 }}
            >Simular / Autorizar →</PrimaryBtn>
            <button onClick={() => verifyConnection(blackForm.shop_domain, 'black', setBlackConnected, setVerifyingBlack)}
              disabled={verifyingBlack} style={verifyBtnStyle}>
              {verifyingBlack ? 'Verificando...' : blackConnected ? '✓ Conexão verificada' : 'Verificar conexão'}
            </button>
            <StepByStep appUrl={APP_URL} redirectUrl={REDIRECT_URL} />
            <PrimaryBtn disabled={!blackConnected} onClick={() => setStep(3)} style={{ marginTop: 16 }}>Próximo →</PrimaryBtn>
          </>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (
          <>
            <h2 style={titleStyle}>Conectar Loja Checkout</h2>
            <p style={subStyle}>Passo 3 de {TOTAL_STEPS}</p>
            <StoreForm form={whiteForm} onChange={setWhiteForm} />
            <PrimaryBtn
              disabled={!whiteForm.shop_domain || !whiteForm.client_id || !whiteForm.client_secret}
              onClick={() => openOAuth(whiteForm, 'white')}
              style={{ marginBottom: 8 }}
            >Simular / Autorizar →</PrimaryBtn>
            <button onClick={() => verifyConnection(whiteForm.shop_domain, 'white', setWhiteConnected, setVerifyingWhite)}
              disabled={verifyingWhite} style={verifyBtnStyle}>
              {verifyingWhite ? 'Verificando...' : whiteConnected ? '✓ Conexão verificada' : 'Verificar conexão'}
            </button>
            <StepByStep appUrl={APP_URL} redirectUrl={REDIRECT_URL} />
            <PrimaryBtn disabled={!whiteConnected} onClick={() => setStep(4)} style={{ marginTop: 16 }}>Próximo →</PrimaryBtn>
          </>
        )}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <>
            <h2 style={titleStyle}>Finalizar</h2>
            <p style={subStyle}>Passo 4 de {TOTAL_STEPS}</p>
            <div style={{ background: '#111', borderRadius: 10, padding: '4px 16px', marginBottom: 24 }}>
              <SummaryRow label="Nome da Operação" value={name} />
              <SummaryRow label="Loja Vitrine" value={blackForm.shop_domain} sub="Conectada com sucesso" />
              <SummaryRow label="Loja Checkout" value={whiteForm.shop_domain} sub="Conectada com sucesso" last />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(3)} style={{ flex: '0 0 auto', background: 'none', border: '1px solid #333', color: '#888', borderRadius: 10, padding: '12px 20px', fontSize: 14, cursor: 'pointer' }}>← Voltar</button>
              <PrimaryBtn disabled={creating} onClick={finish} style={{ flex: 1 }}>{creating ? 'Criando...' : 'Criar Operação'}</PrimaryBtn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StepByStep({ appUrl, redirectUrl }) {
  const [copied, setCopied] = useState(null)

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    })
  }

  const steps = [
    { text: 'Acesse o Shopify Admin da sua loja' },
    { text: 'Vá em Configurações' },
    { text: 'Clique em Apps' },
    { text: 'Selecione Desenvolver apps' },
    { text: 'Clique em Desenvolver apps no Dev Dashboard' },
    { text: 'Clique em Create app' },
    { text: 'No campo App name, informe: VariantSync' },
    { text: 'Clique em Create' },
    { text: 'No campo App URL, cole:', url: appUrl, urlKey: 'appUrl' },
    { text: 'Desative a opção "Embed app in Shopify admin"' },
    {
      text: 'Vá até a seção Access e conceda os seguintes escopos:',
      sub: ['read_products', 'write_products', 'read_inventory', 'write_script_tags', 'read_script_tags'],
    },
    { text: 'Vá até a seção Redirect URLs e cole:', url: redirectUrl, urlKey: 'redirectUrl', warning: true },
    { text: 'Clique em Release' },
    { text: 'Confirme e clique em Release novamente' },
    { text: 'Após o release, vá até a aba Settings' },
    { text: 'Copie o Client ID' },
    { text: 'Copie o Client Secret' },
    { text: 'Volte para o VariantSync' },
    { text: 'Cole o Client ID no campo correspondente acima' },
    { text: 'Cole o Client Secret no campo correspondente acima' },
    { text: 'Clique em "Conectar / Autorizar"' },
    { text: 'Autorize o acesso na Shopify quando solicitado' },
  ]

  return (
    <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 10, padding: '16px', marginTop: 16 }}>
      <p style={{ color: '#aaa', fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Passo a passo para criar o App Shopify:</p>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((s, i) => (
          <li key={i} style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>
            <span style={{ color: '#666', marginRight: 6 }}>{i + 1}.</span>
            {s.text}

            {/* URL copiável */}
            {s.url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: s.warning ? 4 : 0 }}>
                <div style={{ flex: 1, background: '#1e1e3a', border: '1px solid #3a3a6a', borderRadius: 6, padding: '7px 10px', color: '#818cf8', fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.url}
                </div>
                <button
                  onClick={() => copy(s.url, s.urlKey)}
                  style={{ background: '#252540', border: '1px solid #3a3a6a', borderRadius: 6, padding: '6px 10px', color: copied === s.urlKey ? '#4ade80' : '#818cf8', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {copied === s.urlKey ? '✓ Copiado' : '⎘ Copiar'}
                </button>
              </div>
            )}

            {/* Aviso URL exata */}
            {s.warning && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 4, background: '#2a2000', border: '1px solid #4a3800', borderRadius: 6, padding: '6px 10px' }}>
                <span style={{ fontSize: 13 }}>⚠️</span>
                <span style={{ color: '#fbbf24', fontSize: 11 }}>A URL deve ser exatamente igual, incluindo https e caminho completo</span>
              </div>
            )}

            {/* Sub-itens (escopos) */}
            {s.sub && (
              <ul style={{ listStyle: 'none', padding: '6px 0 0 12px', margin: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {s.sub.map((item, j) => (
                  <li key={j} style={{ color: '#666', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#444' }}>•</span> {item}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      {/* Resultado */}
      <div style={{ marginTop: 14, background: '#0f2a0f', border: '1px solid #1a4a1a', borderRadius: 8, padding: '10px 12px' }}>
        <span style={{ color: '#4ade80', fontSize: 12 }}>
          <strong>Resultado:</strong> A loja fica conectada via OAuth com segurança. A conexão aparece apenas para você.
        </span>
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
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '13px', border: 'none', borderRadius: 10,
      background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
      color: '#fff', fontSize: 15, fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, ...style,
    }}>{children}</button>
  )
}

function SummaryRow({ label, value, sub, last }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: last ? 'none' : '1px solid #1e1e1e' }}>
      <div style={{ width: 26, height: 26, minWidth: 26, borderRadius: '50%', background: '#1a2a1a', border: '1px solid #2a4a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontSize: 11 }}>✓</div>
      <div>
        <div style={{ color: '#777', fontSize: 12, marginBottom: 2 }}>{label}</div>
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{value}</div>
        {sub && <div style={{ color: '#4ade80', fontSize: 11, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

const titleStyle = { color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 4 }
const subStyle = { color: '#666', fontSize: 13, marginBottom: 22 }
const labelStyle = { color: '#ccc', fontSize: 13, display: 'block', marginBottom: 7 }
const inputStyle = { width: '100%', background: '#111', border: '1px solid #2e2e2e', borderRadius: 8, padding: '11px 13px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }
const verifyBtnStyle = { width: '100%', background: 'none', border: 'none', color: '#7c3aed', fontSize: 13, cursor: 'pointer', padding: '4px 0', textAlign: 'center', textDecoration: 'underline' }
