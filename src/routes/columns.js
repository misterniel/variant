import { Router } from 'express'
import { getAll, getOne, run } from '../db/database.js'

const router = Router()

// GET /api/columns
router.get('/', async (req, res) => {
  const cols = await getAll('SELECT * FROM board_columns ORDER BY position ASC')
  res.json(cols)
})

// POST /api/columns
router.post('/', async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' })

  const existing = await getOne('SELECT id FROM board_columns WHERE name = ?', [name.trim().toUpperCase()])
  if (existing) return res.status(400).json({ error: 'Coluna já existe' })

  const maxPos = await getOne('SELECT MAX(position) as max FROM board_columns')
  const position = (Number(maxPos?.max) || 0) + 1

  const { lastInsertRowid } = await run(
    'INSERT INTO board_columns (name, position) VALUES (?, ?)',
    [name.trim().toUpperCase(), position]
  )
  const col = await getOne('SELECT * FROM board_columns WHERE id = ?', [lastInsertRowid])
  res.status(201).json(col)
})

// PATCH /api/columns/:id
router.patch('/:id', async (req, res) => {
  const { name, position } = req.body
  const col = await getOne('SELECT * FROM board_columns WHERE id = ?', [req.params.id])
  if (!col) return res.status(404).json({ error: 'Coluna não encontrada' })
  await run(
    'UPDATE board_columns SET name = ?, position = ? WHERE id = ?',
    [name ?? col.name, position ?? col.position, req.params.id]
  )
  res.json({ success: true })
})

// DELETE /api/columns/:id
router.delete('/:id', async (req, res) => {
  const col = await getOne('SELECT * FROM board_columns WHERE id = ?', [req.params.id])
  if (!col) return res.status(404).json({ error: 'Coluna não encontrada' })

  // Move operations from this column to first column
  const firstCol = await getOne('SELECT name FROM board_columns WHERE id != ? ORDER BY position ASC LIMIT 1', [req.params.id])
  if (firstCol) {
    await run('UPDATE operations SET column_name = ? WHERE column_name = ?', [firstCol.name, col.name])
  }

  await run('DELETE FROM board_columns WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

export default router
