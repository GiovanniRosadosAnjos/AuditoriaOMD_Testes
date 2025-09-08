/* =========================================================
   SubForms Core
   - Mantém um registro de plugins por código (ex.: '7.6').
   - Abre o submodal, delega render/collect/HTML ao plugin.
   - Se não houver plugin, usa um fallback genérico (schema.fields).
   API exposta em window.SubForms:
     - register(code, { render(container,schema), collect(container,schema), toHtml(schema,data) })
     - open(code, schema, onApply)
     - buildHtmlFromSchema(schema, data)  (fallback)
   ========================================================= */
(function () {
  const plugins = new Map(); // code -> { render, collect, toHtml }

  /* ---------- Registro de plugins ---------- */
  function register(code, handlers) {
    if (!code) return;
    plugins.set(code, handlers || {});
  }

  /* ---------- Fallback: render e coleta genéricos por schema.fields ---------- */
  function renderGenericForm(container, schema) {
    const fields = Array.isArray(schema?.fields) ? schema.fields : [];
    container.classList.add('form-grid');
    container.innerHTML = fields.map(f => `
      <div>
        <label style="font-weight:600;display:block;margin-bottom:4px" for="sf_${f.id}">
          ${f.label || f.id}${f.required ? ' *' : ''}
        </label>
        ${inputFor(f)}
      </div>
    `).join('');
  }

  function inputFor(f) {
    const type = (f.type === 'date' || f.type === 'number' || f.type === 'text') ? f.type : 'text';
    const ph = f.placeholder ? ` placeholder="${escapeHtml(f.placeholder)}"` : '';
    if (f.type === 'select' && Array.isArray(f.options)) {
      return `
        <select id="sf_${f.id}" ${f.required ? 'required' : ''}>
          ${f.options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
        </select>`;
    }
    return `<input id="sf_${f.id}" type="${type}" ${f.required ? 'required' : ''}${ph}>`;
  }

  function collectGenericForm(container, schema) {
    const out = {};
    const fields = Array.isArray(schema?.fields) ? schema.fields : [];
    let ok = true, firstInvalid = null;
    fields.forEach(f => {
      const el = container.querySelector(`#sf_${CSS.escape(f.id)}`);
      const val = (el?.value || '').trim();
      if (f.required && !val) { ok = false; if (!firstInvalid) firstInvalid = el; }
      out[f.id] = val;
    });
    if (!ok) {
      alert('Preencha os campos obrigatórios.');
      firstInvalid?.focus();
      return false;
    }
    return out;
  }

  function buildHtmlFromSchema(schema, data) {
    const fields = Array.isArray(schema?.fields) ? schema.fields : [];
    const rows = fields.map(f => {
      const v = data?.[f.id];
      if (!v) return '';
      return `<li><b>${escapeHtml(f.label || f.id)}:</b> ${escapeHtml(v)}</li>`;
    }).filter(Boolean).join('');
    return `
      <div class="req-bloco">
        <b>${escapeHtml(schema?.title || 'Registro estruturado')}</b>
        <ul>${rows}</ul>
      </div>`;
  }

  /* ---------- Util ---------- */
  function escapeHtml(s) {
    return (s ?? '').toString().replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  }

  /* ---------- Abrir submodal ---------- */
  function open(code, schema, onApply) {
    const bd    = document.getElementById('subFormBackdrop');
    const title = document.getElementById('subFormTitle');
    const box   = document.getElementById('subForm'); // container onde o plugin renderiza
    if (!bd || !title || !box) return;

    title.textContent = schema?.title || 'Registro estruturado';
    box.className = '';   // remove classes anteriores (plugin decide layout)
    box.innerHTML = '';   // limpa

    const plugin = plugins.get(code);

    // Render
    if (plugin && typeof plugin.render === 'function') {
      plugin.render(box, schema);
    } else {
      // fallback genérico
      renderGenericForm(box, schema);
    }

    // Fechamento
    function close() {
      bd.classList.add('hidden');
      document.getElementById('subFormOk').onclick = null;
      document.getElementById('subFormCancel').onclick = null;
      document.getElementById('subFormClose').onclick = null;
    }

    // OK
    document.getElementById('subFormOk').onclick = () => {
      let data;
      if (plugin && typeof plugin.collect === 'function') {
        data = plugin.collect(box, schema);
      } else {
        data = collectGenericForm(box, schema);
      }
      if (data === false) return; // inválido, plugin bloqueou

      const html = (plugin && typeof plugin.toHtml === 'function')
        ? plugin.toHtml(schema, data)
        : buildHtmlFromSchema(schema, data);

      onApply?.(data, html);
      close();
    };

    // Cancel / Close
    document.getElementById('subFormCancel').onclick = close;
    document.getElementById('subFormClose').onclick  = close;

    bd.classList.remove('hidden');
  }

  /* ---------- Compat: manter nomes antigos se houver ---------- */
  function openSubForm(schema, code, onApplyOld) {
    // assinatura antiga: (schema, codigo, callback(data))
    open(code, schema, (data, html) => onApplyOld?.(data, html));
  }

  // Expondo API
  window.SubForms = {
    register,
    open,
    openSubForm,              // compat
    buildHtmlFromSchema       // útil para plugins
  };
})();
