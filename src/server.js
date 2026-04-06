import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import authRoutes from './routes/auth.js'
import operationsRoutes from './routes/operations.js'
import checkoutRoutes from './routes/checkout.js'
import columnsRoutes from './routes/columns.js'
import { initDB } from './db/database.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// Checkout redirect script (injetado na loja black via ScriptTag)
app.get('/checkout-script.js', (req, res) => {
  const { operation } = req.query
  const appUrl = process.env.APP_URL

  res.set('Content-Type', 'application/javascript')
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Cache-Control', 'no-cache')

  res.send(`
(function() {
  var OPERATION_ID = '${operation}';
  var API_URL = '${appUrl}';

  function getCartAndRedirect() {
    fetch('/cart.js')
      .then(function(r) { return r.json(); })
      .then(function(cart) {
        if (!cart.items || cart.items.length === 0) return;

        var variants = cart.items.map(function(item) {
          return { variant_id: item.variant_id, quantity: item.quantity };
        });

        return fetch(API_URL + '/api/checkout/map?operation_id=' + OPERATION_ID + '&variants=' + encodeURIComponent(JSON.stringify(variants)));
      })
      .then(function(r) { return r && r.json(); })
      .then(function(data) {
        if (data && data.checkout_url) {
          window.location.href = data.checkout_url;
        }
      })
      .catch(function(err) {
        console.error('[VariantSync] Erro ao redirecionar checkout:', err);
      });
  }

  function interceptCheckout() {
    // Intercepta cliques em botões de checkout
    document.addEventListener('click', function(e) {
      var el = e.target;
      while (el && el !== document) {
        var tag = el.tagName ? el.tagName.toLowerCase() : '';
        var name = el.name || '';
        var cls = el.className || '';
        var href = el.href || '';
        var isCheckoutBtn = (
          (tag === 'button' && /checkout/i.test(name + cls)) ||
          (tag === 'a' && /\\/checkout/i.test(href)) ||
          (tag === 'input' && el.type === 'submit' && /checkout/i.test(el.value))
        );
        if (isCheckoutBtn) {
          e.preventDefault();
          e.stopPropagation();
          getCartAndRedirect();
          return;
        }
        el = el.parentElement;
      }
    }, true);

    // Intercepta submit de formulários de checkout
    document.addEventListener('submit', function(e) {
      if (e.target.action && /\\/checkout/i.test(e.target.action)) {
        e.preventDefault();
        getCartAndRedirect();
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', interceptCheckout);
  } else {
    interceptCheckout();
  }
})();
  `.trim())
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/operations', operationsRoutes)
app.use('/api/checkout', checkoutRoutes)
app.use('/api/columns', columnsRoutes)

// Serve React frontend
const clientDist = path.join(__dirname, '../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`VariantSync rodando na porta ${PORT}`)
    console.log(`APP_URL: ${process.env.APP_URL || 'não configurado'}`)
  })
}).catch(err => {
  console.error('Erro ao inicializar banco de dados:', err)
  process.exit(1)
})
