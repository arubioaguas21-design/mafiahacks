# MAFIA · Tienda de camisetas y sudaderas personalizadas

Web estática (HTML + CSS + JS, sin dependencias) para una tienda de camisetas y sudaderas personalizadas. No incluye personalizador: el cliente elige prenda, color, talla y zona de estampado, y envía su diseño después del pedido por email o WhatsApp.

## Cómo verla
Abre `index.html` en el navegador (o sirve la carpeta con cualquier servidor estático, p. ej. `python3 -m http.server`).

## Qué incluye
- Catálogo de 10 prendas con filtros (camisetas / sudaderas) y orden por precio
- Ficha de producto con color, talla, zona de estampado y cantidad
- Carrito lateral guardado en el navegador, con barra de envío gratis
- Secciones: cómo funciona, técnicas, empresas y descuentos por volumen, opiniones, FAQ y contacto
- Diseño adaptado a móvil

## Personalizar
- Productos, precios y colores: arrays `PRODUCTS` y `COLORS` en `script.js`
- Colores de la marca: variables `:root` en `styles.css`
- Nombre, email y teléfono: `index.html`

> El checkout, el formulario de contacto y la newsletter son de demostración: no envían nada todavía. Para cobrar de verdad hay que conectarlo a una pasarela (Stripe, Shopify, WooCommerce…).
