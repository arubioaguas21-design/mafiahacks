/* Tintuka theme */
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

  // Fecha estimada de entrega (días laborables, sin fines de semana)
  document.querySelectorAll('[data-delivery]').forEach((el) => {
    const addBusinessDays = (date, n) => {
      const d = new Date(date);
      while (n > 0) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6) n--;
      }
      return d;
    };
    const fmt = (d) => d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const now = new Date();
    const from = addBusinessDays(now, parseInt(el.dataset.min, 10));
    const to = addBusinessDays(now, parseInt(el.dataset.max, 10));
    const out = el.querySelector('[data-delivery-text]');
    if (out) out.textContent = `entre el ${fmt(from)} y el ${fmt(to)}`;
  });

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
    const saveEl = priceWrap && priceWrap.querySelector('[data-save]');
    const sticky = section.querySelector('[data-sticky-buy]');
    const stickyPrice = section.querySelector('[data-sticky-price]');
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
      if (saveEl) saveEl.textContent = sale ? '-' + Math.floor(((v.compare_at_price - v.price) * 100) / v.compare_at_price) + '%' : '';
      if (stickyPrice) stickyPrice.textContent = money(v.price);
      if (priceWrap) priceWrap.classList.toggle('is-sale', !!sale);
      if (v.featured_media) showMedia(v.featured_media.id);
      const url = new URL(window.location.href);
      url.searchParams.set('variant', v.id);
      window.history.replaceState({}, '', url);
    }
    section.querySelectorAll('input[data-option-index]').forEach((i) => i.addEventListener('change', update));
    if (section.querySelector('fieldset.opt')) markAvailability(selected());

    // Personalizador
    const perso = initPersonalizer(section);

    // Barra fija de compra en móvil: aparece cuando el botón principal sale de pantalla
    if (sticky && addBtn && 'IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        sticky.classList.toggle('is-visible', show);
        sticky.setAttribute('aria-hidden', String(!show));
      }).observe(addBtn);
      sticky.querySelector('[data-sticky-add]').addEventListener('click', () => {
        if (addBtn.disabled) { addBtn.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        form.requestSubmit ? form.requestSubmit() : addBtn.click();
      });
    }

    // Añadir al carrito sin recargar la página
    if (form && window.fetch) {
      form.addEventListener('submit', async (e) => {
        if (perso && !perso.validate()) { e.preventDefault(); return; }
        // Con imagen subida se usa el envío normal del formulario (sube el archivo y va al carrito)
        if (perso && perso.hasFile()) return;
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

  function initPersonalizer(section) {
    const box = section.querySelector('[data-perso]');
    if (!box) return null;
    const preview = section.querySelector('[data-perso-preview]');
    const pText = preview && preview.querySelector('[data-perso-text]');
    const pImg = preview && preview.querySelector('[data-perso-img]');
    const input = box.querySelector('[data-perso-input]');
    const count = box.querySelector('[data-perso-count]');
    const file = box.querySelector('[data-perso-file]');
    const drop = box.querySelector('[data-perso-drop]');
    const consent = box.querySelector('[data-perso-consent]');
    const agree = box.querySelector('[data-perso-agree]');
    const error = box.querySelector('[data-perso-error]');
    const fontInputs = box.querySelectorAll('[data-perso-font]');
    const colorInputs = box.querySelectorAll('[data-perso-color]');
    const posInputs = box.querySelectorAll('input[name="properties[Posición]"]');
    const max = input ? parseInt(input.maxLength, 10) : 0;

    const checked = (list) => Array.from(list).find((i) => i.checked);
    const text = () => (input ? input.value.trim() : '');
    const hasFile = () => !!(file && file.files && file.files.length);

    function showError(msg) {
      error.textContent = msg;
      error.hidden = !msg;
    }

    function update() {
      const t = text();
      const active = !!t || hasFile();
      if (count) count.textContent = `${input.value.length}/${max}`;
      // Solo se envían las opciones si de verdad hay personalización
      fontInputs.forEach((i) => (i.disabled = !t));
      colorInputs.forEach((i) => (i.disabled = !t));
      posInputs.forEach((i) => (i.disabled = !active));
      // Campos vacíos sin nombre: así no se guardan en el pedido
      if (input) input.name = t ? 'properties[Texto]' : '';
      if (file) file.name = hasFile() ? 'properties[Imagen]' : '';
      consent.hidden = !active;
      if (!preview) return;
      preview.hidden = !active;
      const pos = checked(posInputs);
      preview.dataset.pos = pos ? pos.value : '';
      if (pText) {
        pText.textContent = t;
        const f = checked(fontInputs);
        const c = checked(colorInputs);
        pText.style.fontFamily = f ? `'${f.dataset.persoFont}', sans-serif` : '';
        pText.style.color = c ? c.value : '';
      }
    }

    if (input) input.addEventListener('input', () => { showError(''); update(); });
    box.addEventListener('change', (e) => {
      if (e.target === file) {
        showError('');
        const f = file.files[0];
        const maxMb = parseFloat(file.dataset.maxMb || '10');
        if (f && !/^image\/(png|jpeg)$/.test(f.type)) {
          showError('El archivo tiene que ser PNG o JPG.');
          file.value = '';
        } else if (f && f.size > maxMb * 1024 * 1024) {
          showError(`La imagen pesa demasiado (máximo ${maxMb} MB).`);
          file.value = '';
        }
        const ok = hasFile();
        drop.textContent = ok ? `✓ ${file.files[0].name}` : '📎 Elegir archivo';
        drop.classList.toggle('has-file', ok);
        if (pImg) {
          if (ok) {
            const reader = new FileReader();
            reader.onload = () => { pImg.src = reader.result; pImg.hidden = false; };
            reader.readAsDataURL(file.files[0]);
          } else {
            pImg.hidden = true;
            pImg.removeAttribute('src');
          }
        }
      }
      update();
    });
    update();

    return {
      hasFile,
      validate() {
        const active = !!text() || hasFile();
        if (active && agree && !agree.checked) {
          showError('Marca la casilla para confirmar tu personalización.');
          box.open = true;
          consent.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return false;
        }
        showError('');
        return true;
      },
    };
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
