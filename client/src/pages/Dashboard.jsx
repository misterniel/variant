import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AddOperationModal from '../components/AddOperationModal.jsx'

const PURPLE = '#7c3aed'

export default function Dashboard() {
  const [columns, setColumns] = useState([])
  const [operations, setOperations] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [dragOpId, setDragOpId] = useState(null)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [dragColId, setDragColId] = useState(null)
  const [dragOverColId, setDragOverColId] = useState(null)
  const [newColName, setNewColName] = useState('')
  const [addingCol, setAddingCol] = useState(false)
  const [creatingCol, setCreatingCol] = useState(false)
  const newColRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (addingCol) newColRef.current?.focus() }, [addingCol])

  async function loadAll() {
    const [cols, ops] = await Promise.all([
      fetch('/api/columns').then(r => r.json()),
      fetch('/api/operations').then(r => r.json()),
    ])
    setColumns(cols)
    setOperations(ops)
  }

  async function moveCard(opId, colName) {
    await fetch(`/api/operations/${opId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_name: colName }),
    })
    setOperations(ops => ops.map(op => op.id === opId ? { ...op, column_name: colName } : op))
  }

  async function deleteOp(opId, e) {
    e.stopPropagation()
    if (!confirm('Excluir esta operação?')) return
    await fetch(`/api/operations/${opId}`, { method: 'DELETE' })
    setOperations(ops => ops.filter(op => op.id !== opId))
  }

  async function createColumn() {
    const name = newColName.trim()
    if (!name) return setAddingCol(false)
    setCreatingCol(true)
    const res = await fetch('/api/columns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) { await loadAll() }
    setNewColName('')
    setAddingCol(false)
    setCreatingCol(false)
  }

  async function deleteColumn(colId, colName) {
    if (!confirm(`Excluir coluna "${colName}"? As operações serão movidas para a primeira coluna.`)) return
    await fetch(`/api/columns/${colId}`, { method: 'DELETE' })
    loadAll()
  }

  async function reorderColumns(fromId, toId) {
    if (fromId === toId) return
    const from = columns.find(c => c.id === fromId)
    const to = columns.find(c => c.id === toId)
    if (!from || !to) return

    // Swap positions optimistically
    const newCols = columns.map(c => {
      if (c.id === fromId) return { ...c, position: to.position }
      if (c.id === toId) return { ...c, position: from.position }
      return c
    }).sort((a, b) => a.position - b.position)
    setColumns(newCols)

    // Persist both
    await Promise.all([
      fetch(`/api/columns/${fromId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: to.position }),
      }),
      fetch(`/api/columns/${toId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position: from.position }),
      }),
    ])
  }

  async function updateNotes(opId, notes) {
    await fetch(`/api/operations/${opId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
  }

  const filtered = operations.filter(op =>
    !search ||
    op.name?.toLowerCase().includes(search.toLowerCase()) ||
    op.black_store?.toLowerCase().includes(search.toLowerCase()) ||
    op.white_store?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '24px 28px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
            color: '#fff', border: 'none', borderRadius: 8,
            padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Adicionar Operação
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 22 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar operações..."
          style={{
            width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: 999, padding: '11px 20px', color: '#ccc',
            fontSize: 14, outline: 'none', boxSizing: 'border-box',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            letterSpacing: '0.01em',
          }}
        />
      </div>

      {/* Kanban */}
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
        {columns.map(col => {
          const colOps = filtered.filter(op => (op.column_name || columns[0]?.name) === col.name)
          const isCardOver = dragOverCol === col.name && dragOpId
          const isColOver = dragOverColId === col.id && dragColId && dragColId !== col.id
          return (
            <KanbanColumn
              key={col.id}
              col={col}
              operations={colOps}
              isOver={isCardOver}
              isColOver={isColOver}
              isDraggingCol={dragColId === col.id}
              // Card drag events
              onCardDragOver={e => { e.preventDefault(); if (dragOpId) setDragOverCol(col.name) }}
              onCardDragLeave={() => setDragOverCol(null)}
              onCardDrop={() => { if (dragOpId) moveCard(dragOpId, col.name); setDragOverCol(null) }}
              onCardDragStart={id => setDragOpId(id)}
              onCardDragEnd={() => { setDragOpId(null); setDragOverCol(null) }}
              // Column drag events
              onColDragStart={() => { setDragColId(col.id) }}
              onColDragEnd={() => { setDragColId(null); setDragOverColId(null) }}
              onColDragOver={e => { e.preventDefault(); if (dragColId && dragColId !== col.id) setDragOverColId(col.id) }}
              onColDrop={() => { if (dragColId) reorderColumns(dragColId, col.id); setDragColId(null); setDragOverColId(null) }}
              onDelete={deleteOp}
              onCardClick={id => navigate(`/operation/${id}`)}
              onUpdateNotes={updateNotes}
              onDeleteColumn={() => deleteColumn(col.id, col.name)}
            />
          )
        })}

        {/* Nova Coluna */}
        {addingCol ? (
          <div style={{
            minWidth: 260, width: 260, background: '#1a1a1a', borderRadius: 12,
            border: '1px solid #2a2a2a', padding: '12px 14px',
          }}>
            <input
              ref={newColRef}
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createColumn(); if (e.key === 'Escape') setAddingCol(false) }}
              placeholder="Nome da coluna"
              style={{
                width: '100%', background: '#111', border: '1px solid #333', borderRadius: 7,
                padding: '9px 12px', color: '#fff', fontSize: 14, outline: 'none',
                boxSizing: 'border-box', marginBottom: 10,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createColumn} disabled={creatingCol} style={{
                flex: 1, background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`,
                color: '#fff', border: 'none', borderRadius: 7, padding: '8px',
                fontSize: 13, cursor: 'pointer', fontWeight: 600,
              }}>
                {creatingCol ? '...' : 'Criar'}
              </button>
              <button onClick={() => { setAddingCol(false); setNewColName('') }} style={{
                background: '#252525', color: '#888', border: 'none', borderRadius: 7,
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
              }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setAddingCol(true)}
            style={{
              minWidth: 260, width: 260, border: '2px dashed #2a2a2a', borderRadius: 12,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '32px 16px', color: '#444',
              fontSize: 14, gap: 8, cursor: 'pointer', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#444'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
          >
            <span style={{ fontSize: 22 }}>+</span>
            <span>Nova Coluna</span>
          </div>
        )}
      </div>

      {showModal && (
        <AddOperationModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadAll() }}
          defaultColumn={columns[0]?.name || 'AQUECENDO'}
        />
      )}
    </div>
  )
}

function KanbanColumn({ col, operations, isOver, isColOver, isDraggingCol, onCardDragOver, onCardDragLeave, onCardDrop, onCardDragStart, onCardDragEnd, onColDragStart, onColDragEnd, onColDragOver, onColDrop, onDelete, onCardClick, onUpdateNotes, onDeleteColumn }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onColDragStart() }}
      onDragEnd={onColDragEnd}
      onDragOver={e => { onColDragOver(e); if (!isDraggingCol) onCardDragOver(e) }}
      onDragLeave={() => { onCardDragLeave() }}
      onDrop={e => { e.preventDefault(); if (isDraggingCol || !operations) onColDrop(); else onCardDrop() }}
      style={{
        minWidth: 270, width: 270,
        background: isColOver ? '#222' : isOver ? '#1f1f1f' : '#1a1a1a',
        borderRadius: 12,
        border: `1px solid ${isColOver ? '#7c3aed55' : isOver ? '#3a3a3a' : '#252525'}`,
        display: 'flex', flexDirection: 'column',
        transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
        opacity: isDraggingCol ? 0.45 : 1,
        cursor: 'grab',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #222', position: 'relative' }}>
        <span style={{ color: '#555', fontSize: 13, cursor: 'grab' }}>⠿</span>
        <span style={{ color: '#aaa', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', flex: 1 }}>{col.name}</span>
        <span style={{ background: '#252525', color: '#888', fontSize: 11, padding: '2px 7px', borderRadius: 10 }}>{operations.length}</span>
        <span
          style={{ color: '#444', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1 }}
          onClick={() => setMenuOpen(m => !m)}
        >⋮</span>

        {menuOpen && (
          <div style={{
            position: 'absolute', top: 36, right: 8, background: '#222', border: '1px solid #333',
            borderRadius: 8, zIndex: 10, overflow: 'hidden', minWidth: 140,
          }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setMenuOpen(false); onDeleteColumn() }} style={{
              display: 'block', width: '100%', background: 'none', border: 'none',
              color: '#f87171', padding: '10px 14px', textAlign: 'left', fontSize: 13, cursor: 'pointer',
            }}>Excluir coluna</button>
          </div>
        )}
      </div>

      {/* Cards */}
      <div
        style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}
        onClick={() => setMenuOpen(false)}
      >
        {operations.length === 0 ? (
          <div style={{ color: '#383838', fontSize: 13, textAlign: 'center', padding: '28px 0', pointerEvents: 'none' }}>
            Arraste operações aqui
          </div>
        ) : operations.map(op => (
          <OperationCard
            key={op.id}
            op={op}
            onDragStart={() => onCardDragStart(op.id)}
            onDragEnd={onCardDragEnd}
            onDelete={onDelete}
            onClick={() => onCardClick(op.id)}
            onUpdateNotes={onUpdateNotes}
          />
        ))}
      </div>
    </div>
  )
}

function OperationCard({ op, onDragStart, onDragEnd, onDelete, onClick, onUpdateNotes }) {
  const [notes, setNotes] = useState(op.notes || '')
  const [hovered, setHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const timer = useRef(null)

  function handleNotesChange(e) {
    const v = e.target.value
    setNotes(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onUpdateNotes(op.id, v), 800)
  }

  const date = new Date(op.created_at).toLocaleDateString('pt-BR')

  return (
    <div
      draggable
      onDragStart={e => { setIsDragging(true); onDragStart() }}
      onDragEnd={() => { setIsDragging(false); onDragEnd() }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered && !isDragging ? '#272727' : '#212121',
        border: `1px solid ${hovered && !isDragging ? '#3a3a3a' : '#2e2e2e'}`,
        borderRadius: 12,
        padding: '16px 16px',
        cursor: 'grab',
        userSelect: 'none',
        opacity: isDragging ? 0.45 : 1,
        transform: hovered && !isDragging ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered && !isDragging
          ? '0 8px 24px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)'
          : '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s, border-color 0.15s, opacity 0.15s',
      }}
    >
      {/* Name */}
      <div
        onClick={onClick}
        style={{ fontWeight: 700, color: '#fff', fontSize: 15, marginBottom: 12, cursor: 'pointer', lineHeight: 1.3 }}
      >
        {op.name}
      </div>

      {/* Black store */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
        <span style={{ width: 13, height: 13, borderRadius: '50%', border: '1.5px solid #555', flexShrink: 0, display: 'inline-block' }} />
        <span style={{ color: '#777', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {op.black_store}
        </span>
      </div>

      {/* White store */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
        <span style={{ color: '#555', fontSize: 14, lineHeight: 1 }}>→</span>
        <span style={{ color: '#777', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {op.white_store}
        </span>
      </div>

      {/* Date */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ color: '#444', fontSize: 11 }}>📅</span>
        <span style={{ color: '#444', fontSize: 11 }}>{date}</span>
      </div>

      {/* Notes */}
      <div
        style={{ background: '#1a1a1a', borderRadius: 7, padding: '8px 10px' }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={{ color: '#444', fontSize: 10, letterSpacing: '0.06em', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
          OBSERVAÇÕES <span style={{ fontSize: 12 }}>📋</span>
        </div>
        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Clique para adicionar observação"
          rows={2}
          onMouseDown={e => e.stopPropagation()}
          style={{
            width: '100%', background: 'none', border: 'none', outline: 'none',
            color: '#555', fontSize: 12, resize: 'none', fontFamily: 'inherit', cursor: 'text',
          }}
        />
      </div>
    </div>
  )
}
