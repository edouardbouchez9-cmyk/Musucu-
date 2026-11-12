import '@fontsource/barlow/latin-400.css'
import '@fontsource/barlow/latin-500.css'
import '@fontsource/barlow/latin-600.css'
import '@fontsource/barlow-condensed/latin-500.css'
import '@fontsource/barlow-condensed/latin-600.css'
import '@fontsource/barlow-condensed/latin-700.css'
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { depot } from './donnees'

// Le service worker rend l'app utilisable hors ligne. Il ne fonctionne pas
// dans un cadre (iframe), par exemple dans un aperçu.
if (window.self === window.top) registerSW({ immediate: true })

// Demande au navigateur de ne pas effacer les données en cas de manque de place.
navigator.storage?.persist?.().catch(() => undefined)

const racine = createRoot(document.getElementById('root')!)

depot
  .initialiser()
  .then(() => {
    racine.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch(() => {
    racine.render(
      <main className="app">
        <h1>Stockage indisponible</h1>
        <p>
          Ce navigateur bloque le stockage local, dont l’app a besoin pour garder tes séances. Ouvre l’app dans Safari
          hors navigation privée.
        </p>
      </main>,
    )
  })
