# Sales/POS Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete sales/POS module (Historial de Ventas + Resumen de Caja) alongside the existing Stock module in the Zwass app, with atomic stock decrement via Supabase triggers.

**Architecture:** Two-tab single-page app driven by `activeTab` state in `App.jsx`. Existing components are reorganized under `components/stock/` and `components/shared/`; new `components/sales/` houses the new module. Stock decrement is handled by a Postgres trigger so the frontend just inserts/updates `sales` rows. Realtime sync via Supabase Realtime channels (one per hook).

**Tech Stack:** React 18 + Vite + Tailwind CSS + Supabase (Postgres + Realtime) + recharts (new) + xlsx (existing).

**Reference spec:** `docs/superpowers/specs/2026-05-26-sales-pos-module-design.md` (commit `a4e8c37`).

**Verification approach:** Project has no automated test framework. Each task is verified via (a) `npm run build` for type/import safety, (b) Supabase MCP `execute_sql` for DB tasks, (c) reading the dev server output log to confirm HMR succeeded without errors, (d) a final manual end-to-end checklist (Task 17).

---

## File Structure

**Moves (with `git mv` to preserve history):**

| From | To |
|---|---|
| `src/components/Header.jsx` | `src/components/shared/Header.jsx` |
| `src/components/PinModal.jsx` | `src/components/shared/PinModal.jsx` |
| `src/components/ConfirmModal.jsx` | `src/components/shared/ConfirmModal.jsx` |
| `src/components/Dashboard.jsx` | `src/components/stock/Dashboard.jsx` |
| `src/components/ProductTable.jsx` | `src/components/stock/ProductTable.jsx` |
| `src/components/ProductModal.jsx` | `src/components/stock/ProductModal.jsx` |
| `src/components/StockMovementModal.jsx` | `src/components/stock/StockMovementModal.jsx` |
| `src/components/MovementHistory.jsx` | `src/components/stock/MovementHistory.jsx` |
| `src/components/ImportModal.jsx` | `src/components/stock/ImportModal.jsx` |
| `src/components/ExportButton.js` | `src/components/stock/ExportButton.js` |

**New files:**

| Path | Responsibility |
|---|---|
| `supabase/migrations/002_sales_schema.sql` | `sales` table + RLS + indexes + invoice numbering trigger + stock adjust trigger + realtime |
| `src/contexts/PinContext.jsx` | Shared unlock state for Stock module (Dashboard + ProductTable) |
| `src/lib/formatCurrency.js` *(modify)* | Extend with `formatMoney(amount, currency)` for ARS/USD/EUR |
| `src/lib/exportSalesSummary.js` | Excel export of Resumen + Detalle sheets |
| `src/hooks/useSales.js` | Fetch, realtime, registerSale, voidSale, summary helpers |
| `src/components/shared/Nav.jsx` | Tab switcher Stock/Ventas + "Vendido hoy" indicator |
| `src/components/stock/StockView.jsx` | Wraps existing stock components |
| `src/components/sales/SalesView.jsx` | Container + Historial/Resumen toggle + CTA |
| `src/components/sales/RegisterSaleButton.jsx` | The big "● Registrar Venta" CTA |
| `src/components/sales/RegisterSaleModal.jsx` | 3-step orchestrator |
| `src/components/sales/ProductPicker.jsx` | Step 1: search + cards |
| `src/components/sales/SaleDetailsForm.jsx` | Step 2: form |
| `src/components/sales/SalesHistory.jsx` | Historial table + filters + Anular venta |
| `src/components/sales/CashRegisterSummary.jsx` | Resumen container (filter + table + charts + actions) |
| `src/components/sales/PaymentMethodTable.jsx` | The 10×3 summary grid |
| `src/components/sales/SalesCharts.jsx` | 3 recharts (bar daily, donut by method, top 5) |
| `src/components/sales/PrintableSummary.jsx` | Print-only view with dotted-frame |

**Modify:** `src/App.jsx` (tab routing), `src/components/stock/ProductTable.jsx` (Vender button), `src/components/stock/Dashboard.jsx` + `src/components/stock/ProductTable.jsx` (use PinContext), `package.json` (add recharts).

---

## Task 1: DB migration — `sales` table, indexes, RLS, realtime

**Files:**
- Create: `supabase/migrations/002_sales_schema.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/002_sales_schema.sql`:

```sql
-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  text UNIQUE NOT NULL,
  product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name    text NOT NULL,
  sku             text,
  category        text,
  color           text,
  size            text,
  quantity        integer NOT NULL CHECK (quantity > 0),
  unit_price      numeric NOT NULL,
  total_price     numeric NOT NULL,
  payment_method  text NOT NULL CHECK (payment_method IN (
    'Efectivo Pesos','Tarjeta Crédito','Tarjeta Débito','Mercado Pago',
    'Efectivo Dólares','Efectivo Euros','Cuenta Corriente','Débora',
    'Transferencia','Mercado Libre'
  )),
  nationality     text DEFAULT 'Arg' CHECK (nationality IN ('Arg','Extranjero')),
  currency        text DEFAULT 'ARS' CHECK (currency IN ('ARS','USD','EUR')),
  notes           text,
  voided_at       timestamptz,
  sold_at         timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sales_sold_at_idx ON sales (sold_at DESC);
CREATE INDEX IF NOT EXISTS sales_payment_method_idx ON sales (payment_method);
CREATE INDEX IF NOT EXISTS sales_active_idx ON sales (voided_at) WHERE voided_at IS NULL;

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_sales" ON sales FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE sales;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with `project_id: ngcqagfxukyzipynjzyf`, `name: sales_schema`, `query` = full SQL above (without the `IF NOT EXISTS` for the index can fail on first run but is idempotent here).

- [ ] **Step 3: Verify the table exists**

Run via MCP `execute_sql`:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'sales' ORDER BY ordinal_position;
```

Expected: 18 rows matching the schema.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_sales_schema.sql
git commit -m "feat(sales): migration 002 — sales table + RLS + realtime"
```

---

## Task 2: DB migration — invoice numbering trigger

**Files:**
- Modify: `supabase/migrations/002_sales_schema.sql` *(append)*

- [ ] **Step 1: Append the trigger SQL**

Append to `supabase/migrations/002_sales_schema.sql`:

```sql
-- Invoice numbering: VTA-AAAAMMDD-NNN, resets per Argentina day
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  day_str text;
  next_seq int;
BEGIN
  day_str := to_char((now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date, 'YYYYMMDD');
  SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM 14)::int), 0) + 1
    INTO next_seq
    FROM sales
   WHERE invoice_number LIKE 'VTA-' || day_str || '-%';
  NEW.invoice_number := 'VTA-' || day_str || '-' || lpad(next_seq::text, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_invoice_number
  BEFORE INSERT ON sales
  FOR EACH ROW WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();
```

- [ ] **Step 2: Apply via MCP `execute_sql`** (using the same project_id)

- [ ] **Step 3: Verify the trigger fires**

```sql
INSERT INTO sales (product_name, quantity, unit_price, total_price, payment_method)
VALUES ('TEST', 1, 100, 100, 'Efectivo Pesos')
RETURNING invoice_number;
```

Expected: `VTA-YYYYMMDD-001` where YYYYMMDD is today in Argentina TZ.

Then clean up:
```sql
DELETE FROM sales WHERE product_name = 'TEST';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_sales_schema.sql
git commit -m "feat(sales): invoice numbering trigger"
```

---

## Task 3: DB migration — stock adjust trigger

**Files:**
- Modify: `supabase/migrations/002_sales_schema.sql` *(append)*

- [ ] **Step 1: Append the trigger SQL**

```sql
-- Stock adjust: decrement on sale insert, restore on void (UPDATE setting voided_at)
CREATE OR REPLACE FUNCTION adjust_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  current_qty int;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.product_id IS NOT NULL THEN
    SELECT quantity INTO current_qty FROM products WHERE id = NEW.product_id FOR UPDATE;
    IF current_qty < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente: hay % unidades disponibles', current_qty;
    END IF;
    UPDATE products SET quantity = quantity - NEW.quantity WHERE id = NEW.product_id;

  ELSIF TG_OP = 'UPDATE'
        AND OLD.voided_at IS NULL
        AND NEW.voided_at IS NOT NULL
        AND NEW.product_id IS NOT NULL THEN
    UPDATE products SET quantity = quantity + NEW.quantity WHERE id = NEW.product_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sales_adjust_stock
  AFTER INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION adjust_stock_on_sale();
```

- [ ] **Step 2: Apply via MCP `execute_sql`**

- [ ] **Step 3: Verify decrement + oversell block + void restore**

Pick a test product (e.g. `ZW-BIL-001` Billetera Roma Negra). Run:

```sql
-- snapshot
SELECT id, quantity FROM products WHERE sku = 'ZW-BIL-001';
-- record id and qty (let's say 25)

-- sell 2: should succeed, new qty = 23
INSERT INTO sales (product_id, product_name, sku, quantity, unit_price, total_price, payment_method)
SELECT id, name, sku, 2, sale_price, sale_price * 2, 'Efectivo Pesos'
FROM products WHERE sku = 'ZW-BIL-001' RETURNING id, invoice_number;
-- record returned sale id

SELECT quantity FROM products WHERE sku = 'ZW-BIL-001';
-- expect 23

-- oversell attempt: should fail
INSERT INTO sales (product_id, product_name, sku, quantity, unit_price, total_price, payment_method)
SELECT id, name, sku, 9999, sale_price, sale_price * 9999, 'Efectivo Pesos'
FROM products WHERE sku = 'ZW-BIL-001';
-- expect: ERROR Stock insuficiente

-- void the first sale: should restore qty to 25
UPDATE sales SET voided_at = now() WHERE id = '<recorded sale id>';
SELECT quantity FROM products WHERE sku = 'ZW-BIL-001';
-- expect 25

-- clean up
DELETE FROM sales WHERE id = '<recorded sale id>';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/002_sales_schema.sql
git commit -m "feat(sales): stock auto-adjust trigger (FOR UPDATE lock prevents oversell)"
```

---

## Task 4: Install recharts

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install recharts**

```powershell
$env:Path = "C:\Program Files\nodejs\;" + $env:Path
npm install recharts
```

- [ ] **Step 2: Verify install**

```powershell
node -e "console.log(require('./node_modules/recharts/package.json').version)"
```

Expected: prints a version like `2.x.x`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install recharts for sales charts"
```

---

## Task 5: File reorganization — move existing components

**Files:**
- 10 file moves via `git mv`
- Modify: `src/App.jsx`, `src/components/stock/Dashboard.jsx`, `src/components/stock/ProductTable.jsx`, `src/components/stock/ProductModal.jsx`, `src/components/stock/ImportModal.jsx`, `src/components/stock/StockMovementModal.jsx`, `src/components/stock/MovementHistory.jsx` (update relative imports)

- [ ] **Step 1: Create directories**

```powershell
New-Item -ItemType Directory -Force src/components/shared, src/components/stock | Out-Null
```

- [ ] **Step 2: Move files**

```bash
git mv src/components/Header.jsx src/components/shared/Header.jsx
git mv src/components/PinModal.jsx src/components/shared/PinModal.jsx
git mv src/components/ConfirmModal.jsx src/components/shared/ConfirmModal.jsx
git mv src/components/Dashboard.jsx src/components/stock/Dashboard.jsx
git mv src/components/ProductTable.jsx src/components/stock/ProductTable.jsx
git mv src/components/ProductModal.jsx src/components/stock/ProductModal.jsx
git mv src/components/StockMovementModal.jsx src/components/stock/StockMovementModal.jsx
git mv src/components/MovementHistory.jsx src/components/stock/MovementHistory.jsx
git mv src/components/ImportModal.jsx src/components/stock/ImportModal.jsx
git mv src/components/ExportButton.js src/components/stock/ExportButton.js
```

- [ ] **Step 3: Update imports in `src/App.jsx`**

Change every `from './components/X'` to:
- `Header` → `./components/shared/Header`
- `Dashboard` → `./components/stock/Dashboard`
- `ProductTable` → `./components/stock/ProductTable`
- `ProductModal` → `./components/stock/ProductModal`
- `StockMovementModal` → `./components/stock/StockMovementModal`
- `MovementHistory` → `./components/stock/MovementHistory`
- `ImportModal` → `./components/stock/ImportModal`
- `ConfirmModal` → `./components/shared/ConfirmModal`
- `exportToExcel` from `./components/ExportButton` → `./components/stock/ExportButton`

- [ ] **Step 4: Update intra-folder imports**

In each moved file, fix relative imports:
- `../lib/...` stays the same conceptually but now needs `../../lib/...` (one more `..`)
- `./PinModal` in `Dashboard.jsx` and `ProductTable.jsx` → `../shared/PinModal`
- `./PinModal` import in `Dashboard.jsx`: `from './PinModal'` → `from '../shared/PinModal'`
- Same in `ProductTable.jsx`

Run a grep to find all `from '\.\./` references inside `src/components/stock/*.jsx` and add a `../` where they pointed at `lib/` or `hooks/`:

```powershell
# Quick scan to confirm what needs updating:
Select-String -Path "src/components/stock/*.jsx", "src/components/shared/*.jsx" -Pattern "from '\.\./"
```

Update each path: `'../lib/X'` → `'../../lib/X'`, `'../hooks/X'` → `'../../hooks/X'`.

- [ ] **Step 5: Verify the build**

```powershell
$env:Path = "C:\Program Files\nodejs\;" + $env:Path
npm run build
```

Expected: build succeeds. If "Could not resolve" errors appear, fix the offending path and re-run.

- [ ] **Step 6: Verify dev server HMR**

Confirm the dev server (background ID `bsxh4hesi`) is still serving without errors. Read the last 10 lines of its output log; should show `hmr update` lines for all moved files, no red errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: agrupar componentes en components/{stock,shared}"
```

---

## Task 6: PinContext extraction

**Files:**
- Create: `src/contexts/PinContext.jsx`
- Modify: `src/App.jsx`, `src/components/stock/Dashboard.jsx`, `src/components/stock/ProductTable.jsx`

- [ ] **Step 1: Create `src/contexts/PinContext.jsx`**

```jsx
import { createContext, useContext, useState } from 'react'
import PinModal from '../components/shared/PinModal'

const PinContext = createContext(null)

export function PinProvider({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)

  const requestUnlock = () => {
    if (unlocked) return
    setPinOpen(true)
  }
  const lock = () => setUnlocked(false)

  return (
    <PinContext.Provider value={{ unlocked, requestUnlock, lock }}>
      {children}
      {pinOpen && (
        <PinModal
          onSuccess={() => { setUnlocked(true); setPinOpen(false) }}
          onClose={() => setPinOpen(false)}
        />
      )}
    </PinContext.Provider>
  )
}

export function usePin() {
  const ctx = useContext(PinContext)
  if (!ctx) throw new Error('usePin must be used inside <PinProvider>')
  return ctx
}
```

- [ ] **Step 2: Wrap App in `<PinProvider>`**

In `src/App.jsx`, wrap the outermost `<div>` with `<PinProvider>`:

```jsx
import { PinProvider } from './contexts/PinContext'
// ...
return (
  <PinProvider>
    <div className="min-h-screen bg-bg font-body">
      {/* ... existing content ... */}
    </div>
  </PinProvider>
)
```

- [ ] **Step 3: Refactor `Dashboard.jsx` to use `usePin`**

In `src/components/stock/Dashboard.jsx`, remove the local `unlocked`/`showPin` state and the inline `<PinModal>` render. Replace with:

```jsx
import { usePin } from '../../contexts/PinContext'
// inside the component:
const { unlocked, requestUnlock, lock } = usePin()
// in FinancialCard onClick:
onClick={() => unlocked ? lock() : requestUnlock()}
// remove the `{showPin && <PinModal ... />}` JSX at the bottom
```

Delete the now-unused `import PinModal from '...'` line.

- [ ] **Step 4: Refactor `ProductTable.jsx` to use `usePin`**

In `src/components/stock/ProductTable.jsx`, replace local `pricesUnlocked`/`showPin` state with:

```jsx
import { usePin } from '../../contexts/PinContext'
const { unlocked: pricesUnlocked, requestUnlock, lock } = usePin()
```

Update the toggle button onClick: `onClick={() => pricesUnlocked ? lock() : requestUnlock()}`. Delete the bottom `{showPin && <PinModal ...>}` block.

- [ ] **Step 5: Verify**

```powershell
npm run build
```

Open the app, click "Ver precios" in the dashboard — PIN modal opens, enter `2024`, both Dashboard cards AND ProductTable prices unlock together. Click again → both lock.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(stock): unificar PIN unlock vía PinContext"
```

---

## Task 7: Extend `formatCurrency.js` for multi-currency

**Files:**
- Modify: `src/lib/formatCurrency.js`

- [ ] **Step 1: Read current contents**

```powershell
Get-Content src/lib/formatCurrency.js
```

- [ ] **Step 2: Add `formatMoney`**

Append to `src/lib/formatCurrency.js`:

```js
const SYMBOLS = { ARS: '$', USD: 'U$S', EUR: '€' }

export function formatMoney(amount, currency = 'ARS') {
  const n = Number(amount) || 0
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
  return `${SYMBOLS[currency] || '$'} ${formatted}`.replace('$ ', '$') // ARS: "$1.234.567" no space; others keep space
}

// Helper used in places where currency is ARS-only (kept for backward compat with formatARS)
```

If `formatARS` already exists, keep it (it's used by existing components).

- [ ] **Step 3: Quick sanity check**

```powershell
node -e "
import('./src/lib/formatCurrency.js').then(m => {
  console.log(m.formatMoney(1234567, 'ARS'));  // \$1.234.567
  console.log(m.formatMoney(1234, 'USD'));      // U\$S 1.234
  console.log(m.formatMoney(500, 'EUR'));       // € 500
});"
```

If that's tricky on Windows, just visually confirm the function will be exercised by the upcoming components.

- [ ] **Step 4: Commit**

```bash
git add src/lib/formatCurrency.js
git commit -m "feat(lib): formatMoney soporta ARS/USD/EUR"
```

---

## Task 8: `useSales` hook

**Files:**
- Create: `src/hooks/useSales.js`

- [ ] **Step 1: Write the hook**

```js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSales = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('sold_at', { ascending: false })
      .limit(500)
    if (error) setError(error.message)
    else setSales(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSales()
    const channel = supabase
      .channel('sales-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, fetchSales)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchSales])

  const registerSale = async (sale) => {
    // sale: { product_id, product_name, sku, category, color, size, quantity, unit_price, total_price, payment_method, nationality, currency, notes }
    const { data, error } = await supabase
      .from('sales')
      .insert([sale])
      .select()
      .single()
    if (error) throw error
    return data
  }

  const voidSale = async (id) => {
    const { error } = await supabase
      .from('sales')
      .update({ voided_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  return { sales, loading, error, fetchSales, registerSale, voidSale }
}
```

- [ ] **Step 2: Verify import path resolves**

```powershell
npm run build
```

Expected: build succeeds (hook isn't used yet but its imports must resolve).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSales.js
git commit -m "feat(sales): hook useSales con realtime, registerSale, voidSale"
```

---

## Task 9: `Nav` component + extract `StockView`

**Files:**
- Create: `src/components/shared/Nav.jsx`
- Create: `src/components/stock/StockView.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Create `Nav.jsx`**

```jsx
import { useMemo } from 'react'
import { formatMoney } from '../../lib/formatCurrency'

export default function Nav({ activeTab, onTabChange, sales }) {
  const todayTotalArs = useMemo(() => {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return sales
      .filter(s => !s.voided_at && s.currency === 'ARS' && new Date(s.sold_at) >= startOfDay)
      .reduce((sum, s) => sum + Number(s.total_price || 0), 0)
  }, [sales])

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => onTabChange(id)}
      className={`relative px-3 sm:px-4 py-2 text-sm tracking-wider uppercase transition-colors ${
        activeTab === id ? 'text-accent' : 'text-muted hover:text-cream'
      }`}
    >
      {label}
      {activeTab === id && (
        <span className="absolute -bottom-px left-2 right-2 h-px bg-accent" />
      )}
    </button>
  )

  return (
    <nav className="border-b border-white/5 bg-surface/50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <TabButton id="stock" label="Stock" />
          <TabButton id="sales" label="Ventas" />
        </div>
        <div className="text-xs text-muted">
          Vendido hoy <span className="text-cream font-medium ml-1">{formatMoney(todayTotalArs, 'ARS')}</span>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create `StockView.jsx`**

Move the inventory body (and `<Header>` invocation) from `App.jsx` into a new container so each tab owns its own header CTAs:

```jsx
import { useState } from 'react'
import toast from 'react-hot-toast'
import Header from '../shared/Header'
import Dashboard from './Dashboard'
import ProductTable from './ProductTable'
import ProductModal from './ProductModal'
import StockMovementModal from './StockMovementModal'
import MovementHistory from './MovementHistory'
import ImportModal from './ImportModal'
import ConfirmModal from '../shared/ConfirmModal'
import { exportToExcel } from './ExportButton'
import { useProducts } from '../../hooks/useProducts'

export default function StockView({ onSellProduct }) {
  const { products, loading, addProduct, updateProduct, deleteProduct, adjustStock, upsertMany } = useProducts()
  const [productModal, setProductModal] = useState(null)
  const [stockModal, setStockModal] = useState(null)
  const [historyProduct, setHistoryProduct] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Copy these four handlers VERBATIM from current src/App.jsx (lines 23-51):
  //   handleSaveProduct, handleDeleteProduct, handleAdjustStock, handleImport
  // They reference the addProduct/updateProduct/deleteProduct/adjustStock/upsertMany
  // returned by useProducts() above, so they work unchanged.

  return (
    <>
      <Header
        onAddProduct={() => setProductModal('add')}
        onImport={() => setImportOpen(true)}
        onExport={() => exportToExcel(products)}
      />

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
            onSellProduct={onSellProduct}
          />
        </>
      )}

      {/* All modal renders identical to current App.jsx (productModal, stockModal,
          historyProduct, importOpen, confirmDelete) — move them here verbatim */}
    </>
  )
}
```

The `onSellProduct` prop is plumbed but not used until Task 17 wires the "Vender" button in `ProductTable`. For now, calling `<ProductTable onSellProduct={onSellProduct}/>` is harmless — the component just ignores unknown props.

- [ ] **Step 3: Refactor `src/App.jsx`**

```jsx
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { PinProvider } from './contexts/PinContext'
import Nav from './components/shared/Nav'
import StockView from './components/stock/StockView'
import SalesView from './components/sales/SalesView'
import { useSales } from './hooks/useSales'

export default function App() {
  const [tab, setTab] = useState('stock')
  const { sales } = useSales()

  return (
    <PinProvider>
      <div className="min-h-screen bg-bg font-body">
        <Nav activeTab={tab} onTabChange={setTab} sales={sales} />
        <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
          {tab === 'stock' ? <StockView /> : <SalesView sales={sales} />}
        </main>
        <Toaster position="bottom-right" toastOptions={{ /* keep existing if any */ }} />
      </div>
    </PinProvider>
  )
}
```

**Note:** `<Header>` (the ZWASS brand + module-specific CTAs) is now rendered *inside* each view (`StockView` renders `<Header>` with `Importar/Exportar/Nuevo`; `SalesView` renders a header variant with `+ Registrar Venta`). Move the `<Header>` invocation from App.jsx into `StockView`.

Update `StockView.jsx` to render `<Header onAddProduct={...} onImport={...} onExport={...} />` at the top of its returned JSX.

- [ ] **Step 4: Create `SalesView.jsx` (minimal shell for now)**

```jsx
import { useState } from 'react'
import Header from '../shared/Header'

export default function SalesView({ sales }) {
  const [subTab, setSubTab] = useState('history') // 'history' | 'summary'

  return (
    <>
      {/* Placeholder header — replaced in Task 10 with sales-specific CTA */}
      <Header onAddProduct={() => {}} onImport={() => {}} onExport={() => {}} />
      <div className="text-muted text-sm">
        SalesView placeholder — {sales.length} ventas en la base.
      </div>
    </>
  )
}
```

- [ ] **Step 5: Verify the build + manual smoke test**

```powershell
npm run build
```

Open http://localhost:5173. Both tabs are clickable. Stock tab shows the existing inventory. Ventas tab shows the placeholder text and ventas count. "Vendido hoy" shows $0 (no sales yet).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(nav): tabs Stock/Ventas + StockView extraído + SalesView shell"
```

---

## Task 10: `RegisterSaleButton` + `RegisterSaleModal` orchestrator

**Files:**
- Create: `src/components/sales/RegisterSaleButton.jsx`
- Create: `src/components/sales/RegisterSaleModal.jsx`
- Modify: `src/components/sales/SalesView.jsx`

- [ ] **Step 1: Create `RegisterSaleButton.jsx`**

```jsx
import { CurrencyDollarIcon } from '@heroicons/react/24/outline'

export default function RegisterSaleButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-6 py-3 rounded-xl bg-accent text-bg hover:bg-accent-dark transition-colors font-medium text-base shadow-lg"
    >
      <CurrencyDollarIcon className="w-5 h-5" />
      <span>Registrar Venta</span>
    </button>
  )
}
```

- [ ] **Step 2: Create `RegisterSaleModal.jsx` (orchestrator only)**

```jsx
import { useState } from 'react'
import toast from 'react-hot-toast'
import { XMarkIcon } from '@heroicons/react/24/outline'
import ProductPicker from './ProductPicker'
import SaleDetailsForm from './SaleDetailsForm'
import { useSales } from '../../hooks/useSales'
import { formatMoney } from '../../lib/formatCurrency'

export default function RegisterSaleModal({ products, preselectedProduct, onClose }) {
  const [step, setStep] = useState(preselectedProduct ? 'details' : 'picker')
  const [selected, setSelected] = useState(preselectedProduct || null)
  const { registerSale } = useSales()
  const [submitting, setSubmitting] = useState(false)

  const handleConfirm = async (formData) => {
    setSubmitting(true)
    try {
      const sale = await registerSale({
        product_id: selected.id,
        product_name: selected.name,
        sku: selected.sku,
        category: selected.category,
        color: formData.color,
        size: formData.size,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        total_price: formData.quantity * formData.unit_price,
        payment_method: formData.payment_method,
        nationality: formData.nationality,
        currency: formData.currency,
        notes: formData.notes || null,
      })
      toast.success(
        `✓ Venta ${sale.invoice_number} · ${selected.name} · ${formData.payment_method} · ${formatMoney(sale.total_price, sale.currency)}`,
        { duration: 5000 }
      )
      const newStock = selected.quantity - formData.quantity
      if (newStock === 0) {
        toast(`⚠️ ${selected.name} quedó sin stock`, { icon: null, duration: 4000 })
      }
      // No callback needed: useProducts' realtime channel refreshes the product list automatically.
      onClose()
    } catch (err) {
      toast.error(err.message || 'Error al registrar venta')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="modal-enter bg-card border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="font-display text-2xl text-cream">
            {step === 'picker' ? 'Seleccionar producto' : 'Detalles de la venta'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-muted hover:text-cream transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'picker' && (
            <ProductPicker
              products={products}
              onSelect={p => { setSelected(p); setStep('details') }}
            />
          )}
          {step === 'details' && selected && (
            <SaleDetailsForm
              product={selected}
              submitting={submitting}
              onBack={preselectedProduct ? null : () => setStep('picker')}
              onCancel={onClose}
              onSubmit={handleConfirm}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire into `SalesView.jsx`**

```jsx
import { useState } from 'react'
import Header from '../shared/Header'
import RegisterSaleButton from './RegisterSaleButton'
import RegisterSaleModal from './RegisterSaleModal'
import { useProducts } from '../../hooks/useProducts'

export default function SalesView({ sales }) {
  const { products } = useProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [subTab, setSubTab] = useState('history')

  return (
    <>
      <Header
        // hide the stock-specific actions on Ventas tab
        onAddProduct={null}
        onImport={null}
        onExport={null}
      />

      <div className="flex flex-col items-center gap-6">
        <RegisterSaleButton onClick={() => setModalOpen(true)} />
        {/* SalesHistory / CashRegisterSummary toggle goes here in later tasks */}
        <p className="text-muted text-sm">{sales.length} ventas registradas</p>
      </div>

      {modalOpen && (
        <RegisterSaleModal
          products={products}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
```

**Header note:** if `Header.jsx` requires all 3 callbacks, update `Header.jsx` to conditionally render each button only when its prop is truthy. Adjust:

```jsx
{onImport && <button onClick={onImport} ...>...</button>}
{onExport && <button onClick={onExport} ...>...</button>}
{onAddProduct && <button onClick={onAddProduct} ...>...</button>}
```

- [ ] **Step 4: Verify the build**

```powershell
npm run build
```

The build will fail because `ProductPicker` and `SaleDetailsForm` don't exist yet. **This is expected** — create them in Tasks 11 and 12.

- [ ] **Step 5: Commit (skip if build fails — finish next tasks first)**

```bash
git add -A
git commit -m "wip(sales): RegisterSaleButton + Modal orchestrator (needs picker/form)"
```

---

## Task 11: `ProductPicker` (Step 1 of modal)

**Files:**
- Create: `src/components/sales/ProductPicker.jsx`

- [ ] **Step 1: Create component**

```jsx
import { useState, useMemo, useEffect, useRef } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function ProductPicker({ products, onSelect }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = useMemo(() => {
    if (!q.trim()) return products.slice(0, 50)
    const term = q.toLowerCase()
    return products.filter(p =>
      [p.name, p.sku, p.color, p.notes].some(v => v?.toLowerCase().includes(term))
    ).slice(0, 50)
  }, [products, q])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por nombre, SKU o color..."
          className="w-full bg-surface border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-cream placeholder-muted focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">No se encontraron productos</p>
        ) : filtered.map(p => {
          const out = (p.quantity || 0) === 0
          return (
            <button
              key={p.id}
              onClick={() => !out && onSelect(p)}
              disabled={out}
              className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors text-left ${
                out
                  ? 'border-white/5 opacity-40 cursor-not-allowed'
                  : 'border-white/10 hover:border-accent/40 hover:bg-white/2'
              }`}
            >
              <div className="min-w-0">
                <p className="text-cream font-medium truncate">{p.name}</p>
                <p className="text-muted text-xs mt-0.5">
                  {p.sku || '—'}{p.color ? ` · ${p.color}` : ''}{p.size ? ` · ${p.size}` : ''}
                </p>
              </div>
              <div className="text-right text-xs">
                {out ? (
                  <span className="px-2 py-0.5 rounded-full bg-danger/15 text-danger border border-danger/20 whitespace-nowrap">Agotado</span>
                ) : (
                  <span className="text-muted">Stock: <span className="text-cream font-mono">{p.quantity}</span></span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the build**

```powershell
npm run build
```

(Still fails until Task 12 creates `SaleDetailsForm`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/sales/ProductPicker.jsx
git commit -m "feat(sales): ProductPicker (Step 1)"
```

---

## Task 12: `SaleDetailsForm` (Step 2 of modal)

**Files:**
- Create: `src/components/sales/SaleDetailsForm.jsx`

- [ ] **Step 1: Create component**

```jsx
import { useState, useMemo } from 'react'
import { formatMoney } from '../../lib/formatCurrency'

const PAYMENT_METHODS = [
  'Efectivo Pesos','Tarjeta Crédito','Tarjeta Débito','Mercado Pago',
  'Efectivo Dólares','Efectivo Euros','Cuenta Corriente','Débora',
  'Transferencia','Mercado Libre',
]

const CURRENCIES = ['ARS', 'USD', 'EUR']
const NATIONALITIES = ['Arg', 'Extranjero']

export default function SaleDetailsForm({ product, submitting, onBack, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    color: product.color || '',
    size: product.size || '',
    quantity: 1,
    unit_price: product.sale_price || 0,
    payment_method: PAYMENT_METHODS[0],
    nationality: 'Arg',
    currency: 'ARS',
    notes: '',
  })
  const [errors, setErrors] = useState({})

  const set = (field) => (e) => {
    const value = e.target ? e.target.value : e
    setForm(f => ({ ...f, [field]: value }))
    setErrors(es => ({ ...es, [field]: undefined }))
  }

  const total = useMemo(
    () => (Number(form.quantity) || 0) * (Number(form.unit_price) || 0),
    [form.quantity, form.unit_price]
  )

  const validate = () => {
    const errs = {}
    const qty = Number(form.quantity)
    if (!qty || qty <= 0) errs.quantity = 'Cantidad inválida'
    if (qty > (product.quantity || 0)) errs.quantity = `Stock disponible: ${product.quantity}`
    if (Number(form.unit_price) < 0) errs.unit_price = 'Precio inválido'
    if (!form.payment_method) errs.payment_method = 'Requerido'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSubmit({
      ...form,
      quantity: Number(form.quantity),
      unit_price: Number(form.unit_price),
    })
  }

  const Field = ({ label, field, type = 'text', children, error }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted uppercase tracking-wider">{label}</label>
      {children || (
        <input
          type={type}
          value={form[field]}
          onChange={set(field)}
          className={`bg-surface border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors ${
            error ? 'border-danger' : 'border-white/10'
          }`}
        />
      )}
      {error && <span className="text-danger text-xs">{error}</span>}
    </div>
  )

  const RadioGroup = ({ field, options }) => (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => set(field)(opt)}
          className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
            form[field] === opt
              ? 'bg-accent text-bg border-accent'
              : 'border-white/10 text-muted hover:text-cream'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Product header */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface/50 border border-white/5">
        <div className="min-w-0">
          <p className="text-cream font-medium truncate">{product.name}</p>
          <p className="text-muted text-xs mt-0.5">{product.sku || '—'}</p>
        </div>
        <div className="text-right text-xs">
          <p className="text-muted">Stock disponible</p>
          <p className="text-cream font-mono text-lg">{product.quantity}</p>
        </div>
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Color" field="color" />
        <Field label="Talle" field="size" />
        <Field label="Cantidad" field="quantity" type="number" error={errors.quantity} />
        <Field label="Precio unitario" field="unit_price" type="number" error={errors.unit_price} />

        <Field label="Moneda">
          <RadioGroup field="currency" options={CURRENCIES} />
        </Field>
        <Field label="Nacionalidad">
          <RadioGroup field="nationality" options={NATIONALITIES} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Método de pago" error={errors.payment_method}>
            <select
              value={form.payment_method}
              onChange={set('payment_method')}
              className={`bg-surface border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors ${
                errors.payment_method ? 'border-danger' : 'border-white/10'
              }`}
            >
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Notas (opcional)">
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50 transition-colors resize-none"
            />
          </Field>
        </div>
      </div>

      {/* Total + actions */}
      <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-muted text-xs uppercase tracking-wider">Total</p>
          <p className="font-display text-2xl text-cream">{formatMoney(total, form.currency)}</p>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm">
              Volver
            </button>
          )}
          <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-white/20 transition-colors text-sm">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-dark transition-colors text-sm disabled:opacity-50"
          >
            {submitting ? 'Registrando...' : 'Confirmar Venta'}
          </button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verify the build**

```powershell
npm run build
```

Expected: build succeeds now.

- [ ] **Step 3: Manual smoke test**

Open http://localhost:5173 → Ventas tab → click "Registrar Venta" → search a product → select → fill quantity 1, leave defaults → Confirmar. Toast appears with invoice number. Switch to Stock tab → that product's stock decreased by 1.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(sales): SaleDetailsForm (Step 2) + flujo de venta end-to-end"
```

---

## Task 13: `SalesHistory` component

**Files:**
- Create: `src/components/sales/SalesHistory.jsx`
- Modify: `src/components/sales/SalesView.jsx`

- [ ] **Step 1: Create `SalesHistory.jsx`**

```jsx
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import {
  MagnifyingGlassIcon, NoSymbolIcon, EyeIcon
} from '@heroicons/react/24/outline'
import { formatMoney } from '../../lib/formatCurrency'
import ConfirmModal from '../shared/ConfirmModal'

const PAYMENT_METHODS = [
  'Efectivo Pesos','Tarjeta Crédito','Tarjeta Débito','Mercado Pago',
  'Efectivo Dólares','Efectivo Euros','Cuenta Corriente','Débora',
  'Transferencia','Mercado Libre',
]

const DT = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

export default function SalesHistory({ sales, onVoid }) {
  const [q, setQ] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active') // active|voided|all
  const [confirmVoid, setConfirmVoid] = useState(null)

  const filtered = useMemo(() => {
    let list = [...sales]
    if (q) {
      const term = q.toLowerCase()
      list = list.filter(s =>
        [s.invoice_number, s.product_name, s.sku, s.notes].some(v => v?.toLowerCase().includes(term))
      )
    }
    if (methodFilter) list = list.filter(s => s.payment_method === methodFilter)
    if (statusFilter === 'active') list = list.filter(s => !s.voided_at)
    else if (statusFilter === 'voided') list = list.filter(s => !!s.voided_at)
    return list
  }, [sales, q, methodFilter, statusFilter])

  const handleVoid = async (sale) => {
    try {
      await onVoid(sale.id)
      toast.success(`Venta ${sale.invoice_number} anulada — stock restaurado`)
    } catch (err) {
      toast.error('No se pudo anular: ' + err.message)
    }
  }

  return (
    <div className="bg-card border border-white/5 rounded-xl overflow-hidden w-full">
      {/* Filters */}
      <div className="p-3 sm:p-4 border-b border-white/5 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por factura, producto, SKU..."
            className="w-full bg-surface border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-cream placeholder-muted focus:outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex gap-2 sm:gap-3">
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="flex-1 sm:flex-initial bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50">
            <option value="">Todos los métodos</option>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="flex-1 sm:flex-initial bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent/50">
            <option value="active">Activas</option>
            <option value="voided">Anuladas</option>
            <option value="all">Todas</option>
          </select>
        </div>
        <span className="text-xs text-muted sm:ml-auto">{filtered.length} resultados</span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-white/5">
            <tr>
              {['N° Factura','Fecha','Artículo','Color','Talle','Cant.','P. Unit.','Total','Método','Acción'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-xs uppercase tracking-wider text-muted whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-muted">Sin ventas para mostrar</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className={`hover:bg-white/2 transition-colors ${s.voided_at ? 'opacity-50' : ''}`}>
                <td className="px-3 py-3 text-cream font-mono text-xs">{s.invoice_number}</td>
                <td className="px-3 py-3 text-muted text-xs whitespace-nowrap">{DT.format(new Date(s.sold_at))}</td>
                <td className={`px-3 py-3 text-cream ${s.voided_at ? 'line-through' : ''} max-w-xs break-words`}>{s.product_name}</td>
                <td className="px-3 py-3 text-muted text-xs">{s.color || '—'}</td>
                <td className="px-3 py-3 text-muted text-xs">{s.size || '—'}</td>
                <td className="px-3 py-3 text-cream font-mono">{s.quantity}</td>
                <td className="px-3 py-3 text-muted text-xs whitespace-nowrap">{formatMoney(s.unit_price, s.currency)}</td>
                <td className="px-3 py-3 text-cream font-medium whitespace-nowrap">{formatMoney(s.total_price, s.currency)}</td>
                <td className="px-3 py-3 text-muted text-xs">{s.payment_method}</td>
                <td className="px-3 py-3">
                  {s.voided_at ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-muted border border-white/10 whitespace-nowrap">Anulada</span>
                  ) : (
                    <button
                      onClick={() => setConfirmVoid(s)}
                      title="Anular venta"
                      className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-danger transition-colors"
                    >
                      <NoSymbolIcon className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-white/5">
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-muted text-sm">Sin ventas para mostrar</div>
        ) : filtered.map(s => (
          <div key={s.id} className={`p-4 flex flex-col gap-2 ${s.voided_at ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-cream font-mono text-xs">{s.invoice_number}</span>
              <span className="text-muted text-xs">{DT.format(new Date(s.sold_at))}</span>
            </div>
            <p className={`text-cream font-medium ${s.voided_at ? 'line-through' : ''}`}>{s.product_name}</p>
            <div className="text-xs text-muted">
              {[s.color, s.size, `Cant: ${s.quantity}`].filter(Boolean).join(' · ')}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div>
                <p className="text-muted text-[10px] uppercase tracking-wider">Total</p>
                <p className="text-cream font-medium">{formatMoney(s.total_price, s.currency)}</p>
                <p className="text-muted text-[11px]">{s.payment_method}</p>
              </div>
              {s.voided_at
                ? <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 text-muted border border-white/10">Anulada</span>
                : (
                  <button
                    onClick={() => setConfirmVoid(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-muted hover:text-danger hover:border-danger/30 transition-colors text-xs"
                  >
                    <NoSymbolIcon className="w-4 h-4" /> Anular
                  </button>
                )
              }
            </div>
          </div>
        ))}
      </div>

      {confirmVoid && (
        <ConfirmModal
          title="Anular venta"
          message={`¿Anular la venta ${confirmVoid.invoice_number}? El stock de "${confirmVoid.product_name}" se restaurará y la venta se excluirá del Resumen de Caja.`}
          danger
          onConfirm={() => { handleVoid(confirmVoid); setConfirmVoid(null) }}
          onClose={() => setConfirmVoid(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire into `SalesView.jsx`**

Update `SalesView.jsx`:

```jsx
import { useState } from 'react'
import Header from '../shared/Header'
import RegisterSaleButton from './RegisterSaleButton'
import RegisterSaleModal from './RegisterSaleModal'
import SalesHistory from './SalesHistory'
import { useProducts } from '../../hooks/useProducts'
import { useSales } from '../../hooks/useSales'

export default function SalesView() {
  const { products } = useProducts()
  const { sales, voidSale } = useSales()
  const [modalOpen, setModalOpen] = useState(false)
  const [subTab, setSubTab] = useState('history')

  return (
    <>
      <Header onAddProduct={null} onImport={null} onExport={null} />

      <div className="flex flex-col items-center gap-6 mb-6">
        <RegisterSaleButton onClick={() => setModalOpen(true)} />
      </div>

      <div className="flex gap-1 border-b border-white/5 mb-6">
        <button onClick={() => setSubTab('history')} className={`px-4 py-2 text-sm tracking-wider uppercase border-b-2 transition-colors ${subTab === 'history' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-cream'}`}>
          Historial de Ventas
        </button>
        <button onClick={() => setSubTab('summary')} className={`px-4 py-2 text-sm tracking-wider uppercase border-b-2 transition-colors ${subTab === 'summary' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-cream'}`}>
          Resumen de Caja
        </button>
      </div>

      {subTab === 'history' && <SalesHistory sales={sales} onVoid={voidSale} />}
      {subTab === 'summary' && <div className="text-muted text-sm">Resumen de Caja (próxima tarea)</div>}

      {modalOpen && (
        <RegisterSaleModal
          products={products}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
```

Drop the `sales` prop from `App.jsx`'s `<SalesView sales={sales} />` invocation, since SalesView now uses its own `useSales` hook.

Note: `useSales` is now called both in `App.jsx` (for the Nav indicator) and in `SalesView`. Each call creates its own realtime channel. That's acceptable for now — both stay in sync.

- [ ] **Step 3: Verify**

```powershell
npm run build
```

Manual: register a sale → appears at top of historial. Click ❌ Anular → confirmation modal → confirm → row dims, badge "Anulada", and the linked product's stock increases by the sold quantity.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(sales): SalesHistory con filtros, anular venta y vista mobile"
```

---

## Task 14: `PaymentMethodTable` + `CashRegisterSummary` (filter + table + actions)

**Files:**
- Create: `src/components/sales/PaymentMethodTable.jsx`
- Create: `src/components/sales/CashRegisterSummary.jsx`
- Modify: `src/components/sales/SalesView.jsx`

- [ ] **Step 1: Create `PaymentMethodTable.jsx`**

```jsx
import { useMemo } from 'react'
import { formatMoney } from '../../lib/formatCurrency'

const METHODS = [
  'Efectivo Pesos','Tarjeta Crédito','Tarjeta Débito','Mercado Pago',
  'Efectivo Dólares','Efectivo Euros','Cuenta Corriente','Débora',
  'Transferencia','Mercado Libre',
]

export default function PaymentMethodTable({ sales }) {
  const matrix = useMemo(() => {
    // active sales only, grouped by method+currency
    const active = sales.filter(s => !s.voided_at)
    const result = {}
    for (const m of METHODS) result[m] = { ARS: 0, USD: 0, EUR: 0 }
    let totals = { ARS: 0, USD: 0, EUR: 0 }
    for (const s of active) {
      const row = result[s.payment_method]
      if (!row) continue
      row[s.currency] = (row[s.currency] || 0) + Number(s.total_price || 0)
      totals[s.currency] = (totals[s.currency] || 0) + Number(s.total_price || 0)
    }
    return { result, totals }
  }, [sales])

  const Cell = ({ value, currency }) => (
    <td className="px-3 py-2 text-right tabular-nums">
      {value > 0
        ? <span className="text-cream">{formatMoney(value, currency)}</span>
        : <span className="text-muted">—</span>}
    </td>
  )

  return (
    <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface/50 border-b border-white/5">
            <tr>
              <th className="px-3 py-3 text-left text-xs uppercase tracking-wider text-muted">Método de pago</th>
              <th className="px-3 py-3 text-right text-xs uppercase tracking-wider text-muted">Pesos</th>
              <th className="px-3 py-3 text-right text-xs uppercase tracking-wider text-muted">Dólares</th>
              <th className="px-3 py-3 text-right text-xs uppercase tracking-wider text-muted">Euros</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {METHODS.map(m => (
              <tr key={m} className="hover:bg-white/2">
                <td className="px-3 py-2 text-cream">{m}</td>
                <Cell value={matrix.result[m].ARS} currency="ARS" />
                <Cell value={matrix.result[m].USD} currency="USD" />
                <Cell value={matrix.result[m].EUR} currency="EUR" />
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface/70 border-t border-white/10">
            <tr>
              <td className="px-3 py-3 text-accent font-display text-lg">VENTA TOTAL</td>
              <td className="px-3 py-3 text-right text-accent font-display text-lg tabular-nums">{formatMoney(matrix.totals.ARS, 'ARS')}</td>
              <td className="px-3 py-3 text-right text-accent font-display text-lg tabular-nums">{formatMoney(matrix.totals.USD, 'USD')}</td>
              <td className="px-3 py-3 text-right text-accent font-display text-lg tabular-nums">{formatMoney(matrix.totals.EUR, 'EUR')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `CashRegisterSummary.jsx`**

```jsx
import { useMemo, useState } from 'react'
import { PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import PaymentMethodTable from './PaymentMethodTable'

const TZ = 'America/Argentina/Buenos_Aires'

function startOfDayAr() {
  const now = new Date()
  // Convert to Argentina-local midnight
  const arNow = new Date(now.toLocaleString('en-US', { timeZone: TZ }))
  arNow.setHours(0, 0, 0, 0)
  return arNow
}
function startOfWeekAr() {
  const d = startOfDayAr()
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  return d
}
function startOfMonthAr() {
  const d = startOfDayAr()
  d.setDate(1)
  return d
}

export default function CashRegisterSummary({ sales, onPrint, onExport }) {
  const [range, setRange] = useState('today') // today|week|month|custom
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { startDate, endDate } = useMemo(() => {
    const end = new Date()
    let start
    if (range === 'today') start = startOfDayAr()
    else if (range === 'week') start = startOfWeekAr()
    else if (range === 'month') start = startOfMonthAr()
    else {
      start = from ? new Date(from) : new Date(0)
      return { startDate: start, endDate: to ? new Date(to + 'T23:59:59') : end }
    }
    return { startDate: start, endDate: end }
  }, [range, from, to])

  const filteredSales = useMemo(
    () => sales.filter(s => {
      const t = new Date(s.sold_at)
      return t >= startDate && t <= endDate
    }),
    [sales, startDate, endDate]
  )

  const RangeBtn = ({ id, label }) => (
    <button
      onClick={() => setRange(id)}
      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
        range === id ? 'bg-accent text-bg border-accent' : 'border-white/10 text-muted hover:text-cream'
      }`}
    >{label}</button>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Filter row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          <RangeBtn id="today" label="Hoy" />
          <RangeBtn id="week" label="Esta semana" />
          <RangeBtn id="month" label="Este mes" />
          <RangeBtn id="custom" label="Personalizado" />
        </div>
        {range === 'custom' && (
          <div className="flex gap-2 items-center text-sm">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="bg-surface border border-white/10 rounded-lg px-2 py-1.5 text-cream" />
            <span className="text-muted">→</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="bg-surface border border-white/10 rounded-lg px-2 py-1.5 text-cream" />
          </div>
        )}
        <div className="sm:ml-auto flex gap-2">
          <button onClick={() => onPrint?.(filteredSales, { from: startDate, to: endDate })} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-accent/40 text-sm transition-colors">
            <PrinterIcon className="w-4 h-4" /> Imprimir resumen
          </button>
          <button onClick={() => onExport?.(filteredSales, { from: startDate, to: endDate })} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-muted hover:text-cream hover:border-accent/40 text-sm transition-colors">
            <ArrowDownTrayIcon className="w-4 h-4" /> Exportar Excel
          </button>
        </div>
      </div>

      <PaymentMethodTable sales={filteredSales} />

      {/* Charts placeholder — Task 15 fills this */}
      <div id="sales-charts-slot" />
    </div>
  )
}
```

- [ ] **Step 3: Wire into `SalesView.jsx`**

Replace `subTab === 'summary'` body with:

```jsx
{subTab === 'summary' && (
  <CashRegisterSummary
    sales={sales}
    onPrint={() => alert('Print en próxima tarea')}
    onExport={() => alert('Export en próxima tarea')}
  />
)}
```

Add the import: `import CashRegisterSummary from './CashRegisterSummary'`.

- [ ] **Step 4: Verify**

```powershell
npm run build
```

Manual: open Ventas → Resumen de Caja. The table shows current totals; switching Hoy/Semana/Mes refilters. Register a new sale → totals update via realtime.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(sales): CashRegisterSummary con filtros temporales + PaymentMethodTable"
```

---

## Task 15: `SalesCharts` (recharts)

**Files:**
- Create: `src/components/sales/SalesCharts.jsx`
- Modify: `src/components/sales/CashRegisterSummary.jsx`

- [ ] **Step 1: Create `SalesCharts.jsx`**

```jsx
import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { formatMoney } from '../../lib/formatCurrency'

const COLORS = ['#c9a96e','#a8863f','#4a9e6b','#c9893a','#b54545','#8a8278','#5a8aaa','#9a6ec9','#6ec9a9','#c9c46e']
const TZ = 'America/Argentina/Buenos_Aires'

function dayKey(d) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(d)
}

export default function SalesCharts({ sales, dateRange }) {
  const active = useMemo(() => sales.filter(s => !s.voided_at), [sales])

  // 1. Daily ARS revenue
  const dailyArs = useMemo(() => {
    const map = new Map()
    const start = new Date(dateRange.from)
    const end = new Date(dateRange.to)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      map.set(dayKey(d), { day: dayKey(d), ars: 0 })
    }
    for (const s of active) {
      if (s.currency !== 'ARS') continue
      const k = dayKey(new Date(s.sold_at))
      if (map.has(k)) map.get(k).ars += Number(s.total_price || 0)
    }
    return Array.from(map.values())
  }, [active, dateRange])

  // 2. % by payment method (ARS only — same justification as daily chart)
  const byMethod = useMemo(() => {
    const m = {}
    for (const s of active) {
      if (s.currency !== 'ARS') continue
      m[s.payment_method] = (m[s.payment_method] || 0) + Number(s.total_price || 0)
    }
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
  }, [active])

  // 3. Top 5 productos por unidades vendidas
  const topProducts = useMemo(() => {
    const m = {}
    for (const s of active) {
      const k = s.product_name
      m[k] = (m[k] || 0) + Number(s.quantity || 0)
    }
    return Object.entries(m)
      .map(([name, units]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, units }))
      .sort((a,b) => b.units - a.units)
      .slice(0, 5)
  }, [active])

  const Card = ({ title, children, hint }) => (
    <div className="bg-card border border-white/5 rounded-xl p-4">
      <p className="text-muted text-xs uppercase tracking-wider mb-3">{title}</p>
      {hint && <p className="text-muted text-[10px] mb-2">{hint}</p>}
      <div className="h-56">{children}</div>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card title="Ventas ARS por día" hint="USD/EUR no se incluyen para mantener una sola escala">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dailyArs}>
            <XAxis dataKey="day" stroke="#8a8278" tick={{ fontSize: 10 }} />
            <YAxis stroke="#8a8278" tick={{ fontSize: 10 }} tickFormatter={v => (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v)} />
            <Tooltip
              contentStyle={{ background: '#1a1917', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8 }}
              formatter={(v) => formatMoney(v, 'ARS')}
            />
            <Bar dataKey="ars" fill="#c9a96e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="% por método de pago (ARS)" hint="Solo ARS">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75}>
              {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1a1917', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8 }}
              formatter={(v) => formatMoney(v, 'ARS')}
            />
            <Legend wrapperStyle={{ fontSize: 10, color: '#8a8278' }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Top 5 productos (unidades)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topProducts} layout="vertical">
            <XAxis type="number" stroke="#8a8278" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" stroke="#8a8278" tick={{ fontSize: 10 }} width={110} />
            <Tooltip contentStyle={{ background: '#1a1917', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8 }} />
            <Bar dataKey="units" fill="#4a9e6b" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Replace the placeholder in `CashRegisterSummary.jsx`**

Replace `<div id="sales-charts-slot" />` with:

```jsx
<SalesCharts sales={filteredSales} dateRange={{ from: startDate, to: endDate }} />
```

Add the import: `import SalesCharts from './SalesCharts'`.

- [ ] **Step 3: Verify**

```powershell
npm run build
```

Manual: open Resumen de Caja with "Esta semana" range; the 3 charts render with current data. Register a new ARS sale → bars update via realtime.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(sales): SalesCharts (daily, by method, top 5) con recharts"
```

---

## Task 16: `PrintableSummary` + Excel export

**Files:**
- Create: `src/components/sales/PrintableSummary.jsx`
- Create: `src/lib/exportSalesSummary.js`
- Modify: `src/components/sales/CashRegisterSummary.jsx`
- Modify: `src/index.css` (print styles)

- [ ] **Step 1: Add print CSS to `src/index.css`**

Append:

```css
@media print {
  body { background: white !important; color: black !important; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
}
.print-only { display: none; }
```

- [ ] **Step 2: Create `PrintableSummary.jsx`**

```jsx
import { useMemo } from 'react'
import { formatMoney } from '../../lib/formatCurrency'

const METHODS = [
  'Efectivo Pesos','Tarjeta Crédito','Tarjeta Débito','Mercado Pago',
  'Efectivo Dólares','Efectivo Euros','Cuenta Corriente','Débora',
  'Transferencia','Mercado Libre',
]

const fmtDate = (d) => new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit', month: '2-digit', year: 'numeric',
}).format(d)

export default function PrintableSummary({ sales, from, to }) {
  const { matrix, totals } = useMemo(() => {
    const active = sales.filter(s => !s.voided_at)
    const result = {}
    for (const m of METHODS) result[m] = { ARS: 0, USD: 0, EUR: 0 }
    let totals = { ARS: 0, USD: 0, EUR: 0 }
    for (const s of active) {
      const row = result[s.payment_method]
      if (!row) continue
      row[s.currency] += Number(s.total_price || 0)
      totals[s.currency] += Number(s.total_price || 0)
    }
    return { matrix: result, totals }
  }, [sales])

  return (
    <div className="print-only" style={{ padding: 24, fontFamily: 'monospace', color: 'black' }}>
      <div style={{ borderTop: '2px dotted black', borderBottom: '2px dotted black', padding: '12px 0', textAlign: 'center', marginBottom: 16 }}>
        <h1 style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: 24, margin: 0 }}>ZWASS — RESUMEN DE CAJA</h1>
        <p style={{ margin: '4px 0 0', fontSize: 12 }}>Período: {fmtDate(from)} – {fmtDate(to)}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid black' }}>
            <th style={{ textAlign: 'left', padding: 4 }}>Método de pago</th>
            <th style={{ textAlign: 'right', padding: 4 }}>Pesos</th>
            <th style={{ textAlign: 'right', padding: 4 }}>Dólares</th>
            <th style={{ textAlign: 'right', padding: 4 }}>Euros</th>
          </tr>
        </thead>
        <tbody>
          {METHODS.map(m => (
            <tr key={m}>
              <td style={{ padding: 4 }}>{m}</td>
              <td style={{ padding: 4, textAlign: 'right' }}>{matrix[m].ARS > 0 ? formatMoney(matrix[m].ARS, 'ARS') : '—'}</td>
              <td style={{ padding: 4, textAlign: 'right' }}>{matrix[m].USD > 0 ? formatMoney(matrix[m].USD, 'USD') : '—'}</td>
              <td style={{ padding: 4, textAlign: 'right' }}>{matrix[m].EUR > 0 ? formatMoney(matrix[m].EUR, 'EUR') : '—'}</td>
            </tr>
          ))}
          <tr style={{ borderTop: '1px solid black', fontWeight: 'bold' }}>
            <td style={{ padding: 4 }}>VENTA TOTAL</td>
            <td style={{ padding: 4, textAlign: 'right' }}>{formatMoney(totals.ARS, 'ARS')}</td>
            <td style={{ padding: 4, textAlign: 'right' }}>{formatMoney(totals.USD, 'USD')}</td>
            <td style={{ padding: 4, textAlign: 'right' }}>{formatMoney(totals.EUR, 'EUR')}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderTop: '2px dotted black', textAlign: 'center', padding: '12px 0', marginTop: 16, fontSize: 10 }}>
        Impreso {new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `exportSalesSummary.js`**

```js
import * as XLSX from 'xlsx'

const METHODS = [
  'Efectivo Pesos','Tarjeta Crédito','Tarjeta Débito','Mercado Pago',
  'Efectivo Dólares','Efectivo Euros','Cuenta Corriente','Débora',
  'Transferencia','Mercado Libre',
]

const fmtDate = (d) => new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: '2-digit', month: '2-digit', year: 'numeric',
}).format(d).replace(/\//g, '-')

export function exportSalesSummary(sales, { from, to }) {
  const active = sales.filter(s => !s.voided_at)

  // Sheet 1: Resumen
  const matrix = {}
  for (const m of METHODS) matrix[m] = { ARS: 0, USD: 0, EUR: 0 }
  const totals = { ARS: 0, USD: 0, EUR: 0 }
  for (const s of active) {
    if (!matrix[s.payment_method]) continue
    matrix[s.payment_method][s.currency] += Number(s.total_price || 0)
    totals[s.currency] += Number(s.total_price || 0)
  }

  const resumenRows = [
    ['Método de pago', 'Pesos', 'Dólares', 'Euros'],
    ...METHODS.map(m => [m, matrix[m].ARS, matrix[m].USD, matrix[m].EUR]),
    ['VENTA TOTAL', totals.ARS, totals.USD, totals.EUR],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows)
  wsResumen['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]

  // Sheet 2: Detalle
  const detalleRows = [
    ['N° Factura','Fecha','Producto','SKU','Color','Talle','Cantidad','P. Unit.','Total','Moneda','Método','Nacionalidad','Notas'],
    ...active.map(s => [
      s.invoice_number,
      s.sold_at,
      s.product_name,
      s.sku || '',
      s.color || '',
      s.size || '',
      s.quantity,
      s.unit_price,
      s.total_price,
      s.currency,
      s.payment_method,
      s.nationality,
      s.notes || '',
    ]),
  ]
  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleRows)
  wsDetalle['!cols'] = [
    { wch: 18 },{ wch: 22 },{ wch: 28 },{ wch: 14 },{ wch: 14 },
    { wch: 8 },{ wch: 8 },{ wch: 12 },{ wch: 12 },{ wch: 6 },
    { wch: 18 },{ wch: 12 },{ wch: 30 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle')

  XLSX.writeFile(wb, `zwass-resumen-${fmtDate(from)}_${fmtDate(to)}.xlsx`)
}
```

- [ ] **Step 4: Wire print + export buttons in `CashRegisterSummary.jsx`**

```jsx
import PrintableSummary from './PrintableSummary'
import { exportSalesSummary } from '../../lib/exportSalesSummary'

// Add state for the active range we'll pass to the printable view
// At top of component (after filteredSales useMemo):
const [printingRange, setPrintingRange] = useState(null)

// Replace the onPrint/onExport bindings:
const handlePrint = () => {
  setPrintingRange({ from: startDate, to: endDate })
  // Wait one frame so the PrintableSummary renders before print
  requestAnimationFrame(() => {
    window.print()
    setPrintingRange(null)
  })
}
const handleExport = () => exportSalesSummary(filteredSales, { from: startDate, to: endDate })

// Pass to filter row buttons:
<button onClick={handlePrint} ...>...</button>
<button onClick={handleExport} ...>...</button>

// And after the charts, render PrintableSummary so it can be picked up by window.print():
{printingRange && (
  <PrintableSummary sales={filteredSales} from={printingRange.from} to={printingRange.to} />
)}
```

Also add the `no-print` class to the elements that should not appear in the printed page: the filter row, the on-screen table, and the charts grid:

```jsx
<div className="no-print flex flex-col gap-6">
  {/* filter row + PaymentMethodTable + SalesCharts */}
</div>
```

Wrap them in a single `no-print` div for simplicity.

- [ ] **Step 5: Verify**

```powershell
npm run build
```

Manual:
- Click "Imprimir resumen" → browser print dialog opens showing the dotted-frame layout, nothing else.
- Click "Exportar Excel" → file `zwass-resumen-...xlsx` downloads. Open it: 2 sheets, totals match the on-screen table.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(sales): PrintableSummary + export Excel del resumen y detalle"
```

---

## Task 17: "Vender" button in `ProductTable`

**Files:**
- Modify: `src/components/stock/ProductTable.jsx`
- Modify: `src/App.jsx` (or `StockView.jsx`) to lift the sale modal up

- [ ] **Step 1: Lift `RegisterSaleModal` to `App.jsx`**

The Vender button in the Stock tab needs to open the SAME modal used in the Ventas tab. The cleanest path: lift the modal state up to `App.jsx`.

```jsx
// src/App.jsx
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { PinProvider } from './contexts/PinContext'
import Nav from './components/shared/Nav'
import StockView from './components/stock/StockView'
import SalesView from './components/sales/SalesView'
import RegisterSaleModal from './components/sales/RegisterSaleModal'
import { useSales } from './hooks/useSales'
import { useProducts } from './hooks/useProducts'

export default function App() {
  const [tab, setTab] = useState('stock')
  const { sales } = useSales()
  const { products } = useProducts()
  const [saleModal, setSaleModal] = useState(null) // { preselected?: product } | null

  return (
    <PinProvider>
      <div className="min-h-screen bg-bg font-body">
        <Nav activeTab={tab} onTabChange={setTab} sales={sales} />
        <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
          {tab === 'stock'
            ? <StockView onSellProduct={p => setSaleModal({ preselected: p })} />
            : <SalesView onOpenSaleModal={() => setSaleModal({})} />
          }
        </main>
        {saleModal && (
          <RegisterSaleModal
            products={products}
            preselectedProduct={saleModal.preselected}
            onClose={() => setSaleModal(null)}
          />
        )}
        <Toaster position="bottom-right" />
      </div>
    </PinProvider>
  )
}
```

Adjust `SalesView`:

```jsx
export default function SalesView({ onOpenSaleModal }) {
  // remove local useProducts + modalOpen state; remove the RegisterSaleModal JSX
  const { sales, voidSale } = useSales()
  const [subTab, setSubTab] = useState('history')
  // ...
  <RegisterSaleButton onClick={onOpenSaleModal} />
  // ...
}
```

Adjust `StockView` to accept and forward `onSellProduct`:

```jsx
export default function StockView({ onSellProduct }) {
  // ...
  <ProductTable
    // ...
    onSellProduct={onSellProduct}
  />
  // ...
}
```

- [ ] **Step 2: Add Vender button to `ProductTable.jsx`**

In the desktop actions cell, before the edit button:

```jsx
<button
  onClick={() => onSellProduct(p)}
  disabled={p.quantity === 0}
  title="Vender"
  className="p-1.5 rounded hover:bg-white/5 text-muted hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
>
  <BanknotesIcon className="w-4 h-4" />
</button>
```

Import: `import { BanknotesIcon, /* ...existing */ } from '@heroicons/react/24/outline'`

In the mobile card actions row, add (after the "Retirar" button or as a leading icon):

```jsx
<button
  onClick={() => onSellProduct(p)}
  disabled={p.quantity === 0}
  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded hover:bg-white/5 text-accent transition-colors text-xs disabled:opacity-30 disabled:cursor-not-allowed"
>
  <BanknotesIcon className="w-4 h-4" /> Vender
</button>
```

- [ ] **Step 3: Verify**

```powershell
npm run build
```

Manual:
- Stock tab → cualquier producto → click el ícono dorado de "Vender" → modal abre directo en Step 2 (no muestra el ProductPicker).
- Confirmar venta → stock decrementa en la misma tabla → en Ventas/Historial aparece la venta.
- Producto con stock=0 → botón Vender está gris/deshabilitado.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(stock): botón Vender en ProductTable abre el modal pre-seleccionado"
```

---

## Task 18: Manual testing checklist + push

**Files:** none

- [ ] **Step 1: Run through the spec's testing checklist**

For each item, manually verify in http://localhost:5173 and check off mentally:

1. ☐ `sales` table exists in Supabase Table Editor.
2. ☐ Registrar venta de producto en stock → factura `VTA-YYYYMMDD-001`, stock decrementa live (otra pestaña abierta lo refleja sin recargar).
3. ☐ Intentar vender más unidades que stock → toast de error, venta no se crea.
4. ☐ Registrar venta en USD → fila muestra `U$S 1.234`; Resumen tiene la celda en columna Dólares.
5. ☐ Anular venta → fila se opaca con badge "Anulada", stock del producto se restaura, la venta sale del Resumen.
6. ☐ Filtros temporales Hoy/Semana/Mes/Custom cambian el contenido del Resumen y de los charts.
7. ☐ Print → diálogo del navegador con el layout de bordes punteados, nav y charts ocultos.
8. ☐ Exportar Excel → archivo se descarga, dos hojas (Resumen + Detalle), totales coinciden.
9. ☐ PIN trabado en Stock → Dashboard financiero y columnas P.Costo/P.Venta ocultos; Ventas siguen mostrando importes.
10. ☐ Mobile breakpoint (devtools <768px) → modal y historial en formato cards, sin scroll horizontal, todas las acciones reachable.
11. ☐ Realtime → en dos pestañas, registrar venta en una refresca historial y dashboard en la otra automáticamente.
12. ☐ Botón Vender en ProductTable → abre modal pre-seleccionado en Step 2, no requiere búsqueda.

If any item fails, fix it before pushing. Each fix is its own commit.

- [ ] **Step 2: Push everything**

```bash
git push
```

Vercel auto-deploys. Verify the deployment in https://vercel.com → zwass → Deployments. Tail commit should match the latest local commit hash.

- [ ] **Step 3: Final verification on Vercel**

Open `zwass.vercel.app` → repeat 2-3 critical checks (register sale, anular, print). Confirm production parity with local.

- [ ] **Step 4: Commit any final tweaks (if needed) and push again**

---

## Notes for the implementer

- All Tailwind classes follow the existing dark-leather palette (`bg-card`, `border-white/5`, `text-cream`, `text-muted`, `text-accent`). When in doubt, copy patterns from `ProductTable.jsx` or `ProductModal.jsx`.
- All dates rendered to the user must go through `Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', ... })`.
- The `Header` component now accepts nullable `onAddProduct`/`onImport`/`onExport`. Hide each button when its prop is null.
- After each commit, **read** the dev server output file to confirm HMR succeeded:
  ```powershell
  Get-Content "C:\Users\admin\AppData\Local\Temp\claude\c--Users-admin-Zwass-stock\3e732785-584a-4d31-9741-795b2cf7adde\tasks\bsxh4hesi.output" -Tail 5
  ```
  If you see red errors there, do not move to the next task.
- `useSales()` is called twice (App.jsx for the Nav indicator + SalesView for the historial). This creates two realtime channels — fine for now, since both stay in sync. If this becomes a concern, hoist `useSales()` to a context.
- Out of scope (do NOT add): per-user auth, currency conversion, "edit sale" flow, customer records.
