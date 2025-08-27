import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

console.log('NovaGift: Starting application...')

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('NovaGift: Root element not found!')
} else {
  console.log('NovaGift: Root element found, rendering app...')
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  console.log('NovaGift: App rendered successfully')
}