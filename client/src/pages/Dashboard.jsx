import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AddOperationModal from '../components/AddOperationModal.jsx'

const COLUMNS = ['AQUECENDO', 'PRÉ ESCALA', 'ESCALA', 'BLOCK']
const PURPLE = '#7c3aed'

export default function Dashboard() {
  const [operations, setOperations] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => { loadOps() }, [])

  async function loadOps() {
    const res = await fetch('/api/operations')
    setOperations(await res.json())
  }

  async function moveToColumn(opId, col) {
    await fetch(`/api/operations/${opId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_name: col }),
    })
    loadOps()
  }

  async function deleteOp(opId, e) {
    e.stopPropagation()
    if (!confirm('Excluir esta operação?')) return
    await fetch(`/api/operations/${opId}`, { method: 'DELETE' })
    loadOps()
  }

  const filtered = operations.filter(op =>
    op.name.toLowerCase().includes(search.toLowerCase()) ||
    op.black_store?.toLowerCase().includes(search.toLowerCase()) ||
    op.white_store?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Adicionar Operação
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555', fontSize: 14 }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar operações..."
          style={{
            width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: 8, padding: '10px 12px 10px 36px', color: '#ccc',
            fontSize: 14, outline: 'none',
          }}
        />
      </div>

      {/* Kanban */}
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
        {COLUMNS.map(col => {
          const colOps = filtered.filter(op => (op.column_name || 'AQUECENDO') === col)
          return (
            <KanbanColumn
              key={col}
              title={col}
              count={colOps.length}
              operations={colOps}
              onDragOver={e => e.preventDefault()}
              onDrop={() => dragId && moveToColumn(dragId, col)}
              onDragStart={id => setDragId(id)}
              onDragEnd={() => setDragId(null)}
              onDelete={deleteOp}
              onCardClick={id => navigate(`/operation/${id}`)}
              onUpdateNotes={(id, notes) => {
                fetch(`/api/operations/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ notes }),
                })
              }}
            />
          )
        })}

        {/* Nova Coluna placeholder */}
        <div style={{
          minWidth: 260, width: 260, border: '2px dashed #2a2a2a', borderRadius: 12,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '32px 16px', color: '#444',
          fontSize: 14, gap: 8, cursor: 'default',
        }}>
          <span style={{ fontSize: 24 }}>+</span>
          <span>Nova Coluna</span>
        </div>
      </div>

      {showModal && (
        <AddOperationModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadOps() }}
        />
      )}
    </div>
  )
}

function KanbanColumn({ title, count, operations, onDragOver, onDrop, onDragStart, onDragEnd, onDelete, onCardClick, onUpdateNotes }) {
  return (
    <div
      style={{ minWidth: 270, width: 270, background: '#1a1a1a', borderRadius: 12, border: '1px solid #252525', display: 'flex', flexDirection: 'column' }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Column header */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #222' }}>
        <span style={{ color: '#555', fontSize: 13 }}>⠿</span>
        <span style={{ color: '#aaa', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', flex: 1 }}>{title}</span>
        <span style={{ background: '#252525', color: '#888', fontSize: 11, padding: '2px 7px', borderRadius: 10 }}>{count}</span>
        <span style={{ color: '#444', cursor: 'pointer', fontSize: 16 }}>⋮</span>
      </div>

      {/* Cards */}
      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
        {operations.length === 0 ? (
          <div style={{ color: '#383838', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>
            Arraste operações aqui
          </div>
        ) : operations.map(op => (
          <OperationCard
            key={op.id}
            op={op}
            onDragStart={() => onDragStart(op.id)}
            onDragEnd={onDragEnd}
            onDelete={onDelete}
            onClick={() => onCardClick(op.id)}
            onUpdateNotes={onUpdateNotes}
          />
        ))}

        {/* Add card button */}
        <button style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', textAlign: 'left', padding: '6px 4px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>+</span>
        </button>
      </div>
    </div>
  )
}

function OperationCard({ op, onDragStart, onDragEnd, onDelete, onClick, onUpdateNotes }) {
  const [notes, setNotes] = useState(op.notes || '')
  const notesTimer = useRef(null)

  function handleNotesChange(e) {
    const v = e.target.value
    setNotes(v)
    clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => onUpdateNotes(op.id, v), 800)
  }

  const date = new Date(op.created_at).toLocaleDateString('pt-BR')

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        background: '#212121', border: '1px solid #2e2e2e', borderRadius: 10,
        padding: '12px 14px', cursor: 'grab', userSelect: 'none',
      }}
    >
      {/* Name */}
      <div
        onClick={onClick}
        style={{ fontWeight: 700, color: '#fff', fontSize: 15, marginBottom: 10, cursor: 'pointer' }}
      >
        {op.name}
      </div>

      {/* Black store */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #555', display: 'inline-block', flexShrink: 0 }} />
        <span style={{ color: '#888', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {op.black_store}
        </span>
      </div>

      {/* White store */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <span style={{ color: '#555', fontSize: 14, lineHeight: 1 }}>→</span>
        <span style={{ color: '#888', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {op.white_store}
        </span>
      </div>

      {/* Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ color: '#555', fontSize: 11 }}>📅</span>
        <span style={{ color: '#555', fontSize: 11 }}>{date}</span>
      </div>

      {/* Notes */}
      <div style={{ background: '#1a1a1a', borderRadius: 7, padding: '8px 10px' }} onClick={e => e.stopPropagation()}>
        <div style={{ color: '#555', fontSize: 10, letterSpacing: '0.06em', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
          OBSERVAÇÕES <span>📋</span>
        </div>
        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Clique para adicionar observação"
          rows={2}
          style={{
            width: '100%', background: 'none', border: 'none', outline: 'none',
            color: '#666', fontSize: 12, resize: 'none', fontFamily: 'inherit',
            cursor: 'text',
          }}
        />
      </div>
    </div>
  )
}
