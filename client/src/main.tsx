import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'
import './index.css'
import App from './App.tsx'
import { Toaster } from './components/ui/sonner'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster />
    </BrowserRouter>
  </React.StrictMode>
)