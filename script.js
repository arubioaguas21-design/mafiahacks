/* =========================================================
   MAFIA · Tienda de camisetas y sudaderas personalizadas
   ========================================================= */

// ---------- Utilidades de color ----------
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function isLight(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

// ---------- Ilustraciones SVG de prendas ----------
const SHAPES = {
  tee: "M70 22 Q100 42 130 22 L172 38 L196 84 L162 98 L155 82 L155 186 L45 186 L45 82 L38 98 L4 84 L28 38 Z",
  oversize: "M68 22 Q100 42 132 22 L178 40 L198 96 L162 106 L158 92 L160 188 L40 188 L42 92 L38 106 L2 96 L22 40 Z",
  longsleeve: "M70 22 Q100 42 130 22 L170 36 L196 172 L173 177 L155 88 L155 186 L45 186 L45 88 L27 177 L4 172 L30 36 Z",
  tank: "M72 16 Q100 62 128 16 L142 16 Q142 56 160 70 L160 186 L40 186 L40 70 Q58 56 58 16 Z",
  crew: "M70 24 Q100 44 130 24 L172 38 L198 170 L175 178 L156 92 L156 176 L44 176 L44 92 L25 178 L2 170 L28 38 Z",
  hoodie: "M66 30 Q100 58 134 30 L172 42 L198 170 L175 178 L156 92 L156 176 L44 176 L44 92 L25 178 L2 170 L28 42 Z",
};

let svgId = 0;
function garmentSVG(type, color) {
  const gid = "g" + (++svgId);
  const dark = shade(color, -0.12);
  const darker = shade(color, -0.25);
  const line = isLight(color) ? "rgba(0,0,0,.18)" : "rgba(0,0,0,.35)";
  const hl = isLight(color) ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.08)";
  const base = SHAPES[type] || SHAPES.tee;
  let extra = "";

  if (["tee", "oversize", "longsleeve"].includes(type)) {
    const w = type === "oversize" ? 32 : 30;
    extra += `<path d="M${100 - w} 22 Q100 ${type === "oversize" ? 46 : 44} ${100 + w} 22" fill="none" stroke="${darker}" stroke-width="5" stroke-linecap="round"/>`;
  }
  if (type === "tank") {
    extra += `<path d="M72 16 Q100 62 128 16" fill="none" stroke="${darker}" stroke-width="4"/>`;
  }
  if (type === "crew" || type === "hoodie" || type === "zip") {
    // puños y cintura de canalé
    extra += `<rect x="44" y="166" width="112" height="12" rx="2" fill="${dark}"/>`;
    extra += `<path d="M175 178 L198 170 L195 158 L172 166 Z M25 178 L2 170 L5 158 L28 166 Z" fill="${dark}"/>`;
  }
  if (type === "crew") {
    extra += `<path d="M70 24 Q100 50 130 24" fill="none" stroke="${dark}" stroke-width="7" stroke-linecap="round"/>`;
  }
  if (type === "hoodie" || type === "zip") {
    // capucha
    extra += `<path d="M62 34 Q56 2 100 2 Q144 2 138 34 Q100 66 62 34 Z" fill="${color}" stroke="${line}" stroke-width="1.5"/>`;
    extra += `<path d="M74 32 Q74 12 100 12 Q126 12 126 32 Q100 52 74 32 Z" fill="${darker}"/>`;
    if (type === "hoodie") {
      // cordones + bolsillo canguro
      extra += `<path d="M90 50 L88 88 M110 50 L112 88" stroke="${isLight(color) ? darker : "#f2f2f2"}" stroke-width="2.5" stroke-linecap="round"/>`;
      extra += `<path d="M68 128 L132 128 L142 162 L58 162 Z" fill="none" stroke="${line}" stroke-width="2"/>`;
    } else {
      extra += `<path d="M100 48 L100 176" stroke="${darker}" stroke-width="3"/>`;
      extra += `<path d="M58 132 L74 162 M142 132 L126 162" stroke="${line}" stroke-width="2.5" stroke-linecap="round"/>`;
    }
  }

  const shape = type === "zip" ? SHAPES.hoodie : base;
  return `<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
    <ellipse cx="100" cy="188" rx="70" ry="3" fill="rgba(0,0,0,.08)"/>
    <path d="${shape}" fill="${color}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="${shape}" fill="url(#${gid})" opacity=".6"/>
    <defs><linearGradient id="${gid}" x1="0" x2="1"><stop offset="0" stop-color="${hl}"/><stop offset=".5" stop-color="transparent"/><stop offset="1" stop-color="rgba(0,0,0,.08)"/></linearGradient></defs>
    ${extra}
  </svg>`;
}

// Pinta las ilustraciones estáticas del HTML
document.querySelectorAll("[data-garment]").forEach((el) => {
  el.innerHTML = garmentSVG(el.dataset.garment, el.dataset.color);
});

// ---------- Catálogo ----------
const COLORS = {
  blanco: { name: "Blanco", hex: "#f7f6f2" },
  negro: { name: "Negro", hex: "#1c1c1c" },
  gris: { name: "Gris jaspeado", hex: "#a9a9a9" },
  marino: { name: "Azul marino", hex: "#1f3a5f" },
  rojo: { name: "Rojo", hex: "#c8102e" },
  verde: { name: "Verde botella", hex: "#1e4d3a" },
  arena: { name: "Arena", hex: "#d8c7a3" },
  rosa: { name: "Rosa pastel", hex: "#f2b8c6" },
  azul: { name: "Azul cielo", hex: "#9cc3e6" },
  burdeos: { name: "Burdeos", hex: "#5e1b2b" },
  mostaza: { name: "Mostaza", hex: "#d9a21b" },
};

const PRODUCTS = [
  { id: "tee-basic", cat: "camiseta", type: "tee", name: "Camiseta Básica", price: 14.9, badge: "Más vendida",
    desc: "Algodón 100% peinado de 180 g/m². Corte unisex regular y tacto suave. La base perfecta para cualquier diseño.",
    colors: ["blanco", "negro", "gris", "marino", "rojo", "verde"], sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  { id: "tee-oversize", cat: "camiseta", type: "oversize", name: "Camiseta Oversize", price: 19.9, badge: "Nuevo",
    desc: "Gramaje pesado de 240 g/m², hombro caído y cuello grueso. Estilo streetwear.",
    colors: ["negro", "blanco", "arena", "verde", "burdeos"], sizes: ["S", "M", "L", "XL"] },
  { id: "tee-long", cat: "camiseta", type: "longsleeve", name: "Camiseta Manga Larga", price: 18.9,
    desc: "Algodón orgánico de 200 g/m² con puños de canalé. Ideal para estampar también en las mangas.",
    colors: ["blanco", "negro", "marino", "gris"], sizes: ["S", "M", "L", "XL", "XXL"] },
  { id: "tee-tank", cat: "camiseta", type: "tank", name: "Camiseta de Tirantes", price: 12.9,
    desc: "Fresca y ligera, 160 g/m². Perfecta para gimnasio, festivales y verano.",
    colors: ["blanco", "negro", "rojo", "azul"], sizes: ["S", "M", "L", "XL"] },
  { id: "tee-premium", cat: "camiseta", type: "tee", name: "Camiseta Premium Orgánica", price: 22.9, badge: "Eco",
    desc: "Algodón 100% orgánico certificado GOTS, 200 g/m². Teñido con tintes de bajo impacto.",
    colors: ["arena", "rosa", "azul", "verde", "blanco"], sizes: ["XS", "S", "M", "L", "XL"] },
  { id: "tee-kids", cat: "camiseta", type: "tee", name: "Camiseta Infantil", price: 11.9,
    desc: "Algodón suave para los más pequeños. Tallas de 3 a 14 años.",
    colors: ["blanco", "rojo", "azul", "rosa", "mostaza"], sizes: ["3-4", "5-6", "7-8", "9-11", "12-14"] },
  { id: "hoodie-classic", cat: "sudadera", type: "hoodie", name: "Sudadera con Capucha", price: 32.9, badge: "Más vendida",
    desc: "Felpa perchada de 300 g/m², bolsillo canguro y cordones a juego. Abrigo y comodidad.",
    colors: ["negro", "gris", "marino", "burdeos", "verde", "arena"], sizes: ["XS", "S", "M", "L", "XL", "XXL"] },
  { id: "hoodie-heavy", cat: "sudadera", type: "hoodie", name: "Sudadera Oversize Heavy", price: 42.9, badge: "Nuevo",
    desc: "Gramaje extra de 400 g/m², capucha doble y caída holgada. Calidad premium.",
    colors: ["negro", "arena", "rosa", "azul"], sizes: ["S", "M", "L", "XL"] },
  { id: "crew-classic", cat: "sudadera", type: "crew", name: "Sudadera Cuello Redondo", price: 27.9,
    desc: "Clásica sin capucha de 280 g/m² con puños y cintura de canalé.",
    colors: ["gris", "negro", "marino", "mostaza", "blanco"], sizes: ["S", "M", "L", "XL", "XXL"] },
  { id: "zip-hoodie", cat: "sudadera", type: "zip", name: "Sudadera con Cremallera", price: 36.9,
    desc: "Cremallera completa metálica, capucha y bolsillos laterales. Perfecta para bordar el logo en el pecho.",
    colors: ["negro", "marino", "gris", "rojo"], sizes: ["S", "M", "L", "XL", "XXL"] },
];

const PRINT_ZONES = [
  { id: "front", name: "Delante", extra: 0 },
  { id: "back", name: "Espalda", extra: 0 },
  { id: "both", name: "Delante + espalda", extra: 6 },
];

const FREE_SHIPPING = 60;
const SHIPPING_COST = 4.95;

const eur = (n) => n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
const $ = (s) => document.querySelector(s);

// ---------- Grid de productos ----------
let currentFilter = "all";
let currentSort = "featured";

function renderGrid() {
  let list = PRODUCTS.filter((p) => currentFilter === "all" || p.cat === currentFilter);
  if (currentSort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  if (currentSort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);

  $("#productGrid").innerHTML = list.map((p, i) => `
    <article class="card" data-id="${p.id}" tabindex="0" style="animation-delay:${i * 40}ms">
      <div class="card__img">
        ${p.badge ? `<span class="badge ${p.badge === "Eco" ? "badge--dark" : ""}">${p.badge}</span>` : ""}
        ${garmentSVG(p.type, COLORS[p.colors[0]].hex)}
      </div>
      <div class="card__body">
        <div class="card__top">
          <h3 class="card__title">${p.name}</h3>
          <span class="card__price">${eur(p.price)}</span>
        </div>
        <p class="card__meta">${p.colors.length} colores · ${p.sizes[0]}–${p.sizes[p.sizes.length - 1]}</p>
        <div class="card__dots">${p.colors.slice(0, 6).map((c) => `<span class="dot" style="background:${COLORS[c].hex}" title="${COLORS[c].name}"></span>`).join("")}</div>
        <div class="card__btn"><span>Elegir opciones</span></div>
      </div>
    </article>`).join("");
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => setFilter(chip.dataset.filter));
});
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-active", c.dataset.filter === f));
  renderGrid();
}
document.querySelectorAll("[data-filter-link]").forEach((a) => {
  a.addEventListener("click", () => setFilter(a.dataset.filterLink));
});
$("#sort").addEventListener("change", (e) => { currentSort = e.target.value; renderGrid(); });

$("#productGrid").addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) openModal(card.dataset.id);
});
$("#productGrid").addEventListener("keydown", (e) => {
  const card = e.target.closest(".card");
  if (card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openModal(card.dataset.id); }
});

// ---------- Modal de producto ----------
const modal = $("#modal");
let sel = null;

function openModal(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  sel = { product: p, color: p.colors[0], size: p.sizes[Math.min(2, p.sizes.length - 1)], zone: "front", qty: 1 };

  $("#mCat").textContent = p.cat === "camiseta" ? "Camisetas" : "Sudaderas";
  $("#mTitle").textContent = p.name;
  $("#mDesc").textContent = p.desc;
  $("#mColors").innerHTML = p.colors.map((c) =>
    `<button class="swatch" data-color="${c}" style="background:${COLORS[c].hex}" aria-label="${COLORS[c].name}" title="${COLORS[c].name}"></button>`).join("");
  $("#mSizes").innerHTML = p.sizes.map((s) => `<button class="size" data-size="${s}">${s}</button>`).join("");
  $("#mPrint").innerHTML = PRINT_ZONES.map((z) =>
    `<button class="size" data-zone="${z.id}">${z.name}${z.extra ? ` (+${z.extra} €)` : ""}</button>`).join("");
  $("#mQty").value = 1;
  updateModal();

  modal.hidden = false;
  document.body.style.overflow = "hidden";
  modal.querySelector(".modal__close").focus();
}

function updateModal() {
  const p = sel.product;
  const zone = PRINT_ZONES.find((z) => z.id === sel.zone);
  $("#mImg").innerHTML = garmentSVG(p.type, COLORS[sel.color].hex);
  $("#mColorName").textContent = COLORS[sel.color].name;
  $("#mPrice").innerHTML = `${eur(p.price + zone.extra)} <small>/ ud · estampado incluido</small>`;
  document.querySelectorAll("#mColors .swatch").forEach((b) => b.classList.toggle("is-active", b.dataset.color === sel.color));
  document.querySelectorAll("#mSizes .size").forEach((b) => b.classList.toggle("is-active", b.dataset.size === sel.size));
  document.querySelectorAll("#mPrint .size").forEach((b) => b.classList.toggle("is-active", b.dataset.zone === sel.zone));
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = "";
}

$("#mColors").addEventListener("click", (e) => { const b = e.target.closest("[data-color]"); if (b) { sel.color = b.dataset.color; updateModal(); } });
$("#mSizes").addEventListener("click", (e) => { const b = e.target.closest("[data-size]"); if (b) { sel.size = b.dataset.size; updateModal(); } });
$("#mPrint").addEventListener("click", (e) => { const b = e.target.closest("[data-zone]"); if (b) { sel.zone = b.dataset.zone; updateModal(); } });
$("#mMinus").addEventListener("click", () => { $("#mQty").value = Math.max(1, +$("#mQty").value - 1); });
$("#mPlus").addEventListener("click", () => { $("#mQty").value = Math.min(999, +$("#mQty").value + 1); });
modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));

$("#mAdd").addEventListener("click", () => {
  const qty = Math.max(1, Math.min(999, parseInt($("#mQty").value, 10) || 1));
  addToCart({ ...sel, qty });
  closeModal();
  toast(`✓ ${sel.product.name} añadida al carrito`);
});

// ---------- Carrito ----------
const STORAGE_KEY = "mafia-cart";
let cart = [];
try { cart = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { cart = []; }
cart = cart.filter((it) => PRODUCTS.some((p) => p.id === it.id));

function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch { /* sin almacenamiento */ }
}

function unitPrice(it) {
  const p = PRODUCTS.find((x) => x.id === it.id);
  return p.price + PRINT_ZONES.find((z) => z.id === it.zone).extra;
}

function addToCart({ product, color, size, zone, qty }) {
  const key = [product.id, color, size, zone].join("|");
  const existing = cart.find((it) => it.key === key);
  if (existing) existing.qty += qty;
  else cart.push({ key, id: product.id, color, size, zone, qty });
  saveCart();
  renderCart();
  const badge = $("#cartCount");
  badge.classList.remove("bump"); void badge.offsetWidth; badge.classList.add("bump");
}

function renderCart() {
  const count = cart.reduce((s, it) => s + it.qty, 0);
  const subtotal = cart.reduce((s, it) => s + unitPrice(it) * it.qty, 0);
  $("#cartCount").textContent = count;

  if (!cart.length) {
    $("#cartItems").innerHTML = `<div class="empty"><p>Tu carrito está vacío.</p><p><a href="#tienda" class="link" data-close-cart>Ver prendas</a></p></div>`;
  } else {
    $("#cartItems").innerHTML = cart.map((it) => {
      const p = PRODUCTS.find((x) => x.id === it.id);
      const z = PRINT_ZONES.find((x) => x.id === it.zone);
      return `
      <div class="item" data-key="${it.key}">
        <div class="item__img">${garmentSVG(p.type, COLORS[it.color].hex)}</div>
        <div>
          <p class="item__title">${p.name}</p>
          <p class="item__meta">${COLORS[it.color].name} · Talla ${it.size} · ${z.name}</p>
          <div class="item__qty">
            <button data-act="dec" aria-label="Menos">−</button><span>${it.qty}</span><button data-act="inc" aria-label="Más">+</button>
          </div>
        </div>
        <div class="item__right">
          <strong>${eur(unitPrice(it) * it.qty)}</strong>
          <button class="item__remove" data-act="del">Eliminar</button>
        </div>
      </div>`;
    }).join("");
  }

  const left = FREE_SHIPPING - subtotal;
  const pct = Math.min(100, (subtotal / FREE_SHIPPING) * 100);
  $("#shipBar").innerHTML = cart.length
    ? `${left > 0 ? `Te faltan <strong>${eur(left)}</strong> para el envío gratis` : "🎉 ¡Tienes <strong>envío gratis</strong>!"}<div class="ship__bar"><i style="width:${pct}%"></i></div>`
    : "";
  $("#cartTotal").textContent = eur(subtotal);
  $("#checkout").disabled = !cart.length;
  $("#checkout").style.opacity = cart.length ? 1 : .5;
}

$("#cartItems").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const it = cart.find((x) => x.key === btn.closest(".item").dataset.key);
  if (btn.dataset.act === "inc") it.qty++;
  if (btn.dataset.act === "dec") it.qty--;
  if (btn.dataset.act === "del" || it.qty < 1) cart = cart.filter((x) => x !== it);
  saveCart();
  renderCart();
});

const drawer = $("#drawer");
function openCart() { drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
function closeCart() { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; }
$("#cartOpen").addEventListener("click", openCart);
drawer.addEventListener("click", (e) => { if (e.target.closest("[data-close-cart]")) closeCart(); });

$("#checkout").addEventListener("click", () => {
  if (!cart.length) return;
  const subtotal = cart.reduce((s, it) => s + unitPrice(it) * it.qty, 0);
  const total = subtotal + (subtotal >= FREE_SHIPPING ? 0 : SHIPPING_COST);
  cart = [];
  saveCart();
  renderCart();
  closeCart();
  toast(`¡Pedido recibido (${eur(total)})! Te escribiremos para pedirte tu diseño.`, 4500);
});

// ---------- Menú móvil ----------
const nav = $("#nav");
$("#menuBtn").addEventListener("click", () => nav.classList.toggle("is-open"));
nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nav.classList.remove("is-open")));

// ---------- Formularios ----------
$("#contactForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  let ok = true;
  form.querySelectorAll("[required]").forEach((f) => {
    const valid = f.value.trim() && (f.type !== "email" || /^\S+@\S+\.\S+$/.test(f.value));
    f.classList.toggle("invalid", !valid);
    if (!valid) ok = false;
  });
  if (!ok) { toast("Revisa los campos marcados"); return; }
  form.reset();
  $("#formOk").hidden = false;
  setTimeout(() => { $("#formOk").hidden = true; }, 5000);
});

$("#newsletter").addEventListener("submit", (e) => {
  e.preventDefault();
  e.target.reset();
  toast("¡Suscrito! Te llegará un 10% de descuento por email.");
});

// ---------- Toast ----------
let toastTimer;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-show"), ms);
}

// ---------- Teclado ----------
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!modal.hidden) closeModal();
  if (drawer.classList.contains("is-open")) closeCart();
});

// ---------- Init ----------
$("#year").textContent = new Date().getFullYear();
renderGrid();
renderCart();
