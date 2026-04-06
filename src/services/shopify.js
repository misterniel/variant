import axios from 'axios'

export function shopifyClient(shopDomain, accessToken) {
  const base = `https://${shopDomain}/admin/api/2024-01`

  const client = axios.create({
    baseURL: base,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  })

  return {
    async getProducts(params = {}) {
      const res = await client.get('/products.json', {
        params: { limit: 250, ...params },
      })
      return res.data.products
    },

    async getProduct(productId) {
      const res = await client.get(`/products/${productId}.json`)
      return res.data.product
    },

    async createProduct(productData) {
      const res = await client.post('/products.json', { product: productData })
      return res.data.product
    },

    async updateProduct(productId, productData) {
      const res = await client.put(`/products/${productId}.json`, { product: productData })
      return res.data.product
    },

    async getInventoryLevels(inventoryItemIds) {
      const ids = inventoryItemIds.join(',')
      const res = await client.get('/inventory_levels.json', {
        params: { inventory_item_ids: ids },
      })
      return res.data.inventory_levels
    },

    async setInventoryLevel(locationId, inventoryItemId, available) {
      const res = await client.post('/inventory_levels/set.json', {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available,
      })
      return res.data.inventory_level
    },

    async getLocations() {
      const res = await client.get('/locations.json')
      return res.data.locations
    },

    async getScriptTags() {
      const res = await client.get('/script_tags.json')
      return res.data.script_tags
    },

    async createScriptTag(src) {
      const res = await client.post('/script_tags.json', {
        script_tag: { event: 'onload', src },
      })
      return res.data.script_tag
    },

    async deleteScriptTag(scriptTagId) {
      await client.delete(`/script_tags/${scriptTagId}.json`)
    },

    async getShop() {
      const res = await client.get('/shop.json')
      return res.data.shop
    },
  }
}

export async function exchangeCodeForToken(shop, clientId, clientSecret, code) {
  const res = await axios.post(`https://${shop}/admin/oauth/access_token`, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
  })
  return res.data.access_token
}

export function buildOAuthUrl(shop, clientId, redirectUri, state) {
  const scopes = 'read_products,write_products,read_inventory,write_inventory,write_script_tags,read_script_tags'
  return `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
}
