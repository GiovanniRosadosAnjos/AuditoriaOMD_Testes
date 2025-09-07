/* =========================================================
   ISO 13485 – Relatório (sidebar + filtro sticky + modais)
   ========================================================= */

const JSON_PATH = 'ISO13485_Itens_para_auditar.json';
const answers = new Map(); // { codigo -> { html, status } }

const norm = s => (s ?? '').toString().toLowerCase().trim();

/* ============== Dashboard simples de NCs ============== */
const ncSet = new Map(); // codigo -> descricao

function renderNC(){
  const body = document.getElementById('ncBody');
  if (!body) return;
  if (ncSet.size === 0){
    body.innerHTML = '<span class="muted">Nenhuma NC registrada.</span>';
    return;
  }
  body.innerHTML = Array.from(ncSet).map(([code, desc]) => {
    return `<div>${code}, ${desc}</div>`;
  }).join('');
}

function updateNC(codigo, descricao, status){
  if (!codigo) return;
  if (status === 'NC') ncSet.set(codigo, descricao || '');
  else ncSet.delete(codigo);
  renderNC();
}

/* ============== Regime / Local (estado) ============== */
function readRegime(){
  const raw = (document.querySelector('input[name="regime"]:checked') || {}).value || 'omd';
  const v = norm(raw);
  if (v === 'omd') return 'omd';
  if (v === 'interna') return 'interna';
  if (v === 'medical' || v.includes('384')) return 'medical';
  return 'omd';
}
function toggleMedicalBox(){
  const box = document.getElementById('subLocal');
  if (!box) return;
  if (readRegime() === 'medical') box.classList.remove('hidden');
  else {
    box.classList.add('hidden');
    const f = document.getElementById('chkFabrica'); if (f) f.checked = false;
    const s = document.getElementById('chkSolicitante'); if (s) s.checked = false;
  }
}
function getRegimeSummaryText(){
  const regime = (document.querySelector('input[name="regime"]:checked')||{}).value || '';
  if (regime === 'omd')     return '• Regime: <b>Auditoria OMD</b>';
  if (regime === 'interna') return '• Regime: <b>Auditoria OMD interna</b>';
  if (regime === 'medical'){
    const fab = !!document.getElementById('chkFabrica')?.checked;
    const sol = !!document.getElementById('chkSolicitante')?.checked;
    const locais = [fab ? 'Fábrica' : null, sol ? 'Solicitante' : null].filter(Boolean).join(' + ') || '—';
    return `• Regime: <b>Medical (Port. 384/2020)</b><br>• Local: <b>${locais}</b>`;
  }
  return '• Regime: —';
}
function updateRegimeBadge(){
  const el = document.getElementById('regimeFloatText');
  if (el) el.innerHTML = getRegimeSummaryText();
}
function isRegimeComplete(){
  const regime = (document.querySelector('input[name="regime"]:checked')||{}).value || '';
  if (regime === 'omd' || regime === 'interna') return true;
  if (regime === 'medical'){
    const fab = !!document.getElementById('chkFabrica')?.checked;
    const sol = !!document.getElementById('chkSolicitante')?.checked;
    return fab || sol;
  }
  return false;
}
function evaluateRegimeLock(){
  updateRegimeBadge();
  if (!isRegimeComplete()){
    openRegimeModal(); // força completar
  }
}

/* ============== Utilitários de render ============== */
function buildTooltip(it){
  if (it.isTitulo) return 'Título de seção';
  const tags = [];
  if (it.OMD_AuditoriaInterna) tags.push('OMD/Auditoria Interna');
  if (it.TB1_Fabrica)          tags.push('Fábrica');
  if (it.TB2_Solicitante)      tags.push('Solicitante');
  return tags.length ? `Aplicável: ${tags.join(' · ')}` : 'Sem mapeamento de aplicabilidade';
}
function matchesText(it,t){
  if (!t) return true;
  return `${it.codigo||''} ${it.item||''}`.toLowerCase().includes(t);
}
function visibleByRegime(it){
  if (it.isTitulo) return true;
  const regime = readRegime();
  const fab = !!document.getElementById('chkFabrica')?.checked;
  const sol = !!document.getElementById('chkSolicitante')?.checked;
  if (regime === 'omd' || regime === 'interna') return !!it.OMD_AuditoriaInterna;
  if (regime === 'medical') return (fab && it.TB1_Fabrica) || (sol && it.TB2_Solicitante);
  return true;
}
function toSections(rows){
  const out=[]; let cur={title:null,items:[]};
  rows.forEach(r=>{
    if (r.isTitulo){ if(cur.title||cur.items.length) out.push(cur); cur={title:r,items:[]}; }
    else cur.items.push(r);
  });
  if (cur.title||cur.items.length) out.push(cur);
  return out;
}

/* ============== Sanitização de HTML ============== */
function sanitizeHtml(html){
  const t=document.createElement('template'); t.innerHTML=html||'';
  t.content.querySelectorAll('script,style').forEach(e=>e.remove());
  t.content.querySelectorAll('*').forEach(el=>{
    [...el.attributes].forEach(a=>{ if(a.name.startsWith('on')) el.removeAttribute(a.name); });
  });
  return t.innerHTML;
}

/* ============== Toolbar do editor (modal de item) ============== */
function exec(cmd,val=null){ document.execCommand(cmd,false,val); }
function bindToolbar(){
  document.querySelectorAll('.toolbar .tb[data-cmd]').forEach(b=>{
    b.onclick = ()=> exec(b.dataset.cmd);
  });
  document.getElementById('btnLink')?.addEventListener('click', ()=>{
    const url = prompt('URL do link (inclua https://)');
    if (url) exec('createLink', url);
  });
  document.querySelectorAll('.color-btn').forEach(btn=>{
    btn.onclick = ()=> exec('foreColor', btn.dataset.color);
  });
  document.getElementById('hilitePicker')?.addEventListener('input', e=> exec('hiliteColor', e.target.value));
  document.getElementById('btnClearFormat')?.addEventListener('click', ()=>{
    exec('removeFormat'); exec('unlink');
  });
}

/* ============== Modal de Item (anotação) ============== */
function openModal(context, onDone){
  const backdrop = document.getElementById('modalBackdrop');
  const titleEl  = document.getElementById('modalTitle');
  const reqTexto = document.getElementById('reqTexto');
  const editor   = document.getElementById('modalEditor');
  const closeBtn = document.getElementById('modalClose');
  const okBtn    = document.getElementById('modalOk');
  const cancelBtn= document.getElementById('modalCancel');






  titleEl.textContent = `${context.codigo ?? ''} – ${context.descricao ?? ''}`;
  reqTexto.textContent = context.reqTexto ?? '';
  editor.innerHTML = context.htmlAtual || '';

// Pré-preencher com modelo do JSON quando não houver registro prévio
try{
  const noHtml = !(context.htmlAtual && context.htmlAtual.trim());
  if (noHtml && window.__ISO_ITEMS && Array.isArray(window.__ISO_ITEMS)){
    const itemTpl = window.__ISO_ITEMS.find(it => it.codigo === context.codigo);
    if (itemTpl && itemTpl.aplicar_modelo_quando_vazio && itemTpl.modelo_registro_html){
      editor.innerHTML = itemTpl.modelo_registro_html;
    }
  }
}catch(e){ console.warn('Modelo de registro (prefill) ignorado:', e); }





  document.querySelectorAll('input[name="modalStatus"]').forEach(r => r.checked = false);
  if (context.statusAtual === 'C' || context.statusAtual === 'NC') {
    const r = document.querySelector(`input[name="modalStatus"][value="${context.statusAtual}"]`);
    if (r) r.checked = true;
  }

  backdrop.classList.remove('hidden');
  bindToolbar();
  setTimeout(()=> editor.focus(), 0);

  function close(){
    backdrop.classList.add('hidden');
    okBtn.onclick = cancelBtn.onclick = closeBtn.onclick = null;
    document.removeEventListener('keydown', escClose);
  }
  function escClose(e){ if (e.key === 'Escape') close(); }

 
  okBtn.onclick = () => {
  const status = (document.querySelector('input[name="modalStatus"]:checked')||{}).value || '';
  if (!status) {
    alert('Selecione: CONFORME, NÃO CONFORME ou clique em CANCELAR');
    return;
  }
  const html   = editor.innerHTML.trim();
  onDone?.({ codigo: context.codigo, html, status });
  close();
};




  cancelBtn.onclick = close;
  closeBtn.onclick = close;
  document.addEventListener('keydown', escClose);
}

/* ============== Modal de Regime ============== */
function openRegimeModal(){
  const bd = document.getElementById('regimeModalBackdrop');
  toggleMedicalBox();            // reflete o estado atual
  bd.classList.remove('hidden');
}
function closeRegimeModal(){
  document.getElementById('regimeModalBackdrop')?.classList.add('hidden');
}

/* ============== Render da Lista ============== */
function render(items){
  const list = document.getElementById('itemsList');
  const totalEl = document.getElementById('total');
  const t = norm(document.getElementById('filterText')?.value);

  const filtered = items.filter(it => visibleByRegime(it) && matchesText(it, t));
  const sections = toSections(filtered).filter(s => s.items.length > 0);
  const total = sections.reduce((a,s)=> a + s.items.length, 0);
  totalEl.textContent = `${total} item${total===1?'':'s'}`;

  let html = '';
  sections.forEach(sec=>{
    html += `<div class="section">`;
    if (sec.title) html += `<div class="title">${sec.title.codigo} – ${sec.title.item}</div>`;
    sec.items.forEach(it=>{
      const current = answers.get(it.codigo) || {};
      const safeHtml = current.html ? sanitizeHtml(current.html) : '';
      html += `
        <div class="item" title="${buildTooltip(it).replace(/"/g,'&quot;')}">
          <div class="item-row">
            <div class="item-left">
              <div class="item-title">${it.codigo ?? ''} – ${it.item ?? ''}</div>
              ${it.Observacao ? `<div class="item-observacao">Obs: ${it.Observacao}</div>` : ``}
            </div>
            <div class="item-right">
              <div class="resp-preview"
                   data-status="${current.status || ''}"
                   data-codigo="${it.codigo ?? ''}"
                   data-descricao="${(it.item ?? '').replace(/"/g,'&quot;')}"
                   data-req-texto="${(it.requisito_texto ?? '').replace(/"/g,'&quot;')}">
                ${ safeHtml || '<span class="placeholder">Clique para editar</span>' }
              </div>
            </div>
          </div>
        </div>`;
    });
    html += `</div>`;
  });

  list.innerHTML = html || `<div class="section"><div class="item-observacao">Nenhum item encontrado.</div></div>`;
}

/* ============== Bootstrap ============== */
document.addEventListener('DOMContentLoaded', async () => {
  // Exemplo: nome da fábrica
  const f = document.getElementById('factoryName');
  if (f) f.textContent = 'Fábrica XYZ Ltda';

  // Regime radios => mostram/escondem LOCAL quando necessário
  document.querySelectorAll('input[name="regime"]').forEach(r=>{
    r.addEventListener('change', toggleMedicalBox);
  });

  // Botão Alterar (abre modal)
  document.getElementById('btnChangeRegime')?.addEventListener('click', openRegimeModal);
  // Modal Regime: fechar
  document.getElementById('regimeModalClose')?.addEventListener('click', closeRegimeModal);
  document.getElementById('regimeModalCancel')?.addEventListener('click', closeRegimeModal);
  // Modal Regime: aplicar
  document.getElementById('regimeModalOk')?.addEventListener('click', ()=>{
    updateRegimeBadge();
    render(window.__ISO_ITEMS || []);
    closeRegimeModal();
  });

  // Filtro
  const filter = document.getElementById('filterText');
  const btnClear = document.getElementById('btnClear');
  filter?.addEventListener('input', ()=> render(window.__ISO_ITEMS || []));
  btnClear?.addEventListener('click', ()=>{ if(filter) filter.value=''; render(window.__ISO_ITEMS || []); });

  // Clique no preview => abre modal de anotação
  document.getElementById('itemsList').addEventListener('click', (ev)=>{
    const box = ev.target.closest('.resp-preview');
    if (!box) return;
    const codigo = box.dataset.codigo;
    const atual  = answers.get(codigo) || {};
    openModal({
      codigo,
      descricao: box.dataset.descricao,
      htmlAtual: atual.html || '',
      statusAtual: atual.status || '',
      reqTexto: box.dataset.reqTexto || ''
    }, (result)=>{
      answers.set(result.codigo, { html: result.html, status: result.status });
      const safe = sanitizeHtml(result.html || '');
      box.innerHTML = safe || '<span class="placeholder">Clique para editar</span>';
      box.dataset.status = result.status || '';
      updateNC(result.codigo, box.dataset.descricao, result.status);

    });
  });

  // Carrega dados
  try{
    const resp = await fetch(JSON_PATH, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    window.__ISO_ITEMS = await resp.json();
  }catch(e){
    console.warn(`Falha ao carregar ${JSON_PATH}.`, e);
    window.__ISO_ITEMS = [];
  }

  // Inicia
  updateRegimeBadge();
  toggleMedicalBox();
  evaluateRegimeLock();
  render(window.__ISO_ITEMS);
});
