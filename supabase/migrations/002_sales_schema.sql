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
