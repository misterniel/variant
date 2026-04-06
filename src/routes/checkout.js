import { Router } from 'express'
import { getOne } from '../db/database.js'

const router = Router()

// GET /api/checkout/map
router.get('/map', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  const { operation_id, variants } = req.query

  if (!operation_id || !variants)
    return res.status(400).json({ error: 'Parâmetros inválidos' })

  let parsedVariants
  try { parsedVariants = JSON.parse(variants) }
  catch { return res.status(400).json({ error: 'Formato de variantes inválido' }) }

  const operation = await getOne('SELECT * FROM operations WHERE id = ? AND status = ?', [operation_id, 'active'])
  if (!operation) return res.status(404).json({ error: 'Operação não encontrada ou pausada' })

  const whiteStore = await getOne('SELECT shop_domain FROM stores WHERE id = ?', [operation.white_store_id])

  const mappedVariants = []
  for (const item of parsedVariants) {
    const mapping = await getOne(`
      SELECT vm.white_variant_id
      FROM variant_mappings vm
      JOIN product_mappings pm ON vm.product_mapping_id = pm.id
      WHERE pm.operation_id = ? AND vm.black_variant_id = ?
    `, [operation_id, String(item.variant_id)])

    if (mapping) mappedVariants.push({ variant_id: mapping.white_variant_id, quantity: item.quantity })
  }

  if (mappedVariants.length === 0)
    return res.status(404).json({ error: 'Nenhuma variante mapeada encontrada' })

  const cartPath = mappedVariants.map(v => `${v.variant_id}:${v.quantity}`).join(',')
  res.json({ checkout_url: `https://${whiteStore.shop_domain}/cart/${cartPath}` })
})

export default router
