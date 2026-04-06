import { Router } from 'express'
import { getOne, getAll, run } from '../db/database.js'
import { syncProducts, installCheckoutScript } from '../services/productSync.js'
import { shopifyClient } from '../services/shopify.js'

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

// PATCH /api/operations/:id
router.patch('/:id', async (req, res) => {
  const { status, column_name, notes, name } = req.body
  const op = await getOne('SELECT * FROM operations WHERE id = ?', [req.params.id])
  if (!op) return res.status(404).json({ error: 'Operação não encontrada' })
  await run(
    'UPDATE operations SET status = ?, column_name = ?, notes = ?, name = ? WHERE id = ?',
    [status ?? op.status, column_name ?? op.column_name, notes ?? op.notes, name ?? op.name, req.params.id]
  )
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

// GET /api/operations/:id/products — products from both stores side by side
router.get('/:id/products', async (req, res) => {
  const operation = await getOne('SELECT * FROM operations WHERE id = ?', [req.params.id])
  if (!operation) return res.status(404).json({ error: 'Operação não encontrada' })

  const blackStore = await getOne('SELECT * FROM stores WHERE id = ?', [operation.black_store_id])
  const whiteStore = await getOne('SELECT * FROM stores WHERE id = ?', [operation.white_store_id])

  const mappings = await getAll('SELECT * FROM product_mappings WHERE operation_id = ?', [req.params.id])

  try {
    const [blackProducts, whiteProducts] = await Promise.all([
      shopifyClient(blackStore.shop_domain, blackStore.access_token).getProducts(),
      shopifyClient(whiteStore.shop_domain, whiteStore.access_token).getProducts(),
    ])

    const whiteById = {}
    for (const p of whiteProducts) whiteById[String(p.id)] = p

    const result = blackProducts.map((bp, index) => {
      const mapping = mappings.find(m => m.black_product_id === String(bp.id))
      const wp = mapping ? whiteById[mapping.white_product_id] : null
      return {
        index: index + 1,
        black: { id: bp.id, title: bp.title, image: bp.images?.[0]?.src, price: bp.variants?.[0]?.price, variants: bp.variants },
        white: wp ? { id: wp.id, title: wp.title, image: wp.images?.[0]?.src, price: wp.variants?.[0]?.price, variants: wp.variants } : null,
        mapped: !!mapping,
      }
    })

    res.json({ products: result, black_store: blackStore.shop_domain, white_store: whiteStore.shop_domain })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
