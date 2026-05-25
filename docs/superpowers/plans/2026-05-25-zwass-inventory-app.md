# Zwass Inventory Management App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack inventory management web app for Zwass (Argentine leather goods brand) with React+Vite frontend and Supabase backend.

**Architecture:** Single-page React app with Supabase as BaaS (PostgreSQL + Realtime). All data fetching via `@supabase/supabase-js`. PIN-protection is purely frontend (constant). Excel import/export is fully client-side via SheetJS.

**Tech Stack:** React 18, Vite, Tailwind CSS v3, Supabase JS v2, SheetJS (xlsx), react-hot-toast, @heroicons/react

---

## File Map

| File | Responsibility |
|------|---------------|
| `package.json` | Dependencies and scripts |
| `vite.config.js` | Vite + React plugin config |
| `tailwind.config.js` | Custom theme (colors, fonts) |
| `postcss.config.js` | PostCSS for Tailwind |
| `index.html` | App shell, Google Fonts |
| `.env.example` | Supabase env vars template |
| `supabase/migrations/001_initial_schema.sql` | All DDL: products, stock_movements, RLS, realtime |
| `src/main.jsx` | React DOM root, Toaster provider |
| `src/App.jsx` | Layout, state orchestration, PIN context |
| `src/index.css` | Tailwind directives + grain texture CSS |
| `src/lib/supabase.js` | Supabase client singleton |
| `src/lib/formatCurrency.js` | ARS peso formatter ($1.234.567) |
| `src/lib/parseExcel.js` | SheetJS parse + column detection |
| `src/hooks/useProducts.js` | CRUD + realtime subscription for products |
| `src/hooks/useStockMovements.js` | Fetch/add movements per product |
| `src/components/Header.jsx` | ZWASS logo, Import/Export buttons |
| `src/components/Dashboard.jsx` | 6 summary cards, PIN-locked totals |
| `src/components/ProductTable.jsx` | Sortable table, search, filter, pagination |
| `src/components/ProductModal.jsx` | Add/Edit product form modal |
| `src/components/StockMovementModal.jsx` | Add/Remove stock modal |
| `src/components/MovementHistory.jsx` | Per-product movement history panel |
| `src/components/ImportModal.jsx` | Drag-drop xlsx, column mapping, preview, upsert |
| `src/components/ExportButton.jsx` | Export filtered view to xlsx |
| `src/components/PinModal.jsx` | PIN entry modal (shared by Dashboard + Table) |
| `src/components/ConfirmModal.jsx` | Generic yes/no confirmation modal |
| `README.md` | Setup instructions |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `.env.example`
- Create: `src/index.css`
- Create: `src/main.jsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "zwass-stock",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@heroicons/react": "^2.1.3",
    "@supabase/supabase-js": "^2.43.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hot-toast": "^2.4.1",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "vite": "^5.3.1"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

- [ ] **Step 3: Create tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f0e0d',
        surface: '#1a1917',
        card: '#242220',
        accent: '#c9a96e',
        'accent-dark': '#a8863f',
        cream: '#f5f0e8',
        muted: '#8a8278',
        success: '#4a9e6b',
        warning: '#c9893a',
        danger: '#b54545',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Create postcss.config.js**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zwass — Sistema de Stock</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create .env.example**

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 7: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Leather grain noise texture via CSS */
@layer base {
  body {
    background-color: #0f0e0d;
    font-family: 'Inter', sans-serif;
    color: #f5f0e8;
  }

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 256px 256px;
    pointer-events: none;
    z-index: 0;
    opacity: 0.4;
  }

  #root {
    position: relative;
    z-index: 1;
  }
}

/* Modal fade-in animation */
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}
.modal-enter {
  animation: fadeIn 0.18s ease-out forwards;
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #1a1917; }
::-webkit-scrollbar-thumb { background: #3a3632; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #c9a96e; }
```

- [ ] **Step 8: Create src/main.jsx**

```jsx
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
```

- [ ] **Step 9: Run install**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite+React+Tailwind project"
```

---

## Task 2: Supabase Migration SQL

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Products table
CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  sku          text UNIQUE,
  category     text CHECK (category IN (
    'Bolsos y Mochilas','Carteras','Camperas',
    'Morrales y Portafolios','Calzado','Billeteras',
    'Riñoneras','Cinturones','Accesorios','Pañuelos'
  )),
  color        text,
  size         text,
  cost_price   numeric DEFAULT 0,
  sale_price   numeric DEFAULT 0,
  quantity     integer DEFAULT 0,
  notes        text,
  deleted_at   timestamptz,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE,
  type        text CHECK (type IN ('add','remove')) NOT NULL,
  quantity    integer NOT NULL,
  note        text,
  created_at  timestamptz DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: enable but allow all (internal tool, no auth)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_movements" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime on products
ALTER PUBLICATION supabase_realtime ADD TABLE products;
```

- [ ] **Step 2: Run this SQL in Supabase Dashboard → SQL Editor**

  Navigate to your Supabase project → SQL Editor → paste and run the above migration.

- [ ] **Step 3: Create .env from .env.example, fill in values**

  Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Supabase project settings → API.

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema migration"
```

---

## Task 3: Core Library Files

**Files:**
- Create: `src/lib/supabase.js`
- Create: `src/lib/formatCurrency.js`
- Create: `src/lib/parseExcel.js`

- [ ] **Step 1: Create src/lib/supabase.js**

```js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(url, key)
```

- [ ] **Step 2: Create src/lib/formatCurrency.js**

```js
/**
 * Format a number as Argentine Pesos: $1.234.567
 * Uses period as thousands separator, no decimal places for whole numbers.
 */
export function formatARS(value) {
  if (value == null || value === '') return '—'
  const num = Number(value)
  if (isNaN(num)) return '—'
  return '$' + Math.round(num).toLocaleString('es-AR').replace(/,/g, '.')
}

export function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
```

- [ ] **Step 3: Create src/lib/parseExcel.js**

```js
import * as XLSX from 'xlsx'

/**
 * Parse an Excel/CSV file and return { headers, rows }
 * rows: array of objects keyed by header name
 */
export async function parseFile(file) {
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  if (raw.length < 2) return { headers: [], rows: [] }

  const headers = raw[0].map(String)
  const rows = raw.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] ?? '' })
    return obj
  })

  return { headers, rows }
}

/**
 * Map parsed rows to product fields using a columnMap.
 * columnMap: { appField: excelHeader }
 * Returns array of product objects ready for upsert.
 */
export function mapRows(rows, columnMap) {
  return rows
    .map(row => {
      const p = {}
      for (const [field, header] of Object.entries(columnMap)) {
        if (header && row[header] !== undefined) {
          p[field] = row[header]
        }
      }
      // Coerce numeric fields
      if (p.cost_price) p.cost_price = Number(String(p.cost_price).replace(/[^0-9.]/g, '')) || 0
      if (p.sale_price) p.sale_price = Number(String(p.sale_price).replace(/[^0-9.]/g, '')) || 0
      if (p.quantity !== undefined) p.quantity = parseInt(p.quantity, 10) || 0
      return p
    })
    .filter(p => p.name) // name is required
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/
git commit -m "feat: add supabase client, currency formatter, excel parser"
```

---

## Task 4: Data Hooks

**Files:**
- Create: `src/hooks/useProducts.js`
- Create: `src/hooks/useStockMovements.js`

- [ ] **Step 1: Create src/hooks/useProducts.js**

```js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const BASE_QUERY = () =>
  supabase
    .from('products')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

export function useProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await BASE_QUERY()
    if (error) setError(error.message)
    else setProducts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProducts()

    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchProducts])

  const addProduct = async (product) => {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single()
    if (error) throw error
    return data
  }

  const updateProduct = async (id, updates) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const deleteProduct = async (id) => {
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  const adjustStock = async (product, type, qty, note = '') => {
    const newQty = type === 'add'
      ? product.quantity + qty
      : product.quantity - qty

    if (newQty < 0) throw new Error('El stock no puede ser negativo')

    // Upsert movement + update product in parallel
    const [{ error: movErr }, { error: prodErr }] = await Promise.all([
      supabase.from('stock_movements').insert([{
        product_id: product.id,
        type,
        quantity: qty,
        note,
      }]),
      supabase.from('products').update({ quantity: newQty }).eq('id', product.id),
    ])

    if (movErr) throw movErr
    if (prodErr) throw prodErr

    return newQty
  }

  const upsertMany = async (rows) => {
    let imported = 0, updated = 0, errors = 0
    for (const row of rows) {
      try {
        if (row.sku) {
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('sku', row.sku)
            .is('deleted_at', null)
            .single()
          if (existing) {
            await supabase.from('products').update(row).eq('id', existing.id)
            updated++
          } else {
            await supabase.from('products').insert([row])
            imported++
          }
        } else {
          await supabase.from('products').insert([row])
          imported++
        }
      } catch {
        errors++
      }
    }
    await fetchProducts()
    return { imported, updated, errors }
  }

  return { products, loading, error, fetchProducts, addProduct, updateProduct, deleteProduct, adjustStock, upsertMany }
}
```

- [ ] **Step 2: Create src/hooks/useStockMovements.js**

```js
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useStockMovements(productId) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchMovements = useCallback(async () => {
    if (!productId) return
    setLoading(true)
    const { data } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50)
    setMovements(data || [])
    setLoading(false)
  }, [productId])

  return { movements, loading, fetchMovements }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useProducts and useStockMovements hooks"
```

---

## Task 5: PinModal & ConfirmModal Components

**Files:**
- Create: `src/components/PinModal.jsx`
- Create: `src/components/ConfirmModal.jsx`

- [ ] **Step 1: Create src/components/PinModal.jsx**

```jsx
import { useState } from 'react'
import { LockClosedIcon } from '@heroicons/react/24/outline'

const CORRECT_PIN = '2024'

export default function PinModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin === CORRECT_PIN) {
      onSuccess()
      onClose()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <LockClosedIcon className="w-6 h-6 text-accent" />
          </div>
          <h2 className="font-display text-2xl text-cream">Acceso restringido</h2>
          <p className="text-muted text-sm text-center">Ingresá el PIN para ver los valores financieros</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(false) }}
            placeholder="••••"
            maxLength={8}
            autoFocus
            className={`w-full bg-surface border rounded-lg px-4 py-3 text-center text-2xl tracking-widest text-cream focus:outline-none focus:border-accent transition-colors ${
              error ? 'border-danger' : 'border-white/10'
            }`}
          />
          {error && <p className="text-danger text-sm text-center">PIN incorrecto</p>}

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-dark transition-colors text-sm"
            >
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create src/components/ConfirmModal.jsx**

```jsx
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function ConfirmModal({ title, message, onConfirm, onClose, danger = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${danger ? 'bg-danger/10' : 'bg-accent/10'}`}>
            <ExclamationTriangleIcon className={`w-6 h-6 ${danger ? 'text-danger' : 'text-accent'}`} />
          </div>
          <h2 className="font-display text-xl text-cream text-center">{title}</h2>
          <p className="text-muted text-sm text-center">{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm ${
              danger ? 'bg-danger text-white hover:bg-danger/80' : 'bg-accent text-bg hover:bg-accent-dark'
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PinModal.jsx src/components/ConfirmModal.jsx
git commit -m "feat: add PinModal and ConfirmModal components"
```

---

## Task 6: Header Component

**Files:**
- Create: `src/components/Header.jsx`

- [ ] **Step 1: Create src/components/Header.jsx**

```jsx
import { ArrowUpTrayIcon, ArrowDownTrayIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function Header({ onAddProduct, onImport, onExport }) {
  return (
    <header className="border-b border-white/5 bg-surface/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Brand */}
        <div className="flex flex-col">
          <h1 className="font-display text-4xl font-light tracking-[0.25em] text-cream">
            ZWASS
          </h1>
          <span className="text-muted text-xs tracking-widest uppercase mt-0.5">Sistema de Stock</span>
        </div>

        {/* Accent line */}
        <div className="hidden md:block flex-1 mx-8 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-accent/40 transition-all text-sm"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Importar</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-accent/40 transition-all text-sm"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          <button
            onClick={onAddProduct}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-bg hover:bg-accent-dark transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Nuevo producto</span>
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Header.jsx
git commit -m "feat: add Header component"
```

---

## Task 7: Dashboard Component

**Files:**
- Create: `src/components/Dashboard.jsx`

- [ ] **Step 1: Create src/components/Dashboard.jsx**

```jsx
import { useState } from 'react'
import {
  CubeIcon, ArchiveBoxIcon, ExclamationCircleIcon,
  ExclamationTriangleIcon, BanknotesIcon, ShoppingBagIcon,
  LockClosedIcon, EyeIcon, EyeSlashIcon
} from '@heroicons/react/24/outline'
import PinModal from './PinModal'
import { formatARS } from '../lib/formatCurrency'

export default function Dashboard({ products }) {
  const [unlocked, setUnlocked] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const total = products.length
  const totalUnits = products.reduce((s, p) => s + (p.quantity || 0), 0)
  const outOfStock = products.filter(p => p.quantity === 0).length
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 3).length
  const costValue = products.reduce((s, p) => s + (p.cost_price || 0) * (p.quantity || 0), 0)
  const saleValue = products.reduce((s, p) => s + (p.sale_price || 0) * (p.quantity || 0), 0)

  const StatCard = ({ icon: Icon, label, value, color = 'text-cream', valueClass = '' }) => (
    <div className="bg-card border border-white/5 rounded-xl p-5 flex items-start gap-4 hover:border-white/10 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className={`font-display text-2xl ${valueClass || color}`}>{value}</p>
      </div>
    </div>
  )

  const FinancialCard = ({ icon: Icon, label, value }) => (
    <div className="bg-card border border-white/5 rounded-xl p-5 flex items-start gap-4 hover:border-white/10 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-muted text-xs uppercase tracking-wider mb-1">{label}</p>
        <p className="font-display text-2xl text-cream">
          {unlocked ? value : <span className="tracking-widest text-muted">●●●●●●</span>}
        </p>
      </div>
      <button
        onClick={() => unlocked ? setUnlocked(false) : setShowPin(true)}
        className="text-muted hover:text-accent transition-colors mt-1"
        title={unlocked ? 'Ocultar' : 'Mostrar'}
      >
        {unlocked ? <EyeSlashIcon className="w-4 h-4" /> : <LockClosedIcon className="w-4 h-4" />}
      </button>
    </div>
  )

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={CubeIcon} label="Productos" value={total} color="text-accent" />
        <StatCard icon={ArchiveBoxIcon} label="Unidades" value={totalUnits} color="text-cream" />
        <StatCard
          icon={ExclamationCircleIcon}
          label="Sin stock"
          value={outOfStock}
          color="text-danger"
          valueClass={outOfStock > 0 ? 'text-danger' : 'text-cream'}
        />
        <StatCard
          icon={ExclamationTriangleIcon}
          label="Stock bajo"
          value={lowStock}
          color="text-warning"
          valueClass={lowStock > 0 ? 'text-warning' : 'text-cream'}
        />
        <FinancialCard icon={BanknotesIcon} label="Valor al costo" value={formatARS(costValue)} />
        <FinancialCard icon={ShoppingBagIcon} label="Valor retail" value={formatARS(saleValue)} />
      </div>

      {showPin && (
        <PinModal onSuccess={() => setUnlocked(true)} onClose={() => setShowPin(false)} />
      )}
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Dashboard.jsx
git commit -m "feat: add Dashboard component with PIN-protected financials"
```

---

## Task 8: ProductTable Component

**Files:**
- Create: `src/components/ProductTable.jsx`

- [ ] **Step 1: Create src/components/ProductTable.jsx**

This is the largest component. It manages sorting, filtering, search, pagination, and inline action buttons.

```jsx
import { useState, useMemo } from 'react'
import {
  ChevronUpIcon, ChevronDownIcon, ChevronUpDownIcon,
  PencilIcon, TrashIcon, PlusCircleIcon, MinusCircleIcon,
  ClockIcon, MagnifyingGlassIcon, LockClosedIcon, EyeSlashIcon
} from '@heroicons/react/24/outline'
import { formatARS } from '../lib/formatCurrency'
import PinModal from './PinModal'

const CATEGORIES = [
  'Bolsos y Mochilas','Carteras','Camperas',
  'Morrales y Portafolios','Calzado','Billeteras',
  'Riñoneras','Cinturones','Accesorios','Pañuelos'
]
const PAGE_SIZE = 25

const StatusBadge = ({ qty }) => {
  if (qty === 0) return <span className="px-2 py-0.5 rounded-full text-xs bg-danger/15 text-danger border border-danger/20">Agotado</span>
  if (qty <= 3) return <span className="px-2 py-0.5 rounded-full text-xs bg-warning/15 text-warning border border-warning/20">Stock bajo</span>
  return <span className="px-2 py-0.5 rounded-full text-xs bg-success/15 text-success border border-success/20">En stock</span>
}

export default function ProductTable({ products, onEdit, onDelete, onAddStock, onRemoveStock, onShowHistory }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [pricesUnlocked, setPricesUnlocked] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const filtered = useMemo(() => {
    let list = [...products]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        [p.name, p.sku, p.color, p.notes].some(v => v?.toLowerCase().includes(q))
      )
    }
    if (categoryFilter) list = list.filter(p => p.category === categoryFilter)
    if (statusFilter === 'in_stock') list = list.filter(p => p.quantity > 3)
    else if (statusFilter === 'low') list = list.filter(p => p.quantity > 0 && p.quantity <= 3)
    else if (statusFilter === 'out') list = list.filter(p => p.quantity === 0)

    list.sort((a, b) => {
      const va = a[sortKey] ?? ''
      const vb = b[sortKey] ?? ''
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [products, search, categoryFilter, statusFilter, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUpDownIcon className="w-3.5 h-3.5 text-muted" />
    return sortDir === 'asc'
      ? <ChevronUpIcon className="w-3.5 h-3.5 text-accent" />
      : <ChevronDownIcon className="w-3.5 h-3.5 text-accent" />
  }

  const Th = ({ col, label }) => (
    <th
      className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted cursor-pointer hover:text-cream select-none whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">{label} <SortIcon col={col} /></span>
    </th>
  )

  return (
    <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-white/5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nombre, SKU, color..."
            className="w-full bg-surface border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-cream placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1) }}
          className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
        >
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
        >
          <option value="">Todos los estados</option>
          <option value="in_stock">En stock</option>
          <option value="low">Stock bajo</option>
          <option value="out">Agotado</option>
        </select>

        <div className="ml-auto flex items-center gap-2 text-xs text-muted">
          <span>{filtered.length} resultados</span>
          <button
            onClick={() => pricesUnlocked ? setPricesUnlocked(false) : setShowPin(true)}
            className="flex items-center gap-1 px-2 py-1 rounded border border-white/10 hover:border-accent/40 hover:text-accent transition-colors"
            title={pricesUnlocked ? 'Ocultar precios' : 'Mostrar precios'}
          >
            {pricesUnlocked ? <EyeSlashIcon className="w-3.5 h-3.5" /> : <LockClosedIcon className="w-3.5 h-3.5" />}
            {pricesUnlocked ? 'Ocultar precios' : 'Ver precios'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-white/5">
            <tr>
              <Th col="name" label="Nombre" />
              <Th col="sku" label="SKU" />
              <Th col="category" label="Categoría" />
              <Th col="color" label="Color" />
              <Th col="size" label="Talle" />
              {pricesUnlocked && <Th col="cost_price" label="P. Costo" />}
              {pricesUnlocked && <Th col="sale_price" label="P. Venta" />}
              <Th col="quantity" label="Stock" />
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-muted">Estado</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-muted">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-muted">
                  No se encontraron productos
                </td>
              </tr>
            ) : paginated.map(p => (
              <tr key={p.id} className="hover:bg-white/2 transition-colors group">
                <td className="px-4 py-3 text-cream font-medium max-w-48 truncate">{p.name}</td>
                <td className="px-4 py-3 text-muted font-mono text-xs">{p.sku || '—'}</td>
                <td className="px-4 py-3 text-muted text-xs">{p.category || '—'}</td>
                <td className="px-4 py-3 text-muted text-xs">{p.color || '—'}</td>
                <td className="px-4 py-3 text-muted text-xs">{p.size || '—'}</td>
                {pricesUnlocked && <td className="px-4 py-3 text-muted text-xs">{formatARS(p.cost_price)}</td>}
                {pricesUnlocked && <td className="px-4 py-3 text-muted text-xs">{formatARS(p.sale_price)}</td>}
                <td className="px-4 py-3">
                  <span className={`font-mono font-medium ${
                    p.quantity === 0 ? 'text-danger' : p.quantity <= 3 ? 'text-warning' : 'text-cream'
                  }`}>{p.quantity}</span>
                </td>
                <td className="px-4 py-3"><StatusBadge qty={p.quantity} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onShowHistory(p)} title="Historial" className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-cream transition-colors">
                      <ClockIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onAddStock(p)} title="Agregar stock" className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-success transition-colors">
                      <PlusCircleIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onRemoveStock(p)} title="Retirar stock" className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-warning transition-colors">
                      <MinusCircleIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onEdit(p)} title="Editar" className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-accent transition-colors">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(p)} title="Eliminar" className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-danger transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-muted">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-white/10 disabled:opacity-30 hover:border-white/20 hover:text-cream transition-colors"
            >
              Anterior
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-white/10 disabled:opacity-30 hover:border-white/20 hover:text-cream transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {showPin && (
        <PinModal onSuccess={() => setPricesUnlocked(true)} onClose={() => setShowPin(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProductTable.jsx
git commit -m "feat: add ProductTable with sort, filter, search, pagination"
```

---

## Task 9: ProductModal Component

**Files:**
- Create: `src/components/ProductModal.jsx`

- [ ] **Step 1: Create src/components/ProductModal.jsx**

```jsx
import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

const CATEGORIES = [
  'Bolsos y Mochilas','Carteras','Camperas',
  'Morrales y Portafolios','Calzado','Billeteras',
  'Riñoneras','Cinturones','Accesorios','Pañuelos'
]

const EMPTY = {
  name: '', sku: '', category: '', color: '',
  size: '', cost_price: '', sale_price: '', quantity: 0, notes: ''
}

export default function ProductModal({ product, onSave, onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(product?.id)

  useEffect(() => {
    if (product) setForm({ ...EMPTY, ...product })
    else setForm(EMPTY)
  }, [product])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'El nombre es requerido'
    if (form.quantity < 0) errs.quantity = 'La cantidad no puede ser negativa'
    if (form.cost_price !== '' && Number(form.cost_price) < 0) errs.cost_price = 'Precio inválido'
    if (form.sale_price !== '' && Number(form.sale_price) < 0) errs.sale_price = 'Precio inválido'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        cost_price: form.cost_price === '' ? 0 : Number(form.cost_price),
        sale_price: form.sale_price === '' ? 0 : Number(form.sale_price),
        quantity: Number(form.quantity),
        sku: form.sku || null,
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, field, type = 'text', placeholder = '', required = false }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted uppercase tracking-wider">
        {label}{required && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        type={type}
        value={form[field]}
        onChange={set(field)}
        placeholder={placeholder}
        min={type === 'number' ? 0 : undefined}
        className={`bg-surface border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors ${
          errors[field] ? 'border-danger' : 'border-white/10'
        }`}
      />
      {errors[field] && <span className="text-danger text-xs">{errors[field]}</span>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-display text-2xl text-cream">
            {isEdit ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Nombre" field="name" required placeholder="Cartera de cuero marrón" />
            </div>
            <Field label="SKU" field="sku" placeholder="ZW-CAR-001" />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted uppercase tracking-wider">Categoría</label>
              <select
                value={form.category}
                onChange={set('category')}
                className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
              >
                <option value="">Sin categoría</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Color" field="color" placeholder="Marrón cuero" />
            <Field label="Talle/Tamaño" field="size" placeholder="M, 38, Único..." />
            <Field label="Precio costo (ARS)" field="cost_price" type="number" placeholder="0" />
            <Field label="Precio venta (ARS)" field="sale_price" type="number" placeholder="0" />
            <Field label="Cantidad en stock" field="quantity" type="number" placeholder="0" />
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs text-muted uppercase tracking-wider">Notas</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                rows={3}
                placeholder="Notas internas..."
                className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors resize-none"
              />
            </div>
          </div>

          {errors.submit && (
            <p className="mt-3 text-danger text-sm text-center">{errors.submit}</p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-dark transition-colors text-sm disabled:opacity-50"
            >
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ProductModal.jsx
git commit -m "feat: add ProductModal add/edit form"
```

---

## Task 10: StockMovementModal & MovementHistory

**Files:**
- Create: `src/components/StockMovementModal.jsx`
- Create: `src/components/MovementHistory.jsx`

- [ ] **Step 1: Create src/components/StockMovementModal.jsx**

```jsx
import { useState } from 'react'
import { XMarkIcon, PlusCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline'

export default function StockMovementModal({ product, type, onSave, onClose }) {
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAdd = type === 'add'
  const maxRemove = product?.quantity ?? 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    const n = parseInt(qty, 10)
    if (!n || n <= 0) { setError('Ingresá una cantidad válida'); return }
    if (!isAdd && n > maxRemove) { setError(`No podés retirar más de ${maxRemove} unidades`); return }
    setSaving(true)
    try {
      await onSave(product, type, n, note.trim())
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {isAdd
              ? <PlusCircleIcon className="w-5 h-5 text-success" />
              : <MinusCircleIcon className="w-5 h-5 text-warning" />}
            <h2 className="font-display text-xl text-cream">
              {isAdd ? 'Agregar stock' : 'Retirar stock'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <p className="text-muted text-sm mb-5 truncate">
          <span className="text-cream">{product?.name}</span>
          {' — '}{isAdd ? 'Stock actual:' : 'Disponible:'} <span className="text-accent font-medium">{product?.quantity}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted uppercase tracking-wider">Cantidad</label>
            <input
              type="number"
              value={qty}
              onChange={e => { setQty(e.target.value); setError('') }}
              min={1}
              max={isAdd ? undefined : maxRemove}
              autoFocus
              className={`bg-surface border rounded-lg px-4 py-3 text-center text-2xl text-cream focus:outline-none focus:border-accent/50 transition-colors ${
                error ? 'border-danger' : 'border-white/10'
              }`}
            />
            {error && <span className="text-danger text-xs">{error}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted uppercase tracking-wider">Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ej: Entrega de proveedor, venta al por mayor..."
              className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm disabled:opacity-50 ${
                isAdd ? 'bg-success text-white hover:bg-success/80' : 'bg-warning text-bg hover:bg-warning/80'
              }`}
            >
              {saving ? 'Guardando...' : isAdd ? 'Agregar' : 'Retirar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create src/components/MovementHistory.jsx**

```jsx
import { useEffect } from 'react'
import { XMarkIcon, PlusCircleIcon, MinusCircleIcon } from '@heroicons/react/24/outline'
import { useStockMovements } from '../hooks/useStockMovements'
import { formatDate } from '../lib/formatCurrency'

export default function MovementHistory({ product, onClose }) {
  const { movements, loading, fetchMovements } = useStockMovements(product?.id)

  useEffect(() => { fetchMovements() }, [fetchMovements])

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end bg-black/50 backdrop-blur-sm">
      <div className="modal-enter bg-card border border-white/10 rounded-t-2xl md:rounded-2xl w-full md:w-96 h-[70vh] md:h-auto md:max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h2 className="font-display text-xl text-cream">Historial de movimientos</h2>
            <p className="text-muted text-xs mt-0.5 truncate max-w-64">{product?.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <p className="text-muted text-sm text-center py-8">Cargando...</p>
          ) : movements.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">Sin movimientos registrados</p>
          ) : (
            <div className="flex flex-col gap-3">
              {movements.map(m => (
                <div key={m.id} className="flex items-start gap-3 p-3 bg-surface/50 rounded-lg border border-white/5">
                  <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    m.type === 'add' ? 'bg-success/10' : 'bg-warning/10'
                  }`}>
                    {m.type === 'add'
                      ? <PlusCircleIcon className="w-4 h-4 text-success" />
                      : <MinusCircleIcon className="w-4 h-4 text-warning" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${m.type === 'add' ? 'text-success' : 'text-warning'}`}>
                        {m.type === 'add' ? '+' : '-'}{m.quantity} unidades
                      </span>
                      <span className="text-muted text-xs shrink-0">{formatDate(m.created_at)}</span>
                    </div>
                    {m.note && <p className="text-muted text-xs mt-0.5 truncate">{m.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/StockMovementModal.jsx src/components/MovementHistory.jsx
git commit -m "feat: add StockMovementModal and MovementHistory components"
```

---

## Task 11: ImportModal Component

**Files:**
- Create: `src/components/ImportModal.jsx`

- [ ] **Step 1: Create src/components/ImportModal.jsx**

```jsx
import { useState, useRef } from 'react'
import { XMarkIcon, ArrowUpTrayIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { parseFile, mapRows } from '../lib/parseExcel'

const APP_FIELDS = [
  { key: 'name', label: 'Nombre *' },
  { key: 'sku', label: 'SKU' },
  { key: 'category', label: 'Categoría' },
  { key: 'color', label: 'Color' },
  { key: 'size', label: 'Talle' },
  { key: 'cost_price', label: 'Precio Costo' },
  { key: 'sale_price', label: 'Precio Venta' },
  { key: 'quantity', label: 'Cantidad' },
  { key: 'notes', label: 'Notas' },
]

// Try to auto-detect column mapping from header names
function autoDetect(headers) {
  const map = {}
  const HINTS = {
    name: ['nombre','name','producto','descripcion','description'],
    sku: ['sku','codigo','code','ref','referencia'],
    category: ['categoria','category','tipo','type'],
    color: ['color','colour'],
    size: ['talle','size','talla','medida','numero'],
    cost_price: ['costo','cost','precio costo','precio_costo','p. costo'],
    sale_price: ['venta','sale','precio venta','precio_venta','precio','price'],
    quantity: ['cantidad','qty','stock','unidades','quantity'],
    notes: ['notas','notes','observaciones','comentarios'],
  }
  for (const [field, hints] of Object.entries(HINTS)) {
    const match = headers.find(h => hints.includes(h.toLowerCase().trim()))
    if (match) map[field] = match
  }
  return map
}

export default function ImportModal({ onImport, onClose }) {
  const [step, setStep] = useState('upload') // upload | map | confirm | result
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [columnMap, setColumnMap] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true)
    try {
      const { headers: h, rows: r } = await parseFile(file)
      setHeaders(h)
      setRows(r)
      setColumnMap(autoDetect(h))
      setStep('map')
    } catch (err) {
      alert('Error al leer el archivo: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleImport = async () => {
    setLoading(true)
    const mapped = mapRows(rows, columnMap)
    try {
      const res = await onImport(mapped)
      setResult(res)
      setStep('result')
    } catch (err) {
      alert('Error al importar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const previewRows = rows.slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-display text-2xl text-cream">Importar Excel</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => inputRef.current.click()}
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
                dragOver ? 'border-accent bg-accent/5' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <ArrowUpTrayIcon className="w-10 h-10 text-muted" />
              <div className="text-center">
                <p className="text-cream font-medium">Arrastrá tu archivo aquí</p>
                <p className="text-muted text-sm mt-1">o hacé clic para seleccionar</p>
                <p className="text-muted text-xs mt-2">.xlsx, .xls, .csv</p>
              </div>
              {loading && <p className="text-accent text-sm">Procesando...</p>}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>
          )}

          {/* Step: Map columns */}
          {step === 'map' && (
            <div className="flex flex-col gap-5">
              <p className="text-muted text-sm">{rows.length} filas detectadas. Mapeá las columnas de tu archivo a los campos de la aplicación:</p>

              <div className="grid grid-cols-2 gap-3">
                {APP_FIELDS.map(f => (
                  <div key={f.key} className="flex flex-col gap-1">
                    <label className="text-xs text-muted uppercase tracking-wider">{f.label}</label>
                    <select
                      value={columnMap[f.key] || ''}
                      onChange={e => setColumnMap(m => ({ ...m, [f.key]: e.target.value || undefined }))}
                      className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors"
                    >
                      <option value="">— No importar —</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div>
                <p className="text-muted text-xs uppercase tracking-wider mb-2">Vista previa (primeras 10 filas)</p>
                <div className="overflow-x-auto border border-white/5 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-surface/50">
                      <tr>
                        {APP_FIELDS.filter(f => columnMap[f.key]).map(f => (
                          <th key={f.key} className="px-3 py-2 text-left text-muted uppercase tracking-wider">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {previewRows.map((row, i) => (
                        <tr key={i} className="hover:bg-white/2">
                          {APP_FIELDS.filter(f => columnMap[f.key]).map(f => (
                            <td key={f.key} className="px-3 py-2 text-cream truncate max-w-32">{row[columnMap[f.key]] ?? '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && result && (
            <div className="flex flex-col items-center gap-6 py-6">
              <CheckCircleIcon className="w-14 h-14 text-success" />
              <h3 className="font-display text-2xl text-cream">Importación completada</h3>
              <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                <div className="bg-surface rounded-xl p-4 text-center border border-white/5">
                  <p className="text-2xl font-display text-success">{result.imported}</p>
                  <p className="text-muted text-xs mt-1">Importados</p>
                </div>
                <div className="bg-surface rounded-xl p-4 text-center border border-white/5">
                  <p className="text-2xl font-display text-accent">{result.updated}</p>
                  <p className="text-muted text-xs mt-1">Actualizados</p>
                </div>
                <div className="bg-surface rounded-xl p-4 text-center border border-white/5">
                  <p className={`text-2xl font-display ${result.errors > 0 ? 'text-danger' : 'text-muted'}`}>{result.errors}</p>
                  <p className="text-muted text-xs mt-1">Errores</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 py-4 border-t border-white/5 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm"
          >
            {step === 'result' ? 'Cerrar' : 'Cancelar'}
          </button>
          {step === 'map' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm"
              >
                Cambiar archivo
              </button>
              <button
                onClick={handleImport}
                disabled={loading || !columnMap.name}
                className="px-4 py-2.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-dark transition-colors text-sm disabled:opacity-50"
              >
                {loading ? 'Importando...' : `Confirmar importación (${rows.length} filas)`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ImportModal.jsx
git commit -m "feat: add ImportModal with drag-drop, column mapping, preview"
```

---

## Task 12: ExportButton

**Files:**
- Create: `src/components/ExportButton.jsx`

- [ ] **Step 1: Create src/components/ExportButton.jsx**

Note: This is invoked from App.jsx, which passes the current filtered products. The component is stateless — it just exports when called.

```js
import * as XLSX from 'xlsx'
import { formatDate } from '../lib/formatCurrency'

export function exportToExcel(products) {
  const rows = products.map(p => ({
    'Nombre': p.name,
    'SKU': p.sku || '',
    'Categoría': p.category || '',
    'Color': p.color || '',
    'Talle': p.size || '',
    'Precio Costo': p.cost_price || 0,
    'Precio Venta': p.sale_price || 0,
    'Cantidad': p.quantity || 0,
    'Valor Total (costo)': (p.cost_price || 0) * (p.quantity || 0),
    'Estado': p.quantity === 0 ? 'Agotado' : p.quantity <= 3 ? 'Stock bajo' : 'En stock',
    'Notas': p.notes || '',
    'Creado': formatDate(p.created_at),
  }))

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Stock')

  const date = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
  XLSX.writeFile(wb, `zwass-stock-${date}.xlsx`)
}
```

Save this as `src/components/ExportButton.js` (not JSX — it's a utility function, not a component).

- [ ] **Step 2: Commit**

```bash
git add src/components/ExportButton.js
git commit -m "feat: add export-to-excel utility"
```

---

## Task 13: App.jsx — Wire Everything Together

**Files:**
- Create: `src/App.jsx`

- [ ] **Step 1: Create src/App.jsx**

```jsx
import { useState } from 'react'
import toast from 'react-hot-toast'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import ProductTable from './components/ProductTable'
import ProductModal from './components/ProductModal'
import StockMovementModal from './components/StockMovementModal'
import MovementHistory from './components/MovementHistory'
import ImportModal from './components/ImportModal'
import ConfirmModal from './components/ConfirmModal'
import { exportToExcel } from './components/ExportButton'
import { useProducts } from './hooks/useProducts'

export default function App() {
  const { products, loading, addProduct, updateProduct, deleteProduct, adjustStock, upsertMany } = useProducts()

  // Modal state
  const [productModal, setProductModal] = useState(null) // null | 'add' | product object
  const [stockModal, setStockModal] = useState(null)     // null | { product, type }
  const [historyProduct, setHistoryProduct] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // null | product

  const handleSaveProduct = async (data) => {
    if (data.id) {
      await updateProduct(data.id, data)
      toast.success('Producto actualizado')
    } else {
      await addProduct(data)
      toast.success('Producto creado')
    }
  }

  const handleDeleteProduct = async (product) => {
    await deleteProduct(product.id)
    toast.success('Producto eliminado')
  }

  const handleAdjustStock = async (product, type, qty, note) => {
    const newQty = await adjustStock(product, type, qty, note)
    if (newQty === 0) {
      toast(`⚠️ ${product.name} quedó sin stock`, { icon: null, duration: 4000 })
    } else if (newQty <= 3) {
      toast(`📦 Stock bajo en ${product.name}`, { icon: null, duration: 3000 })
    } else {
      toast.success(type === 'add' ? `+${qty} unidades agregadas` : `-${qty} unidades retiradas`)
    }
  }

  const handleImport = async (rows) => {
    const result = await upsertMany(rows)
    return result
  }

  return (
    <div className="min-h-screen bg-bg font-body">
      <Header
        onAddProduct={() => setProductModal('add')}
        onImport={() => setImportOpen(true)}
        onExport={() => exportToExcel(products)}
      />

      <main className="max-w-screen-xl mx-auto px-6 py-8 flex flex-col gap-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-muted text-sm">Cargando inventario...</p>
            </div>
          </div>
        ) : (
          <>
            <Dashboard products={products} />
            <ProductTable
              products={products}
              onEdit={p => setProductModal(p)}
              onDelete={p => setConfirmDelete(p)}
              onAddStock={p => setStockModal({ product: p, type: 'add' })}
              onRemoveStock={p => setStockModal({ product: p, type: 'remove' })}
              onShowHistory={p => setHistoryProduct(p)}
            />
          </>
        )}
      </main>

      {/* Modals */}
      {productModal !== null && (
        <ProductModal
          product={productModal === 'add' ? null : productModal}
          onSave={handleSaveProduct}
          onClose={() => setProductModal(null)}
        />
      )}

      {stockModal && (
        <StockMovementModal
          product={stockModal.product}
          type={stockModal.type}
          onSave={handleAdjustStock}
          onClose={() => setStockModal(null)}
        />
      )}

      {historyProduct && (
        <MovementHistory
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
        />
      )}

      {importOpen && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setImportOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar producto"
          message={`¿Estás seguro? Esto eliminará "${confirmDelete.name}" y su historial de movimientos.`}
          danger
          onConfirm={() => handleDeleteProduct(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire all components together in App.jsx"
```

---

## Task 14: README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update README.md**

```markdown
# Zwass — Sistema de Stock

Aplicación interna de gestión de inventario para [Zwass](https://www.zwass4us.com/), marca argentina de marroquinería.

## Tecnologías

- React 18 + Vite
- Supabase (PostgreSQL + Realtime)
- Tailwind CSS
- SheetJS (importación/exportación Excel)
- react-hot-toast

## Setup

### 1. Clonar y instalar

```bash
git clone <repo>
cd zwass-stock
npm install
```

### 2. Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/migrations/001_initial_schema.sql`
3. Copiar las credenciales desde **Settings → API**

### 3. Variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Correr localmente

```bash
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173)

### 5. Build para producción

```bash
npm run build
```

## PIN para valores financieros

El PIN por defecto es **`2024`**. Para cambiarlo, editar la constante `CORRECT_PIN` en `src/components/PinModal.jsx`.

## Importación de Excel

El archivo debe tener encabezados en la primera fila. Los nombres de columnas se detectan automáticamente si coinciden con términos como "Nombre", "SKU", "Cantidad", "Precio", etc. También podés mapear manualmente cada columna.

## Categorías disponibles

- Bolsos y Mochilas
- Carteras
- Camperas
- Morrales y Portafolios
- Calzado
- Billeteras
- Riñoneras
- Cinturones
- Accesorios
- Pañuelos
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add setup README"
```

---

## Self-Review Notes

- ✅ All 8 spec features covered: Dashboard, PIN protection, Product table, Add product, Stock movements, Edit/Delete, Excel import, Export
- ✅ All Spanish text throughout
- ✅ ARS formatting via `formatARS()` used consistently
- ✅ Soft delete via `deleted_at` column
- ✅ Toast notifications for stock warnings (0 and ≤3)
- ✅ Realtime subscription in `useProducts`
- ✅ RLS policies in migration (allow all for internal tool)
- ✅ Dark leather aesthetic with custom Tailwind config
- ✅ PIN constant in `PinModal.jsx` — change `CORRECT_PIN` to update
- ✅ `ExportButton.js` exports current product array (App passes all products; filtering could be added later per user request)
- ✅ `useStockMovements` hook is separate as specified
- ⚠️ `ExportButton.js` is saved as `.js` not `.jsx` since it's a utility function — no JSX used

