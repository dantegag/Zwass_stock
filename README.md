# Zwass — Sistema de Stock

Aplicación interna de gestión de inventario para [Zwass](https://www.zwass4us.com/), marca argentina de marroquinería.

## Tecnologías

- React 18 + Vite
- Supabase (PostgreSQL + Realtime)
- Tailwind CSS
- SheetJS (importación/exportación Excel)
- react-hot-toast

## Setup

### 1. Instalar Node.js

Descargar e instalar desde [nodejs.org](https://nodejs.org/) (versión 18 o superior).

### 2. Clonar e instalar dependencias

```bash
git clone <repo>
cd zwass-stock
npm install
```

### 3. Configurar Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/migrations/001_initial_schema.sql`
3. Copiar las credenciales desde **Settings → API**

### 4. Variables de entorno

```bash
cp .env.example .env
```

Editar `.env`:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 5. Correr localmente

```bash
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173)

### 6. Build para producción

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
