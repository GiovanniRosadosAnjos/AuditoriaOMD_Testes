/* =========================================================
   SubForms dinâmicos (para requisitos com form_schema no JSON)
   - window.SubForms.openSubForm(schema, codigo, onApply)
   - window.SubForms.buildHtmlFromSchema(schema, data)
   - Renderers específicos por requisito (ex.: 7.6)
   ========================================================= */

(function(){
  const api = {};

  /** Abre o sub-modal com base no schema vindo do JSON */
  api.openSubForm = function(schema, codigo, onApply){
    const bd   = document.getElementById('subFormBackdrop');
    const form = document.getElementById('subForm');
    const title= document.getElementById('subFormTitle');
    if (!bd || !form) return;

    title.textContent = schema.title || 'Registro estruturado';

    // monta campos
    form.innerHTML = '';
    (schema.fields || []).forEach(f=>{
      const wrap = document.createElement('div');

      const lab = document.createElement('label');
      lab.textContent = f.label || f.id;
      lab.setAttribute('for', `sf_${f.id}`);

      let input;
      if (f.type === 'select') {
        input = document.createElement('select');
        (f.options || []).forEach(opt=>{
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt; input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.type = (f.type === 'date' || f.type === 'text') ? f.type : 'text';
        if (f.placeholder) input.placeholder = f.placeholder;
      }
      input.id = `sf_${f.id}`;
      input.required = !!f.required;

      wrap.appendChild(lab);
      wrap.appendChild(input);
      form.appendChild(wrap);
    });

    function close(){
      bd.classList.add('hidden');
      document.getElementById('subFormOk').onclick = null;
      document.getElementById('subFormCancel').onclick = null;
      document.getElementById('subFormClose').onclick = null;
    }

    document.getElementById('subFormOk').onclick = ()=>{
      const data = {};
      let ok = true;
      (schema.fields || []).forEach(f=>{
        const el = document.getElementById(`sf_${f.id}`);
        const val = (el?.value || '').trim();
        if (f.required && !val) ok = false;
        data[f.id] = val;
      });
      if (!ok){ alert('Preencha os campos obrigatórios.'); return; }

      onApply?.(data);
      close();
    };
    document.getElementById('subFormCancel').onclick = close;
    document.getElementById('subFormClose').onclick = close;

    bd.classList.remove('hidden');
  };

  /** HTML padrão (fallback) para qualquer schema */
  api.buildHtmlFromSchema = function(schema, d){
    const rows = (schema.fields || []).map(f=>{
      const val = d[f.id];
      if (!val) return '';
      return `<li><b>${f.label || f.id}:</b> ${val}</li>`;
    }).filter(Boolean).join('');
    return `
      <div class="req-bloco">
        <b>${schema.title || 'Registro estruturado'}</b>
        <ul>${rows}</ul>
      </div>`;
  };

  /** Renderers específicos por requisito (ex.: “7.6”) */
  const renderers = {
    '7.6': function(schema, d){
      return `
        <div class="req-bloco">
          <b>${schema.title || 'Registro de Calibração do Dispositivo'}</b>
          <ul>
            ${d.nome ? `<li><b>Dispositivo:</b> ${d.nome}${d.modelo ? ' – '+d.modelo : ''}${d.serie ? ' (S/N '+d.serie+')' : ''}</li>`:''}
            ${d.cert ? `<li><b>Certificado:</b> ${d.cert}</li>`:''}
            ${d.lab ? `<li><b>Laboratório:</b> ${d.lab}</li>`:''}
            ${d.rastreab ? `<li><b>Rastreabilidade:</b> ${d.rastreab}</li>`:''}
            ${d.faixa ? `<li><b>Faixa/Grandeza:</b> ${d.faixa}</li>`:''}
            ${d.incerteza ? `<li><b>Incerteza:</b> ${d.incerteza}</li>`:''}
            ${d.data_cal ? `<li><b>Data calibração:</b> ${d.data_cal}</li>`:''}
            ${d.validade ? `<li><b>Validade:</b> ${d.validade}</li>`:''}
            ${d.situacao ? `<li><b>Situação:</b> ${d.situacao}</li>`:''}
          </ul>
        </div>`;
    }
  };

  /** Decide qual HTML usar (específico por código, senão fallback) */
  api.renderHtml = function(codigo, schema, data){
    const fn = renderers[codigo];
    return (typeof fn === 'function')
      ? fn(schema, data)
      : api.buildHtmlFromSchema(schema, data);
  };

  window.SubForms = api;
})();
