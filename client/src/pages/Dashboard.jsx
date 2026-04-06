import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AddOperationModal from '../components/AddOperationModal.jsx'

const PURPLE = '#7c3aed'
const COL_WIDTH = 300

export default function Dashboard() {
  const [columns, setColumns] = useState([])
  const [operations, setOperations] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [addingCol, setAddingCol] = useState(false)
  const [creatingCol, setCreatingCol] = useState(false)
  const newColRef = useRef(null)
  const navigate = useNavigate()

  // ── Drag state ──
  const [drag, setDrag] = useState(null)     // { type:'card'|'col', id, sourceCol, w, h, offX, offY }
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const [dragOverCol, setDragOverCol] = useState(null)
  const [dragOverColId, setDragOverColId] = useState(null)
  const colRefs = useRef({})
  const boardRef = useRef(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => { if (addingCol) newColRef.current?.focus() }, [addingCol])

  // ── Global mouse events during drag ──
  useEffect(() => {
    if (!drag) return
    function onMove(e) {
      setDragPos({ x: e.clientX, y: e.clientY })
      if (drag.type === 'card') {
        for (const [colName, ref] of Object.entries(colRefs.current)) {
          if (!ref) continue
          const r = ref.getBoundingClientRect()
          if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
            setDragOverCol(colName); break
          }
        }
      } else {
        for (const col of columns) {
          const ref = colRefs.current[col.name]
          if (!ref) continue
          const r = ref.getBoundingClientRect()
          if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top) {
            if (col.name !== drag.sourceCol) setDragOverColId(col.id)
            else setDragOverColId(null)
            break
          }
        }
      }
    }
    function onUp() {
      if (drag.type === 'card' && dragOverCol && dragOverCol !== drag.sourceCol) {
        moveCard(drag.id, dragOverCol)
      } else if (drag.type === 'col' && dragOverColId) {
        reorderColumns(drag.id, dragOverColId)
      }
      setDrag(null); setDragOverCol(null); setDragOverColId(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [drag, dragOverCol, dragOverColId, columns])

  async function loadAll() {
    const [cols, ops] = await Promise.all([
      fetch('/api/columns').then(r => r.json()),
      fetch('/api/operations').then(r => r.json()),
    ])
    setColumns(cols)
    setOperations(ops)
  }

  async function moveCard(opId, colName) {
    setOperations(ops => ops.map(op => op.id === opId ? { ...op, column_name: colName } : op))
    await fetch(`/api/operations/${opId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_name: colName }),
    })
  }

  async function deleteOp(opId, e) {
    e.stopPropagation()
    if (!confirm('Excluir esta operação?')) return
    await fetch(`/api/operations/${opId}`, { method: 'DELETE' })
    setOperations(ops => ops.filter(op => op.id !== opId))
  }

  async function reorderColumns(fromId, toId) {
    const from = columns.find(c => c.id === fromId)
    const to = columns.find(c => c.id === toId)
    if (!from || !to) return
    const newCols = columns.map(c => {
      if (c.id === fromId) return { ...c, position: to.position }
      if (c.id === toId) return { ...c, position: from.position }
      return c
    }).sort((a, b) => a.position - b.position)
    setColumns(newCols)
    await Promise.all([
      fetch(`/api/columns/${fromId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: to.position }) }),
      fetch(`/api/columns/${toId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ position: from.position }) }),
    ])
  }

  async function createColumn() {
    const name = newColName.trim()
    if (!name) return setAddingCol(false)
    setCreatingCol(true)
    const res = await fetch('/api/columns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) await loadAll()
    setNewColName(''); setAddingCol(false); setCreatingCol(false)
  }

  async function deleteColumn(colId, colName) {
    if (!confirm(`Excluir coluna "${colName}"?`)) return
    await fetch(`/api/columns/${colId}`, { method: 'DELETE' })
    loadAll()
  }

  async function updateNotes(opId, notes) {
    await fetch(`/api/operations/${opId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
  }

  function startCardDrag(e, op) {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setDrag({ type: 'card', id: op.id, sourceCol: op.column_name, w: rect.width, h: rect.height, offX: e.clientX - rect.left, offY: e.clientY - rect.top })
    setDragPos({ x: e.clientX, y: e.clientY })
    setDragOverCol(op.column_name)
  }

  function startColDrag(e, col) {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setDrag({ type: 'col', id: col.id, sourceCol: col.name, w: rect.width, h: rect.height, offX: e.clientX - rect.left, offY: e.clientY - rect.top })
    setDragPos({ x: e.clientX, y: e.clientY })
  }

  const filtered = operations.filter(op =>
    !search || op.name?.toLowerCase().includes(search.toLowerCase()) ||
    op.black_store?.toLowerCase().includes(search.toLowerCase()) ||
    op.white_store?.toLowerCase().includes(search.toLowerCase())
  )

  const draggingOp = drag?.type === 'card' ? operations.find(o => o.id === drag.id) : null
  const draggingCol = drag?.type === 'col' ? columns.find(c => c.id === drag.id) : null

  return (
    <div ref={boardRef} style={{ padding: '24px 28px', minHeight: '100vh', userSelect: drag ? 'none' : 'auto' }}>
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

      <div style={{ marginBottom: 22 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar operações..."
          style={{
            width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: 999, padding: '11px 20px', color: '#ccc',
            fontSize: 14, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
        {columns.map(col => {
          const colOps = filtered.filter(op => (op.column_name || columns[0]?.name) === col.name)
          const isCardOver = dragOverCol === col.name && drag?.type === 'card' && drag?.sourceCol !== col.name
          const isColOver = dragOverColId === col.id && drag?.type === 'col'
          const isColDragging = drag?.type === 'col' && drag?.id === col.id

          return (
            <div
              key={col.id}
              ref={el => colRefs.current[col.name] = el}
              style={{
                minWidth: COL_WIDTH, width: COL_WIDTH,
                background: isColOver ? '#222' : isCardOver ? '#1f1f1f' : '#1a1a1a',
                borderRadius: 12,
                border: `1px solid ${isColOver ? '#7c3aed66' : isCardOver ? '#3a3a3a' : '#252525'}`,
                display: 'flex', flexDirection: 'column',
                opacity: isColDragging ? 0.3 : 1,
                transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
              }}
            >
              {/* Column Header — drag handle */}
              <div
                onMouseDown={e => startColDrag(e, col)}
                style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #222', cursor: 'grab', position: 'relative' }}
              >
                <span style={{ color: '#555', fontSize: 13 }}>⠿</span>
                <span style={{ color: '#aaa', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', flex: 1 }}>{col.name}</span>
                <span style={{ background: '#252525', color: '#888', fontSize: 11, padding: '2px 7px', borderRadius: 10 }}>{colOps.length}</span>
                <ColMenu onDelete={() => deleteColumn(col.id, col.name)} />
              </div>

              <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 140 }}>
                {colOps.length === 0 ? (
                  <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
                    Arraste operações aqui
                  </div>
                ) : colOps.map(op => (
                  <OperationCard
                    key={op.id}
                    op={op}
                    isDragging={drag?.id === op.id && drag?.type === 'card'}
                    onMouseDown={e => startCardDrag(e, op)}
                    onClick={() => navigate(`/operation/${op.id}`)}
                    onDelete={deleteOp}
                    onUpdateNotes={updateNotes}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Nova Coluna */}
        {addingCol ? (
          <div style={{ minWidth: COL_WIDTH, width: COL_WIDTH, background: '#1a1a1a', borderRadius: 12, border: '1px solid #2a2a2a', padding: '12px 14px' }}>
            <input
              ref={newColRef}
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createColumn(); if (e.key === 'Escape') setAddingCol(false) }}
              placeholder="Nome da coluna"
              style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 7, padding: '9px 12px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createColumn} disabled={creatingCol} style={{ flex: 1, background: `linear-gradient(135deg, ${PURPLE}, #a855f7)`, color: '#fff', border: 'none', borderRadius: 7, padding: '8px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                {creatingCol ? '...' : 'Criar'}
              </button>
              <button onClick={() => { setAddingCol(false); setNewColName('') }} style={{ background: '#252525', color: '#888', border: 'none', borderRadius: 7, padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setAddingCol(true)}
            style={{ minWidth: COL_WIDTH, width: COL_WIDTH, border: '2px dashed #2a2a2a', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', color: '#444', fontSize: 14, gap: 8, cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#444'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2a2a'}
          >
            <span style={{ fontSize: 22 }}>+</span>
            <span>Nova Coluna</span>
          </div>
        )}
      </div>

      {/* ── Floating drag ghost ── */}
      {drag && (draggingOp || draggingCol) && (
        <div style={{
          position: 'fixed',
          left: dragPos.x - drag.offX,
          top: dragPos.y - drag.offY,
          width: drag.w,
          pointerEvents: 'none',
          zIndex: 9999,
          transform: 'rotate(2deg) scale(1.03)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          borderRadius: 12,
          opacity: 0.92,
        }}>
          {draggingOp
            ? <OperationCard op={draggingOp} isGhost onMouseDown={() => {}} onClick={() => {}} onDelete={() => {}} onUpdateNotes={() => {}} />
            : <ColGhost col={draggingCol} />
          }
        </div>
      )}

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

function ColMenu({ onDelete }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <span onMouseDown={e => { e.stopPropagation(); setOpen(o => !o) }} style={{ color: '#444', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1 }}>⋮</span>
      {open && (
        <div style={{ position: 'absolute', top: 24, right: 0, background: '#222', border: '1px solid #333', borderRadius: 8, zIndex: 10, minWidth: 140 }}>
          <button onMouseDown={e => { e.stopPropagation(); setOpen(false); onDelete() }} style={{ display: 'block', width: '100%', background: 'none', border: 'none', color: '#f87171', padding: '10px 14px', textAlign: 'left', fontSize: 13, cursor: 'pointer' }}>
            Excluir coluna
          </button>
        </div>
      )}
    </div>
  )
}

function ColGhost({ col }) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: 12, border: '1px solid #7c3aed55', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#555', fontSize: 13 }}>⠿</span>
      <span style={{ color: '#aaa', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em' }}>{col.name}</span>
    </div>
  )
}

function OperationCard({ op, isDragging, isGhost, onMouseDown, onClick, onDelete, onUpdateNotes }) {
  const [notes, setNotes] = useState(op.notes || '')
  const [hovered, setHovered] = useState(false)
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
      onMouseDown={isGhost ? undefined : onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isGhost ? '#272727' : hovered && !isDragging ? '#272727' : '#222',
        border: `1px solid ${hovered && !isDragging ? '#3e3e3e' : '#2e2e2e'}`,
        borderRadius: 12,
        padding: '18px 18px',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        opacity: isDragging ? 0.15 : 1,
        transform: hovered && !isDragging && !isGhost ? 'translateY(-2px)' : 'none',
        boxShadow: hovered && !isDragging && !isGhost
          ? '0 10px 30px rgba(0,0,0,0.5)'
          : '0 2px 6px rgba(0,0,0,0.25)',
        transition: isDragging ? 'none' : 'transform 0.15s, box-shadow 0.15s, background 0.12s',
        borderLeft: `3px solid ${PURPLE}44`,
      }}
    >
      {/* Name */}
      <div onClick={isGhost ? undefined : onClick} style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 14, cursor: 'pointer', lineHeight: 1.3 }}>
        {op.name}
      </div>

      {/* Stores */}
      <div style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 12px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#555', flexShrink: 0 }} />
          <span style={{ color: '#888', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{op.black_store || '—'}</span>
        </div>
        <div style={{ height: 1, background: '#2a2a2a', margin: '0 0 0 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: '#7c3aed', fontSize: 13, lineHeight: 1, fontWeight: 700 }}>→</span>
          <span style={{ color: '#888', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{op.white_store || '—'}</span>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ color: '#444', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>📅</span> {date}
        </span>
        <span style={{ background: '#1a1a2e', color: '#818cf8', fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 500 }}>
          {op.products_synced || 0} produtos
        </span>
      </div>

      {/* Notes */}
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{ background: '#1a1a1a', borderRadius: 8, padding: '10px 12px' }}
      >
        <div style={{ color: '#444', fontSize: 10, letterSpacing: '0.06em', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>OBSERVAÇÕES</span>
          <span style={{ fontSize: 12, opacity: 0.5 }}>📋</span>
        </div>
        {isGhost ? (
          <div style={{ color: '#444', fontSize: 12, minHeight: 20 }}>{notes || 'Sem observações'}</div>
        ) : (
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Clique para adicionar observação"
            rows={2}
            style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: '#555', fontSize: 12, resize: 'none', fontFamily: 'inherit', cursor: 'text' }}
          />
        )}
      </div>
    </div>
  )
}
