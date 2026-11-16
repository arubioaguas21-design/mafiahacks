# Tintuka · Camisetas y sudaderas

Tienda de camisetas y sudaderas con diseños propios, impresas bajo pedido con **Gelato** y vendidas con **Shopify**.

## Carpetas

| Carpeta / archivo | Qué es |
|---|---|
| `theme/` | **Tema de Shopify** listo para subir (Tienda online → Temas → Subir archivo zip) |
| `docs/GUIA-SHOPIFY-GELATO.md` | Guía paso a paso: crear la tienda, subir el tema, conectar Gelato, envíos, precios y devoluciones |
| `index.html`, `script.js` | Maqueta estática para ver el diseño en el navegador sin Shopify. Usa el mismo CSS que el tema (`theme/assets/base.css`) |

## Generar el zip del tema

```bash
cd theme && zip -r ../tema-tintuka.zip . -x '.*'
```

## Qué incluye el tema

- Estilo moderno y llamativo: colores vivos (violeta, rosa y lima), bordes marcados y sombras desplazadas
- Señales de confianza reales: franja de confianza, garantías, pago seguro con los métodos de pago, fecha estimada de entrega, datos legales de la empresa y estrellas solo con opiniones reales
- Portada editable: portada con imágenes, cinta de texto, categorías, productos destacados, garantías, "Así funciona", ventajas, banner de descuento, opiniones (oculta hasta que tengas opiniones reales) y FAQ
- Personalizador opcional por producto (texto, tipografía, color, posición e imagen propia, con vista previa en directo)
- Ficha de producto con galería, colores y tallas, % de descuento, añadir al carrito sin recargar, pago rápido y barra fija de compra en móvil
- Colección con filtros de Shopify, orden y paginación
- Carrito con barra de envío gratis, búsqueda, blog, contacto, 404, contraseña y tarjeta regalo
- Todo en español y editable desde el editor de temas de Shopify
