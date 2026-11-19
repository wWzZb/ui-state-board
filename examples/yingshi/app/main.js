'use strict';
const samplePrompt='钴蓝色玻璃花瓶里插着两朵橙色虞美人。暖黄色桌面，午后阳光，干净的静物摄影。';
const sizes={'1:1':[1024,1024,'square'],'3:4':[768,1024,'portrait'],'4:3':[1024,768,'landscape']};
const root=document.querySelector('#studio'), dialog=document.querySelector('#sheet');
const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blankDraft=()=>({text:'',ratio:'自动',ref:null});
let owner='', account=emptyAccount(), draft=blankDraft(), view='create', workId='', sheet='', intent='', email='', feedback='', fileError='', textError='', scenario='done', timer, busy=false;
let originalId='', orderId='', referenceImage='', uploadSerial=0, readingFile=false;

const credits=()=>available(account);
const action=(id,label,klass='cta',icon='',nodeId='action-'+id)=>`<button id="${nodeId}" type="button" data-act="${id}" class="${klass}">${icon?ic(icon,nodeId+'-icon'):''}${label}</button>`;
const head=(id,title,subtitle='GPT Image 2.6 Flare · 本地模拟')=>`<div id="${id}-head" class="head"><h1 id="${id}-title">${title}</h1><div id="${id}-model" class="model"><i id="${id}-model-dot"></i>${subtitle}</div></div>`;
const titleOf=j=>j.text===samplePrompt?'午后花器':Array.from(j.text).slice(0,16).join('');
const picked=()=>account.jobs.find(j=>j.id===workId);
const source=j=>j.img||('app/assets/'+sizes[j.ratio][2]+'.jpg');
const nav=id=>['create','library'].map((n,i)=>action(n,['生成','我的作品'][i],'navitem '+((view==='library'||view==='detail')===!!i?'active':''),i?'folder':'editor',id+'-'+n)).join('');
const caption=(id,icon,h,d,tone='')=>`<div id="${id}" class="status"><div id="${id}-symbol" class="symbol ${tone}">${ic(icon,id+'-icon')}</div><h2 id="${id}-heading">${h}</h2><p id="${id}-description">${d}</p></div>`;
const promptBox=(id,j)=>`<div id="${id}" class="promptcard"><span id="${id}-label" class="label">画面描述</span><p id="${id}-text">${esc(j.text)}</p></div>`;
function examplePreview(){
  return `<aside id="example-preview" class="preview">
    <div id="example-preview-header" class="bar"><h3 id="example-preview-heading">示例作品</h3><span id="example-preview-size" class="fn">1:1 · 1024 × 1024</span></div>
    <img id="example-preview-photo" class="photo" alt="蓝色花瓶里的两朵橙色虞美人" src="${sample}">
    <div id="example-preview-title-row" class="bar padtop"><h3 id="example-preview-title">午后花器</h3>${action('example','使用这段提示词 ↗','use','','example-preview-use')}</div>
    ${promptBox('example-preview-prompt',{text:samplePrompt})}</aside>`;
}
function editor(){
  const job=pending(account);
  return `<div id="editor-workspace" class="workspace"><section id="editor">${head('editor','生成图片')}
    <button id="editor-example" class="example" data-act="example"><img id="editor-example-photo" alt="" src="${sample}"><div id="editor-example-info"><span id="editor-example-label">示例作品</span><strong id="editor-example-title">午后花器</strong><span id="editor-example-use" class="use">使用这段提示词 ↗</span></div></button>
    ${job?action('resume','查看进行中的任务','ghost','clock'):''}
    <div id="prompt-block" class="block"><div id="prompt-row" class="row"><label id="prompt-label" class="label" for="prompt">画面描述</label><button id="prompt-clear" class="use" data-act="clear">清空</button></div>
    <textarea id="prompt" class="box" rows="3" placeholder="想画什么？可以写下主体、风格和光线。">${esc(draft.text)}</textarea>${textError?'<div id="prompt-error" class="alert" role="alert">'+esc(textError)+'</div>':''}</div>
    <div id="upload-block" class="block"><div id="upload-row" class="row"><label id="upload-label" class="label" for="upload">参考图</label><span id="upload-optional" class="sub">选填 · 最多 1 张</span></div>
    <input hidden type="file" accept="image/jpeg,image/png,image/webp" id="upload">
    <div id="upload-controls" class="uploadwrap"><button id="upload-button" class="upload" data-act="upload">${draft.ref?`<img id="upload-thumbnail" alt="" class="thumb" src="${referenceImage}"><div id="upload-info" class="filemeta"><strong id="upload-file-name">${esc(draft.ref.name)}</strong><div id="upload-hint" class="micro">已添加 · 点击替换</div></div>`:`<div id="upload-symbol" class="tileIcon">${ic('image','upload-icon')}</div><div id="upload-info"><strong id="upload-text">添加图片</strong><div id="upload-hint" class="micro">JPG、PNG、WebP · 最大 10 MB</div></div><div id="upload-add" class="end">${ic('add','upload-add-icon')}</div>`}</button>${draft.ref?action('remove','移除','use'):''}</div>
    ${fileError?'<div id="upload-error" class="alert" role="alert">'+esc(fileError)+'</div>':''}</div>
    <div id="ratio-block" class="block"><div id="ratio-label" class="label">画面比例</div><div id="ratio-choices" class="choice">${['自动',...Object.keys(sizes)].map(r=>`<button id="ratio-${r==='自动'?'auto':r.replace(':','-')}" class="chip ${r===draft.ratio?'sel':''}" aria-pressed="${r===draft.ratio}" data-ratio="${r}">${r}</button>`).join('')}</div></div>
    ${action('generate','生成 1 张','cta','spark')}<div id="editor-usage" class="smallprint">每次成功生成使用 1 张额度</div>
    <details id="demo-settings" class="details"><summary id="demo-settings-title">本地演示设置</summary><label id="scenario-label">下次生成　<select id="scenario">${[['done','正常出图'],['failed','生成失败'],['blocked','审核未通过'],['unknown','网络中断待确认']].map(([v,l])=>`<option id="scenario-${v}" value="${v}" ${scenario===v?'selected':''}>${l}</option>`).join('')}</select></label><p id="demo-settings-note">模拟生图按所选比例返回示例图或参考图。</p></details>
    </section>${examplePreview()}</div>`;
}
function library(){
  const works=account.jobs.filter(j=>j.status==='done');
  return `<section id="library">${head('library','我的作品','保存在当前浏览器的演示账号中')}
  <div id="library-balance" class="balance"><span id="library-balance-label">可用生成额度 <b id="library-balance-amount">${credits()} 张</b></span>${action('purchase','购买张数 ↗','use')}</div>
  ${pending(account)?action('resume','查看生成进度','ghost','clock'):''}
  ${works.length?`<div id="library-list-heading" class="bar"><strong id="library-list-title">全部作品</strong><span id="library-count" class="count">${works.length} 幅作品</span></div><div id="library-cards" class="cards">${works.map(j=>{
    const id='work-card-'+esc(j.id);
    return `<button id="${id}" class="card" data-work="${esc(j.id)}"><img id="${id}-photo" alt="" src="${source(j)}"><div id="${id}-info"><strong id="${id}-title">${esc(titleOf(j))}</strong><span id="${id}-meta">${new Date(j.created).toLocaleDateString('zh-CN')} · ${j.ratio}</span></div></button>`;
  }).join('')}</div>`:`<div id="library-empty" class="statebody empty">${caption('library-empty-status','folder','还没有作品','成功生成的图片会保存在这里。')}${action('create','去生成第一张','cta','spark')}</div>`}</section>`;
}
function jobView(){
  const j=picked();
  if(!j) return editor();
  if(j.status==='done'){
    const [w,h]=sizes[j.ratio];
    const panel=`<div id="result-header" class="bar">${action(view==='detail'?'library':'create',view==='detail'?'我的作品':'返回生成','back','back','result-back')}<span id="result-size" class="fn">${j.ratio} · ${w} × ${h}</span></div>
    <h1 id="result-title" class="worktitle">${view==='detail'?esc(titleOf(j)):'生成成功'}</h1><div id="result-storage" class="meta">模拟图片 · 已保存至我的作品</div>
    <img id="result-photo" class="photo" alt="生成结果" src="${source(j)}"><div id="result-usage" class="meta">${ic('image','result-usage-icon')} 标准画质 · 本次已使用 1 张</div>
    <div id="result-actions" class="dual"><a id="result-download" class="cta download" href="${source(j)}" download="映室-${j.id.slice(0,8)}.jpg">${ic('down','result-download-icon')}下载原图</a>${action('again','重新生成','ghost','retry')}</div>${promptBox('result-prompt',j)}`;
    return `<div id="result-workspace" class="workspace resultLayout"><section id="result-editor" class="sideEditor">${head('result-editor','生成图片')}${promptBox('result-editor-prompt',j)}<p id="result-editor-ratio" class="note">画面比例　${j.ratio}</p>${action('create','回到画面编辑','ghost','editor')}</section><section id="result-panel" class="resultPanel">${panel}</section></div>`;
  }
  const info={
    running:['clock','正在生成','可以离开此页，作品会自动保存。'],
    unknown:['warn','结果待确认','网络中断，恢复后可查询原任务。'],
    failed:['warn','生成失败','本次占用的 1 张已退回。'],
    blocked:['shield','请调整画面描述','本次请求未通过模拟审核，已退回 1 张。']
  }[j.status];
  const wait=['running','unknown'].includes(j.status);
  return `<div id="job-progress" class="reading">${head('job-progress','生成进度')}<div id="job-progress-card" class="statebody">${wait?`<div id="job-pending-art" class="pending-art"><span id="job-pending-mark" class="busyMark">${mark('job-pending-logo')}</span></div>`:''}${caption('job-status',...info,wait?'':'warn')}</div><div id="job-balance" class="balance">${wait?'已占用 1 张 · ':''}可用 ${credits()} 张 ${ic('ticket','job-balance-icon')}</div>${promptBox('job-prompt',j)}
  ${j.status==='unknown'?action('query','查询原任务','cta','retry'):j.status==='failed'?action('again','再次生成 · 使用 1 张','cta','retry'):action('create',j.status==='blocked'?'修改画面描述':'回生成页','ghost','editor')}</div>`;
}
const pkg='<div id="package" class="package"><div id="package-summary" class="row"><strong id="package-amount">15 张生成额度</strong><span id="package-price" class="price">¥9.90</span></div><p id="package-terms">每张 ¥0.66 · 自购买起 1 年有效</p></div>';
function sheetContent(){
  const sheetAction=(id,label,klass,icon)=>action(id,label,klass,icon,'sheet-action-'+id);
  const definitions={
    login:['登录后继续',`<p id="sheet-description" class="desc">输入一个演示邮箱，草稿会保留。</p><label id="email-label" for="email">邮箱</label><input id="email" class="field" type="email" value="${esc(email)}" placeholder="name@example.com" autocomplete="email">${sheetAction('send','获取演示验证码','cta','arrow')}`],
    code:['输入验证码',`<p id="sheet-description" class="desc">${esc(email)}<br id="code-description-break">本地演示验证码为 <b id="code-sample">123456</b>。</p><label id="code-label" for="code">6 位验证码</label><input class="field code" id="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">${sheetAction('verify','登录')}${sheetAction('changeEmail','更换邮箱','ghost')}`],
    account:['我的账户',`<p id="sheet-description" class="desc">${esc(owner)}</p><div id="sheet-balance" class="balance">剩余 ${credits()} 张</div>${sheetAction('purchase','购买生成张数')}${sheetAction('logout','退出演示账号','ghost')}`],
    buy:['补充生成张数',`<p id="sheet-description" class="desc">当前可用 ${credits()} 张。</p>${pkg}${sheetAction('pay','模拟微信支付 ¥9.90')}<p id="payment-terms" class="smallprint">本地模拟 · 一次性购买</p>`],
    waiting:['等待支付结果',caption('sheet-status','clock','模拟微信收银台','15 张生成额度 · ¥9.90')+sheetAction('paySuccess','模拟支付成功')+sheetAction('payCancel','取消支付','ghost')+'<details id="payment-options" class="details"><summary id="payment-options-title">其他支付结果</summary>'+sheetAction('payFail','模拟支付失败','use')+'</details>'],
    paid:['额度已到账',caption('sheet-status','check','15 张已到账','当前剩余 '+credits()+' 张','good')+sheetAction(intent==='generate'?'afterPay':'close',intent==='generate'?'继续生成 · 使用 1 张':'完成')+(intent==='generate'?sheetAction('close','返回草稿','ghost'):'')],
    canceled:['支付已取消','<p id="sheet-description" class="desc">本笔订单已取消，草稿已保留。</p>'+sheetAction('pay','重新支付 ¥9.90')+sheetAction('close','返回草稿','ghost')],
    payfail:['支付失败','<p id="sheet-description" class="desc">本笔模拟订单未扣款，可重新支付。</p>'+sheetAction('pay','重新支付 ¥9.90')+sheetAction('close','返回草稿','ghost')],
    again:['重新生成这幅图？',`<p id="sheet-description" class="desc">沿用原描述、参考图和比例，原作品保留。</p><div id="sheet-balance" class="balance">本次使用 1 张 <span id="sheet-balance-remaining">剩余 ${credits()} 张</span></div>${sheetAction('confirmAgain','确认重新生成 · 使用 1 张','cta','retry')}${sheetAction('close','取消','ghost')}`]
  };
  const [title,body]=definitions[sheet];
  return `<section id="sheet-content" class="sheet"><div id="sheet-handle" class="handle"></div><div id="sheet-header" class="row"><h2 id="sheetTitle">${title}</h2><button id="sheet-dismiss" class="x" data-act="close" aria-label="关闭">${ic('close','sheet-dismiss-icon')}</button></div>${body}<div id="sheetError" role="alert">${esc(feedback)}</div></section>`;
}
function render(){
  root.innerHTML=`<header id="studio-header" class="mast"><button id="studio-brand" class="brand" data-act="create">${mark('studio-logo')}映室</button><nav id="studio-desktop-nav" class="desktopnav">${nav('desktop-nav')}</nav>${action('account',owner?'剩余 '+credits()+' 张':'登录','who',owner?'ticket':'user')}</header><main id="studio-content" class="content">${view==='create'?editor():view==='library'?library():jobView()}</main><footer id="studio-mobile-nav" class="navbar">${nav('mobile-nav')}</footer>`;
  if(sheet) { dialog.innerHTML=sheetContent(); if(!dialog.open)dialog.showModal(); }
  else if(dialog.open) dialog.close();
}
function openSheet(s){sheet=s;feedback='';render();}
function navigate(v,id=''){
  view=v;workId=id;sheet='';feedback='';originalId='';
  history.replaceState(null,'','#'+(id?v+'/'+id:v));
  render();window.scrollTo(0,0);
}
let noticeTimer;
function notice(msg){
  const n=document.getElementById('notice');n.textContent=msg;
  clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.textContent='',3500);
}


function saveDraft(){
  const key='draft:'+(owner||'guest'), copy=structuredClone(draft);
  return updateRecord(key,{},()=>copy);
}
async function loadDraft(){
  draft=await readRecord('draft:'+(owner||'guest'))||blankDraft();
  referenceImage=draft.ref?(await readRecord('image:'+draft.ref.id))||'':'';
}
function setSession(key,val){ if(!reviewRecords)sessionStorage.setItem('ys:'+key,val); }
function getSession(key){ return sessionStorage.getItem('ys:'+key)||''; }
async function loadAccount(){
  account=owner?(await readRecord('account:'+owner))||emptyAccount():emptyAccount();
}
const updateBus = !reviewRecords && typeof BroadcastChannel==='function'?new BroadcastChannel('yingshi-demo-changes-v1'):null;
function broadcast(){ updateBus?.postMessage(owner); }
function schedule(){
  clearTimeout(timer);
  const job=pending(account);
  if(!job||job.status==='unknown'||job.due===null) return;
  const who=owner;
  timer=setTimeout(async()=>{
    try {
      const updated=await settleJob(who,job.id);
      if(who!==owner) return;
      account=updated; broadcast();
      if(view==='create' && !sheet && document.activeElement?.id==='prompt'){
        root.querySelector('[data-act=resume]')?.remove();
        root.querySelector('.who').innerHTML=ic('ticket','action-account-icon')+'剩余 '+credits()+' 张';
      }else if(!sheet)render();
      schedule();
    } catch(e){notice(e.message);}
  },Math.max(10,job.due-Date.now()));
}
async function current(){
  await loadAccount();
  schedule();
}
function syncFlow(){
  setSession('flow',JSON.stringify({owner,intent,originalId}));
}
function restoreFlow(){
  const value=JSON.parse(getSession('flow')||'{}');
  if(value.owner===owner){intent=value.intent||'';originalId=value.originalId||'';}
}
async function boot(){
  try{
    if(reviewRecords){
      ({owner,view,workId,sheet,intent,email,fileError,textError,originalId,orderId}=seedReview(reviewState,samplePrompt));
      await loadDraft();
      await current();
      render();
      return;
    }
    owner=localStorage.getItem('ys:owner')||'';
    await loadDraft();
    await current();
    const [page,id]=location.hash.slice(1).split('/');
    const j=account.jobs.find(job=>job.id===id);
    if(j && ['job','detail'].includes(page)){ view=page;workId=id; }
    else if(page==='library'&&owner)view='library';
    else if(pending(account)){view='job';workId=pending(account).id;}
    if(account.order?.status==='waiting'){restoreFlow();orderId=account.order.id;sheet='waiting';}
    render();
  }catch(e){
    root.textContent=reviewRecords?'无法打开评审状态：'+e.message:'无法保存本地演示数据。请在允许本地存储的 Safari 或 Chrome 窗口打开页面。';
  }
}
function imageFrom(url){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('无法读取图片，请重新选择。'));
    img.src=url;
  });
}
function jpeg(img,w,h){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='white';ctx.fillRect(0,0,w,h);
  const scale=Math.max(w/img.naturalWidth,h/img.naturalHeight);
  const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
  ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
  return canvas.toDataURL('image/jpeg',.89);
}
async function chooseFile(file){
  const ticket=++uploadSerial;
  if(!file)return;
  fileError='';
  const supported = file.type ? ['image/jpeg','image/png','image/webp'].includes(file.type) : /\.(jpe?g|png|webp)$/i.test(file.name);
  if(!supported)fileError='请选择 JPG、PNG 或 WebP 图片。';
  if(file.size>10*1024*1024)fileError='图片超过 10 MB，请选择较小的文件。';
  if(fileError){readingFile=false;render();return;}
  readingFile=true;
  const url=URL.createObjectURL(file);
  try{
    const im=await imageFrom(url), k=Math.min(1,1280/Math.max(im.naturalWidth,im.naturalHeight));
    const data=jpeg(im,Math.max(1,Math.round(im.naturalWidth*k)),Math.max(1,Math.round(im.naturalHeight*k)));
    const id=uid();
    await updateRecord('image:'+id,'',()=>data);
    if(ticket!==uploadSerial)return;
    draft.ref={id,name:file.name,width:im.naturalWidth,height:im.naturalHeight};
    referenceImage=data;
    await saveDraft();
  }catch(e){fileError='无法添加这张图片，请重新选择。';}
  finally{URL.revokeObjectURL(url);if(ticket===uploadSerial){readingFile=false;render();}}
}
function effectiveRatio(spec){
  if(spec.ratio!=='自动')return spec.ratio;
  if(!spec.ref)return '1:1';
  const r=spec.ref.width/spec.ref.height;
  return r>1.18?'4:3':r<.85?'3:4':'1:1';
}
async function start(){
  if(readingFile){notice('正在读取参考图，请稍候');return;}
  const old=account.jobs.find(j=>j.id===originalId);
  const spec=old?{text:old.text,ref:old.ref,ratio:old.ratio}:structuredClone(draft);
  spec.text=spec.text.trim();
  if(!spec.text){textError='请先写下你想生成的画面。';openSheet('');document.getElementById('prompt')?.focus();return;}
  intent='generate';
  if(!owner){openSheet('login');return;}
  await loadAccount();
  const active=pending(account);
  if(active){navigate('job',active.id);schedule();return;}
  if(!credits()){await purchase();return;}
  const ratio=effectiveRatio(spec);
  let img=old?.img||'';
  if(!img){
    const ref=spec.ref ? await readRecord('image:'+spec.ref.id) : sample;
    if(!ref)throw new Error('参考图已不可用，请重新选择');
    img=jpeg(await imageFrom(ref),...sizes[ratio].slice(0,2));
  }
  account=await reserveJob(owner,{text:spec.text,ref:spec.ref,ratio,img,scenario});
  const job=pending(account);
  scenario='done'; intent='';syncFlow();broadcast();
  navigate('job',job.id);schedule();
}
async function purchase(){
  if(!owner){openSheet('login');return;}
  await loadAccount();
  if(account.order?.status==='waiting'){
    orderId=account.order.id;openSheet('waiting');
  }else openSheet('buy');
}
async function paidAction(outcome){
  if(sheet!=='waiting')return;
  account=await finishOrder(owner,orderId,outcome);
  if(account.order?.id!==orderId){notice('请重新查看当前订单');return;}
  const state={paid:'paid',canceled:'canceled',failed:'payfail',waiting:'waiting'}[account.order.status];
  broadcast();openSheet(state);
}
async function login(){
  const field=document.getElementById('code');
  if(field?.value!=='123456'){showError('请输入演示验证码 123456');return;}
  const guestDraft=structuredClone(draft);
  owner=email;if(!reviewRecords)localStorage.setItem('ys:owner',owner);
  await loadDraft();
  if(guestDraft.text||guestDraft.ref||guestDraft.ratio!=='自动'){
    draft=guestDraft;
    referenceImage=draft.ref?(await readRecord('image:'+draft.ref.id))||'':'';
    await saveDraft();
  }
  await updateRecord('draft:guest',{},blankDraft);
  await current();
  if(intent==='generate')await start();
  else if(intent==='library')navigate('library');
  else if(intent==='purchase')await purchase();
  else openSheet('');
}
function showError(message){
  feedback=message;
  const el=document.getElementById('sheetError');
  if(el)el.textContent=message;else notice(message);
}
async function dispatch(id){
  switch(id){
    case 'create': navigate('create');break;
    case 'library':
      intent='library';
      if(!owner)openSheet('login');else {await current();navigate('library');}
      break;
    case 'example':
      draft.text=samplePrompt;draft.ratio='1:1';textError='';await saveDraft();render();document.getElementById('prompt').focus();break;
    case 'clear':
      draft.text='';textError='';await saveDraft();render();document.getElementById('prompt').focus();break;
    case 'upload': document.getElementById('upload').click();break;
    case 'remove':uploadSerial++;readingFile=false;draft.ref=null;referenceImage='';fileError='';await saveDraft();render();break;
    case 'account': intent='account';openSheet(owner?'account':'login');break;
    case 'logout':
      await saveDraft();owner='';email='';if(!reviewRecords)localStorage.removeItem('ys:owner');
      account=emptyAccount();clearTimeout(timer);intent='';originalId='';
      await loadDraft();navigate('create');break;
    case 'send': {
      const field=document.getElementById('email');
      if(!field.value.trim()||!field.checkValidity()) {showError('请填写有效的邮箱地址');field.focus();break;}
      email=field.value.trim().toLowerCase();openSheet('code');break;
    }
    case 'changeEmail': openSheet('login');break;
    case 'verify':await login();break;
    case 'purchase':intent='purchase';await purchase();break;
    case 'pay':
      account=await createOrder(owner);orderId=account.order.id;syncFlow();broadcast();openSheet('waiting');break;
    case 'paySuccess':await paidAction('paid');break;
    case 'payCancel':await paidAction('canceled');break;
    case 'payFail':await paidAction('failed');break;
    case 'close':openSheet('');break;
    case 'generate': originalId='';await start();break;
    case 'afterPay':await start();break;
    case 'resume':if(pending(account))navigate('job',pending(account).id);break;
    case 'again': originalId=workId;openSheet('again');break;
    case 'confirmAgain':await start();break;
    case 'query':
      account=await settleJob(owner,workId,true);broadcast();render();schedule();break;
  }
}
document.addEventListener('click',async e=>{
  const button=e.target.closest('[data-act],[data-ratio],[data-work]');
  if(!button||busy)return;
  busy=true;
  try{
    if(button.dataset.ratio){draft.ratio=button.dataset.ratio;await saveDraft();render();}
    else if(button.dataset.work)navigate('detail',button.dataset.work);
    else await dispatch(button.dataset.act);
  }catch(err){showError(err.message||'操作失败，请重试');}
  finally{busy=false;}
});
document.addEventListener('input',e=>{
  if(e.target.id==='prompt'){
    draft.text=e.target.value;textError='';
    e.target.parentElement.querySelector('.alert')?.remove();
    saveDraft().catch(()=>notice('草稿保存失败，请检查浏览器存储'));
  }
});
document.addEventListener('change',e=>{
  if(e.target.id==='upload')chooseFile(e.target.files[0]);
  if(e.target.id==='scenario')scenario=e.target.value;
});
dialog.addEventListener('cancel',e=>{e.preventDefault();openSheet('');});
dialog.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.matches('#email,#code')){
    e.preventDefault();dialog.querySelector('.cta').click();
  }
});
updateBus?.addEventListener('message',async e=>{
  if(e.data!==owner||busy)return;
  await current();
  if(sheet==='waiting'&&account.order?.id===orderId&&account.order.status!=='waiting'){
    openSheet({paid:'paid',failed:'payfail',canceled:'canceled'}[account.order.status]);
  }else if(view!=='create'&&!sheet)render();
  else if(!sheet){
    const who=root.querySelector('.who');
    if(who)who.innerHTML=ic('ticket','action-account-icon')+'剩余 '+credits()+' 张';
  }
});
boot();
