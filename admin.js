const state={stats:null,leads:[],selectedFiles:{uomo:null,donna:null}};
const $=selector=>document.querySelector(selector);
const loginScreen=$('#loginScreen'),adminShell=$('#adminShell'),loginForm=$('#loginForm');
const formatDate=value=>value?new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)):'—';
const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

boot();

async function boot(){
  $('#todayLabel').textContent=new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
  const session=await api('/api/admin/session').catch(()=>({authenticated:false}));
  if(session.authenticated)showDashboard();
  else loginScreen.hidden=false;
}

loginForm.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=loginForm.querySelector('button');button.disabled=true;
  $('#loginMessage').textContent='';
  try{
    await api('/api/admin/session',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:$('#adminPassword').value})});
    $('#adminPassword').value='';showDashboard();
  }catch(error){$('#loginMessage').textContent=error.message;}
  finally{button.disabled=false;}
});

async function showDashboard(){
  loginScreen.hidden=true;adminShell.hidden=false;
  await loadOverview();
}

async function loadOverview(){
  $('#refreshButton').classList.add('loading');
  try{
    const data=await api('/api/admin/overview?limit=500');
    state.stats=data.stats;state.leads=data.leads;
    renderStats();renderLeads();
  }catch(error){
    if(error.status===401){adminShell.hidden=true;loginScreen.hidden=false;return;}
    toast(error.message);
  }finally{$('#refreshButton').classList.remove('loading');}
}

function renderStats(){
  const s=state.stats;
  const readyPrograms=Object.values(s.programs||{}).filter(program=>program?.active&&program?.filename).length;
  const metrics=[
    ['Questionari ricevuti',s.submissions,'profili completi'],
    ['Ultimi 7 giorni',s.recent,'nuovi questionari'],
    ['Consenso contenuti',s.marketingConsents,'opt-in facoltativi'],
    ['Programmi',`${readyPrograms}/2`,readyPrograms===2?'Uomo e Donna disponibili':readyPrograms===1?'un PDF ancora da caricare':'nessun PDF caricato'],
  ];
  $('#metricGrid').innerHTML=metrics.map(([label,value,note])=>`<article class="metric"><span class="metric-label">${label}</span><b class="metric-value">${value}</b><span class="metric-note">${note}</span></article>`).join('');
  const total=Math.max(s.submissions,1);$('#levelTotal').textContent=`${s.submissions} ${s.submissions===1?'profilo':'profili'}`;
  $('#levelBars').innerHTML=Object.entries(s.byLevel).map(([label,value])=>`<div class="level-row"><label>${label}</label><div class="level-track"><div class="level-fill" style="width:${Math.round(value/total*100)}%"></div></div><b>${value}</b></div>`).join('');
  $('#goalList').innerHTML=s.goals.length?s.goals.map(({label,value})=>`<li><span>${escapeHtml(label)}</span><b>${value}</b></li>`).join(''):'<li class="empty-copy">Gli obiettivi appariranno dopo i primi questionari.</li>';
  renderPrograms(s.programs);
}

function renderPrograms(programs={}){
  document.querySelectorAll('[data-program-variant]').forEach(form=>{
    const variant=form.dataset.programVariant;
    const program=programs[variant]||{};
    const hasProgram=Boolean(program.filename);
    form.querySelector('[data-role="program-file-bar"]').hidden=!hasProgram;
    form.querySelector('[data-role="current-program-name"]').textContent=hasProgram?program.filename:'';
    form.querySelector('[data-role="remove-program"]').disabled=!hasProgram;
    const status=form.querySelector('[data-role="program-status"]');
    status.textContent=hasProgram&&program.active?'Disponibile':'Da caricare';
    status.classList.toggle('ready',Boolean(hasProgram&&program.active));
  });
}

function renderLeads(){
  const search=$('#searchInput').value.trim().toLowerCase(),level=$('#levelFilter').value;
  const leads=state.leads.filter(item=>item.status==='questionario'&&(level==='tutti'||item.level===level)&&(!search||`${item.name} ${item.email} ${item.goal||''}`.toLowerCase().includes(search)));
  $('#emptyState').hidden=leads.length>0;
  $('#leadRows').innerHTML=leads.map(item=>`<tr>
    <td data-label="Persona"><div class="person-cell"><span class="lead-avatar">${initials(item.name)}</span><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.email)}</small></span></div></td>
    <td data-label="Stato"><span class="status-pill ${item.status==='questionario'?'complete':''}">${item.status==='questionario'?'Completo':'In attesa'}</span></td>
    <td data-label="Obiettivo">${escapeHtml(item.goal||'—')}</td><td data-label="Profilo">${item.level?`<span class="level-pill">${escapeHtml(item.level)} · ${item.score}</span>`:'—'}</td>
    <td data-label="Ingresso">${formatDate(item.createdAt)}</td><td data-label="Dettaglio"><button class="row-open" type="button" data-lead="${item.id}" aria-label="Apri ${escapeHtml(item.name)}">→</button></td></tr>`).join('');
  document.querySelectorAll('[data-lead]').forEach(button=>button.addEventListener('click',()=>openLead(state.leads.find(item=>item.id===button.dataset.lead))));
}

function openLead(lead){
  if(!lead)return;
  $('#drawerTitle').textContent=lead.name;
  const answers=lead.answers||{};
  const labels={obiettivo:'Obiettivo',esperienza:'Esperienza',frequenza:'Frequenza',alimentazione:'Alimentazione',disciplina:'Disciplina',costanza:'Abbandoni',consapevolezza:'Muscolo target',tecnica:'Tecnica',ostacolo:'Ostacolo'};
  $('#drawerBody').innerHTML=`
    <div class="drawer-identity"><div class="drawer-stat"><span>Email</span><b>${escapeHtml(lead.email)}</b></div><div class="drawer-stat"><span>Ingresso</span><b>${formatDate(lead.createdAt)}</b></div><div class="drawer-stat"><span>Stato</span><b>${lead.status==='questionario'?'Questionario completo':'Lista d’attesa'}</b></div><div class="drawer-stat"><span>Marketing</span><b>${lead.marketingConsent?'Consenso dato':'Non richiesto'}</b></div></div>
    ${lead.status==='questionario'?`<section class="drawer-section"><h3>Profilo · ${escapeHtml(lead.level)} (${lead.score}/100)</h3><div class="answer-list">${Object.entries(labels).map(([key,label])=>`<div class="answer-row"><span>${label}</span><b>${escapeHtml(answers[key]||'—')}</b></div>`).join('')}</div></section><section class="drawer-section"><h3>Cosa vuole migliorare</h3><p class="open-answer">${escapeHtml(lead.improvementGoal||'—')}</p><h3 style="margin-top:24px">Perché conta davvero</h3><p class="open-answer">${escapeHtml(lead.motivation||'—')}</p></section>`:`<section class="drawer-section"><h3>Obiettivo dichiarato</h3><p class="open-answer">${escapeHtml(lead.goal||'Non ancora indicato')}</p></section>`}`;
  $('#detailDrawer').classList.add('open');$('#detailDrawer').setAttribute('aria-hidden','false');$('#drawerScrim').hidden=false;$('#closeDrawer').focus();
}

function closeDrawer(){
  $('#detailDrawer').classList.remove('open');$('#detailDrawer').setAttribute('aria-hidden','true');$('#drawerScrim').hidden=true;
}

$('#closeDrawer').addEventListener('click',closeDrawer);$('#drawerScrim').addEventListener('click',closeDrawer);document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDrawer();});
$('#refreshButton').addEventListener('click',loadOverview);['#searchInput','#levelFilter'].forEach(selector=>$(selector).addEventListener(selector==='#searchInput'?'input':'change',renderLeads));
$('#logoutButton').addEventListener('click',async()=>{await api('/api/admin/session',{method:'DELETE'});adminShell.hidden=true;loginScreen.hidden=false;});

document.querySelectorAll('[data-program-variant]').forEach(form=>{
  const variant=form.dataset.programVariant;
  const input=form.querySelector('[data-role="pdf-input"]');
  const dropZone=form.querySelector('[data-role="drop-zone"]');
  input.addEventListener('change',()=>selectProgramFile(form,input.files[0]));
  ['dragenter','dragover'].forEach(type=>dropZone.addEventListener(type,event=>{event.preventDefault();dropZone.classList.add('dragging');}));
  ['dragleave','drop'].forEach(type=>dropZone.addEventListener(type,event=>{event.preventDefault();dropZone.classList.remove('dragging');if(type==='drop')selectProgramFile(form,event.dataTransfer.files[0]);}));
  form.addEventListener('submit',event=>uploadProgram(event,form));
  form.querySelector('[data-role="remove-program"]').addEventListener('click',()=>removeProgram(form));
  state.selectedFiles[variant]=null;
});

function selectProgramFile(form,file){
  const variant=form.dataset.programVariant;
  state.selectedFiles[variant]=file||null;
  form.querySelector('[data-role="upload-button"]').disabled=!file;
  form.querySelector('[data-role="file-hint"]').textContent=file?`${file.name} · ${(file.size/1024/1024).toFixed(2)} MB`:'Trascina qui o scegli un file · massimo 50 MB';
}

async function uploadProgram(event,form){
  event.preventDefault();
  const variant=form.dataset.programVariant;
  const label=variant==='donna'?'Donna':'Uomo';
  const file=state.selectedFiles[variant];
  if(!file)return;
  const message=form.querySelector('[data-role="upload-message"]');
  const button=form.querySelector('[data-role="upload-button"]');
  const input=form.querySelector('[data-role="pdf-input"]');
  message.textContent='';message.className='form-message';
  if(file.type!=='application/pdf'&&!file.name.toLowerCase().endsWith('.pdf')){message.textContent='Seleziona un PDF.';return;}
  if(file.size>50*1024*1024){message.textContent='Il PDF supera 50 MB.';return;}
  button.disabled=true;button.textContent='Caricamento…';
  let prepared;
  try{
    prepared=await api('/api/admin/program',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({filename:file.name,size:file.size,type:file.type||'application/pdf',variant}),
    });
    let result;
    if(prepared.upload.mode==='resumable'){
      await uploadPdfResumable(prepared.upload,file,percentage=>{
        button.textContent=`Caricamento ${percentage}%`;
        message.textContent=`Invio del PDF: ${percentage}%`;
      });
      result=await api('/api/admin/program',{
        method:'PATCH',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({action:'finalize-upload',ticket:prepared.upload.ticket}),
      });
    }else{
      result=await api('/api/admin/program',{method:'PUT',headers:{'content-type':'application/pdf','x-file-name':encodeURIComponent(file.name),'x-program-variant':variant},body:file});
    }
    message.textContent=`PDF ${label} caricato correttamente.`;message.classList.add('success');
    state.stats.programs[variant]=result.program;
    renderStats();
    selectProgramFile(form,null);
    input.value='';
    toast(`PDF ${label} disponibile.`);
  }catch(error){
    if(prepared?.upload?.ticket){
      await api('/api/admin/program',{
        method:'PATCH',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({action:'abort-upload',ticket:prepared.upload.ticket}),
      }).catch(()=>{});
    }
    message.textContent=error.message;
  }
  finally{button.disabled=!state.selectedFiles[variant];button.innerHTML=`Carica PDF ${label} <span>→</span>`;}
}

async function uploadPdfResumable(upload,file,onProgress){
  const metadata=[
    ['bucketName','lead-magnets'],
    ['objectName',upload.path],
    ['contentType','application/pdf'],
    ['cacheControl','3600'],
  ].map(([key,value])=>`${key} ${btoa(value)}`).join(',');
  const created=await fetch(upload.endpoint,{
    method:'POST',
    credentials:'omit',
    headers:{
      'Tus-Resumable':'1.0.0',
      'Upload-Length':String(file.size),
      'Upload-Metadata':metadata,
      'x-signature':upload.token,
      'x-upsert':'false',
    },
  });
  if(!created.ok)throw new Error(await storageError(created,'Impossibile avviare il caricamento.'));
  const location=created.headers.get('location');
  if(!location)throw new Error('Supabase non ha restituito il collegamento di caricamento.');
  const uploadUrl=new URL(location,upload.endpoint).toString();
  const chunkSize=6*1024*1024;
  let offset=Number(created.headers.get('upload-offset')||0);
  let failures=0;
  while(offset<file.size){
    const end=Math.min(offset+chunkSize,file.size);
    try{
      const response=await fetch(uploadUrl,{
        method:'PATCH',
        credentials:'omit',
        headers:{
          'Tus-Resumable':'1.0.0',
          'Upload-Offset':String(offset),
          'Content-Type':'application/offset+octet-stream',
          'x-signature':upload.token,
        },
        body:file.slice(offset,end),
      });
      if(!response.ok)throw new Error(await storageError(response,'Un blocco del PDF non è stato caricato.'));
      offset=Number(response.headers.get('upload-offset')||end);
      failures=0;
      onProgress(Math.min(100,Math.round(offset/file.size*100)));
    }catch(error){
      failures+=1;
      if(failures>4)throw new Error('Caricamento interrotto. Controlla la connessione e riprova.');
      await wait([0,1000,3000,6000,10000][failures]);
      offset=await resumableOffset(uploadUrl,upload.token,offset);
      onProgress(Math.min(100,Math.round(offset/file.size*100)));
    }
  }
}

async function resumableOffset(url,token,fallback){
  try{
    const response=await fetch(url,{method:'HEAD',credentials:'omit',headers:{'Tus-Resumable':'1.0.0','x-signature':token}});
    if(response.ok)return Number(response.headers.get('upload-offset')||fallback);
  }catch{}
  return fallback;
}

async function storageError(response,fallback){
  const body=await response.json().catch(()=>null);
  return body?.message||body?.error||fallback;
}

function wait(milliseconds){return new Promise(resolve=>setTimeout(resolve,milliseconds));}

async function removeProgram(form){
  const variant=form.dataset.programVariant;
  const label=variant==='donna'?'Donna':'Uomo';
  const filename=state.stats?.programs?.[variant]?.filename;
  if(!filename)return;
  const recipients=variant==='donna'?'chi seleziona Donna':'chi seleziona Uomo o “Preferisco non dirlo”';
  if(!window.confirm(`Rimuovere ${filename}? ${recipients} non potrà sbloccare il programma finché non carichi un nuovo PDF.`))return;
  const button=form.querySelector('[data-role="remove-program"]');
  const message=form.querySelector('[data-role="upload-message"]');
  button.disabled=true;button.textContent='Rimozione…';message.textContent='';message.className='form-message';
  try{
    const result=await api(`/api/admin/program?variant=${variant}`,{method:'DELETE'});
    state.stats.programs[variant]=result.program;renderStats();
    message.textContent=`PDF ${label} rimosso correttamente.`;message.classList.add('success');toast(`PDF ${label} rimosso.`);
  }catch(error){message.textContent=error.message;}
  finally{button.textContent='Rimuovi PDF';button.disabled=!state.stats?.programs?.[variant]?.filename;}
}

$('#exportButton').addEventListener('click',()=>{
  if(!state.leads.length){toast('Non ci sono contatti da esportare.');return;}
  const columns=['name','email','status','goal','level','score','marketingConsent','createdAt'];
  const rows=[columns,...state.leads.map(item=>columns.map(key=>item[key]??''))];
  const csv=rows.map(row=>row.map(value=>`"${String(value).replaceAll('"','""')}"`).join(',')).join('\n');
  const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download=`metodo-zac-contatti-${new Date().toISOString().slice(0,10)}.csv`;link.click();URL.revokeObjectURL(link.href);
});

document.querySelectorAll('.side-link').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.side-link').forEach(item=>item.classList.toggle('active',item===link));}));

async function api(url,options={}){
  const response=await fetch(url,{credentials:'same-origin',...options});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error||'Richiesta non riuscita.');error.status=response.status;throw error;}
  return data;
}
function initials(name){return String(name||'?').split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();}
let toastTimer;function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3200);}
