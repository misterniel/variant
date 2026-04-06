import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const PURPLE = '#7c3aed'

export default function OperationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [operation, setOperation] = useState(null)
  const [products, setProducts] = useState([])
  const [blackStore, setBlackStore] = useState('')
  const [whiteStore, setWhiteStore] = useState('')
  const [tab, setTab] = useState('mapping')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [installingScript, setInstallingScript] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const [searchBlack, setSearchBlack] = useState('')
  const [searchWhite, setSearchWhite] = useState('')

  useEffect(() => { loadData() }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const [opsRes, prodRes] = await Promise.all([
        fetch('/api/operations').then(r => r.json()),
        fetch(`/api/operations/${id}/products`).then(r => r.json()),
      ])
      const op = opsRes.find(o => String(o.id) === String(id))
      setOperation(op)
      if (!prodRes.error) {
        setProducts(prodRes.products || [])
        setBlackStore(prodRes.black_store || '')
        setWhiteStore(prodRes.white_store || '')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    const res = await fetch(`/api/operations/${id}/sync`, { method: 'POST' })
    const data = await res.json()
    setSyncing(false)
    if (data.error) alert('Erro: ' + data.error)
    else { alert(`${data.productsSynced} produtos sincronizados!`); loadData() }
  }

  async function handleInstallScript() {
    setInstallingScript(true)
    const res = await fetch(`/api/operations/${id}/install-script`, { method: 'POST' })
    const data = await res.json()
    setInstallingScript(false)
    if (data.error) alert('Erro: ' + data.error)
    else alert('Script instalado na loja Vitrine!')
  }

  const filteredBlack = products.filter(p =>
    !searchBlack || p.black?.title?.toLowerCase().includes(searchBlack.toLowerCase())
  )
  const filteredWhite = products.filter(p =>
    !searchWhite || p.white?.title?.toLowerCase().includes(searchWhite.toLowerCase())
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', color: '#555' }}>
      Carregando...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f' }}>
      {/* Top bar */}
      <div style={{
        background: '#141414', borderBottom: '1px solid #222',
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
            {operation?.name || `Operação — ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
          </div>
          <div style={{ color: '#555', fontSize: 12 }}>{blackStore} → {whiteStore}</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <ActionBtn icon="⬇" label="Importar Template" onClick={() => {}} />
          <ActionBtn icon="📄" label="CSV" onClick={() => {}} />
          <ActionBtn icon="↻" label="Atualizar" onClick={handleSync} loading={syncing} />
          <button
            onClick={handleInstallScript}
            disabled={installingScript}
            style={{
              background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            {installingScript ? 'Instalando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 0' }}>
        <div style={{ background: '#1a1a1a', borderRadius: 10, padding: 4, display: 'flex', gap: 2 }}>
          <TabBtn active={tab === 'mapping'} onClick={() => setTab('mapping')}>Mapeamento Padrão</TabBtn>
          <TabBtn active={tab === 'promotions'} onClick={() => setTab('promotions')}>Promoções</TabBtn>
        </div>
      </div>

      {tab === 'mapping' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: '20px 24px' }}>
          {/* Vitrine */}
          <ProductColumn
            title="Vitrine"
            search={searchBlack}
            onSearch={setSearchBlack}
            products={filteredBlack.map(p => ({ ...p.black, index: p.index, mapped: p.mapped }))}
            empty={products.length === 0}
            onSync={handleSync}
            syncing={syncing}
          />

          {/* Checkout */}
          <ProductColumn
            title="Checkout"
            search={searchWhite}
            onSearch={setSearchWhite}
            products={filteredWhite.map(p => ({ ...p.white, index: p.index, mapped: p.mapped }))}
            empty={products.length === 0}
          />
        </div>
      )}

      {tab === 'promotions' && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: '#555' }}>
          Em breve
        </div>
      )}
    </div>
  )
}

function ProductColumn({ title, search, onSearch, products, empty, onSync, syncing }) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 12, border: '1px solid #252525', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, background: '#7c3aed', borderRadius: '50%', display: 'inline-block' }} />
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>{title}</span>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e1e1e' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555', fontSize: 13 }}>🔍</span>
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Buscar produtos..."
            style={{
              width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 7,
              padding: '8px 10px 8px 30px', color: '#ccc', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Products */}
      <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
        {empty ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#444', fontSize: 13 }}>
            {onSync ? (
              <>
                <div style={{ marginBottom: 12 }}>Nenhum produto sincronizado ainda</div>
                <button onClick={onSync} disabled={syncing} style={{
                  background: `linear-gradient(135deg, #7c3aed, #a855f7)`, color: '#fff',
                  border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer',
                }}>
                  {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                </button>
              </>
            ) : 'Sincronize os produtos primeiro'}
          </div>
        ) : products.map((p, i) => p ? (
          <ProductRow key={i} product={p} />
        ) : (
          <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid #1e1e1e', color: '#333', fontSize: 12, textAlign: 'center' }}>
            — não mapeado —
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductRow({ product }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderBottom: '1px solid #1e1e1e',
    }}>
      {/* Drag handle */}
      <span style={{ color: '#333', fontSize: 14, cursor: 'grab' }}>⠿</span>

      {/* Number */}
      <span style={{ color: '#555', fontSize: 12, minWidth: 24 }}>
        {String(product.index).padStart(2, '0')}
      </span>

      {/* Image */}
      <div style={{
        width: 40, height: 40, minWidth: 40, background: '#111', borderRadius: 6,
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {product.image
          ? <img src={product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: '#333', fontSize: 18 }}>□</span>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ color: '#ccc', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {product.title}
        </div>
        <div style={{ color: '#555', fontSize: 11 }}>
          {product.variants?.[0]?.title !== 'Default Title' ? product.variants?.[0]?.title : ''}
        </div>
        <div style={{ color: '#444', fontSize: 11 }}>ID: {product.id}</div>
      </div>

      {/* Price */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ color: '#ccc', fontSize: 13 }}>$ {product.price || '0.00'}</div>
        <span style={{ color: '#555', fontSize: 14, cursor: 'pointer' }}>⇅</span>
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#aaa',
      borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span>{icon}</span> {label}
    </button>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? '#2a2a2a' : 'none', color: active ? '#fff' : '#666',
      border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14,
      cursor: 'pointer', fontWeight: active ? 500 : 400,
    }}>
      {children}
    </button>
  )
}
