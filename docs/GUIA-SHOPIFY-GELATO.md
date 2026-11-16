# Guía: montar la tienda con Shopify + Gelato

Cómo funciona todo junto:

- **Shopify** es la tienda: la web, el carrito, los cobros y los clientes.
- **Gelato** fabrica y envía. Cuando alguien compra, el pedido pasa solo a Gelato, que imprime la prenda en el centro de producción más cercano al cliente y se la manda.
- **Tú** creas los diseños, los subes a Gelato y pones los precios.

---

## 1. Crea la tienda de Shopify

1. Entra en shopify.com y crea una tienda nueva. Si ya tienes otra tienda (Lolives), puedes crearla desde la misma cuenta: cada tienda tiene su propia web, sus productos y su plan.
2. Rellena el nombre de la tienda, el país (España) y la moneda (EUR).

## 2. Sube el tema

1. Genera el archivo del tema (o usa el `tema-colorcalle.zip` que te he pasado):
   ```bash
   cd theme && zip -r ../tema-colorcalle.zip . -x '.*'
   ```
   Los archivos `layout/`, `sections/`… tienen que quedar en la raíz del zip, no dentro de una carpeta.
2. En Shopify: **Tienda online → Temas → Añadir tema → Subir archivo zip**.
3. Pulsa **Personalizar** para revisarlo y luego **Publicar**.

En el editor (**Personalizar**) puedes cambiar sin tocar código:

| Dónde | Qué cambiar |
|---|---|
| Cabecera | Logo (o el texto "colorcalle") y menú |
| Barra de anuncios | El texto de arriba del todo |
| Portada | Título, texto, botones y las 2 imágenes (usa mockups de Gelato con fondo limpio) |
| Categorías | Elige las colecciones **Camisetas** y **Sudaderas** (paso 5) |
| Productos destacados | La colección que se muestra (si no eliges ninguna, salen todos los productos) |
| Franja de confianza | Los 4 mensajes bajo la cabecera (pago seguro, envío, devoluciones, atención) |
| Garantías | Las 4 tarjetas de "Sin letra pequeña" |
| Banner promocional | El "-10% en tu primer pedido" (mira el paso 9 bis: hay que crear el código) |
| Opiniones | **Está oculta.** Actívala solo cuando tengas opiniones reales de clientes |
| Pie de página | Texto, menús y newsletter |
| Configuración del tema → Colores | Los 6 colores de la marca (violeta, rosa, lima…) |
| Configuración del tema → Datos de la empresa | **Titular, NIF, dirección y email.** Salen en el pie de página: dan confianza y en España es obligatorio (LSSI) |
| Configuración del tema → Entrega | Días laborables mínimos y máximos para el aviso "Recíbelo entre el … y el …" de cada producto. Pon plazos reales |
| Configuración del tema → Tarjetas de producto | Teñir el fondo blanco de los mockups con el color de la tarjeta (activado) |

## 3. Conecta Gelato

1. En Shopify: **Apps → Shopify App Store**, busca **Gelato** e instálala.
2. Crea tu cuenta de Gelato (o inicia sesión) y conéctala con la tienda.
3. Revisa en Gelato el método de pago con el que te cobrarán la fabricación y el envío de cada pedido.

## 4. Crea los productos en Gelato

Por cada diseño:

1. En Gelato, elige la prenda base del catálogo (camiseta, oversize, sudadera con capucha…). Fíjate en la calidad, el gramaje y en qué países se fabrica.
2. Sube tu diseño: **PNG con fondo transparente**, a buena resolución (lo ideal es unos 300 ppp al tamaño real de impresión).
3. Elige colores y tallas, y genera los mockups.
4. Pon el título, la descripción y el **precio de venta**.
5. **Publícalo en Shopify.** El producto aparece en tu tienda con sus fotos, colores y tallas.

**Nombre de la opción de color:** el tema busca una opción llamada `Color` para mostrar las bolitas de colores. Si en tus productos se llama de otra forma (por ejemplo `Colour`), cámbialo en **Personalizar → Configuración del tema → Tarjetas de producto**.

**Bolitas de color:** para que se vean bolitas en vez del nombre, en la ficha del producto en Shopify vincula la opción Color con su metacampo de categoría "Color" y asigna un color a cada valor.

**Etiquetas útiles:** si añades la etiqueta `nuevo` o `mas-vendido` a un producto, su tarjeta mostrará la insignia "Nuevo" o "Más vendido".

## 5. Colecciones

En **Productos → Colecciones**, crea:

- **Camisetas**: automática, con la condición "Tipo de producto es igual a Camiseta" (o el tipo que ponga Gelato).
- **Sudaderas**: igual, con el tipo de las sudaderas.

Después asígnalas en **Personalizar → Portada → Categorías**.

## 6. Menús

En **Tienda online → Menús**:

- **Menú principal** (`main-menu`): Camisetas, Sudaderas, Cómo funciona (enlace `/#como-funciona`), Contacto.
- **Menú del pie** (`footer`): Preguntas frecuentes (`/#faq`), Contacto, Guía de tallas, Envíos.

## 7. Páginas

En **Tienda online → Páginas**:

- **Contacto**: al crearla, elige la plantilla **page.contact**, que incluye el formulario. Pon tu email y tu WhatsApp en **Personalizar**.
- **Guía de tallas**: copia las medidas de las prendas de Gelato que uses. Luego, en **Personalizar → Producto**, elige esta página como "Guía de tallas".
- **Sobre nosotros** (opcional).

## 8. Envíos

Gelato te cobra el envío de cada pedido, así que tus tarifas de envío deben cubrirlo.

- En **Configuración → Envío y entrega**, crea tarifas para España y los países a los que vendas.
- La barra de "envío gratis a partir de 60 €" del carrito es solo visual. Para que el envío gratis sea real, crea en Shopify una tarifa gratuita para pedidos de más de 60 €. Si cambias la cifra, cámbiala también en **Personalizar → Carrito**.
- Revisa los plazos de Gelato para tu catálogo y ajusta los textos del tema ("2-5 días de fabricación") si no coinciden.

## 9. Pagos e impuestos

- **Configuración → Pagos**: activa Shopify Payments (tarjeta, Apple Pay, Google Pay) y Bizum o PayPal si te interesan.
- **Configuración → Impuestos**: precios con IVA incluido. Si vendes a otros países de la UE, infórmate sobre la ventanilla única (OSS).

## 9 bis. Código de bienvenida del banner (-10 %)

El banner promete un 10 % de descuento al apuntarse a la newsletter. Para que la promesa se cumpla:

1. **Descuentos → Crear descuento**: un código, por ejemplo `BIENVENIDA10`, con un 10 % y "un uso por cliente".
2. Instala **Shopify Email** (gratis) y crea la automatización **Bienvenida a nuevos suscriptores** con ese código.
3. Si no quieres ofrecer descuento, cambia el banner a "Botón con enlace" o desactívalo en **Personalizar**.

## Opiniones reales (recomendado)

Las estrellas de las tarjetas y de la ficha de producto **solo aparecen si hay valoraciones reales**. El tema las lee de una app de opiniones que use el metacampo estándar de Shopify (`reviews.rating`), como Judge.me o Shopify Product Reviews. Instala una, activa los emails que piden opinión tras la compra y, cuando tengas unas cuantas, activa también la sección **Opiniones** de la portada con textos reales. No te inventes opiniones: es ilegal en la UE y se nota.

## 10. Devoluciones y textos legales (importante)

- En la UE, el cliente tiene **14 días para desistir** de una compra online. La excepción para productos personalizados se aplica a lo hecho según las indicaciones del cliente. **Con diseños tuyos en tallas estándar, lo normal es que la excepción no se aplique.** Cuenta con aceptar devoluciones.
- Gelato suele reponer las prendas con defectos de fabricación, pero **no se queda las devoluciones por cambio de opinión**. Decide qué haces tú con ellas (por ejemplo, que el cliente pague el envío de vuelta).
- Genera las políticas en **Configuración → Políticas** (devoluciones, privacidad, términos, envíos y aviso legal) y pide a un asesor que las revise. Salen solas en el pie de página.

## 11. Calcula tus precios

Por cada producto:

```
precio de venta (con IVA)
 − IVA (21 %)
 − coste de la prenda en Gelato
 − envío que no te cubra el cliente
 − comisión del pago (~1,5-3 %)
 = tu margen
```

## 12. Antes de abrir

- [ ] Rellena **Datos de la empresa** y la página de contacto con datos reales.
- [ ] Comprueba que lo que dicen la franja de confianza, las garantías y las FAQ (14 días, envío con seguimiento, respuesta en 24 h) es lo que vas a cumplir.
- [ ] Haz un **pedido de prueba** con tus propios diseños para ver la calidad real.
- [ ] Revisa la web en el móvil.
- [ ] Conecta tu dominio (**Configuración → Dominios**).
- [ ] Quita la contraseña de la tienda (**Tienda online → Preferencias**).
