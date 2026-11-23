const BASE = import.meta.env.BASE_URL;
const now = () => new Date().toISOString();
const future = (days: number) => new Date(Date.now()+days*86400000).toISOString();
const names = [['사과','Pommes'],['쌀','Riz'],['국수','Nouilles'],['배','Poires']];
let items = Array.from({length:15},(_,i)=>({
 id:'product-'+i,titleKo:names[i%4][0]+' '+(i+1),titleFr:names[i%4][1]+' '+(i+1),
 descriptionKo:'검토용 예시 상품입니다.',descriptionFr:'Produit de démonstration.',
 included:true,visible:true,supplier:'누리커넥트',retailCents:450+i*25,
 packQty:12,boxPriceTtcCents:1200,limitMode:'unlimited',storage:'ambient',
 imageUrl:BASE+'sample.jpg'
}));
const active = {eventId:'bazaar-preview-demo',nameKo:'ASICC 예시 바자회',nameFr:'Bazar ASICC de démonstration',
 status:'published',introKo:'예시 상품과 모의 주문을 체험할 수 있습니다.',
 introFr:'Vente de démonstration. Aucune commande réelle.',orderCutoff:future(2),transferCutoff:future(3),
 pickupKo:'예시 수령 장소',pickupFr:'Point de retrait fictif',iban:'FR7600000000000000000000000',beneficiary:'미리보기 / Démonstration'};
const closed={...active,eventId:'bazaar-preview-closed',status:'closed',nameKo:'지난 예시 바자회',nameFr:'Vente précédente'};
let draft: any = null;
const sampleUser={uid:'demo',reload:async()=>{},getIdToken:async()=>''};
export const bazaarAuth={currentUser:sampleUser};
export const onAuthStateChanged=(_:unknown,callback:(user:typeof sampleUser)=>void)=>queueMicrotask(()=>callback(sampleUser));
export const eFormat=(n:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n/100);
export const h=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const order={id:'demo-order',orderRef:'DEMO-001',name:'예시 주문자',email:'demo@example.test',phone:'0600000000',
 totalCents:450,createdAt:now(),items:[{id:'product-0',titleKo:'사과 1',titleFr:'Pommes 1',supplier:'누리커넥트',priceCents:450,qty:1,packQty:12}]};
export async function adminAction(data:any) {
 switch(data.op){
 case 'listEvents':return {events:[active,closed].map(e=>({...e,id:e.eventId})),drafts:draft?[{id:draft.id,nameKo:draft.event.nameKo}]:[]};
 case 'dashboard':return {event:data.eventId===closed.eventId?closed:active,products:structuredClone(items),orders:[order],readOnly:data.eventId===closed.eventId,isCurrent:data.eventId!==closed.eventId};
 case 'createDraft':draft={id:'bazaar-preview-draft',event:{...active,status:'draft'},serial:2,updatedAt:now(),items:structuredClone(items)};return {draft:structuredClone(draft)};
 case 'getDraft':return {draft:structuredClone(draft)};
 case 'saveDraft':draft={...draft,event:data.event,items:structuredClone(data.items),updatedAt:now()};return {updatedAt:draft.updatedAt};
 case 'deleteDraft':draft=null;return {};
 case 'publishDraft':items=draft.items;Object.assign(active,draft.event,{status:'published'});draft=null;return {eventId:active.eventId};
 case 'saveProduct':case 'addProduct':items=[...items.filter(p=>p.id!==data.id),{...data.product,id:data.id}];return {id:data.id};
 case 'archiveProduct':items=items.map(p=>p.id===data.id?{...p,visible:false}:p);return {};
 case 'reorder':items=data.ids.map((id:string)=>items.find(p=>p.id===id));return {};
 case 'storePhoto':return {imageUrl:data.content?'data:image/png;base64,'+data.content:BASE+'sample.jpg',photoPath:''};
 case 'bankConfirm':Object.assign(order,{bankConfirmedAt:now()});return {};
 case 'saveEvent':Object.assign(active,data);return {};
 case 'endEvent':active.status='closed';return {};
 default:throw new Error('미리보기에서는 이 작업을 실행하지 않습니다.');
 }
}
export async function getShop(id:string){const event=id===closed.eventId?closed:active;return {serverNow:now(),event,products:event.status==='closed'?[]:items.map(p=>({...p,priceCents:p.retailCents,stockRemaining:20}))};}
export async function createOrder(){return {id:order.id,token:'demo',orderRef:order.orderRef,totalCents:order.totalCents,iban:active.iban,beneficiary:active.beneficiary};}
export async function buyerAction(){return {order};}
