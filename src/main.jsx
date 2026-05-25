import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#242220',
          color: '#f5f0e8',
          border: '1px solid #3a3632',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
        },
      }}
    />
  </React.StrictMode>
)
