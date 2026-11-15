/* Mafia theme */
(function () {
  const root = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';

  // Menú móvil
  const toggle = document.querySelector('[data-menu-toggle]');
  const nav = document.getElementById('SiteNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open);
    });
  }

  // Botones +/− de cantidad
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qty]');
    if (!btn) return;
    const input = btn.parentElement.querySelector('input[type="number"]');
    const min = parseInt(input.min || '0', 10);
    input.value = Math.max(min, (parseInt(input.value, 10) || 0) + parseInt(btn.dataset.qty, 10));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Carrito: actualizar al cambiar cantidades
  const cartForm = document.querySelector('[data-cart-form]');
  if (cartForm) {
    let t;
    cartForm.addEventListener('change', (e) => {
      if (!e.target.matches('[data-cart-qty]')) return;
      clearTimeout(t);
      t = setTimeout(() => cartForm.submit(), 500);
    });
  }

  // Filtros y orden de colección
  const filterForm = document.querySelector('[data-filter-form]');
  if (filterForm) {
    filterForm.addEventListener('change', () => {
      const params = new URLSearchParams(new FormData(filterForm));
      window.location.search = params.toString();
    });
  }

  // Página de producto
  document.querySelectorAll('[data-product]').forEach(initProduct);

  function money(cents) {
    const currency = (window.Shopify && Shopify.currency && Shopify.currency.active) || 'EUR';
    return (cents / 100).toLocaleString(document.documentElement.lang || 'es', { style: 'currency', currency });
  }

  function initProduct(section) {
    const jsonEl = section.querySelector('[data-product-json]');
    if (!jsonEl) return;
    const data = JSON.parse(jsonEl.textContent);
    const form = section.querySelector('.product__form');
    const idInput = section.querySelector('[data-variant-id]');
    const addBtn = section.querySelector('[data-add-button]');
    const addText = section.querySelector('[data-add-text]');
    const priceWrap = section.querySelector('.price [data-price-wrap]');
    const priceEl = priceWrap && priceWrap.querySelector('[data-price]');
    const compareEl = priceWrap && priceWrap.querySelector('[data-compare]');
    const errorEl = section.querySelector('[data-form-error]');

    // Galería
    function showMedia(id) {
      if (!id) return;
      const item = section.querySelector(`.gallery__item[data-media-id="${id}"]`);
      if (!item) return;
      section.querySelectorAll('.gallery__item').forEach((el) => el.classList.toggle('is-active', el === item));
      section.querySelectorAll('[data-thumb]').forEach((el) => el.classList.toggle('is-active', el.dataset.thumb == id));
    }
    section.querySelectorAll('[data-thumb]').forEach((b) => b.addEventListener('click', () => showMedia(b.dataset.thumb)));

    // Variantes
    function selected() {
      return Array.from(section.querySelectorAll('fieldset.opt')).map((fs) => {
        const c = fs.querySelector('input:checked');
        return c ? c.value : null;
      });
    }
    function markAvailability(sel) {
      section.querySelectorAll('input[data-option-index]').forEach((input) => {
        const i = +input.dataset.optionIndex;
        const test = sel.slice();
        test[i] = input.value;
        const ok = data.variants.some((v) => v.available && v.options.every((o, k) => o === test[k]));
        const label = section.querySelector(`label[for="${input.id}"]`);
        if (label) label.classList.toggle('is-unavailable', !ok);
      });
    }
    function update() {
      const sel = selected();
      sel.forEach((val, i) => {
        const lbl = section.querySelector(`[data-option-label="${i}"]`);
        if (lbl) lbl.textContent = val;
      });
      markAvailability(sel);
      const v = data.variants.find((x) => x.options.every((o, i) => o === sel[i]));
      if (!v) {
        addBtn.disabled = true;
        addText.textContent = 'No disponible';
        return;
      }
      idInput.value = v.id;
      addBtn.disabled = !v.available;
      addText.textContent = v.available ? 'Añadir al carrito' : 'Agotado';
      const sale = v.compare_at_price && v.compare_at_price > v.price;
      if (priceEl) priceEl.textContent = money(v.price);
      if (compareEl) compareEl.textContent = sale ? money(v.compare_at_price) : '';
      if (priceWrap) priceWrap.classList.toggle('is-sale', !!sale);
      if (v.featured_media) showMedia(v.featured_media.id);
      const url = new URL(window.location.href);
      url.searchParams.set('variant', v.id);
      window.history.replaceState({}, '', url);
    }
    section.querySelectorAll('input[data-option-index]').forEach((i) => i.addEventListener('change', update));
    if (section.querySelector('fieldset.opt')) markAvailability(selected());

    // Añadir al carrito sin recargar la página
    if (form && window.fetch) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (addBtn.disabled) return;
        errorEl.hidden = true;
        addBtn.disabled = true;
        const original = addText.textContent;
        addText.textContent = 'Añadiendo…';
        try {
          const res = await fetch(root + 'cart/add.js', {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new FormData(form),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.description || json.message || 'No se pudo añadir al carrito');
          const cart = await (await fetch(root + 'cart.js')).json();
          document.querySelectorAll('[data-cart-count]').forEach((el) => {
            el.textContent = cart.item_count;
            el.classList.remove('bump');
            void el.offsetWidth;
            el.classList.add('bump');
          });
          addText.textContent = '✓ Añadido';
          showToast('Añadido al carrito', root + 'cart');
          setTimeout(() => { addText.textContent = original; addBtn.disabled = false; }, 1500);
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.hidden = false;
          addText.textContent = original;
          addBtn.disabled = false;
        }
      });
    }
  }

  function showToast(msg, href) {
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg + ' · ';
    const a = document.createElement('a');
    a.href = href;
    a.textContent = 'Ver carrito →';
    a.style.textDecoration = 'underline';
    t.appendChild(a);
    requestAnimationFrame(() => t.classList.add('is-show'));
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => t.classList.remove('is-show'), 3500);
  }
})();
