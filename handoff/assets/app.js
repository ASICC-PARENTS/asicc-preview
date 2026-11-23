(function(){'use strict';
const page=document.body.dataset.page,$=s=>document.querySelector(s),app=$('#app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>(Number(n)||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const clone=x=>JSON.parse(JSON.stringify(x));
const stateKey='asicc-approved-handoff-v1';
const createEvent=(name,round,status,items,orders=[])=>({name,round,status,products:clone(items),
 orderProducts:clone(items),orders:clone(orders),poDrafts:{},poMeta:{},orderDeadline:'',transferDeadline:'',pickupKo:'',pickupFr:''});
const initialCatalog=ASICC_SAMPLE.catalog.map(({boxes,limitMode,manualLimit,...item})=>item);
const initial={catalog:clone(initialCatalog),active:createEvent('2026 겨울 바자회',3,'active',ASICC_SAMPLE.catalog,ASICC_SAMPLE.orders),
 draft:null,past:[createEvent('2026 가을 바자회',2,'past',ASICC_SAMPLE.catalog,ASICC_SAMPLE.orders.slice(2,6)),
 createEvent('2026 봄 바자회',1,'past',ASICC_SAMPLE.catalog,ASICC_SAMPLE.orders.slice(4))],view:'active',history:0,manualCounter:0};
let model=initial;
try{const saved=sessionStorage.getItem(stateKey);if(saved)model=JSON.parse(saved);}catch{}
const selectedEvent=()=>model.view==='past'?model.past[model.history]:model.view==='draft'?model.draft:model.view==='active'?model.active:null;
const current=()=>selectedEvent()?.status==='past';
if(model.active&&!model.active.orderDeadline){model.active.orderDeadline='2026-11-27T12:00';model.active.transferDeadline='2026-11-27T18:00';}
const store={search:'',orderFilter:'all',orderSort:'new',settleScope:'confirmed',vendor:'업체 A',
 get catalog(){return model.catalog;},get products(){return selectedEvent()?.products??[];},
 get orders(){return selectedEvent()?.orders??[];},get poDrafts(){return selectedEvent()?.poDrafts??{};},
 get mode(){return model.view;},set mode(value){model.view=value==='active'&&!model.active?'empty':value;},
 get history(){return model.history;},set history(value){model.history=value;},
 get manualCounter(){return model.manualCounter;},set manualCounter(value){model.manualCounter=value;}
};
function persist(){try{sessionStorage.setItem(stateKey,JSON.stringify(model));return true;}catch{return false;}}
document.addEventListener('click',()=>queueMicrotask(persist));
document.addEventListener('change',()=>queueMicrotask(persist));
window.addEventListener('pagehide',persist);
const finance=n=>Math.round((Number(n)||0)*100)/100;
const defaults=p=>({...clone(p),boxes:0,limitMode:'auto',manualLimit:0,active:true});
const allocated=p=>store.orders.filter(o=>o.status!=='canceled').reduce((sum,o)=>sum+o.items.reduce((n,i)=>n+(orderProduct(i)?.id===p.id?Number(i[1]):0),0),0);
function orderProduct(item){return selectedEvent()?.orderProducts.find(p=>item[3]?p.id===item[3]:p.ko===item[0]);}
const statuses={unpaid:['송금 신고 없음','unpaid'],reported:['송금 신고 접수','reported'],confirmed:['입금 확인 완료','confirmed'],canceled:['취소','canceled']};
function total(o){return o.items.reduce((s,x)=>s+x[1]*x[2],0)}
function stats(){let valid=store.orders.filter(x=>x.status!=='canceled'),confirmed=store.orders.filter(x=>x.status==='confirmed');return [['총 주문',valid.length+'건'],['총 주문금액',money(valid.reduce((s,x)=>s+total(x),0))],['입금 확인액',money(confirmed.reduce((s,x)=>s+total(x),0))],['입금 확인 대기',store.orders.filter(x=>['reported','unpaid'].includes(x.status)).length+'건']];}
function metrics(xs){return '<div class="metrics">'+xs.map(x=>'<div class="metric"><span>'+x[0]+'</span><strong>'+x[1]+'</strong>'+(x[2]?'<small>'+x[2]+'</small>':'')+'</div>').join('')+'</div>'}
function eventHead(){
 const e=selectedEvent();
 if(!e)return '<section class="panel empty"><h2>진행 중인 바자회가 없습니다.</h2></section>';
 const label={active:'● 주문 접수 중',draft:'준비 중 · 임시저장',past:'종료된 바자회'}[e.status];
 const time=value=>value?esc(value.replace('T',' ')):'미설정';
 return '<section class="panel pad"><div class="toolbar"><h2>'+esc(e.name)+'</h2><span class="status '+(e.status==='past'?'old':e.status==='draft'?'draft':'')+'">'+label+'</span></div><div class="info-row"><span>주문 마감 <b>'+time(e.orderDeadline)+'</b></span><span>송금 마감 <b>'+time(e.transferDeadline)+'</b></span></div>'+metrics(stats())+banner('총 주문과 주문금액은 취소 주문을 제외합니다.')+'</section>';
}
function tabs(){return '<nav class="tabs" aria-label="관리 탭"><a href="products.html" class="'+(page==='products'?'active':'')+'">제품관리</a><a href="orders.html" class="'+(page==='orders'?'active':'')+'">주문관리</a><a href="settlement.html" class="'+(page==='settlement'?'active':'')+'">정산관리</a></nav>'}
function banner(msg,cls=''){return '<div class="notice '+cls+'">'+msg+'</div>'}
function modal(title,caption,body,foot){$('#modal-title').textContent=title;$('#modal-caption').textContent=caption||'';$('#modal-body').innerHTML=body;$('#modal-foot').innerHTML=foot||'<button class="btn neutral" data-action="close">닫기</button>';$('#modal').hidden=false;}
function closeModal(){$('#modal').hidden=true;}
$('#modal-close').onclick=closeModal;
function pastModal(){
 modal('지난 바자회 선택','지난 행사는 기록 조회용이며 상품 원본은 유지됩니다.',
 '<div class="past-select"><button class="btn neutral" data-action="past-prev" aria-label="이전 회차">‹</button><select class="select" id="past-selector" aria-label="지난 바자회">'+model.past.map((e,i)=>'<option value="'+i+'">'+e.round+'회 · '+esc(e.name)+'</option>').join('')+'</select><button class="btn neutral" data-action="past-next" aria-label="다음 회차">›</button></div>',
 '<button class="btn primary" data-action="open-past">확인</button>');
 $('#past-selector').value=store.history;
}
$('#global-past').onclick=pastModal;
function draftModal(resume=false){
 const existing=resume?model.draft:null;
 modal(existing?'새 바자회 · 임시저장':'새 바자회 만들기','기본 상품 목록에서 독립된 행사 상품을 복사합니다.',
 '<div class="form-grid"><label class="field wide">행사명<input id="event-name" value="'+esc(existing?.name||'새 예시 바자회')+'"></label><label class="field">주문 마감 (프랑스 현지시간)<input type="datetime-local" id="event-order" value="'+esc(existing?.orderDeadline||'')+'"></label><label class="field">송금 마감 (프랑스 현지시간)<input type="datetime-local" id="event-transfer" value="'+esc(existing?.transferDeadline||'')+'"></label><label class="field wide">픽업 안내 · 한국어<textarea id="event-pickup-ko">'+esc(existing?.pickupKo||'')+'</textarea></label><label class="field wide">Retrait · français<textarea id="event-pickup-fr">'+esc(existing?.pickupFr||'')+'</textarea></label></div>',
 '<button class="btn neutral" data-action="close">취소</button><button class="btn primary" data-action="create-draft">임시저장</button>');
}
$('#global-new').onclick=()=>{if(model.draft){store.mode='draft';draftModal(true);}else draftModal();};
function renderMain(){
 let e=selectedEvent(),body='';
 if(!e)body='<section class="panel empty"><i>▦</i><h2>진행 중인 바자회가 없습니다.</h2><p class="muted">새 바자회를 만들거나 지난 행사를 확인할 수 있습니다.</p><a class="btn neutral" href="products.html?catalog=1">기본 상품 목록 관리</a></section>';
 else{
  body=eventHead();
  if(e.status==='draft')body+='<section class="panel pad">'+banner('기본 상품 목록을 복사했습니다. 발행 전에는 방문객에게 공개되지 않습니다.')+'<div class="actions"><a class="btn primary" href="products.html">상품 편집하기</a><button class="btn neutral" data-action="edit-draft">행사 설정</button><button class="btn neutral" data-action="mode-active">현재 행사 보기</button><button class="btn neutral" data-action="delete-draft">임시저장 삭제</button><button class="btn primary" data-action="publish-draft">발행</button></div></section>';
  else body+='<section class="panel pad"><h3>'+(current()?'지난 바자회 기록':'현재 바자회 관리')+'</h3><p class="muted small">필요한 업무 탭을 선택하세요.</p>'+tabs()+'<div class="tabbody actions"><a class="btn neutral" href="products.html">상품 관리</a><a class="btn neutral" href="orders.html">주문 확인</a><a class="btn neutral" href="settlement.html">정산·발주</a>'+(current()?'<button class="btn neutral" data-action="mode-active">현재 바자회로 돌아가기</button>':'<button class="btn neutral" data-action="end-event">행사 종료</button>')+'</div></section>';
 }
 app.innerHTML='<div class="toolbar"><strong>메인 화면 상태 미리보기</strong><div class="actions"><button class="btn neutral" data-action="mode-empty">행사 없음</button><button class="btn neutral" data-action="mode-active">진행 중</button>'+(model.draft&&store.mode!=='draft'?'<button class="btn neutral" data-action="resume-draft">준비 중인 행사 재개</button>':'')+'</div></div>'+body;
}
let productView=new URLSearchParams(location.search).has('catalog')?'catalog':'event',productFilter='';
function unit(p){return Number(p.pack)>0?Number(p.buy)/Number(p.pack):0}
function roi(p){return unit(p)>0&&p.sale!==''?((p.sale/unit(p)-1)*100).toFixed(2):'—'}
function lim(p){return p.limitMode==='manual'?(Number(p.manualLimit)||0):(Number(p.boxes)||0)*(Number(p.pack)||0)}

function supplierOptions(p){
 const names=[...new Set([...store.catalog,...store.products].map(x=>String(x.vendor||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
 return (p.vendor?'':'<option value="" selected>업체 선택</option>')+names.map(name=>'<option value="'+esc(name)+'"'+(name===p.vendor?' selected':'')+'>'+esc(name)+'</option>').join('')+'<option value="__asicc_new_supplier__">＋ 새 업체 추가…</option>';
}
function storageOptions(p){
 const names=['상온','냉장','냉동'];if(p.storage&&!names.includes(p.storage))names.push(p.storage);
 return names.map(name=>'<option value="'+esc(name)+'"'+(name===p.storage?' selected':'')+'>'+esc(name)+'</option>').join('');
}
function tableProducts(){const ps=(productView==='catalog'?store.catalog:store.products).filter(x=>(x.ko+' '+x.fr+' '+x.vendor).toLowerCase().includes(productFilter.toLowerCase()));const catalog=productView==='catalog';return '<div class="sheet"><table style="min-width:1880px"><colgroup><col style="width:70px"><col style="width:60px"><col style="width:160px"><col style="width:172px"><col style="width:120px"><col style="width:117px"><col style="width:105px"><col style="width:117px"><col style="width:107px"><col style="width:108px"><col style="width:110px"><col style="width:127px"><col style="width:107px"><col style="width:130px"><col style="width:125px"><col style="width:98px"></colgroup><thead><tr>'+['판매 포함','사진','상품명 · 한국어','상품명 · 프랑스어','공급업체','매입가/박스 €','박스당 수량','개당 원가','판매가/개 €','수익률 %','예상 박스','판매한도 방식','판매한도','보관','설명·사진','관리'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+ps.map(p=>'<tr data-row="'+p.id+'"><td><input type="checkbox" data-toggle="'+p.id+'" '+(p.active?'checked':'')+' '+(catalog||current()?'disabled':'')+'></td><td><span class="thumb">'+(p.photo?'<img src="'+esc(p.photo)+'" alt="" width="32">':esc(p.emoji))+'</span></td>'+['ko','fr','vendor','buy','pack'].map(f=>f==='vendor'?'<td><select class="select" style="width:100%;max-width:120px;padding:7px" data-prod="'+p.id+'" data-key="vendor">'+supplierOptions(p)+'</select></td>':'<td><input class="cell" data-prod="'+p.id+'" data-key="'+f+'" '+(['buy','pack'].includes(f)?'type="number" step="any" min="0"':'type="text"')+' value="'+esc(p[f])+'"></td>').join('')+'<td data-derived="unit" data-id="'+p.id+'">'+(unit(p)?money(unit(p)):'—')+'</td><td><input class="cell" type="number" step="0.01" min="0" data-prod="'+p.id+'" data-key="sale" value="'+p.sale+'"></td><td><input class="cell" type="number" step="0.01" data-prod="'+p.id+'" data-key="roi" value="'+roi(p)+'"></td><td><input class="cell" type="number" step="1" min="0" data-prod="'+p.id+'" data-key="boxes" value="'+(p.boxes??'—')+'"></td><td><select class="select" style="padding:7px;max-width:112px" data-prod="'+p.id+'" data-key="limitMode"><option value="auto" '+(p.limitMode==='auto'?'selected':'')+'>자동 계산</option><option value="manual" '+(p.limitMode==='manual'?'selected':'')+'>수동 입력</option></select></td><td><input class="cell" type="number" step="1" min="0" data-prod="'+p.id+'" data-key="manualLimit" value="'+lim(p)+'" '+(p.limitMode==='auto'?'disabled':'')+'></td><td><select class="select" style="width:100%;max-width:125px;padding:7px" data-prod="'+p.id+'" data-key="storage">'+storageOptions(p)+'</select></td><td><button class="linkbtn" data-action="edit-product" data-id="'+p.id+'">설명·사진 ✎</button></td><td><button class="linkbtn" data-action="delete-product" data-id="'+p.id+'">삭제</button></td></tr>').join('')+'</tbody></table></div><p class="muted tiny" style="margin-top:8px">↔ 가로로 스크롤 · 판매가 ↔ 수익률 양방향 계산 · 판매한도 자동/수동 선택 · 상품 하나당 한 행</p>'}
function renderProducts(){const catalog=productView==='catalog';app.innerHTML=eventHead()+tabs()+'<section class="tabbody"><div class="toolbar"><div><h2>'+(catalog?'기본 상품 목록 관리':'이번 바자회 상품 관리')+'</h2><p class="muted small">'+(catalog?'상시 원본 관리 · 새 바자회 생성 시 복사':esc(selectedEvent()?.name||'')+'에만 적용되는 상품 사본')+'</p></div><div class="actions">'+(catalog?'<button class="btn neutral" data-action="switch-event">← 이번 바자회로</button>':'<button class="btn neutral" data-action="switch-catalog">⚙ 기본 상품 목록 관리</button>')+'</div></div>'+banner(catalog?'<b>원본 상품 관리</b> · 기본 목록을 수정해도 이미 생성된 바자회의 상품에는 영향을 주지 않습니다.':'<b>이번 행사 전용 복사본</b> · 여기서 수정하는 모든 상품 정보는 기본 상품 목록에 반영되지 않습니다.')+'<div class="toolbar"><div class="actions"><input id="product-search" class="search" value="'+esc(productFilter)+'" placeholder="상품 또는 공급업체 검색"><span class="muted small">상품 '+(catalog?store.catalog.length:store.products.length)+'종</span></div><div class="actions">'+(catalog?'':'<button class="btn neutral" data-action="import">＋ 기본 목록에서 가져오기</button>')+'<button class="btn neutral" data-action="add-product">＋ 상품 추가</button></div></div>'+tableProducts()+'<div class="footbar"><span id="product-status" class="muted small">표에서 직접 수정하거나 설명·사진을 열어 편집하세요.</span><button class="btn primary" data-action="save-product">'+(catalog?'기본 목록 저장':'이번 행사 변경사항 저장')+'</button></div></section>'}
function editProduct(id){const p=(productView==='catalog'?store.catalog:store.products).find(p=>p.id===id);if(!p)return;modal(p.ko+' · 상세 편집',productView==='catalog'?'기본 원본 수정':'이번 바자회에만 적용','<div class="form-grid"><label class="field">상품명 · 한국어<input id="edit-ko" value="'+esc(p.ko)+'"></label><label class="field">상품명 · 프랑스어<input id="edit-fr" value="'+esc(p.fr)+'"></label><label class="field wide">설명 · 한국어<textarea id="edit-kod">'+esc(p.koDesc)+'</textarea></label><label class="field wide">Description · français<textarea id="edit-frd">'+esc(p.frDesc)+'</textarea></label><label class="field wide">상품 사진 (시안 표시용)<input id="edit-photo" type="file" accept="image/jpeg,image/png,image/webp"><small class="muted">실제 서버에는 업로드하지 않습니다.</small></label></div>','<button class="btn neutral" data-action="close">취소</button><button class="btn primary" data-action="save-product-detail" data-id="'+p.id+'">수정 적용</button>');}
function importModal(){let items=store.catalog.filter(c=>!store.products.some(x=>x.id===c.id));modal('기본 상품 목록에서 가져오기','선택한 상품을 현재 바자회에 복사합니다.',items.length?items.map(p=>'<label class="modal-row"><input type="checkbox" data-import="'+p.id+'"><span>'+p.emoji+' <b>'+esc(p.ko)+'</b> · '+esc(p.fr)+'</span><b>'+money(p.sale)+'</b></label>').join(''):banner('기본 목록 상품을 모두 가져왔습니다.'),'<button class="btn neutral" data-action="close">취소</button><button class="btn primary" data-action="import-apply">선택 상품 가져오기</button>')}
function productChange(el){const arr=productView==='catalog'?store.catalog:store.products,p=arr.find(x=>x.id===el.dataset.prod);if(!p)return;const k=el.dataset.key;if(productView==='catalog'&&['boxes','manualLimit','limitMode'].includes(k))return;let val=el.value;
 if(k==='vendor'&&val==='__asicc_new_supplier__'){
  const entered=prompt('새 공급업체명을 입력해 주세요 (최대 120자).');
  if(entered===null||!entered.trim()){el.value=p.vendor||'';return;}
  val=entered.trim();
  if(val.length>120){alert('공급업체명은 120자 이내로 입력해 주세요.');el.value=p.vendor||'';return;}
 }
 if(['buy','pack','sale','boxes','manualLimit','roi'].includes(k)){if(val===''){el.value=k==='roi'?roi(p):k==='manualLimit'?lim(p):p[k];return;}val=Math.max(k==='roi'?-100:0,Number(val)||0);}if(k==='pack'||k==='boxes'||k==='manualLimit')val=Math.floor(val);
 const candidate={...p,[k]:val};
 if(productView==='event'&&['pack','boxes','manualLimit','limitMode'].includes(k)&&lim(candidate)<allocated(p)){
  $('#product-status').textContent='이미 접수한 주문 수량보다 판매한도를 낮출 수 없습니다.';
  el.value=k==='manualLimit'?lim(p):p[k];return;
 }
 if(k==='roi'){if(unit(p)>0&&p.buy>0)p.sale=finance(unit(p)*(1+val/100));}else p[k]=['buy','sale'].includes(k)?finance(val):val;let row=app.querySelector('[data-row="'+p.id+'"]');if(!row)return;const unitcell=row.querySelector('[data-derived=unit]');if(unitcell)unitcell.textContent=unit(p)>0?money(unit(p)):'—';const rcell=row.querySelector('[data-key=roi]');if(rcell&&k!=='roi')rcell.value=roi(p);const scell=row.querySelector('[data-key=sale]');if(scell&&k==='roi')scell.value=p.sale.toFixed(2);const limitcell=row.querySelector('[data-key=manualLimit]');if(limitcell&&productView==='event'){limitcell.disabled=p.limitMode==='auto';if(p.limitMode==='auto'||k==='limitMode')limitcell.value=lim(p)}if(k==='vendor'){
  const oldSheet=app.querySelector('.sheet'),left=oldSheet?.scrollLeft||0,top=oldSheet?.scrollTop||0;
  renderProducts();
  const nextSheet=app.querySelector('.sheet');if(nextSheet){nextSheet.scrollLeft=left;nextSheet.scrollTop=top;}
 }
 $('#product-status').textContent='● 저장하지 않은 변경사항이 있습니다. (시안 내 데이터만 변경)';}
const orderFields=['주문번호','주문자','주문일시','연락처','이메일','상품 주문내역','총 주문액','송금 신고','은행 입금 확인','비고','주문 상태','관리'];
function filteredOrders(){return store.orders.filter(o=>(store.orderFilter==='all'||(store.orderFilter==='pending'?o.status==='reported':o.status===store.orderFilter))&&[o.id,o.name,o.phone,o.email,o.memo,...o.items.map(i=>i[0])].join(' ').toLowerCase().includes(store.search.toLowerCase())).sort((a,b)=>store.orderSort==='amount'?total(b)-total(a):store.orderSort==='name'?a.name.localeCompare(b.name,'ko'):store.orderSort==='old'?store.orders.indexOf(a)-store.orders.indexOf(b):store.orders.indexOf(b)-store.orders.indexOf(a))}
function renderOrders(){let ls=filteredOrders();const filters=[['all','전체'],['pending','송금 신고 · 확인 대기'],['unpaid','송금 신고 없음'],['confirmed','입금 확인'],['canceled','취소']];app.innerHTML=eventHead()+tabs()+'<section class="tabbody"><div class="toolbar"><div><h2>주문관리</h2><p class="muted small">PC는 엑셀형 주문표 · 모바일은 카드형 주문 목록</p></div><span class="muted small">주문 1건당 1행</span></div>'+banner('<b>은행 입금 확인 대기 '+store.orders.filter(o=>o.status==='reported').length+'건</b> · 고객의 송금 신고만으로 주문이 확정되지 않습니다.','warning')+'<div class="toolbar"><div class="actions"><input class="search" id="order-search" placeholder="이름 · 주문번호 · 연락처 · 비고 검색" value="'+esc(store.search)+'"><select class="select" id="order-sort"><option value="new">최신 주문순</option><option value="old">오래된 주문순</option><option value="amount">주문금액 높은 순</option><option value="name">이름순</option></select></div><span class="muted tiny">전체 '+store.orders.length+'건</span></div><div class="filters">'+filters.map(([f,t])=>'<button class="filter '+(f===store.orderFilter?'active':'')+'" data-action="order-filter" data-value="'+f+'">'+t+' ('+store.orders.filter(o=>f==='all'||(f==='pending'?o.status==='reported':o.status===f)).length+')</button>').join('')+'</div><div class="sheet"><table style="min-width:1470px"><colgroup>'+[110,110,95,126,160,195,105,118,125,90,112,105].map(x=>'<col style="width:'+x+'px">').join('')+'</colgroup><thead><tr>'+orderFields.map((x,i)=>'<th class="'+(i===0?'sticky-one':i===1?'sticky-two':'')+'">'+x+'</th>').join('')+'</tr></thead><tbody>'+ls.map(o=>{const st=statuses[o.status];return '<tr><td class="sticky-one"><b style="color:var(--wine)">'+o.id+'</b></td><td class="sticky-two"><b>'+esc(o.name)+'</b></td><td class="tiny">'+esc(o.date)+'</td><td>'+esc(o.phone)+'</td><td class="tiny">'+esc(o.email)+'</td><td>'+o.items.map(i=>esc(i[0])+' ×'+i[1]).join(' · ')+'</td><td><b>'+money(total(o))+'</b></td><td><span class="state '+(o.status==='reported'||o.status==='confirmed'?'reported':'unpaid')+'">'+(o.status==='reported'||o.status==='confirmed'?'신고 완료':'미신고')+'</span></td><td>'+(o.status==='confirmed'?'<span class="state confirmed">✓ 확인 완료</span>':o.status==='canceled'?'—':'<button class="linkbtn dark" data-action="confirm" data-id="'+o.id+'">입금 확인</button>')+'</td><td>'+(o.memo?'<button class="linkbtn warn" data-action="order-detail" data-id="'+o.id+'">● 비고 있음</button>':'—')+'</td><td><span class="state '+st[1]+'">'+st[0]+'</span></td><td><button class="linkbtn" data-action="order-detail" data-id="'+o.id+'">상세 보기</button></td></tr>'}).join('')+'</tbody></table></div><div class="order-cards">'+ls.map(o=>'<div class="order-card" data-action="order-detail" data-id="'+o.id+'"><div class="toolbar"><div><b style="color:var(--wine)">'+o.id+'</b><p style="margin-top:4px"><b>'+esc(o.name)+'</b></p></div><span class="state '+o.status+'">'+statuses[o.status][0]+'</span></div><div class="toolbar" style="margin-top:11px"><strong>'+money(total(o))+'</strong><span class="muted small">'+esc(o.date)+(o.memo?' · 📝 비고':'')+' ›</span></div></div>').join('')+'</div><div class="footbar"><span class="muted small">표시 '+ls.length+'건 · 주문 내역은 수정하지 않습니다.</span></div></section>';$('#order-sort').value=store.orderSort}
function orderModal(id){let o=store.orders.find(o=>o.id===id);if(!o)return;modal(o.id+' · '+o.name,'주문 상세 및 입금 처리 이력','<div class="modal-row"><span>연락처</span><b>'+esc(o.phone)+'</b></div><div class="modal-row"><span>이메일</span>'+esc(o.email)+'</div><h3 style="margin:17px 0 6px">상품 내역</h3>'+o.items.map(i=>'<div class="modal-row"><span>'+esc(i[0])+' ×'+i[1]+'</span><b>'+money(i[1]*i[2])+'</b></div>').join('')+'<div class="summary-bar"><b>총 주문액</b><strong>'+money(total(o))+'</strong></div><h3>판매자에게 전달할 사항</h3>'+(o.memo?banner(esc(o.memo),'warning'):banner('입력된 비고가 없습니다.'))+'<h3>입금 처리</h3><p class="muted small" style="margin:8px 0">'+statuses[o.status][0]+(o.verifiedAt?' · '+esc(o.verifiedAt):'')+'</p>'+banner('송금 신고와 은행의 실제 입금 확인은 서로 다른 단계입니다.'),'<button class="btn neutral" data-action="close">닫기</button>'+(!current()&&(o.status==='unpaid'||o.status==='reported')?'<button class="btn primary" data-action="confirm" data-id="'+o.id+'">실제 은행 입금 확인</button><button class="btn neutral" data-action="cancel-order" data-id="'+o.id+'">예시 주문 취소</button>':''));}
let pendingPO={};
function accepted(){return store.orders.filter(o=>store.settleScope==='confirmed'?o.status==='confirmed':o.status!=='canceled')}
function demands(){
 const records=new Map();
 for(const order of accepted())for(const item of order.items){
  const before=orderProduct(item);if(!before)continue;
  const p=before;
  const row=records.get(p.id)||{...p,ordered:0,revenue:0};
  row.ordered+=item[1];row.revenue=finance(row.revenue+item[1]*item[2]);records.set(p.id,row);
 }
 return [...records.values()].map(p=>({...p,minimum:p.pack>0?Math.ceil(p.ordered/p.pack):0}));
}
function vendors(){return [...new Set([...demands().map(p=>p.vendor),...Object.keys(store.poDrafts)])]}
function makePO(v){const key=v;if(!store.poDrafts[key])store.poDrafts[key]=demands().filter(p=>p.vendor===v).map(p=>({id:p.id,name:p.ko,ordered:p.ordered,per:p.pack,qty:p.minimum,unit:'박스',price:p.buy,amount:Math.round(p.minimum*p.buy*100)/100,manual:false}));return store.poDrafts[key]}
function poTotal(v){return makePO(v).reduce((s,p)=>s+(Number(p.amount)||0),0)}
function vendorSales(v){return demands().filter(p=>p.vendor===v).reduce((s,p)=>s+p.revenue,0)}
function renderSettlement(){let ds=demands(),vs=vendors(),sumBuy=vs.reduce((s,v)=>s+poTotal(v),0),sumSales=ds.reduce((s,p)=>s+p.revenue,0);if(!vs.includes(store.vendor))store.vendor=vs[0]||'';if(!vs.length){app.innerHTML=eventHead()+tabs()+'<section class="tabbody"><h2>정산관리</h2>'+banner('집계할 주문이 없습니다.')+'<button class="btn neutral" data-action="scope" data-value="all">전체 유효 주문</button></section>';return;}app.innerHTML=eventHead()+tabs()+'<section class="tabbody"><div class="toolbar"><div><h2>정산관리</h2><p class="muted small">업체별 정산 · 발주서 품목/수량/매입가 직접 수정</p></div><span class="muted small">고객 주문 원본과 발주서는 별개</span></div><div class="notice"><div class="toolbar"><b>집계 기준</b><div class="actions"><button class="filter '+(store.settleScope==='confirmed'?'active':'')+'" data-action="scope" data-value="confirmed">입금 확인 주문</button><button class="filter '+(store.settleScope==='all'?'active':'')+'" data-action="scope" data-value="all">전체 유효 주문</button></div></div><p class="muted tiny" style="margin-top:8px">'+(store.settleScope==='confirmed'?'운영진이 은행 입금을 확인한 주문을 기준으로 합니다.':'취소 주문을 제외하고 미입금 주문까지 포함한 예상 수요입니다.')+'</p></div>'+metrics([['집계 주문',accepted().length+'건'],['고객 판매액',money(sumSales)],['업체 발주액',money(sumBuy)],['예상 판매차액',money(sumSales-sumBuy)]])+'<h3 style="margin:21px 0 11px">업체별 발주 현황</h3><div class="supplier-grid">'+vs.map(v=>{let rr=demands().filter(p=>p.vendor===v);return '<div class="vendor-box '+(store.vendor===v?'active':'')+'"><div class="toolbar"><h3>'+esc(v)+'</h3><button class="linkbtn" data-action="vendor" data-value="'+esc(v)+'">'+(store.vendor===v?'선택됨':'상세·발주')+'</button></div><div class="vendor-stats"><div><span>상품 주문수량</span><b>'+rr.reduce((s,p)=>s+p.ordered,0)+'개</b></div><div><span>발주 수량</span><b>'+esc(quantityByUnit(makePO(v)))+'</b></div><div><span>매입액 TTC</span><b>'+money(poTotal(v))+'</b></div><div><span>판매액</span><b>'+money(vendorSales(v))+'</b></div><div><span>예상 차액</span><b>'+money(vendorSales(v)-poTotal(v))+'</b></div></div></div>'}).join('')+'</div><div class="panel pad" style="margin-top:20px"><div class="toolbar"><div><h3>'+esc(store.vendor)+' · 구매발주서 편집</h3><p class="muted small">'+(poMeta(store.vendor).confirmed?'확정 · 읽기 전용':poMeta(store.vendor).savedAt?'저장된 초안':'작성 중')+' · 집계와 발주서 차이 '+money(poTotal(store.vendor)-finance(demands().filter(p=>p.vendor===store.vendor).reduce((sum,p)=>sum+p.minimum*p.buy,0)))+'</p><p class="muted small">전화주문·추가 구매를 위해 품목, 수량, 단가, 소계를 직접 변경할 수 있습니다.</p></div><button class="btn primary" data-action="po-add">＋ 발주 품목 추가</button></div><div class="sheet" style="max-height:460px"><table style="min-width:900px"><colgroup><col style="width:210px"><col style="width:115px"><col style="width:110px"><col style="width:125px"><col style="width:125px"><col style="width:85px"></colgroup><thead><tr><th>품목 / 구분</th><th>발주수량</th><th>단위</th><th>매입단가 TTC</th><th>품목 소계 TTC</th><th>관리</th></tr></thead><tbody>'+makePO(store.vendor).map(p=>'<tr><td><input class="cell" value="'+esc(p.name)+'" data-po="'+esc(p.id)+'" data-key="name"><div class="muted tiny">'+(p.manual?'수동 추가':'주문 수량 '+p.ordered+'개 · '+p.per+'개/박스')+poWarning(p)+'</div></td><td><input type="number" min="0" step="1" class="cell" value="'+p.qty+'" data-po="'+p.id+'" data-key="qty"></td><td><select class="select" style="width:100%;padding:7px" data-po="'+p.id+'" data-key="unit">'+['박스','개','봉','세트'].map(u=>'<option '+(p.unit===u?'selected':'')+'>'+u+'</option>').join('')+'</select></td><td><input type="number" min="0" step="0.01" class="cell" value="'+p.price+'" data-po="'+p.id+'" data-key="price"></td><td><input type="number" min="0" step="0.01" class="cell" value="'+p.amount+'" data-po="'+p.id+'" data-key="amount"></td><td><button class="linkbtn" data-action="po-del" data-id="'+p.id+'">삭제</button></td></tr>').join('')+'</tbody></table></div><div class="summary-bar"><span><b>'+esc(store.vendor)+'</b> 총 발주금액 TTC</span><strong>'+money(poTotal(store.vendor))+'</strong></div><div class="actions" style="justify-content:flex-end"><button class="btn neutral" data-action="po-reset">자동 산출로 초기화</button><button class="btn neutral" data-action="po-settings">발주 정보 편집</button><button class="btn neutral" data-action="po-save">발주서 초안 저장</button><button class="btn neutral" data-action="po-confirm">발주서 확정</button><button class="btn neutral" data-action="one-pdf">PDF</button><button class="btn neutral" data-action="one-excel">Excel</button><button class="btn primary" data-action="po-preview">구매발주서 미리보기</button></div></div>'+banner('고객 판매 실적과 발주서는 별도로 보존합니다. 구매발주서의 수동 변경이 고객 주문액이나 상품 원본을 수정하지 않습니다.')+'<div class="panel pad"><div class="toolbar"><div><h3>전체 업체 구매발주서</h3><p class="muted small">공급업체용 자료에는 고객정보와 판매금액이 포함되지 않습니다.</p></div><button class="btn neutral" data-action="all-po">전체 업체 검토</button><button class="btn neutral" data-action="all-pdf">전체 PDF</button><button class="btn neutral" data-action="all-excel">전체 Excel</button></div></div></section>'}
function poChange(el){const p=makePO(store.vendor).find(p=>p.id===el.dataset.po);if(!p)return;const k=el.dataset.key;let value=el.value;if(['qty','price','amount'].includes(k))value=Math.max(0,Number(value)||0);p[k]=value;if(k==='qty'||k==='price')p.amount=Math.round(p.qty*p.price*100)/100;if(k==='amount'&&p.qty>0)p.price=Math.round(p.amount/p.qty*10000)/10000;rerender();}
function previewPO(v){let ps=makePO(v),meta=poMeta(v);modal('구매발주서 / Bon de commande',esc(v)+' · 디자인 검토용 문서','<div class="po-preview"><div class="toolbar"><div><div class="brand" style="font-size:17px;color:var(--wine)">ASICC</div><p class="tiny muted">Association de la Section Internationale Coréenne à Courbevoie</p><p class="tiny">contact@asicc-parents.fr</p></div><div class="small" style="text-align:right">발주처: ASICC<br>공급업체: <b>'+esc(v)+'</b><br>발주번호: '+esc(meta.number)+'<br>발주일: '+esc(meta.date||'')+'</div></div><h2 style="margin-top:26px">BON DE COMMANDE<br><small style="font-size:12px;letter-spacing:0;font-weight:500">구매발주서</small></h2><p>'+metadata.slice(2).filter(([key])=>meta[key]).map(([key,label])=>esc(label)+': '+esc(meta[key])).join('<br>')+'</p><table><thead><tr><th>품목</th><th>수량</th><th>단위</th><th>매입 단가 TTC</th><th>합계 TTC</th></tr></thead><tbody>'+ps.map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+p.qty+'</td><td>'+esc(p.unit)+'</td><td>'+money(p.price)+'</td><td><b>'+money(p.amount)+'</b></td></tr>').join('')+'</tbody></table><div class="summary-bar"><b>총 매입액 TTC</b><strong>'+money(poTotal(v))+'</strong></div><div class="notice">납품 주소·예정일·담당자·SIRET는 확인된 공식 정보로 실제 생성할 때 입력합니다.<br>공급업체용 문서에 고객 판매가격·협회 수익률·고객 개인정보를 포함하지 않습니다.</div></div>','<button class="btn neutral" data-action="close">수정 화면으로</button><button class="btn" disabled>PDF 다운로드 (구현 예정)</button><button class="btn" disabled>Excel 다운로드 (구현 예정)</button>')}
function addPOModal(){modal('발주 품목 추가',store.vendor+' · 수동 추가','<div class="form-grid"><label class="field wide">품목명<input id="po-new-name" placeholder="예: 추가 구매 김치"></label><label class="field">발주수량<input id="po-new-qty" type="number" min="1" value="1"></label><label class="field">단위<select id="po-new-unit"><option>박스</option><option>개</option><option>봉</option><option>세트</option></select></label><label class="field">매입 단가 TTC (€)<input id="po-new-price" type="number" min="0" step="0.01" value="0"></label></div>','<button class="btn neutral" data-action="close">취소</button><button class="btn primary" data-action="po-add-save">발주서에 추가</button>')}
function rerender(){
 if(page==='main'||(!selectedEvent()&&!(page==='products'&&productView==='catalog'))){renderMain();return;}
 if(page==='products')renderProducts();
 if(page==='orders')renderOrders();
 if(page==='settlement')renderSettlement();
 if(page==='products'&&productView==='catalog')app.querySelectorAll('[data-key=boxes],[data-key=manualLimit],[data-key=limitMode]').forEach(el=>el.disabled=true);
 if(current()||page==='settlement'&&poMeta(store.vendor).confirmed){
  app.querySelectorAll(current()?'[data-prod],[data-toggle],[data-po]':'[data-po]').forEach(el=>el.disabled=true);
 }
}
app.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
if(handleScreenAction(a,b))return;
if(a==='mode-empty'){store.mode='empty';rerender();}if(a==='mode-active'){store.mode='active';rerender();}if(a==='show-past')pastModal();if(a==='new')$('#global-new').click();
if(a==='switch-catalog'){productView='catalog';productFilter='';rerender();}if(a==='switch-event'){productView='event';productFilter='';rerender();}if(a==='edit-product')editProduct(b.dataset.id);if(a==='import')importModal();if(a==='delete-product'){const ar=productView==='catalog'?store.catalog:store.products;const p=ar.find(x=>x.id===b.dataset.id);if(p&&confirm(p.ko+' 상품을 '+(productView==='catalog'?'기본 상품 목록':'이번 바자회')+'에서 삭제할까요?')){ar.splice(ar.indexOf(p),1);rerender();}}
if(a==='add-product'){const ar=productView==='catalog'?store.catalog:store.products;const p=clone(ASICC_SAMPLE.catalog[0]);p.id='new'+(++store.manualCounter);p.ko='새 상품';p.fr='Nouveau produit';p.vendor='';p.buy=0;p.sale=0;p.koDesc='';p.frDesc='';p.emoji='📦';ar.push(productView==='catalog'?Object.fromEntries(Object.entries(p).filter(([key])=>!['boxes','manualLimit','limitMode'].includes(key))):defaults(p));rerender();editProduct(p.id);}
if(a==='save-product'){$('#product-status').textContent='✓ 미리보기 화면 내에서만 반영됨 · 실제 저장 없음';}
if(a==='order-filter'){store.orderFilter=b.dataset.value;rerender();}if(a==='order-detail')orderModal(b.dataset.id);
if(a==='confirm')confirmOrder(b.dataset.id);
if(a==='scope'){store.settleScope=b.dataset.value;rerender();}if(a==='vendor'){store.vendor=b.dataset.value;rerender();}if(a==='po-add')addPOModal();if(a==='po-del'){const ar=makePO(store.vendor);if(confirm('발주서에서 해당 품목을 삭제할까요? 고객 주문 원본은 유지됩니다.')){const x=ar.findIndex(p=>p.id===b.dataset.id);if(x>=0)ar.splice(x,1);rerender();}}
if(a==='po-reset'){if(confirm('이 업체 발주서의 수동 변경을 초기화할까요?')){delete store.poDrafts[store.vendor];rerender();}}
if(a==='po-preview')previewPO(store.vendor);if(a==='all-po')modal('전체 업체 구매발주서 검토','업체별 구매발주서 분리 작성',vendors().map(v=>'<div class="modal-row"><b>'+esc(v)+'</b><span>'+money(poTotal(v))+'</span><button class="linkbtn" data-action="show-po" data-value="'+esc(v)+'">미리보기</button></div>').join(''),'<button class="btn neutral" data-action="close">닫기</button>');
});
$('#modal').addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b)return;const a=b.dataset.action;
if(handleModalAction(a,b))return;
if(a==='close')closeModal();
if(a==='past-prev'||a==='past-next'){store.history=(store.history+(a==='past-next'?1:-1)+2)%2;$('#past-selector').value=store.history;}
if(a==='create-draft'){store.mode='draft';store.products=clone(store.catalog);closeModal();if(page==='main')rerender();else window.location.href='index.html';}
if(a==='save-product-detail'){let p=(productView==='catalog'?store.catalog:store.products).find(x=>x.id===b.dataset.id);if(p){const file=$('#edit-photo').files[0];if(file){if(file.size>300000||!['image/jpeg','image/png','image/webp'].includes(file.type)){alert('미리보기에서는 300KB 이하 JPEG·PNG·WebP 사진을 선택해 주세요.');return}const reader=new FileReader();reader.onload=()=>{p.photo=String(reader.result);persist();rerender();};reader.readAsDataURL(file);}p.ko=$('#edit-ko').value;p.fr=$('#edit-fr').value;p.koDesc=$('#edit-kod').value;p.frDesc=$('#edit-frd').value;closeModal();rerender();}}
if(a==='import-apply'){let ids=[...document.querySelectorAll('[data-import]:checked')].map(x=>x.dataset.import);ids.forEach(id=>{let x=store.catalog.find(p=>p.id===id);if(x)store.products.push(defaults(x))});closeModal();rerender();}
if(a==='po-add-save'){const name=$('#po-new-name').value.trim(),qty=Number($('#po-new-qty').value),price=Number($('#po-new-price').value);if(!name||!(qty>0)||!(price>=0)){alert('품목명·수량·단가를 확인해 주세요.');return}makePO(store.vendor).push({id:'manual'+(++store.manualCounter),name,ordered:0,per:0,qty,unit:$('#po-new-unit').value,price,amount:Math.round(qty*price*100)/100,manual:true});closeModal();rerender();}
if(a==='show-po'){store.vendor=b.dataset.value;previewPO(store.vendor);}
});
app.addEventListener('change',e=>{const el=e.target;if(current()&&productView!=='catalog'||page==='settlement'&&poMeta(store.vendor).confirmed)return;if(el.dataset.prod){productChange(el);return}if(el.dataset.toggle){let p=store.products.find(p=>p.id===el.dataset.toggle);if(p)p.active=el.checked;return}if(el.dataset.po){poChange(el);return}if(el.id==='order-sort'){store.orderSort=el.value;rerender();return}});
app.addEventListener('input',e=>{const el=e.target;if(el.id==='product-search'){productFilter=el.value;const pos=el.selectionStart;rerender();const n=$('#product-search');n.focus();n.setSelectionRange(pos,pos)}if(el.id==='order-search'){store.search=el.value;const pos=el.selectionStart;rerender();const n=$('#order-search');n.focus();n.setSelectionRange(pos,pos)}});
function quantityByUnit(lines){
 const totals=new Map();
 for(const line of lines)totals.set(line.unit,(totals.get(line.unit)||0)+line.qty);
 return [...totals].map(([unit,qty])=>qty+' '+unit).join(' · ')||'0';
}
function poMeta(v){
 const event=selectedEvent();
 if(!event||!v)return {};
 return event.poMeta[v]??={number:'DEMO-'+event.round+'-'+(Object.keys(event.poMeta).length+1),
  date:new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Paris'}), contact:'',email:'',deliveryDate:'',location:'',notes:'',owner:''};
}
function poWarning(line){
 if(line.manual)return '';
 const capacity=line.unit==='박스'?line.qty*line.per:line.unit==='개'?line.qty:null;
 const need=demands().find(p=>p.id===line.id)?.ordered??0;
 return capacity!==null&&capacity<need?' · 발주 수량 부족 ('+(need-capacity)+'개)':'';
}
const metadata=[
 ['number','발주번호'],['date','발주일','date'],['contact','업체 담당자'],['email','업체 연락처'],
 ['deliveryDate','납품일','date'],['location','납품 장소'],['notes','전달사항'],['owner','발주 담당자']
];
function poSettings(){
 const meta=poMeta(store.vendor);
 modal('발주 정보 편집',store.vendor,'<div class="form-grid">'+metadata.map(([key,title,type])=>'<label class="field">'+title+'<input id="meta-'+key+'" type="'+(type||'text')+'" value="'+esc(meta[key])+'"></label>').join('')+'</div>',
 '<button class="btn neutral" data-action="close">취소</button><button class="btn primary" data-action="save-meta">적용</button>');
}
function purchaseRows(vendor){
 const meta=poMeta(vendor);
 return [
 ['ASICC','Association de la Section Internationale Coréenne à Courbevoie'],
 ['연락 이메일','contact@asicc-parents.fr'],['Bon de commande / 구매발주서',selectedEvent().name],['공급업체',vendor],
 ...metadata.map(([key,caption])=>[caption,meta[key]??'']),
 [],
 ['품목','발주수량','단위','매입 단가 TTC (€)','소계 TTC (€)'],
 ...makePO(vendor).map(p=>[p.name,p.qty,p.unit,p.price,p.amount]),
 ['총 매입 TTC (€)','','','',finance(poTotal(vendor))]
 ];
}
function exportExcel(list){
 if(!list.length)return;
 const workbook=XLSX.utils.book_new();
 list.forEach((vendor,i)=>{
  const sheet=XLSX.utils.aoa_to_sheet(purchaseRows(vendor));
  sheet['!cols']=[{wch:35},{wch:48},{wch:15},{wch:22},{wch:22}];
  XLSX.utils.book_append_sheet(workbook,sheet,'업체 '+(i+1));
 });
 XLSX.writeFile(workbook,'ASICC-'+(list.length>1?'전체':'업체')+'-구매발주서.xlsx');
}
function exportPdf(list){
 if(!list.length)return;
 const pdf=new jspdf.jsPDF();let first=true;
 for(const vendor of list){
  const canvas=document.createElement('canvas');canvas.width=1120;canvas.height=1580;
  const ctx=canvas.getContext('2d');let y=0;
  function start(){
   ctx.fillStyle='#fff';ctx.fillRect(0,0,1120,1580);
   ctx.fillStyle='#81364d';ctx.font='bold 36px system-ui';ctx.fillText('ASICC  ·  BON DE COMMANDE',55,80);
   ctx.fillStyle='#262127';ctx.font='24px system-ui';y=130;
  }
  function finish(){if(!first)pdf.addPage();first=false;pdf.addImage(canvas.toDataURL('image/png'),'PNG',5,5,200,282);}
  function wrap(text,width){
   return String(text??'').split('\n').flatMap(part=>{
    const lines=[];let current='';
    for(const char of part){if(current&&ctx.measureText(current+char).width>width){lines.push(current);current='';}current+=char;}
    return [...lines,current];
   });
  }
  start();
  for(const row of purchaseRows(vendor)){
   const xs=row.length===5?[55,465,600,740,920]:[55,350];
   const widths=row.length===5?[395,124,129,166,148]:[275,680];
   const columns=row.map((value,i)=>wrap(value,widths[i]));
   const count=Math.max(1,...columns.map(lines=>lines.length));
   for(let i=0;i<count;i++){
    if(y>1505){finish();start();}
    columns.forEach((lines,j)=>ctx.fillText(lines[i]||'',xs[j],y));y+=37;
   }
  }
  finish();
 }
 pdf.save('ASICC-'+(list.length>1?'전체':'업체')+'-구매발주서.pdf');
}
function exportAction(action){
 const all=action.startsWith('all-');
 const list=all?vendors():[store.vendor].filter(Boolean);
 if(action.endsWith('pdf'))exportPdf(list);else exportExcel(list);
}
function handleScreenAction(action,button){
 if(['all-pdf','all-excel','one-pdf','one-excel'].includes(action)){exportAction(action);return true;}
 const e=selectedEvent();
 if(action==='resume-draft'){store.mode='draft';rerender();return true;}
 if(action==='edit-draft'){draftModal(true);return true;}
 if(action==='delete-draft'){
  if(model.draft&&confirm('예시 임시저장을 삭제할까요?')){model.draft=null;store.mode='active';rerender();}
  return true;
 }
 if(action==='publish-draft'){
  const draft=model.draft;
  if(!draft)return true;
  if(model.active){alert('진행 중인 예시 바자회를 먼저 종료하세요.');return true;}
  if(!draft.orderDeadline||!draft.transferDeadline||draft.orderDeadline>=draft.transferDeadline||!draft.pickupKo||!draft.pickupFr||!draft.products.some(p=>p.active&&lim(p)>0)){alert('주문·송금 마감 순서, 두 언어 픽업 안내, 판매 포함 상품과 판매한도를 확인하세요.');return true;}
  if(confirm('예시 바자회를 발행할까요?')){draft.status='active';draft.orderProducts=clone(draft.products);model.active=draft;model.draft=null;store.mode='active';rerender();}
  return true;
 }
 if(action==='end-event'){
  if(e===model.active&&confirm('예시 행사를 종료하고 기록을 보관할까요?')){e.status='past';model.past.unshift(clone(e));model.active=null;store.mode='empty';rerender();}
  return true;
 }
 if(action==='switch-catalog')return false;
 if(current()&&!(page==='products'&&productView==='catalog')&&['confirm','add-product','delete-product','save-product','import','po-add','po-del','po-reset','po-settings','po-save','po-confirm'].includes(action))return true;
 if(['po-add','po-del','po-reset','po-settings','po-save','po-confirm'].includes(action)&&poMeta(store.vendor).confirmed)return true;
 if(action==='po-settings'){poSettings();return true;}
 if(action==='po-save'){
  poMeta(store.vendor).savedAt=new Date().toISOString();persist();alert('이 탭에서 다시 열 수 있도록 예시 발주서 초안을 저장했습니다.');return true;
 }
 if(action==='po-confirm'){
  if(confirm('이 예시 발주서를 확정할까요? 확정 후 자동 집계로 덮어쓸 수 없습니다.')){
   poMeta(store.vendor).confirmed=true;rerender();
  }
  return true;
 }
 return false;
}
function confirmOrder(id){
 if(current())return;
 const o=store.orders.find(x=>x.id===id);if(o&&o.status!=='confirmed'&&o.status!=='canceled'&&confirm(o.id+' · '+o.name+'님의 실제 은행 입금 '+money(total(o))+'을 확인하셨습니까?\n현재는 예시 데이터만 변경합니다.')){o.status='confirmed';o.verifiedAt=new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});closeModal();rerender();}
}
function handleModalAction(action,button){
 if(action==='confirm'){confirmOrder(button.dataset.id);return true;}
 if(action==='open-past'){store.history=Number($('#past-selector').value);store.mode='past';closeModal();rerender();return true;}
 if(action==='past-prev'||action==='past-next'){
  const selector=$('#past-selector'),length=model.past.length;
  selector.value=(Number(selector.value)+(action==='past-next'?1:-1)+length)%length;return true;
 }
 if(action==='create-draft'){
  const name=$('#event-name').value.trim();
  if(!name){alert('행사명을 입력해 주세요.');return true;}
  const e=model.draft??createEvent(name,Math.max(model.active?.round??0,...model.past.map(p=>p.round))+1,'draft',store.catalog.map(defaults));
  Object.assign(e,{name,orderDeadline:$('#event-order').value,transferDeadline:$('#event-transfer').value,pickupKo:$('#event-pickup-ko').value,pickupFr:$('#event-pickup-fr').value});
  model.draft=e;store.mode='draft';closeModal();
  if(page==='main')rerender();else{persist();location.href='index.html';}
  return true;
 }
 if(action==='save-meta'){
  if(!current()&&!poMeta(store.vendor).confirmed)for(const [key] of metadata)poMeta(store.vendor)[key]=$('#meta-'+key).value;
  closeModal();rerender();return true;
 }
 if(action==='cancel-order'){
  const order=store.orders.find(o=>o.id===button.dataset.id);
  if(!current()&&order&&order.status!=='confirmed'&&confirm('이 예시 주문을 취소할까요?')){order.status='canceled';closeModal();rerender();}
  return true;
 }
 if(['all-pdf','all-excel','one-pdf','one-excel'].includes(action)){exportAction(action);return true;}
 if(current()&&!(page==='products'&&productView==='catalog')&&['save-product-detail','import-apply','po-add-save'].includes(action))return true;
 return false;
}

rerender();
})();
