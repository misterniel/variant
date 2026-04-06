import { shopifyClient } from './shopify.js'
import { getOne, getAll, run } from '../db/database.js'

export async function syncProducts(operationId) {
  const operation = await getOne('SELECT * FROM operations WHERE id = ?', [operationId])
  if (!operation) throw new Error('Operação não encontrada')

  const blackStore = await getOne('SELECT * FROM stores WHERE id = ?', [operation.black_store_id])
  const whiteStore = await getOne('SELECT * FROM stores WHERE id = ?', [operation.white_store_id])

  const blackClient = shopifyClient(blackStore.shop_domain, blackStore.access_token)
  const whiteClient = shopifyClient(whiteStore.shop_domain, whiteStore.access_token)

  let productsSynced = 0
  const errors = []

  try {
    const blackProducts = await blackClient.getProducts()

    for (const blackProduct of blackProducts) {
      try {
        const existingMapping = await getOne(
          'SELECT * FROM product_mappings WHERE operation_id = ? AND black_product_id = ?',
          [operationId, String(blackProduct.id)]
        )

        const productPayload = buildProductPayload(blackProduct)

        if (existingMapping) {
          await whiteClient.updateProduct(existingMapping.white_product_id, productPayload)
          const whiteProduct = await whiteClient.getProduct(existingMapping.white_product_id)
          await updateVariantMappings(existingMapping.id, blackProduct.variants, whiteProduct.variants)
        } else {
          const whiteProduct = await whiteClient.createProduct(productPayload)
          const { lastInsertRowid } = await run(
            'INSERT INTO product_mappings (operation_id, black_product_id, white_product_id) VALUES (?, ?, ?)',
            [operationId, String(blackProduct.id), String(whiteProduct.id)]
          )
          await insertVariantMappings(Number(lastInsertRowid), blackProduct.variants, whiteProduct.variants)
        }

        productsSynced++
      } catch (err) {
        errors.push(`Produto "${blackProduct.title}": ${err.message}`)
      }
    }

    await run(
      'INSERT INTO sync_logs (operation_id, status, message, products_synced) VALUES (?, ?, ?, ?)',
      [operationId, 'success', errors.length > 0 ? errors.join('; ') : null, productsSynced]
    )

    return { success: true, productsSynced, errors }
  } catch (err) {
    await run(
      'INSERT INTO sync_logs (operation_id, status, message, products_synced) VALUES (?, ?, ?, ?)',
      [operationId, 'error', err.message, productsSynced]
    )
    throw err
  }
}

function buildProductPayload(blackProduct) {
  return {
    title: blackProduct.title,
    body_html: blackProduct.body_html,
    vendor: blackProduct.vendor,
    product_type: blackProduct.product_type,
    tags: blackProduct.tags,
    status: blackProduct.status,
    images: blackProduct.images.map(img => ({ src: img.src, alt: img.alt })),
    variants: blackProduct.variants.map(v => ({
      title: v.title,
      price: v.price,
      compare_at_price: v.compare_at_price,
      sku: v.sku,
      option1: v.option1,
      option2: v.option2,
      option3: v.option3,
      weight: v.weight,
      weight_unit: v.weight_unit,
      requires_shipping: v.requires_shipping,
      taxable: v.taxable,
    })),
    options: blackProduct.options.map(o => ({ name: o.name, values: o.values })),
  }
}

async function insertVariantMappings(productMappingId, blackVariants, whiteVariants) {
  for (let i = 0; i < blackVariants.length; i++) {
    const wv = whiteVariants[i]
    if (wv) {
      await run(
        'INSERT INTO variant_mappings (product_mapping_id, black_variant_id, white_variant_id) VALUES (?, ?, ?)',
        [productMappingId, String(blackVariants[i].id), String(wv.id)]
      )
    }
  }
}

async function updateVariantMappings(productMappingId, blackVariants, whiteVariants) {
  await run('DELETE FROM variant_mappings WHERE product_mapping_id = ?', [productMappingId])
  await insertVariantMappings(productMappingId, blackVariants, whiteVariants)
}

export async function installCheckoutScript(operationId) {
  const operation = await getOne('SELECT * FROM operations WHERE id = ?', [operationId])
  const blackStore = await getOne('SELECT * FROM stores WHERE id = ?', [operation.black_store_id])
  const blackClient = shopifyClient(blackStore.shop_domain, blackStore.access_token)

  const scriptUrl = `${process.env.APP_URL}/checkout-script.js?operation=${operationId}`

  const existingScripts = await blackClient.getScriptTags()
  for (const script of existingScripts) {
    if (script.src.includes('checkout-script.js')) {
      await blackClient.deleteScriptTag(script.id)
    }
  }

  await blackClient.createScriptTag(scriptUrl)
}
