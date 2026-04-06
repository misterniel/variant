import { Router } from 'express'
import { getOne, getAll, run } from '../db/database.js'
import { syncProducts, installCheckoutScript } from '../services/productSync.js'

const router = Router()

// GET /api/operations
router.get('/', async (req, res) => {
  const operations = await getAll(`
    SELECT
      op.id, op.name, op.status, op.created_at,
      bs.shop_domain as black_store, bs.id as black_store_id,
      ws.shop_domain as white_store, ws.id as white_store_id,
      (SELECT COUNT(*) FROM product_mappings pm WHERE pm.operation_id = op.id) as products_synced,
      (SELECT created_at FROM sync_logs sl WHERE sl.operation_id = op.id ORDER BY sl.created_at DESC LIMIT 1) as last_sync
    FROM operations op
    JOIN stores bs ON op.black_store_id = bs.id
    JOIN stores ws ON op.white_store_id = ws.id
    ORDER BY op.created_at DESC
  `)
  res.json(operations)
})

// POST /api/operations
router.post('/', async (req, res) => {
  const { name, black_store_id, white_store_id } = req.body
  if (!name || !black_store_id || !white_store_id)
    return res.status(400).json({ error: 'Nome, loja black e loja white são obrigatórios' })
  if (String(black_store_id) === String(white_store_id))
    return res.status(400).json({ error: 'As lojas devem ser diferentes' })

  const blackStore = await getOne('SELECT * FROM stores WHERE id = ? AND role = ?', [black_store_id, 'black'])
  const whiteStore = await getOne('SELECT * FROM stores WHERE id = ? AND role = ?', [white_store_id, 'white'])
  if (!blackStore) return res.status(400).json({ error: 'Loja Black não encontrada' })
  if (!whiteStore) return res.status(400).json({ error: 'Loja White não encontrada' })

  const { lastInsertRowid } = await run(
    'INSERT INTO operations (name, black_store_id, white_store_id) VALUES (?, ?, ?)',
    [name, black_store_id, white_store_id]
  )
  const operation = await getOne('SELECT * FROM operations WHERE id = ?', [lastInsertRowid])
  res.status(201).json(operation)
})

// PATCH /api/operations/:id/status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body
  if (!['active', 'paused'].includes(status))
    return res.status(400).json({ error: 'Status inválido' })
  await run('UPDATE operations SET status = ? WHERE id = ?', [status, req.params.id])
  res.json({ success: true })
})

// DELETE /api/operations/:id
router.delete('/:id', async (req, res) => {
  await run('DELETE FROM operations WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

// POST /api/operations/:id/sync
router.post('/:id/sync', async (req, res) => {
  try {
    const result = await syncProducts(Number(req.params.id))
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/operations/:id/install-script
router.post('/:id/install-script', async (req, res) => {
  try {
    await installCheckoutScript(Number(req.params.id))
    res.json({ success: true, message: 'Script de checkout instalado na loja Black' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/operations/:id/logs
router.get('/:id/logs', async (req, res) => {
  const logs = await getAll(
    'SELECT * FROM sync_logs WHERE operation_id = ? ORDER BY created_at DESC LIMIT 20',
    [req.params.id]
  )
  res.json(logs)
})

// GET /api/operations/:id/mappings
router.get('/:id/mappings', async (req, res) => {
  const mappings = await getAll(`
    SELECT pm.*, COUNT(vm.id) as variant_count
    FROM product_mappings pm
    LEFT JOIN variant_mappings vm ON vm.product_mapping_id = pm.id
    WHERE pm.operation_id = ?
    GROUP BY pm.id
    ORDER BY pm.synced_at DESC
  `, [req.params.id])
  res.json(mappings)
})

export default router
