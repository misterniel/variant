import { Router } from 'express'
import crypto from 'crypto'
import { buildOAuthUrl, exchangeCodeForToken } from '../services/shopify.js'
import { getOne, getAll, run } from '../db/database.js'

const router = Router()
const pendingSessions = new Map()

// POST /api/auth/connect
router.post('/connect', (req, res) => {
  const { shop_domain, client_id, client_secret, role } = req.body
  if (!shop_domain || !client_id || !client_secret || !role)
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' })
  if (!['black', 'white'].includes(role))
    return res.status(400).json({ error: 'Role deve ser black ou white' })

  const shop = shop_domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const state = crypto.randomBytes(16).toString('hex')
  const redirectUri = `${process.env.APP_URL}/api/auth/callback`

  pendingSessions.set(state, { shop, client_id, client_secret, role })
  setTimeout(() => pendingSessions.delete(state), 10 * 60 * 1000)

  res.json({ redirect_url: buildOAuthUrl(shop, client_id, redirectUri, state) })
})

// GET /api/auth/callback
router.get('/callback', async (req, res) => {
  const { shop, code, state } = req.query
  const session = pendingSessions.get(state)
  if (!session) return res.status(400).send('Sessão inválida ou expirada. Tente conectar novamente.')
  pendingSessions.delete(state)

  try {
    const accessToken = await exchangeCodeForToken(shop, session.client_id, session.client_secret, code)
    const existing = await getOne('SELECT id FROM stores WHERE shop_domain = ?', [shop])

    if (existing) {
      await run('UPDATE stores SET access_token = ?, client_id = ?, client_secret = ?, role = ? WHERE shop_domain = ?',
        [accessToken, session.client_id, session.client_secret, session.role, shop])
    } else {
      await run('INSERT INTO stores (shop_domain, access_token, client_id, client_secret, role) VALUES (?, ?, ?, ?, ?)',
        [shop, accessToken, session.client_id, session.client_secret, session.role])
    }

    res.redirect(`${process.env.APP_URL}/?connected=true&shop=${shop}&role=${session.role}`)
  } catch (err) {
    console.error('OAuth error:', err.message)
    res.redirect(`${process.env.APP_URL}/?error=oauth_failed`)
  }
})

// GET /api/auth/stores
router.get('/stores', async (req, res) => {
  const stores = await getAll('SELECT id, shop_domain, role, created_at FROM stores ORDER BY created_at DESC')
  res.json(stores)
})

// DELETE /api/auth/stores/:id
router.delete('/stores/:id', async (req, res) => {
  await run('DELETE FROM stores WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

export default router
