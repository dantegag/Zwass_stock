# Sales / POS Module — Design Spec

**Date:** 2026-05-26
**Project:** Zwass Stock (`zwass-stock`)
**Stack:** React 18 + Vite + Tailwind + Supabase (Postgres + Realtime)

## Goal

Add a Ventas (sales) module alongside the existing Stock module so the team can register sales, view sales history, and produce a daily/weekly/monthly cash register summary broken down by payment method and currency. The Excel-based "Resumen de Caja" workflow used today is replaced by a digital flow that:

- Decrements product stock automatically when a sale is registered.
- Stores all sale records with denormalized snapshots (so historical reports survive product edits).
- Supports three currencies (ARS, USD, EUR) without auto-conversion.
- Produces printable and Excel-exportable summaries.

## Decisions (confirmed during brainstorming)

| # | Decision | Choice |
|---|---|---|
| 1 | Scope | Build everything in one pass — DB + nav + sale modal + log + Resumen de Caja + charts + print + export + Vender button. |
| 2 | Multi-currency | No exchange rate field. Each sale stores `total_price` in the chosen currency. Resumen shows separate Pesos/Dólares/Euros columns with no conversion. |
| 3 | Stock decrement | Postgres trigger on `sales` (AFTER INSERT/UPDATE). Atomic. Prevents oversell via raised exception on negative stock. |

## Database

### New table: `sales`

```sql
CREATE TABLE sales (
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

CREATE INDEX sales_sold_at_idx ON sales (sold_at DESC);
CREATE INDEX sales_payment_method_idx ON sales (payment_method);
CREATE INDEX sales_voided_at_idx ON sales (voided_at) WHERE voided_at IS NULL;

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_sales" ON sales FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
```

### Invoice number generation

Format: `VTA-AAAAMMDD-NNN` reset per Argentina day. Generated server-side by a `BEFORE INSERT` trigger:

```sql
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

### Stock auto-adjust trigger

```sql
CREATE OR REPLACE FUNCTION adjust_stock_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  current_qty int;
BEGIN
  -- INSERT new sale: decrement stock
  IF TG_OP = 'INSERT' AND NEW.product_id IS NOT NULL THEN
    SELECT quantity INTO current_qty FROM products WHERE id = NEW.product_id FOR UPDATE;
    IF current_qty < NEW.quantity THEN
      RAISE EXCEPTION 'Stock insuficiente: hay % unidades disponibles', current_qty;
    END IF;
    UPDATE products SET quantity = quantity - NEW.quantity WHERE id = NEW.product_id;

  -- UPDATE marking sale as voided: restore stock
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

`FOR UPDATE` lock protects against concurrent oversell. Reversing a void (un-voiding) is not supported by this trigger; it isn't a use case.

## Architecture

### File reorganization

Existing components are grouped under `components/stock/` to make room for `components/sales/` and `components/shared/`:

```
src/
├── App.jsx                   ← tab switcher
├── components/
│   ├── shared/
│   │   ├── Nav.jsx           ← Stock | Ventas tabs + today total
│   │   ├── Header.jsx        ← (moved from components/)
│   │   ├── PinModal.jsx
│   │   └── ConfirmModal.jsx
│   ├── stock/
│   │   ├── StockView.jsx     ← container (was the body of App.jsx)
│   │   ├── Dashboard.jsx
│   │   ├── ProductTable.jsx
│   │   ├── ProductModal.jsx
│   │   ├── StockMovementModal.jsx
│   │   ├── MovementHistory.jsx
│   │   ├── ImportModal.jsx
│   │   └── ExportButton.js
│   └── sales/
│       ├── SalesView.jsx     ← container with log/summary toggle
│       ├── RegisterSaleButton.jsx
│       ├── RegisterSaleModal.jsx
│       ├── ProductPicker.jsx
│       ├── SaleDetailsForm.jsx
│       ├── SalesLog.jsx
│       ├── CashRegisterSummary.jsx
│       ├── PaymentMethodTable.jsx
│       ├── SalesCharts.jsx
│       └── PrintableSummary.jsx
├── hooks/
│   ├── useProducts.js        ← (no changes)
│   └── useSales.js           ← NEW
├── lib/
│   ├── supabase.js
│   ├── formatCurrency.js     ← extended for USD/EUR
│   ├── parseExcel.js
│   └── exportSalesSummary.js ← NEW
└── contexts/
    └── PinContext.jsx        ← NEW (shared price-unlock across modules)
```

Import paths in existing files (App, ProductTable, etc.) are updated to point at the new locations.

### State & data flow

- `App.jsx` owns `activeTab` (`'stock' | 'sales'`) and wraps everything in `<PinProvider>`.
- `<PinProvider>` exposes `{ unlocked, requestUnlock, lock }` so both modules share one PIN session.
- `useProducts()` and `useSales()` are independent hooks, each with their own Realtime channel.
- `useSales()` returns: `sales`, `loading`, `registerSale`, `voidSale`, `summary(filter)`, `fetchSales`.
- The stock-decrement happens in the DB trigger; frontend just calls `supabase.from('sales').insert(...)` and reacts to the realtime update on `products`.

## UX

### Navigation

A new `<Nav>` component sits directly under the existing `<Header>`:

```
┌────────────────────────────────────────────────────────────────┐
│ ZWASS — Sistema de Stock          [Importar][Exportar][Nuevo] │  ← Header
├────────────────────────────────────────────────────────────────┤
│  ● Stock     Ventas                       Vendido hoy $34.500 │  ← Nav
└────────────────────────────────────────────────────────────────┘
```

The active tab uses `text-accent` and an underline. The right side shows today's ARS total in muted text (signal-of-life). Header buttons (Import/Export/Nuevo) remain Stock-specific and are hidden on the Ventas tab; replaced by a single CTA `+ Registrar Venta`.

### Register Sale modal (3 steps)

**Step 1 — Product picker:**
- Autofocused search input filters live by name, sku, color.
- Results render as horizontal cards (name + sku · color · size + "Stock: N" on the right). Out-of-stock items are dimmed, show "Agotado" badge, and are not clickable.
- Empty state: "Buscá un producto para empezar".

**Step 2 — Sale details:** (entered with a pre-selected product, also reachable from Stock's Vender button)
- Top section (read-only style): product name + "Stock disponible: N".
- Editable inputs:
  - Color (text, pre-filled from product)
  - Talle (text, pre-filled from product)
  - Cantidad (number, min 1, max=current stock; inline error if exceeded)
  - Moneda (radio: ARS / USD / EUR)
  - Nacionalidad (radio: Arg / Extranjero — default Arg)
  - Precio unit. (number, pre-filled from product.sale_price)
  - Método de pago (select with the 10 enum values)
  - Notas (textarea, optional)
- Footer:
  - Live total: `Total: <formatted in chosen currency>`
  - Buttons: Cancelar / Volver (to step 1, only if not pre-selected) / Confirmar Venta

**Step 3 — Confirming:** brief spinner while the insert resolves. On success:
- Toast `✓ Venta {invoice_number} — {product} · {method} · {total}`.
- If resulting product.quantity = 0, second toast warning `⚠️ {product} quedó sin stock`.
- Modal closes; sales log refreshes via realtime.
- On error (e.g. trigger raises "Stock insuficiente"): error toast, stay in modal, user can adjust quantity.

### Sales Log

A table similar to ProductTable: `N° Factura | Fecha | Artículo | Color | Talle | Cant. | P. Unit | Total | Método | [⋯]`.
- Default sort: `sold_at DESC`.
- Filter row: search (invoice/product/notes) + date range + payment method dropdown.
- Sale rows for voided sales: row dimmed, text struck through, badge "Anulada".
- Actions: 🕐 Ver detalle (drawer with notes + nationality), ❌ Anular venta (confirm modal → sets `voided_at`).
- Prices and totals hidden by default until PIN unlocks. Cantidad and meta info always visible.
- Mobile (md-): card list. Each card shows invoice on top, product name, payment method, total, and the actions.

### Cash Register Summary (Resumen de Caja)

Toggle inside SalesView: `[ Log de ventas ] [ Resumen de caja ]`.

When Resumen is active:

1. **Time filter row** — chips `Hoy | Esta semana | Este mes` + custom `Desde [📅] Hasta [📅]`. State stored in component; default is "Hoy".
2. **Payment method table** — rows for the 10 methods (in the spec's order); columns Pesos / Dólares / Euros. Values from sales filtered by `sold_at` within range AND `voided_at IS NULL`. Footer row: `VENTA TOTAL` per column. All amounts hidden behind PIN.
3. **Action buttons** — `[ Imprimir resumen ]` and `[ Exportar a Excel ]`.
4. **Charts row** (below the table):
   - Bar chart: ARS revenue per day in range (USD/EUR omitted for clarity; tooltip text mentions this).
   - Donut chart: % of ARS total per payment method.
   - Horizontal bar: top 5 productos más vendidos (by unit count, all currencies aggregated).

### Print view

A separate `<PrintableSummary>` component rendered into a portal under `<body>` (hidden offscreen normally, visible only via `@media print`). The chrome (nav, charts, action buttons) is hidden via `print:hidden`. The printable area renders:

```
··········································  ← dotted top frame
            ZWASS — RESUMEN DE CAJA
       Período: 25/05/2026 – 26/05/2026
··········································

Método de Pago        Pesos      Dólares  Euros
Efectivo Pesos      $234.500     —        —
Tarjeta Crédito     $612.000     —        —
...
VENTA TOTAL         $1.465.800   U$S 450  € 200

··········································
              Impreso 26/05/2026 18:34
··········································
```

Triggered by `window.print()` from the "Imprimir resumen" button. PIN unlock is required (the print view never reveals amounts if locked).

### Excel export

`exportSalesSummary(range, sales)` builds a workbook with two sheets via `xlsx`:
- **Resumen** — same payment method × currency layout, plus total row.
- **Detalle** — all sales in range, one row per sale, all columns including notes.

File name: `zwass-resumen-{YYYY-MM-DD}-{YYYY-MM-DD}.xlsx`.

### Stock integration ("Vender" button)

In `ProductTable` desktop row actions, a new icon button:
- Icon: `BanknotesIcon` from `@heroicons/react/24/outline`, color `text-accent`.
- Tooltip: "Vender".
- Disabled (grayed) when `quantity = 0`.
- Click → opens `<RegisterSaleModal>` with `initialStep="details"` and `preselectedProduct={p}`.

Same button appears in the mobile card layout alongside `Sumar`/`Retirar`.

### PIN protection

Extracts the existing `unlocked` state from `Dashboard` and `ProductTable` into a `<PinContext>`:

```jsx
const { unlocked, requestUnlock } = usePin();
// requestUnlock() opens the PinModal if locked, no-op if already unlocked
```

All places that previously held their own local `unlocked` state (Dashboard, ProductTable, new CashRegisterSummary, SalesLog) consume this context. One PIN entry unlocks prices everywhere for the session. A "Bloquear precios" button in the Nav locks again.

## Formatting

`lib/formatCurrency.js` is extended:

```js
formatMoney(amount, currency = 'ARS') → string
// ARS:  "$1.234.567"
// USD:  "U$S 1.234"
// EUR:  "€ 1.234"
```

Dates always rendered in `America/Argentina/Buenos_Aires` timezone via `Intl.DateTimeFormat`.

## New dependency

- `recharts` (~50KB gzipped) for the three charts. Already-present `xlsx` handles the export.

## Out of scope (not in this iteration)

- Currency conversion / "Total general en ARS" view.
- Per-user authentication (still relies on shared PIN like the rest of the app).
- Editing a sale after creation (anular + crear nueva is the workflow).
- Inventory reports beyond what the Stock module already provides.
- Customer / contact records.

## Testing approach

Manual end-to-end checklist after implementation, executed via the running dev server:

1. Migration applied; `sales` table visible in Supabase Table Editor.
2. Register sale of an in-stock product → invoice generated `VTA-YYYYMMDD-001`, stock decrements live.
3. Try selling more units than available → error toast, sale not created.
4. Register sale in USD → row shows `U$S` formatting; Resumen has it in the Dólares column.
5. Anular venta → row dims, product stock restored.
6. Time filters switch the Resumen table and charts.
7. Print view → opens dialog with the dotted-frame layout, all chrome hidden.
8. Excel export → file downloads, both sheets present with correct totals.
9. PIN locked → all prices in both modules masked; unlock once → unlocked in both.
10. Mobile breakpoint → sale modal and log render as cards, no horizontal scroll, all actions reachable.
11. Realtime → opening two tabs, registering a sale in one updates the log and dashboard in the other.

## Risks & mitigations

- **Trigger raises an error in the middle of a sale.** Frontend surfaces the message in the toast; the modal remains open so the user can adjust quantity.
- **Realtime channel disconnects.** Both `useProducts` and `useSales` re-subscribe on mount; manual refresh always works.
- **Time zone bugs in invoice numbering or filters.** All "today/week/month" math happens with `America/Argentina/Buenos_Aires`. The trigger uses the same TZ for the invoice prefix.
- **PIN context refactor breaks the existing Stock module.** Mitigated by leaving the same UX (lock icon, "Ver precios" button) and centralizing the unlocked flag in one place.
