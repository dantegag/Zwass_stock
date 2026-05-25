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
