
const by=id=>document.getElementById(id);
const eur=c=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(c/100);
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names=[['사과','Pommes'],['쌀','Riz'],['국수','Nouilles'],['김치','Kimchi'],['배','Poires'],['감자','Pommes de terre']];
let nextId=0;
const newItem=(i=0)=>({id:"demo-"+(++nextId),included:true,ko:i?names[(i-1)%6][0]+' '+i:'',fr:i?names[(i-1)%6][1]+' '+i:'',dk:i?'예시 원산지와 구성입니다.':'',df:i?'Origine et composition.':'',vendor:i%2?'한빛 식품':'두레 유통',cost:14+i,price:4+i/4,pack:12,storage:'상온',photo:i?'sample.jpg':''});
let catalog=Array.from({length:24},(_,i)=>newItem(i+1));
let event=null, mode='event', selected=0, currentDetail;
const sampleOrders=[
 {id:'EX-001',name:'예시 주문자 A',paid:false,note:'17시에 찾으러 가겠습니다.\n수령자는 가족입니다.',lines:[[0,17],[1,2]]},
 {id:'EX-002',name:'예시 주문자 B',paid:true,lines:[[0,3],[2,13]]},
 {id:'EX-003',name:'예시 주문자 C',paid:false,lines:[[1,5],[3,6]]}
];

const fields=[
 ['photo','사진','photo'],['ko','상품명 · 한국어'],['fr','상품명 · 프랑스어'],
 ['pack','박스당 수량','number'],['cost','박스 매입가 TTC €','number'],['price','판매가 €','number'],
 ['margin','수익률 %','number'],['storage','보관 방법'],
 ['dk','설명 · 한국어','detail'],['df','설명 · 프랑스어','detail'],['vendor','공급업체']
];
const round2=value=>Math.round((value+Number.EPSILON)*100)/100;
const unitCost=item=>item.pack>0&&item.cost!==''?item.cost/item.pack:NaN;
const marginFor=item=>item.price>0&&Number.isFinite(unitCost(item))?round2((1-unitCost(item)/item.price)*100):'';
function syncPricing(item, key, el){
 const value=el.valueAsNumber;
 if(key==='margin'){
  if(!Number.isFinite(value)||value>=100||!(unitCost(item)>0))return;
  item.price=round2(unitCost(item)/(1-value/100));
 }else item[key]=Number.isFinite(value)?value:'';
 const other=key==='margin'?'price':'margin';
 document.querySelectorAll('[data-price-item][data-price-field]').forEach(input=>{
  if(input.dataset.priceItem===item.id&&input.dataset.priceField===other)input.value=other==='price'?item.price:marginFor(item);
 });
}
function updateIncludedCount(){
 if(mode!=='event')return;
 by('includedCount').textContent=`판매 포함 ${event.items.filter(item=>item.included).length} / ${event.items.length}`;
}
const list=()=>event.items;

function action(text,fn,primary=false){const button=document.createElement('button');button.textContent=text;if(primary)button.className='primary';button.onclick=fn;by('actions').append(button);}
function details(item,key,label,type){
 currentDetail={item,key,type};const box=by('detail');box.returnValue='';by('detailTitle').textContent=(item.ko||'새 상품')+' · '+label;
 const area=box.querySelector('textarea');area.hidden=type==='photo';area.value=type==='detail'?item[key]:'';
 by('photoEdit').hidden=type!=='photo';const img=by('photoEdit').querySelector('img');img.src=item.photo||'sample.jpg';
 by('photoEdit').querySelector('input').value='';area.readOnly=event.status==='closed';by('photoEdit').querySelector('input').disabled=area.readOnly;box.querySelector('[value=confirm]').hidden=area.readOnly;box.showModal();
}
by('detail').addEventListener('close',async()=>{
 if(by('detail').returnValue!=='confirm'||(mode==='event'&&event.status==='closed'))return;
 const {item,key,type}=currentDetail;
 if(type==='detail')item[key]=by('detail').querySelector('textarea').value;
 else{const file=by('photoEdit').querySelector('input').files[0];if(file)item.photo=URL.createObjectURL(file);}
 drawProducts();
});
function field(item,[key,label,type]){
 const el=document.createElement(type==='detail'||type==='photo'?'button':'input');el.setAttribute('aria-label',label);
 if(type==='detail'||type==='photo'){
  el.className=type==='detail'?'description':'photo';el.textContent=type==='detail'?(item[key]||'설명 입력'):'사진 편집';
  if(type==='photo'&&item.photo){const img=new Image();img.src=item.photo;img.alt='';el.prepend(img);}
  el.onclick=()=>details(item,key,label,type);
 }else{
  el.type=type||'text';
  if(type==='number'){
   if(key!=='margin')el.min=key==='pack'?'1':'0';
   if(key==='margin')el.max='99.99';
   el.step=key==='pack'?'1':'0.01';
   el.value=key==='margin'?marginFor(item):item[key];
   el.dataset.priceItem=item.id;el.dataset.priceField=key;
   el.oninput=()=>syncPricing(item,key,el);
   if(key==='margin')el.onchange=()=>{
    if(el.value!==''&&(!(unitCost(item)>0)||el.valueAsNumber>=100)){
     by('status').textContent='박스 매입가와 박스당 수량을 먼저 입력하세요. 수익률은 100% 미만이어야 합니다.';
    }
    el.value=marginFor(item);
   };
  }else{el.value=item[key];el.oninput=()=>item[key]=el.value;}
 }
 el.disabled=event.status==='closed'&&el.tagName==='INPUT';
 return el;
}
function include(item){
 const el=document.createElement('input');el.type='checkbox';el.checked=item.included;el.setAttribute('aria-label',(item.ko||'새 상품')+' 판매 포함');el.dataset.includeItem=item.id;el.disabled=event.status==='closed';
 el.onchange=()=>{item.included=el.checked;document.querySelectorAll('[data-include-item]').forEach(input=>{if(input.dataset.includeItem===item.id)input.checked=item.included;});updateIncludedCount();};return el;
}
function drawProducts(){
 const items=list(), columns=mode==='event'?[fields[0],['included','판매 포함'],...fields.slice(1)]:fields;
 by('head').innerHTML='<tr>'+columns.map(([,label])=>'<th scope="col">'+label+'</th>').join('')+'</tr>';
 by('body').replaceChildren();
 for(const item of items){const row=by('body').insertRow();for(const col of columns)row.insertCell().append(col[0]==='included'?include(item):field(item,col));}
 updateIncludedCount();
 const mobile=by('mobile');mobile.replaceChildren();
 if(!items.length)return;
 selected=Math.min(selected,items.length-1);
 const picker=document.createElement('select');picker.setAttribute('aria-label','편집할 상품');
 items.forEach((item,i)=>picker.add(new Option(item.ko||'새 상품',i,i===selected,i===selected)));
 picker.onchange=()=>{selected=Number(picker.value);drawProducts();};mobile.append(picker);
 const item=items[selected];
 for(const col of columns){const label=document.createElement('label');label.textContent=col[1];label.append(col[0]==='included'?include(item):field(item,col));mobile.append(label);}
}
function table(headers,rows,footer=[]){
 const cells=row=>row.map((x,i)=>'<td data-label="'+escapeHtml(headers[i])+'">'+x+'</td>').join('');
 return '<table><thead><tr>'+headers.map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+cells(row)+'</tr>').join('')+'</tbody>'+(footer.length?'<tfoot><tr>'+footer.map((x,i)=>'<th data-label="'+escapeHtml(headers[i])+'">'+x+'</th>').join('')+'</tr></tfoot>':'')+'</table>';
}

const clone=structuredClone;
function makeEvent(name,round,status,orders=[]){
 return {id:'event-'+round,round,name,status,items:clone(catalog),orders:clone(orders),adjustments:{},purchase:{},orderProducts:clone(catalog)};
}
const past=[
 makeEvent('봄 나눔 바자회',1,'closed',sampleOrders.slice(1)),
 makeEvent('가을 바자회',2,'closed',sampleOrders)
];
let active=makeEvent('겨울 온라인 바자회',3,'published',sampleOrders);
active.orders[0].reported=true;
let draft=makeEvent('새해 준비 바자회',4,'draft');
let tab='products', pastIndex=-1;
function orderTotal(order){
 return order.lines.reduce((sum,[index,qty])=>sum+qty*Math.round(event.orderProducts[index].price*100),0);
}
function statusOf(order){
 return order.canceled?'canceled':order.paid?'paid':order.reported?'reported':'pending';
}
const labels={paid:'입금 확인',reported:'송금 신고 · 확인 대기',pending:'미입금 · 미신고',canceled:'취소'};
const paidOrders=()=>event.orders.filter(o=>o.paid&&!o.canceled);
const validOrders=()=>event.orders.filter(o=>!o.canceled);
const moneyTotal=orders=>orders.reduce((sum,o)=>sum+orderTotal(o),0);
function changeTab(next){
 tab=next;
 const available=Boolean(event);
 for(const [key,id] of Object.entries({products:'editor',orders:'orders',settlement:'settlement'}))by(id).hidden=!available||tab!==key;
 document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===tab));
 if(!event)return;
 if(tab==='products')renderProducts();
 if(tab==='orders')drawOrders();
 if(tab==='settlement')drawSettlement();
}
function render(){
 by('title').textContent=event?event.name:'진행 중인 바자회가 없습니다.';
 by('eventStatus').textContent=event?({published:'진행 중',draft:'준비 중 · 임시저장',closed:'완료 · 기록 열람'}[event.status]):'진행 중인 행사 없음';
 by('tabs').hidden=!event;
 by('drafts').hidden=!draft||event===draft;
 by('pastPicker').hidden=pastIndex<0;
 by('pastSelect').replaceChildren(...past.map((item,i)=>new Option(`${item.round}회 · ${item.name}`,i,i===pastIndex,i===pastIndex)));
 by('prev').disabled=pastIndex<1;
 by('next').disabled=pastIndex>=past.length-1;
 const summary=by('summary');
 summary.replaceChildren();
 if(event){
  const metrics=[['주문 건수',validOrders().length+'건'],['총 주문액',eur(moneyTotal(validOrders()))],['입금 확인액',eur(moneyTotal(paidOrders()))],['입금 확인 대기',validOrders().filter(o=>!o.paid).length+'건']];
  for(const [name,value] of metrics){const card=document.createElement('div');const strong=document.createElement('strong');strong.textContent=value;card.append(name,strong);summary.append(card);}
 }
 changeTab(tab);
}
function show(next,index=-1){
 event=next;pastIndex=index;selected=0;by('status').textContent='';render();
}
function renderProducts(){
 by('name').value=event.name;
 by('name').disabled=event.status!=='draft';
 by('name').oninput=()=>{event.name=by('name').value||'이름 없는 바자회';by('title').textContent=event.name;};
 by('bulk').hidden=event.status==='closed';
 by('add').hidden=event.status==='closed';
 drawProducts();
 by('actions').replaceChildren();
 if(event.status==='draft'){
  action('임시저장',()=>{draft=event;by('status').textContent='예시 초안을 저장했습니다.';},true);
  action('발행',()=>{
   if(active){by('status').textContent='진행 중인 예시 바자회를 먼저 종료하세요.';return;}
   if(confirm('예시 행사를 발행할까요?')){active=event;active.status='published';active.orderProducts=clone(event.items);draft=null;show(active);}
  });
 }else if(event.status==='published'){
  action('상품 변경 저장',()=>by('status').textContent='이번 예시 행사에만 저장했습니다.',true);
  action('행사 종료',()=>{
   if(!confirm('예시 행사를 종료하고 기록으로 보관할까요?'))return;
   event.status='closed';past.push(clone(event));active=null;show(null);
   by('status').textContent='종료한 행사는 지난 바자회 보기에서 확인할 수 있습니다.';
  });
 }
}
function setAll(included){
 if(event.status==='closed')return;
 event.items.forEach(item=>item.included=included);
 drawProducts();
}
function drawOrders(){
 const query=by('query').value.trim().toLowerCase(), filter=by('filter').value;
 const host=by('orderList');
 host.replaceChildren();
 for(const order of event.orders){
  const state=statusOf(order);
  if(filter!=='all'&&filter!==state||![order.id,order.name,order.note].some(v=>String(v||'').toLowerCase().includes(query)))continue;
  const detail=document.createElement('details');
  detail.innerHTML=`<summary>${escapeHtml(order.id)} · ${escapeHtml(order.name)} · ${eur(orderTotal(order))} · ${labels[state]}</summary>
  <p>송금 신고: ${order.reported?'신고함':'미신고'}</p>
  <ul>${order.lines.map(([index,qty])=>`<li>${escapeHtml(event.orderProducts[index].ko)} · ${qty}개</li>`).join('')}</ul>
  ${order.note?`<p class="note"><strong>수령 비고</strong><br>${escapeHtml(order.note)}</p>`:''}`;
  if(event.status==='published'&&!order.canceled){
   const commands=document.createElement('div');commands.className='actions';
   if(!order.paid){
    const confirmPayment=document.createElement('button');confirmPayment.textContent='전체 주문액 입금 확인';
    confirmPayment.onclick=()=>{if(confirm(`${eur(orderTotal(order))}의 실제 입금을 확인했나요? (예시)`)){order.paid=true;render();}};
    commands.append(confirmPayment);
   }
   const cancel=document.createElement('button');cancel.textContent=order.paid?'주문 취소':'미입금 주문 취소';
   cancel.onclick=()=>{if(confirm('이 예시 주문을 취소할까요?')){order.canceled=true;render();}};
   commands.append(cancel);detail.append(commands);
  }
  host.append(detail);
 }
 if(!host.childElementCount)host.textContent='조건에 맞는 주문이 없습니다.';
}
function sums(){
 const records=new Map();
 for(const order of validOrders()){
  for(const [i,qty] of order.lines){
   const ordered=event.orderProducts[i], product=event.items.find(item=>item.id===ordered.id)??ordered;
   const row=records.get(i)||{i,product,qty:0,paidQty:0,sales:0,paidSales:0};
   row.qty+=qty;
   row.sales+=qty*Math.round(ordered.price*100);
   if(order.paid){row.paidQty+=qty;row.paidSales+=qty*Math.round(ordered.price*100);}
   records.set(i,row);
  }
 }
 return [...records.values()].map(row=>{
  const auto=Math.ceil(row.paidQty/(row.product.pack||1));
  const boxes=row.paidQty?(event.adjustments[row.product.id]??auto):0;
  return {...row,auto,boxes,cost:boxes*Math.round(row.product.cost*100)};
 });
}
function vendorGroups(rows){
 const groups=new Map();
 for(const row of rows){const name=row.product.vendor;groups.set(name,[...(groups.get(name)||[]),row]);}
 return groups;
}
function sumRows(rows){
 return rows.reduce((out,row)=>[out[0]+row.qty,out[1]+row.boxes,out[2]+row.cost,out[3]+row.sales,out[4]+row.paidSales-row.cost],[0,0,0,0,0]);
}
function drawSettlement(openVendor){
 const rows=sums();
 by('sales').innerHTML=table(['상품','공급업체','주문 수량','판매금액'],
  rows.map(r=>[escapeHtml(r.product.ko),escapeHtml(r.product.vendor),r.qty,eur(r.sales)]));
 const format=([qty,boxes,cost,sales,profit])=>[qty,boxes,eur(cost),eur(sales),eur(profit)];
 const groups=vendorGroups(rows);
 by('vendors').innerHTML=table(['공급업체','주문 수량','발주 박스 수','매입 TTC','판매금액','예상 매출총이익'],
  [...groups].map(([name,group])=>[escapeHtml(name)+' 소계',...format(sumRows(group))]),['전체 합계',...format(sumRows(rows))]);
 const ordersByVendor=purchaseDocuments(rows);
 const host=by('purchase');host.replaceChildren();
 by('allPdf').disabled=by('allExcel').disabled=!ordersByVendor.length;
 by('allPdf').onclick=()=>downloadPdf(purchaseDocuments(sums()),'all');
 by('allExcel').onclick=()=>downloadExcel(purchaseDocuments(sums()),'all');
 if(!ordersByVendor.length){host.textContent='입금 확인된 주문이 없어 발주서가 없습니다.';return;}
 for(const doc of ordersByVendor){
  const details=document.createElement('details');details.open=doc.name===openVendor;
  details.innerHTML=`<summary>${escapeHtml(doc.name)} · ${doc.lines.reduce((n,r)=>n+r.boxes,0)}박스 · ${eur(doc.total)}</summary>
  <div class="form-row"><label>발주일 <input type="date" data-field="date" value="${escapeHtml(doc.info.date)}"></label><label>납품 장소 <input data-field="location" value="${escapeHtml(doc.info.location)}"></label>
  <label>전달사항 <textarea rows="3" data-field="instructions">${escapeHtml(doc.info.instructions)}</textarea></label></div>
  <div class="sheet report-table">${table(['품목','입금 확인 수량','박스당 수량','자동 박스','발주 박스 수','박스 단가 TTC','매입 TTC'],doc.lines.map(r=>[
   escapeHtml(r.product.ko),r.paidQty,r.product.pack,r.auto,
   `<input type="number" min="0" step="1" max="9999" aria-label="${escapeHtml(r.product.ko)} 발주 박스 수" data-id="${escapeHtml(r.product.id)}" value="${r.boxes}">`,
   eur(Math.round(r.product.cost*100)),eur(r.cost)
  ]))}</div><p class="purchase-total">총 매입 TTC · ${eur(doc.total)}</p>
  <div class="actions"><button data-export="pdf">업체 PDF</button><button data-export="excel">업체 Excel</button></div>`;
  for(const field of details.querySelectorAll('[data-field]')){
   field.disabled=event.status==='closed';field.oninput=()=>doc.info[field.dataset.field]=field.value;
  }
  for(const box of details.querySelectorAll('[data-id]')){
   box.disabled=event.status==='closed';
   box.onchange=()=>{
    if(box.value==='')delete event.adjustments[box.dataset.id];
    else if(box.validity.valid)event.adjustments[box.dataset.id]=Number(box.value);
    drawSettlement(doc.name);
   };
  }
  const matching=()=>purchaseDocuments(sums()).filter(d=>d.name===doc.name);
  details.querySelector('[data-export="pdf"]').onclick=()=>downloadPdf(matching(),`vendor-${ordersByVendor.indexOf(doc)+1}`);
  details.querySelector('[data-export="excel"]').onclick=()=>downloadExcel(matching(),`vendor-${ordersByVendor.indexOf(doc)+1}`);
  host.append(details);
 }
}
function purchaseDocuments(rows){
 return [...vendorGroups(rows.filter(row=>row.paidQty>0))].map(([name,lines])=>({
  name,lines,total:lines.reduce((total,row)=>total+row.cost,0),
  info:event.purchase[name]??={date:new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Paris'}),location:'예시 수령 장소',instructions:''},
 }));
}
function documentRows(doc){
 return [
  ['발주서',event.name],['공급업체',doc.name],['발주일',doc.info.date],['납품 장소',doc.info.location],
  ['전달사항',doc.info.instructions],[],
  ['품목','발주 박스 수','박스 단가 TTC (€)','총 매입 TTC (€)'],
  ...doc.lines.map(row=>[row.product.ko,row.boxes,row.product.cost,row.cost/100]),
  ['총 매입 TTC (€)','','',doc.total/100]
 ];
}
function downloadExcel(documents,name){
 const workbook=XLSX.utils.book_new();
 documents.forEach((doc,i)=>{
  const sheet=XLSX.utils.aoa_to_sheet(documentRows(doc));
  sheet['!cols']=[{wch:34},{wch:23},{wch:21},{wch:21}];
  XLSX.utils.book_append_sheet(workbook,sheet,`업체 ${i+1}`);
 });
 XLSX.writeFile(workbook,`asicc-purchase-${name}.xlsx`);
}
function downloadPdf(documents,name){
 const pdf=new window.jspdf.jsPDF();
 let first=true;
 for(const doc of documents){
  const canvas=document.createElement('canvas');canvas.width=1120;canvas.height=1580;
  const ctx=canvas.getContext('2d');
  let y;
  function newPage(){
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#282420';ctx.font='25px system-ui';y=80;
  }
  function finish(){
   if(!first)pdf.addPage();first=false;
   pdf.addImage(canvas.toDataURL('image/png'),'PNG',5,5,200,282);
  }
  newPage();
  for(const row of documentRows(doc)){
   const columns=row.map(value=>String(value??''));
   const cols=columns.length===4?[55,520,680,905]:[55,290];
   const maxWidths=columns.length===4?[435,145,210,160]:[220,765];
   const splitLines=(text,width)=>text.split('\n').flatMap(paragraph=>{
    const output=[];let line='';
    for(const char of paragraph){if(line&&ctx.measureText(line+char).width>width){output.push(line);line='';}line+=char;}
    return [...output,line];
   });
   const lines=columns.map((value,i)=>splitLines(value,maxWidths[i]));
   const lineCount=Math.max(1,...lines.map(l=>l.length));
   for(let j=0;j<lineCount;j++){
    if(y>1505){finish();newPage();}
    lines.forEach((part,i)=>ctx.fillText(part[j]??'',cols[i],y));y+=39;
   }
  }
  finish();
 }
 pdf.save(`asicc-purchase-${name}.pdf`);
}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>changeTab(b.dataset.tab));
by('query').oninput=by('filter').onchange=drawOrders;
by('selectAll').onclick=()=>setAll(true);by('clearAll').onclick=()=>setAll(false);
by('add').onclick=()=>{if(event.status!=='closed'){event.items.push(newItem());selected=event.items.length-1;drawProducts();by('body').lastElementChild?.scrollIntoView({block:'nearest'});}};
const showPast=i=>show(past[i],i);
by('pastButton').onclick=()=>showPast(past.length-1);
by('pastSelect').onchange=()=>showPast(Number(by('pastSelect').value));
by('prev').onclick=()=>showPast(pastIndex-1);by('next').onclick=()=>showPast(pastIndex+1);
by('backCurrent').onclick=()=>show(active);
by('resume').onclick=()=>{tab='products';show(draft);};
by('newEvent').onclick=()=>{
 if(draft&&!confirm('현재 예시 초안을 새 초안으로 바꿀까요?'))return;
 draft=makeEvent('새 예시 바자회',Math.max(...past.map(e=>e.round),active?.round||0)+1,'draft');
 tab='products';show(draft);
};
tab=['products','orders','settlement'].includes(location.hash.slice(1))?location.hash.slice(1):'products';
show(active);
