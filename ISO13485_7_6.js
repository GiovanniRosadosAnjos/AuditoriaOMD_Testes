/* =========================================================
   Plugin 7.6 — Dispositivos de Medição (tabela por colunas)
   Requer: window.SubForms.register + window.SubForms.open (CORE)
   ========================================================= */
(function(){
  const ROWS = [
    {id:'tipo',                 label:'Tipo de Dispositivo de Medição', type:'text',   required:true},
    {id:'modelo',               label:'Modelo',                          type:'text'},
    {id:'serie',                label:'Número de Série',                 type:'text'},
    {id:'periodicidade_meses',  label:'Qual a periodicidade de calibração estabelecida? (em meses)', type:'number'},
    {id:'situacao_ident',       label:'A situação de calibração está identificada?',   type:'text'},
    {id:'validade',             label:'Validade da Calibração',          type:'date',   required:true},
    {id:'rastreab',             label:'Rastreabilidade (internacionais ou nacionais?)',type:'text',   required:true}
  ];

  function inputFor(row, col){
    const name = `c${col}_${row.id}`;
    const t = (row.type === 'date' || row.type === 'number' || row.type === 'text') ? row.type : 'text';
    return `<input name="${name}" type="${t}" class="sf76-inp">`;
  }

  function render(container){
    container.innerHTML = `
      <div class="sf76-head">
        <button type="button" id="sf76Add" class="btn secondary">+ Dispositivo</button>
      </div>
      <div class="sf76-table-wrap">
        <table class="sf76-table">
          <thead><tr><th>Descrição</th><th data-col="1">1</th></tr></thead>
          <tbody>
            ${ROWS.map(r => `
              <tr data-row="${r.id}">
                <td class="desc">${r.label}</td>
                <td data-col="1">${inputFor(r, '1')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
    let colCount = 1;
    container.querySelector('#sf76Add').addEventListener('click', ()=>{
      colCount++;
      // TH
      const th = document.createElement('th');
      th.setAttribute('data-col', String(colCount));
      th.textContent = String(colCount);
      container.querySelector('.sf76-table thead tr').appendChild(th);
      // TDs
      ROWS.forEach(r=>{
        const tr = container.querySelector(`tr[data-row="${r.id}"]`);
        const td = document.createElement('td');
        td.setAttribute('data-col', String(colCount));
        td.innerHTML = inputFor(r, String(colCount));
        tr.appendChild(td);
      });
    });
  }

  function collect(container){
    const head = container.querySelectorAll('.sf76-table thead th[data-col]');
    const cols = [...head].map(th => Number(th.getAttribute('data-col'))).sort((a,b)=>a-b);
    const devices = [];
    for (const n of cols){
      const obj = {};
      for (const r of ROWS){
        const el = container.querySelector(`[name="c${n}_${r.id}"]`);
        obj[r.id] = (el?.value || '').trim();
        if (r.required && !obj[r.id]) { alert(`Preencha: "${r.label}" na coluna ${n}.`); el?.focus(); return false; }
      }
      // aviso simples de validade vencida
      if (obj.validade && !isNaN(Date.parse(obj.validade)) && new Date(obj.validade) < new Date()){
        console.warn(`Coluna ${n}: validade passada (${obj.validade}).`);
      }
      devices.push(obj);
    }
    return { devices };
  }

  function escapeHtml(s){ return (s||'').replace(/[&<>"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' })[m]); }
  function toHtml(schema, data){
    const cols = data.devices.length;
    const headCols = Array.from({length: cols}, (_,i)=> `<th>${i+1}</th>`).join('');
    const body = ROWS.map(r=>{
      const tds = data.devices.map(d=> `<td>${escapeHtml(d[r.id] || '')}</td>`).join('');
      return `<tr><td class="desc">${r.label}</td>${tds}</tr>`;
    }).join('');
    return `
      <div class="req-bloco">
        <b>${(schema && schema.title) || 'Tabela 7.6 – Dispositivo'}</b>
        <div class="sf76-table-wrap">
          <table class="sf76-table printable">
            <thead><tr><th>Descrição</th>${headCols}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
      </div>`;
  }

  // registra no CORE
  window.SubForms?.register?.('7.6', { render, collect, toHtml });
})();
