# MAFIA · Camisetas y sudaderas

Tienda de camisetas y sudaderas con diseños propios, impresas bajo pedido con **Gelato** y vendidas con **Shopify**.

## Carpetas

| Carpeta / archivo | Qué es |
|---|---|
| `theme/` | **Tema de Shopify** listo para subir (Tienda online → Temas → Subir archivo zip) |
| `docs/GUIA-SHOPIFY-GELATO.md` | Guía paso a paso: crear la tienda, subir el tema, conectar Gelato, envíos, precios y devoluciones |
| `index.html`, `styles.css`, `script.js` | Primera maqueta estática de la web (solo de referencia visual) |

## Generar el zip del tema

```bash
cd theme && zip -r ../tema-mafia.zip . -x '.*'
```

## Qué incluye el tema

- Portada editable: portada con imágenes, cinta de texto, categorías, productos destacados, "Así funciona", ventajas, opiniones (oculta hasta que tengas opiniones reales) y FAQ
- Ficha de producto con galería, colores y tallas, añadir al carrito sin recargar y pago rápido
- Colección con filtros de Shopify, orden y paginación
- Carrito con barra de envío gratis, búsqueda, blog, contacto, 404, contraseña y tarjeta regalo
- Todo en español y editable desde el editor de temas de Shopify
