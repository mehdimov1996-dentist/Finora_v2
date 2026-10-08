(()=>{
'use strict';
const K='finora_full_v4';
const JM=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const CATS=['خانه','غذا و رستوران','حمل‌ونقل','خودرو','خرید','تفریح','سلامت','قبوض و اینترنت','اقساط','سفر','هدیه','آموزش','سایر'];
const INCOME_TYPES=['درآمد دندانپزشکی','حقوق','درآمد جانبی','سود دریافتی','سایر'];
const DESTS=['سرمایه در گردش','دارایی امن'];
const ACCS=[
 {id:'bourse',name:'بورس (الفا)',color:'#5ba7ff',unit:'تومان'},
 {id:'goldlord',name:'طلا (لورد)',color:'#e7b84b',unit:'تومان'},
 {id:'goldsig',name:'طلا (Signal AI)',color:'#ff9f5b',unit:'تومان'},
 {id:'cryptosig',name:'کریپتو (Signal AI)',color:'#35d07f',unit:'USDT'}];
const ACC=Object.fromEntries(ACCS.map(a=>[a.id,a]));
const UNITS=['تومان','USDT','دلار'];
const native=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());

/* ---------- helpers ---------- */
const $=i=>document.getElementById(i);
const pad=x=>String(x).padStart(2,'0');
const n=x=>{x=Number(x);return Number.isFinite(x)?x:0};
const str=v=>String(v??'');
const fa=s=>String(s).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const en=s=>String(s).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const num=s=>n(en(s).replace(/[,٬،\s]/g,''));
const fmt=x=>n(x).toLocaleString('fa-IR',{maximumFractionDigits:2});
const money=x=>fmt(x)+' تومان';
const esc=x=>str(x).replace(/[&<>"']/g,a=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[a]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
let toastTimer;
const toast=m=>{const t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.style.display='none',2200)};

/* ---------- Jalali calendar ---------- */
function g2j(gy,gm,gd){
  const gdm=[0,31,59,90,120,151,181,212,243,273,304,334];
  const gy2=gm>2?gy+1:gy;
  let days=355666+365*gy+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400)+gd+gdm[gm-1];
  let jy=-1595+33*Math.floor(days/12053);days%=12053;
  jy+=4*Math.floor(days/1461);days%=1461;
  if(days>365){jy+=Math.floor((days-1)/365);days=(days-1)%365}
  const jm=days<186?1+Math.floor(days/31):7+Math.floor((days-186)/30);
  const jd=1+(days<186?days%31:(days-186)%30);
  return [jy,jm,jd];
}
function j2g(jy,jm,jd){
  jy+=1595;
  let days=-355668+365*jy+Math.floor(jy/33)*8+Math.floor(((jy%33)+3)/4)+jd+(jm<7?(jm-1)*31:((jm-7)*30)+186);
  let gy=400*Math.floor(days/146097);days%=146097;
  if(days>36524){gy+=100*Math.floor(--days/36524);days%=36524;if(days>=365)days++}
  gy+=4*Math.floor(days/1461);days%=1461;
  if(days>365){gy+=Math.floor((days-1)/365);days=(days-1)%365}
  let gd=days+1;
  const sa=[0,31,((gy%4===0&&gy%100!==0)||gy%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  let gm;for(gm=0;gm<13&&gd>sa[gm];gm++)gd-=sa[gm];
  return [gy,gm,gd];
}
const isoLocal=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; // local time, not UTC
const todayISO=()=>isoLocal(new Date());
const ISO_RE=/^\d{4}-\d{2}-\d{2}$/;
const toJ=iso=>{const [y,m,d]=iso.split('-').map(Number);return g2j(y,m,d)};
const mkey=iso=>ISO_RE.test(iso||'')?(j=>j[0]+'-'+pad(j[1]))(toJ(iso)):'';
const curMonth=()=>mkey(todayISO());
const jfmt=iso=>{const j=toJ(iso);return fa(j[0]+'/'+pad(j[1])+'/'+pad(j[2]))};
const monthLabel=k=>{const [y,m]=k.split('-').map(Number);return JM[m-1]+' '+fa(y)};
const addMonth=(k,d)=>{const [y,m]=k.split('-').map(Number);const t=y*12+(m-1)+d;return Math.floor(t/12)+'-'+pad(t%12+1)};
function parseJ(s){
  const p=en(s).trim().split(/[\/\-.\s]+/).filter(Boolean).map(Number);
  if(p.length!==3||p.some(v=>!Number.isInteger(v)))return null;
  const [y,m,d]=p;
  if(y<1300||y>1500||m<1||m>12||d<1||d>31)return null;
  const g=j2g(y,m,d),b=g2j(g[0],g[1],g[2]);
  if(b[0]!==y||b[1]!==m||b[2]!==d)return null; // rejects e.g. 31 Mehr
  return g[0]+'-'+pad(g[1])+'-'+pad(g[2]);
}

/* ---------- state ---------- */
const fresh=()=>({wallet:{income:[],expense:[],transfer:[],budget:[]},invest:{safe:{asset:'BTC',current:0,target:2},assets:[]},journal:[],flows:[],safeLog:[],jUnits:{},acats:[],notes:[],todos:[],month:curMonth()});
const srcId=v=>str(v).replace(/[^\w-]/g,'').slice(0,30);
const newNid=()=>1+Math.floor(Math.random()*2147000000);
const SYM_RE={binance:/^[A-Z0-9]{3,20}$/,other:/^[\w.\-:@]{1,40}$/};
function catSym(o){const src=srcId(o.src)||'binance',sy=str(o.symbol);return{src,symbol:(src==='binance'?SYM_RE.binance:SYM_RE.other).test(sy)?sy:''}}
function normalize(x){
  const f=fresh();
  if(!x||typeof x!=='object')return f;
  const arr=a=>Array.isArray(a)?a.filter(o=>o&&typeof o==='object'):[];
  const sid=o=>str(o.id).replace(/[^\w-]/g,'')||uid();
  const dt=v=>ISO_RE.test(str(v))?str(v):todayISO();
  const w=x.wallet||{},iv=x.invest||{};
  f.wallet.income=arr(w.income).map(o=>({id:sid(o),amount:n(o.amount),type:str(o.type),date:dt(o.date),note:str(o.note)}));
  f.wallet.expense=arr(w.expense).map(o=>({id:sid(o),amount:n(o.amount),cat:str(o.cat)||'سایر',date:dt(o.date),note:str(o.note)}));
  f.wallet.transfer=arr(w.transfer).map(o=>({id:sid(o),amount:n(o.amount),dest:str(o.dest),date:dt(o.date),note:str(o.note)}));
  f.wallet.budget=arr(w.budget).map(o=>({cat:str(o.cat),amount:n(o.amount)}));
  const s=iv.safe||{};
  f.invest.safe={asset:str(s.asset)||'BTC',current:n(s.current),target:n(s.target)};
  f.invest.assets=arr(iv.assets).map(o=>({id:sid(o),name:str(o.name),symbol:str(o.symbol),type:str(o.type),qty:n(o.qty),price:n(o.price)}));
  const jr=Array.isArray(x.journal)?arr(x.journal):arr(iv.trades); // old backups kept trades under invest
  const ju=x.jUnits&&typeof x.jUnits==='object'?x.jUnits:{};
  f.jUnits=Object.fromEntries(ACCS.map(a=>[a.id,UNITS.includes(str(ju[a.id]))?str(ju[a.id]):(a.id==='cryptosig'&&!x.jUnits&&UNITS.includes(str(x.jUnit))?str(x.jUnit):a.unit)]));
  f.journal=jr.map(o=>({id:sid(o),acc:ACC[o.acc]?o.acc:'cryptosig',symbol:str(o.symbol),side:o.side==='short'?'short':'long',status:o.status==='closed'?'closed':'open',entry:n(o.entry),exit:n(o.exit),size:n(o.size),sl:n(o.sl),tp:n(o.tp),pnl:n(o.pnl),setup:str(o.setup),note:str(o.note),date:dt(o.date),src:srcId(o.src),psym:str(o.psym).trim().slice(0,40),hit:['tp','sl'].includes(o.hit)?o.hit:''}));
  f.flows=arr(x.flows).filter(o=>ACC[o.acc]).map(o=>({id:sid(o),acc:o.acc,date:dt(o.date),amount:n(o.amount),kind:['deposit','withdraw','safe'].includes(o.kind)?o.kind:(n(o.amount)<0?'withdraw':'deposit'),note:str(o.note),ref:str(o.ref).replace(/[^\w-]/g,'')}));
  f.safeLog=arr(x.safeLog).filter(o=>ACC[o.acc]).map(o=>({id:sid(o),acc:o.acc,date:dt(o.date),amount:n(o.amount),unit:str(o.unit),price:n(o.price),qty:n(o.qty),asset:str(o.asset),note:str(o.note)}));
  f.acats=arr(x.acats).map(o=>({id:sid(o),name:str(o.name).slice(0,40)||'بدون نام',...catSym(o),manual:n(o.manual),manualAt:str(o.manualAt).slice(0,40),ai:o.ai&&typeof o.ai==='object'?{text:str(o.ai.text).slice(0,10000),date:dt(o.ai.date)}:null}));
  const cids=new Set(f.acats.map(c=>c.id));
  f.notes=arr(x.notes).filter(o=>cids.has(str(o.cat))).map(o=>({id:sid(o),cat:str(o.cat),date:dt(o.date),title:str(o.title).slice(0,120)||'بدون عنوان',text:str(o.text).slice(0,5000),bias:['buy','sell','watch'].includes(o.bias)?o.bias:'watch',lo:n(o.lo),hi:n(o.hi),target:n(o.target),stop:n(o.stop),alert:o.alert!==false,status:o.status==='done'?'done':'active',lastNotif:n(o.lastNotif),created:n(o.created)}));
  f.todos=arr(x.todos).map(o=>{const due=ISO_RE.test(str(o.due))?str(o.due):'';return{id:sid(o),title:str(o.title),lead:[0,10,30,60,1440].includes(+o.lead)?+o.lead:0,nid:Number.isInteger(+o.nid)&&+o.nid>0&&+o.nid<2147483000?+o.nid:newNid(),notified:o.notified===true,due,time:due&&/^([01]\d|2[0-3]):[0-5]\d$/.test(str(o.time))?str(o.time):'',prio:[1,2,3].includes(+o.prio)?+o.prio:2,done:o.done===true}});
  const m=str(x.month),y=+m.slice(0,4);
  f.month=/^\d{4}-\d{2}$/.test(m)&&y>=1300&&y<=1500&&+m.slice(5)>=1&&+m.slice(5)<=12?m:curMonth();
  return f;
}
let S=(()=>{try{return normalize(JSON.parse(localStorage.getItem(K)))}catch(e){return fresh()}})();
let page='menu',todoFilter='open';
function persist(){try{localStorage.setItem(K,JSON.stringify(S));return true}catch(e){return false}}
function save(){
  const ok=persist();
  if(!ok)toast('ذخیره‌سازی ناموفق بود؛ از Backup استفاده کنید');
  render();
  return ok;
}

/* ---------- calculations ---------- */
const sum=a=>a.reduce((t,x)=>t+x.amount,0);
const inM=(x,m=S.month)=>mkey(x.date)===m;
const tot=(k,m=S.month)=>sum(S.wallet[k].filter(x=>inM(x,m)));
const inc=()=>tot('income'),exp=()=>tot('expense'),tr=()=>tot('transfer');
// cumulative wallet balance of all entries matching the filter
const bal=f=>sum(S.wallet.income.filter(f))-sum(S.wallet.expense.filter(f))-sum(S.wallet.transfer.filter(f));
const balance=()=>bal(x=>mkey(x.date)<=S.month); // up to the end of the selected month
const transferTo=dest=>sum(S.wallet.transfer.filter(x=>x.dest===dest));
function defDate(){
  if(curMonth()===S.month)return todayISO();
  const [y,m]=S.month.split('-').map(Number),g=j2g(y,m,1);
  return g[0]+'-'+pad(g[1])+'-'+pad(g[2]);
}
const dateField=()=>`<div><label>تاریخ (شمسی)</label><input name="date" inputmode="numeric" autocomplete="off" required value="${jfmt(defDate())}"></div>`;
const amountField=()=>`<div><label>مبلغ (تومان)</label><input name="amount" type="number" step="any" min="0" required></div>`;

/* ---------- render ---------- */
const TILES=[['home','🏠','Overview'],['wallet','💳','کیف پول'],['invest','📈','سرمایه‌گذاری'],['journal','📊','ژورنال معاملاتی'],['analysis','📓','تحلیل'],['todo','✅','To-Do'],['settings','⚙️','تنظیمات']];
const TITLE=Object.fromEntries(TILES.map(t=>[t[0],t[1]+' '+t[2]]));
const MONTHLY={home:1,wallet:1,journal:1}; // pages that follow the month bar
const RENDER={menu:renderMenu,home:renderHome,wallet:renderWallet,invest:renderInvest,journal:renderJournal,analysis:renderAnalysis,todo:renderTodo,settings:renderSettings};
function render(){
  $('mlabel').textContent=monthLabel(S.month);
  $('monthbar').hidden=!MONTHLY[page];
  $('menuBtn').hidden=page==='menu';
  $('psub').textContent=page==='menu'?'دفترچه مدیریت مالی شخصی + سرمایه‌گذاری':TITLE[page];
  RENDER[page]();
  renderAlerts();
}
function openPage(p,push){
  if(!RENDER[p])p='menu';
  if(push&&p!=='menu'&&page==='menu'){try{history.pushState({p},'')}catch(e){}}
  page=p;
  document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===p));
  render();window.scrollTo(0,0);
}
window.addEventListener('popstate',e=>openPage(e.state&&e.state.p||'menu',false));
function goMenu(){if(history.state&&history.state.p)history.back();else openPage('menu',false)}
function renderMenu(){
  $('menu').innerHTML=`<div class="tiles">${TILES.map(t=>`<button class="tile" data-p="${t[0]}"><span class="ti">${t[1]}</span><span class="tn">${esc(t[2])}</span></button>`).join('')}</div>`;
}

function renderHome(){
  const ms=[];
  for(let i=5;i>=0;i--){const k=addMonth(S.month,-i);ms.push([k,tot('income',k),tot('expense',k),tot('transfer',k)])}
  const I=inc(),E=exp(),T=tr(),sv=I-E,sf=S.invest.safe;
  const iv=S.invest.assets.reduce((a,x)=>a+x.qty*x.price,0),sp=sf.target?sf.current/sf.target*100:0;
  $('home').innerHTML=`<div class="grid g4"><div class="card"><div class="label">درآمد ماه</div><div class="big green">${money(I)}</div></div><div class="card"><div class="label">هزینه ماه</div><div class="big red">${money(E)}</div></div><div class="card"><div class="label">پس‌انداز ماه</div><div class="big blue">${money(sv)}</div></div><div class="card"><div class="label">انتقال به سرمایه‌گذاری</div><div class="big gold">${money(T)}</div></div></div>
<div class="grid g2 section"><div class="card"><div class="row"><h2>🛡 دارایی امن</h2><span class="pill">${esc(sf.asset)}</span></div><div class="big">${fmt(sf.current)} / ${fmt(sf.target)}</div><div class="progress" style="margin-top:10px"><i style="width:${Math.max(0,Math.min(100,sp))}%"></i></div><div class="mini">${fa(sp.toFixed(1))}٪ از هدف</div></div>
<div class="card"><h2>⚡ شاخص‌های کلیدی</h2><div class="list"><div class="row"><span>نرخ پس‌انداز</span><b class="green">${fa((I?sv/I*100:0).toFixed(1))}٪</b></div><div class="row"><span>نرخ سرمایه‌گذاری</span><b class="gold">${fa((I?T/I*100:0).toFixed(1))}٪</b></div><div class="row"><span>مانده کیف پول (تا پایان ماه)</span><b>${money(balance())}</b></div><div class="row"><span>ارزش دارایی‌ها</span><b>${money(iv)}</b></div></div></div></div>
<div class="grid g2 section"><div class="card"><h2>📊 هزینه‌های ماه</h2><canvas id="hc" class="chart"></canvas></div><div class="card"><h2>🎯 مسیر مالی</h2><p class="mini">درآمد ← هزینه‌های ضروری ← پس‌انداز ← انتقال به سرمایه‌گذاری ← دارایی امن</p><div class="item">انتقال از کیف پول به سرمایه‌گذاری در این ماه: <b class="gold">${money(T)}</b></div></div></div>
<div class="card section"><h2>📈 روند ۶ ماهه</h2><div class="legend"><span class="green">● درآمد</span><span class="red">● هزینه</span><span class="gold">● سرمایه‌گذاری</span></div><canvas id="mc" class="chart"></canvas></div>
<div class="card section"><h2>📅 گزارش ماهانه</h2><table class="table"><tr><th>ماه</th><th>درآمد</th><th>هزینه</th><th>سرمایه‌گذاری</th><th>مانده</th></tr>${ms.slice().reverse().map(x=>`<tr><td>${monthLabel(x[0])}</td><td class="green">${money(x[1])}</td><td class="red">${money(x[2])}</td><td class="gold">${money(x[3])}</td><td>${money(x[1]-x[2]-x[3])}</td></tr>`).join('')}</table></div>`;
  drawCosts('hc');drawMonth('mc',ms);
}

function renderWallet(){
  $('wallet').innerHTML=`<div class="grid g4"><div class="card"><div class="label">درآمد</div><div class="big green">${money(inc())}</div></div><div class="card"><div class="label">هزینه</div><div class="big red">${money(exp())}</div></div><div class="card"><div class="label">سرمایه‌گذاری</div><div class="big gold">${money(tr())}</div></div><div class="card"><div class="label">مانده (تا پایان ماه)</div><div class="big blue">${money(balance())}</div></div></div>
<div class="grid g2 section"><div class="card"><h2>➕ درآمد</h2><form class="form" data-form="income">${amountField()}<div><label>نوع</label><select name="type">${INCOME_TYPES.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>${dateField()}<div><label>توضیح</label><input name="note"></div><div class="full"><button class="btn success">ثبت درآمد</button></div></form></div>
<div class="card"><h2>➖ هزینه</h2><form class="form" data-form="expense">${amountField()}<div><label>دسته</label><select name="cat">${CATS.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>${dateField()}<div><label>توضیح</label><input name="note"></div><div class="full"><button class="btn danger">ثبت هزینه</button></div></form></div></div>
<div class="card section"><h2>🔄 انتقال به سرمایه‌گذاری</h2><form class="form" data-form="transfer">${amountField()}<div><label>مقصد</label><select name="dest">${DESTS.map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>${dateField()}<div><label>توضیح</label><input name="note" placeholder="سرمایه‌گذاری ماهانه"></div><div class="full"><button class="btn primary">ثبت انتقال</button></div></form></div>
<div class="grid g2 section"><div class="card"><h2>📋 تراکنش‌های ماه</h2>${walletList()}</div><div class="card"><h2>🎯 بودجه هزینه‌ها</h2>${budgets()}</div></div>`;
}
function walletList(){
  const a=[
    ...S.wallet.income.filter(x=>inM(x)).map(x=>({...x,k:'income',title:x.type})),
    ...S.wallet.expense.filter(x=>inM(x)).map(x=>({...x,k:'expense',title:x.cat})),
    ...S.wallet.transfer.filter(x=>inM(x)).map(x=>({...x,k:'transfer',title:'انتقال به '+x.dest}))
  ].sort((p,q)=>q.date.localeCompare(p.date));
  if(!a.length)return'<div class="empty">تراکنشی ثبت نشده</div>';
  return`<table class="table"><tr><th>تاریخ</th><th>عنوان</th><th>مبلغ</th><th></th></tr>${a.map(x=>`<tr><td>${jfmt(x.date)}</td><td>${esc(x.title)}${x.note?`<div class="mini">${esc(x.note)}</div>`:''}</td><td class="${x.k==='income'?'green':x.k==='expense'?'red':'gold'}">${x.k==='income'?'+':'−'}${money(x.amount)}</td><td><button class="btn danger" data-act="del" data-k="${x.k}" data-id="${esc(x.id)}">×</button></td></tr>`).join('')}</table>`;
}
function budgets(){
  return CATS.map(c=>{
    const b=(S.wallet.budget.find(x=>x.cat===c)||{}).amount||0;
    const s=sum(S.wallet.expense.filter(x=>inM(x)&&x.cat===c));
    const p=b?Math.min(100,s/b*100):0;
    return`<div class="card" style="padding:9px;margin-bottom:7px"><div class="row"><span>${esc(c)}</span><span class="mini">${b?money(s)+' / '+money(b):'بدون بودجه'}</span></div><div class="progress" style="margin-top:6px"><i${b&&s>b?' class="over"':''} style="width:${p}%"></i></div><button class="btn" style="margin-top:6px" data-act="budget" data-cat="${esc(c)}">تعیین بودجه</button></div>`;
  }).join('');
}

function renderInvest(){
  const a=S.invest.assets,v=a.reduce((s,x)=>s+x.qty*x.price,0),sf=S.invest.safe;
  $('invest').innerHTML=`<div class="grid g3"><div class="card"><div class="label">دارایی امن</div><div class="big gold">${fmt(sf.current)} ${esc(sf.asset)}</div><div class="mini">هدف ${fmt(sf.target)} · واریز تا امروز: ${money(transferTo('دارایی امن'))}</div></div><div class="card"><div class="label">ارزش دارایی‌های در گردش</div><div class="big">${money(v)}</div><div class="mini">واریز به سرمایه در گردش: ${money(transferTo('سرمایه در گردش'))}</div></div><div class="card"><div class="label">معاملات ژورنال</div><div class="big blue">${fa(S.journal.length)}</div></div></div>
<div class="grid g2 section"><div class="card"><h2>🛡 هدف دارایی امن</h2><form class="form" data-form="safe"><div><label>دارایی</label><input name="asset" value="${esc(sf.asset)}"></div><div><label>مقدار فعلی</label><input name="current" type="number" step="any" min="0" value="${esc(sf.current)}"></div><div><label>هدف</label><input name="target" type="number" step="any" min="0" value="${esc(sf.target)}"></div><div><button class="btn success">ذخیره</button></div></form></div>
<div class="card"><h2>➕ دارایی</h2><form class="form" data-form="asset"><div><label>نام</label><input name="name" required placeholder="طلای ۱۸"></div><div><label>نماد</label><input name="symbol" required placeholder="GERAM18"></div><div><label>دسته</label><select name="type"><option>کریپتو</option><option>طلا</option><option>ارز</option><option>بورس</option><option>نفت</option><option>سایر</option></select></div><div><label>مقدار</label><input name="qty" type="number" step="any" min="0" value="0"></div><div><label>قیمت (تومان)</label><input name="price" type="number" step="any" min="0" value="0"></div><div><button class="btn primary">افزودن</button></div></form></div></div>
<div class="card section"><h2>💰 دارایی‌ها</h2>${a.length?`<table class="table"><tr><th>نام</th><th>دسته</th><th>مقدار</th><th>قیمت</th><th>ارزش</th><th></th></tr>${a.map(x=>`<tr><td>${esc(x.name)}<span class="mini"> ${esc(x.symbol)}</span></td><td>${esc(x.type)}</td><td>${fmt(x.qty)}</td><td>${money(x.price)}</td><td>${money(x.qty*x.price)}</td><td><button class="btn danger" data-act="delAsset" data-id="${esc(x.id)}">×</button></td></tr>`).join('')}</table>`:'<div class="empty">دارایی ثبت نشده</div>'}</div>`;
}
function srcCard(){
  const host=u=>{try{return new URL(u.split('{symbol}').join('X')).host}catch(e){return''}};
  const list=`<div class="row todo" style="margin-top:6px"><span><b>Binance</b><div class="mini" dir="ltr">api.binance.com · پیش‌فرض (نماد مثل BTCUSDT)</div></span></div>`+SRC.map(s=>`<div class="row todo" style="margin-top:6px"><span><b>${esc(s.name)}</b><div class="mini" dir="ltr">${esc(host(s.url))}${s.path?' · '+esc(s.path):''}${s.mult!==1?' · ×'+s.mult:''}</div></span><button class="btn danger" data-act="srcdel" data-id="${esc(s.id)}">×</button></div>`).join('');
  return list+`<form class="form" data-form="srcadd" style="margin-top:10px"><div><label>نام منبع</label><input name="name" required maxlength="40" placeholder="مثلاً قیمت طلا"></div><div><label>مسیر مقدار در JSON</label><input name="path" dir="ltr" placeholder="data.price یا data[0].price"></div><div class="full"><label>آدرس (https) — جای نماد: {symbol}</label><input name="url" dir="ltr" required placeholder="https://api.example.com/price?symbol={symbol}"></div><div><label>نام هدر کلید (اختیاری)</label><input name="hName" dir="ltr" placeholder="x-api-key"></div><div><label>مقدار هدر / کلید</label><input name="hVal" type="password" dir="ltr" autocomplete="off"></div><div><label>ضریب (مثلاً ۰٫۱ برای ریال ← تومان)</label><input name="mult" type="number" step="any" min="0" value="1"></div><div><label>نماد تست</label><input name="test" dir="ltr" placeholder="XAUUSD"></div><div class="full actions"><button class="btn primary">افزودن منبع</button><button type="button" class="btn" data-act="srctest">تست</button></div></form><p class="mini">پاسخ API باید JSON باشد و «مسیر مقدار» به عدد قیمت اشاره کند (بدون مسیر، کل پاسخ عدد فرض می‌شود). اگر کلید لازم دارد، داخل آدرس یا هدر بگذارید. کلیدها فقط روی همین دستگاه می‌مانند و در Backup نیستند. در مرورگر ممکن است سرویس به‌خاطر CORS جواب ندهد؛ در APK این محدودیت نیست. بعد از افزودن، منبع در فرم معامله و دسته‌های تحلیل انتخاب‌شدنی است.</p>`;
}
function srcFromForm(f,forTest){
  const name=str(f.get('name')).trim().slice(0,40),url=str(f.get('url')).trim();
  if(!name&&!forTest)return'نام منبع را وارد کنید';
  if(!/^https:\/\/[^\s]+$/.test(url))return'آدرس باید با https:// شروع شود';
  const hName=str(f.get('hName')).trim();if(hName&&!/^[\w-]{1,40}$/.test(hName))return'نام هدر نامعتبر است';
  const mult=num(f.get('mult'));
  return{name,url,path:str(f.get('path')).trim().slice(0,120),hName,hVal:str(f.get('hVal')).trim().slice(0,300),mult:mult>0?mult:1};
}
function aiForm(){
  const c=aiCfg();
  return`<form class="form" data-form="aiset"><div><label>سرویس</label><select name="provider"><option value="anthropic"${c.provider==='anthropic'?' selected':''}>Anthropic (Claude)</option><option value="openai"${c.provider==='openai'?' selected':''}>سازگار با OpenAI (OpenAI، OpenRouter، Gemini، …)</option></select></div><div><label>آدرس API</label><input name="url" dir="ltr" value="${esc(c.raw.url||'')}" placeholder="${esc(AI_DEF[c.provider].url)}"></div><div><label>مدل</label><input name="model" dir="ltr" value="${esc(c.raw.model||'')}" placeholder="${esc(AI_DEF[c.provider].model)}"></div><div><label>کلید API</label><input name="key" type="password" dir="ltr" autocomplete="off" value="${esc(c.key)}"></div><div class="full actions"><button class="btn primary">ذخیره</button><button type="button" class="btn" data-act="aitest">تست اتصال</button></div></form><p class="mini">کلید فقط روی همین دستگاه ذخیره می‌شود و داخل Backup نمی‌رود. متن تحلیل‌ها برای پاسخ، به سرویس انتخابی شما ارسال می‌شود. اگر سرویس از ایران در دسترس نباشد باید از VPN یا یک آدرس واسط استفاده کنید.</p>`;
}
function renderSettings(){
  const [y,m]=S.month.split('-').map(Number);
  $('settings').innerHTML=`<div class="grid g2"><div class="card"><h2>💾 Backup / Restore</h2><div class="actions"><button class="btn primary" data-act="backup">دانلود Backup</button><label class="btn">Restore<input type="file" accept=".json,application/json" hidden id="rf"></label></div></div><div class="card"><h2>🗓 ماه گزارش</h2><div class="form"><div><label>سال</label><input id="my" type="number" min="1300" max="1500" value="${y}"></div><div><label>ماه</label><select id="mm">${JM.map((x,i)=>`<option value="${i+1}"${i+1===m?' selected':''}>${x}</option>`).join('')}</select></div></div><button class="btn" style="margin-top:7px" data-act="setmonth">اعمال</button></div></div>
<div class="card section"><h2>📡 Live Crypto</h2><div class="row"><span>BTC/USDT</span><b id="btc" dir="ltr">...</b></div><div class="row"><span>ETH/USDT</span><b id="eth" dir="ltr">...</b></div><p class="mini">قیمت زنده کریپتو از Binance دریافت می‌شود. اگر دسترسی به Binance محدود باشد، پیام «در دسترس نیست» نمایش داده می‌شود. برای طلا، ارز، بورس و غیره از کارت «منابع قیمت (API)» پایین‌تر یک API اضافه کنید.</p></div>
<div class="card section"><h2>📡 منابع قیمت (API)</h2>${srcCard()}</div>
<div class="card section"><h2>🔔 اعلان‌ها</h2><div class="actions"><button class="btn primary" data-act="enableNotif">فعال‌سازی اعلان</button><button class="btn" data-act="testNotif">اعلان آزمایشی</button><button class="btn" data-act="exactAlarm">دقت زمان‌بندی (اندروید)</button></div><p class="mini">یادآوری مهلت‌های To-Do در نسخه‌ی اندروید حتی وقتی برنامه بسته است کار می‌کند. هشدار قیمت و حد سود/ضرر فقط وقتی برنامه باز است بررسی می‌شود.</p></div>
<div class="card section"><h2>🤖 اتصال به AI (برای بخش تحلیل)</h2>${aiForm()}</div>
<div class="card section"><h2>⚠️ حذف اطلاعات</h2><button class="btn danger" data-act="wipe">حذف همه اطلاعات</button></div>`;
  $('rf').addEventListener('change',restore);
  live(false);
}

/* ---------- analysis notebook: categories, price zones, live alerts, AI ---------- */
const BIAS={buy:'خرید',sell:'فروش',watch:'دیده‌بانی'};
const QUOTES={};let ALERTS=[],aCat='',aNew=false,aiBusy=false;
/* ---------- price sources: Binance (built in) + user-defined JSON APIs ---------- */
const SRCK='finora_src_v1';
function loadSrc(){
  try{
    const a=JSON.parse(localStorage.getItem(SRCK)||'[]');
    return Array.isArray(a)?a.filter(o=>o&&typeof o==='object').map(o=>({id:srcId(o.id),name:str(o.name).slice(0,40),url:str(o.url),path:str(o.path).slice(0,120),hName:str(o.hName).slice(0,40),hVal:str(o.hVal).slice(0,300),mult:n(o.mult)>0?n(o.mult):1})).filter(o=>o.id&&/^https:\/\//.test(o.url)):[];
  }catch(e){return[]}
}
let SRC=loadSrc();
const saveSrc=()=>{try{localStorage.setItem(SRCK,JSON.stringify(SRC));return true}catch(e){return false}};
const srcName=id=>id==='binance'?'Binance':((SRC.find(s=>s.id===id)||{}).name||'');
const srcOk=id=>id==='binance'||SRC.some(s=>s.id===id);
const qkey=(src,sym)=>src+':'+sym;
const symOk=(src,sym)=>(src==='binance'?SYM_RE.binance:SYM_RE.other).test(sym);
const srcOpts=(cur,none)=>(none?[['',none]]:[]).concat([['binance','Binance'],...SRC.map(s=>[s.id,s.name])]).map(o=>`<option value="${esc(o[0])}"${o[0]===cur?' selected':''}>${esc(o[1])}</option>`).join('');
const tsym=t=>{const s=str(t.psym||t.symbol).trim();return t.src==='binance'?s.toUpperCase().replace(/[\/\-_\s]/g,''):(t.psym?s:s.replace(/[\/\-_\s]/g,''))};
const tquote=t=>{const q=t.src&&QUOTES[qkey(t.src,tsym(t))];return q&&q.p>0?q:null};
function getPath(o,path){
  return path.replace(/\[(\d+)\]/g,'.$1').split('.').filter(Boolean).reduce((v,k)=>v!=null&&typeof v==='object'&&Object.prototype.hasOwnProperty.call(v,k)?v[k]:undefined,o);
}
async function fetchQ(src,sym,cfg){
  const key=qkey(src,sym);
  if(src==='binance'&&!cfg){
    for(const base of ENDPOINTS){
      try{
        const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),8000);
        const r=await fetch(`${base}/api/v3/ticker/price?symbol=${encodeURIComponent(sym)}`,{signal:ctl.signal});clearTimeout(t);
        if(!r.ok)continue;
        const j=await r.json(),p=+j.price;
        if(p>0){QUOTES[key]={p,t:Date.now()};return p}
      }catch(e){}
    }
    return 0;
  }
  const c=cfg||SRC.find(x=>x.id===src);if(!c)return 0;
  try{
    const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),10000);
    const headers={};if(c.hName&&/^[\w-]{1,40}$/.test(c.hName))headers[c.hName]=c.hVal;
    const r=await fetch(c.url.split('{symbol}').join(encodeURIComponent(sym)),{signal:ctl.signal,headers});clearTimeout(t);
    if(!r.ok)return 0;
    const txt=await r.text();let v;
    if(c.path){let j;try{j=JSON.parse(txt)}catch(e){return 0}v=getPath(j,c.path)}
    else{try{v=JSON.parse(txt)}catch(e){v=txt}}
    if(v==null||typeof v==='object')return 0;
    const p=num(v)*(c.mult>0?c.mult:1);
    if(p>0){QUOTES[key]={p,t:Date.now()};return p}
  }catch(e){}
  return 0;
}
const fetchSym=sym=>fetchQ('binance',sym);
const AIK='finora_ai_v1';
const AI_DEF={anthropic:{url:'https://api.anthropic.com',model:'claude-sonnet-5-5'},openai:{url:'https://api.openai.com/v1',model:'gpt-4o-mini'}};
function aiCfg(){
  let o={};try{o=JSON.parse(localStorage.getItem(AIK)||'{}')||{}}catch(e){}
  const provider=o.provider==='openai'?'openai':'anthropic';
  return{provider,url:str(o.url).trim()||AI_DEF[provider].url,model:str(o.model).trim()||AI_DEF[provider].model,key:str(o.key).trim(),raw:o};
}
const fp=v=>n(v).toLocaleString('en-US',{maximumFractionDigits:v>=100?2:v>=1?4:8});
const zone=nt=>{
  const a=nt.lo,b=nt.hi;
  if(a>0&&b>0)return[Math.min(a,b),Math.max(a,b)];
  const v=a>0?a:b;return v>0?[v*0.998,v*1.002]:null; // single level = ±0.2%
};
const inZone=(p,z)=>p>=z[0]&&p<=z[1];
const catQuote=c=>{
  const q=c.symbol&&QUOTES[qkey(c.src||'binance',c.symbol)];
  if(q&&q.p>0)return q;
  return c.manual>0?{p:c.manual,t:Date.parse(c.manualAt)||0}:null;
};
const catPrice=c=>{const q=catQuote(c);return q?q.p:0};
const chipPrice=c=>{const p=catPrice(c);return p?fp(p):'—'};
const mid=nt=>{const z=zone(nt);return z?(z[0]+z[1])/2:0};

function noteLive(nt,c){
  const z=zone(nt),p=catPrice(c);
  if(!z)return'بدون محدوده';
  if(!p)return'قیمت لایو در دسترس نیست';
  if(inZone(p,z))return'✅ قیمت داخل محدوده است';
  const d=p<z[0]?(z[0]-p)/p*100:(p-z[1])/p*100;
  return(p<z[0]?'↗ ':'↘ ')+f1(d)+'٪ تا محدوده';
}
function compareCat(c){
  const ns=S.notes.filter(x=>x.cat===c.id&&x.status==='active').sort((a,b)=>a.date.localeCompare(b.date)||a.created-b.created);
  if(!ns.length)return[];
  const out=[],p=catPrice(c),cnt=b=>ns.filter(x=>x.bias===b).length;
  out.push(`${fa(ns.length)} تحلیل فعال: ${fa(cnt('buy'))} خرید، ${fa(cnt('sell'))} فروش، ${fa(cnt('watch'))} دیده‌بانی.`);
  ['buy','sell'].forEach(b=>{
    const zs=ns.filter(x=>x.bias===b).map(zone).filter(Boolean);
    if(zs.length<2)return;
    const lo=Math.max(...zs.map(z=>z[0])),hi=Math.min(...zs.map(z=>z[1]));
    out.push(lo<=hi?`ناحیه‌ی مشترک ${BIAS[b]}: ${fp(lo)} تا ${fp(hi)}`:`محدوده‌های ${BIAS[b]} هم‌پوشانی ندارند؛ بازه‌ی کلی ${fp(Math.min(...zs.map(z=>z[0])))} تا ${fp(Math.max(...zs.map(z=>z[1])))}`);
  });
  if(ns.length>=2){
    const a=ns[ns.length-2],b=ns[ns.length-1],ma=mid(a),mb=mid(b);
    if(ma&&mb){const ch=(mb-ma)/ma*100;out.push(`تحلیل جدید (${jfmt(b.date)}) نسبت به قبلی ${ch>=0?'بالاتر':'پایین‌تر'} است؛ مرکز محدوده ${f1(Math.abs(ch))}٪ جابه‌جا شده.`)}
    if(a.bias!==b.bias)out.push(`جهت از «${BIAS[a.bias]}» به «${BIAS[b.bias]}» تغییر کرده.`);
  }
  if(p){
    const zs=ns.map(x=>({x,z:zone(x)})).filter(r=>r.z),inside=zs.filter(r=>inZone(p,r.z));
    if(inside.length)out.push(`🔔 قیمت فعلی ${fp(p)} داخل محدوده‌ی ${inside.map(r=>'«'+esc(r.x.title)+'»').join('، ')} است.`);
    else if(zs.length){
      const near=zs.map(r=>({r,d:p<r.z[0]?(r.z[0]-p)/p*100:(p-r.z[1])/p*100,up:p<r.z[0]})).sort((u,v)=>u.d-v.d)[0];
      out.push(`نزدیک‌ترین محدوده «${esc(near.r.x.title)}» است: ${f1(near.d)}٪ ${near.up?'بالاتر':'پایین‌تر'} از قیمت فعلی ${fp(p)}.`);
    }
  }else out.push('قیمت لایو در دسترس نیست؛ با «قیمت دستی» ثبتش کنید.');
  return out;
}
const cmpHTML=c=>{const l=compareCat(c);return l.length?l.map(x=>`<div class="item">• ${x}</div>`).join(''):'<div class="empty">تحلیل فعالی برای مقایسه نیست</div>'};

function noteCard(nt,c){
  const z=zone(nt),rng=z?(nt.lo>0&&nt.hi>0?`${fp(z[0])} – ${fp(z[1])}`:fp(nt.lo||nt.hi)+' (±۰٫۲٪)'):'—';
  return`<div class="tcard${nt.status==='done'?' dim':''}"><div class="row"><span><b>${esc(nt.title)}</b> <span class="pill">${BIAS[nt.bias]}</span>${nt.status==='done'?' <span class="pill">بسته</span>':''}</span><span class="mini">${jfmt(nt.date)}</span></div>
<div class="mini" style="margin-top:6px">محدوده: <b dir="ltr">${rng}</b>${nt.target?' · هدف '+fp(nt.target):''}${nt.stop?' · حد ضرر '+fp(nt.stop):''}</div>
${nt.text?`<div class="tnote">${esc(nt.text)}</div>`:''}
<div class="row" style="margin-top:8px"><span class="mini" data-nid="${esc(nt.id)}">${noteLive(nt,c)}</span><span><button class="btn" data-act="toggleAlert" data-id="${esc(nt.id)}" title="اعلان">${nt.alert?'🔔':'🔕'}</button> <button class="btn" data-act="toggleNote" data-id="${esc(nt.id)}">${nt.status==='done'?'↩︎':'✔'}</button> <button class="btn" data-act="editNote" data-id="${esc(nt.id)}">✎</button> <button class="btn danger" data-act="delNote" data-id="${esc(nt.id)}">×</button></span></div></div>`;
}
function renderAnalysis(){
  if(!S.acats.some(c=>c.id===aCat))aCat=S.acats[0]?S.acats[0].id:'';
  const chips=S.acats.map(c=>`<button class="chip${c.id===aCat?' on':''}" data-act="acat" data-id="${esc(c.id)}">${esc(c.name)} <span class="cp" data-cid="${esc(c.id)}">${chipPrice(c)}</span></button>`).join('');
  const cur=S.acats.find(c=>c.id===aCat),showNew=aNew||!S.acats.length;
  const newForm=showNew?`<div class="card section"><h2>🗂 دسته‌ی جدید</h2><form class="form" data-form="acat"><div><label>نام دسته</label><input name="name" required maxlength="40" placeholder="تحلیل BTC"></div><div><label>منبع قیمت</label><select name="src">${srcOpts('binance')}</select></div><div><label>نماد در منبع (اختیاری)</label><input name="symbol" dir="ltr" placeholder="BTCUSDT" autocapitalize="characters"></div><div class="full"><button class="btn primary">ساخت دسته</button></div></form><div class="mini">برای دسته‌هایی که نماد ندارند (طلا، بورس، …) می‌توانید قیمت را دستی ثبت کنید.</div></div>`:'';
  $('analysis').innerHTML=`<div class="chips">${chips}<button class="chip" data-act="toggleNewCat">${showNew&&S.acats.length?'✕ بستن':'＋ دسته'}</button></div>${newForm}${cur?catView(cur):''}`;
  if(cur)pollQuotes(true);
}
function catView(c){
  const ns=S.notes.filter(x=>x.cat===c.id).sort((a,b)=>(a.status==='done')-(b.status==='done')||b.date.localeCompare(a.date)||b.created-a.created);
  const q=catQuote(c),hasAI=!!aiCfg().key;
  return`<div class="card section"><div class="row"><h2 style="margin:0">${esc(c.name)} ${c.symbol?`<span class="pill" dir="ltr">${esc(c.symbol)}${c.src&&c.src!=='binance'?' · '+esc(srcName(c.src)):''}</span>`:''}</h2><b class="cp" data-cid="${esc(c.id)}" dir="ltr" style="font-size:20px">${chipPrice(c)}</b></div>
<div class="mini" id="qtime">${q&&q.t?'آخرین به‌روزرسانی '+new Date(q.t).toLocaleTimeString('fa-IR'):''}</div>
<div class="actions"><button class="btn" data-act="arefresh">↻ قیمت</button><button class="btn" data-act="setManual">قیمت دستی</button><button class="btn" data-act="editCat">ویرایش دسته</button><button class="btn danger" data-act="delCat">حذف دسته</button><button class="btn" data-act="enableNotif">🔔 فعال‌سازی اعلان</button></div>
<div class="mini" style="margin-top:6px">اعلان فقط وقتی برنامه باز است قیمت را بررسی می‌کند (هر ۳۰ ثانیه).</div></div>
<div class="card section"><h2>🧭 جمع‌بندی لایو</h2><div id="acmp">${cmpHTML(c)}</div>
<div class="actions"><button class="btn primary" data-act="aiAnalyze"${aiBusy?' disabled':''}>${aiBusy?'در حال دریافت…':'🤖 تحلیل با AI'}</button>${hasAI?'':'<span class="mini">برای AI در تنظیمات کلید API وارد کنید</span>'}</div>
<div id="aiout">${c.ai?`<div class="tnote" style="margin-top:10px">${esc(c.ai.text)}</div><div class="mini">پاسخ AI · ${jfmt(c.ai.date)}</div>`:''}</div></div>
<details class="card section"${ns.length?'':' open'}><summary>➕ تحلیل جدید</summary><form class="form" data-form="anote" style="margin-top:10px"><div class="full"><label>عنوان</label><input name="title" required maxlength="120" autocomplete="off" placeholder="مثلاً حمایت هفتگی"></div><div><label>جهت</label><select name="bias"><option value="buy">خرید</option><option value="sell">فروش</option><option value="watch">دیده‌بانی</option></select></div><div><label>تاریخ (شمسی)</label><input name="date" inputmode="numeric" autocomplete="off" required value="${jfmt(todayISO())}"></div><div><label>محدوده — از قیمت</label><input name="lo" type="number" step="any" min="0" dir="ltr"></div><div><label>محدوده — تا قیمت</label><input name="hi" type="number" step="any" min="0" dir="ltr"></div><div><label>هدف (اختیاری)</label><input name="target" type="number" step="any" min="0" dir="ltr"></div><div><label>حد ضرر (اختیاری)</label><input name="stop" type="number" step="any" min="0" dir="ltr"></div><div class="full"><label>متن تحلیل</label><textarea name="text"></textarea></div><div class="full"><label class="chkrow"><input type="checkbox" name="alert" checked> اعلان هنگام ورود قیمت به محدوده</label><div class="mini">اگر فقط یک عدد بدهید، ±۰٫۲٪ اطرافش محدوده حساب می‌شود.</div></div><div class="full"><button class="btn primary">ثبت تحلیل</button></div></form></details>
<div class="card section"><h2>📓 تحلیل‌ها</h2>${ns.length?ns.map(x=>noteCard(x,c)).join(''):'<div class="empty">هنوز تحلیلی ثبت نشده</div>'}</div>`;
}
function paintLive(){
  document.querySelectorAll('.cp[data-cid]').forEach(el=>{const c=S.acats.find(x=>x.id===el.dataset.cid);if(c)el.textContent=chipPrice(c)});
  document.querySelectorAll('[data-tid]').forEach(el=>{const t=S.journal.find(x=>x.id===el.dataset.tid);if(t)el.innerHTML=tradeLive(t)});
  document.querySelectorAll('[data-fl]').forEach(el=>{el.innerHTML=floatHTML(el.dataset.fl)});
  document.querySelectorAll('[data-flg]').forEach(el=>{el.innerHTML=liveGrowthHTML(el.dataset.flg)});
  if($('rc'))drawReturns('rc');
  if(page!=='analysis')return;
  const c=S.acats.find(x=>x.id===aCat);if(!c)return;
  const a=$('acmp');if(a)a.innerHTML=cmpHTML(c);
  document.querySelectorAll('[data-nid]').forEach(el=>{const nt=S.notes.find(x=>x.id===el.dataset.nid);if(nt)el.textContent=noteLive(nt,c)});
  const q=catQuote(c),t=$('qtime');if(t)t.textContent=q&&q.t?'آخرین به‌روزرسانی '+new Date(q.t).toLocaleTimeString('fa-IR'):'';
}
function wantedKeys(all){
  const m=new Map();
  S.acats.forEach(c=>{if(c.symbol&&srcOk(c.src)&&(all||S.notes.some(x=>x.cat===c.id&&x.status==='active'&&x.alert)))m.set(qkey(c.src,c.symbol),[c.src,c.symbol])});
  S.journal.forEach(t=>{if(t.status==='open'&&t.src&&srcOk(t.src)){const y=tsym(t);if(y&&symOk(t.src,y))m.set(qkey(t.src,y),[t.src,y])}});
  return[...m.values()];
}
let polling=false;
const QFAIL={};let pollAgain=false;
async function pollQuotes(all,force){
  if(polling){pollAgain=true;return}
  const now=Date.now();
  let keys=wantedKeys(all);
  // only fetch what is missing or stale; failed fetches cool down for 10s (a forced refresh ignores both)
  if(!force)keys=keys.filter(([a,b])=>{const k=qkey(a,b),q=QUOTES[k];return(!q||now-q.t>4000)&&!(QFAIL[k]&&now-QFAIL[k]<10000)});
  if(!keys.length){paintLive();checkAlerts();return} // nothing to fetch, but new trades/notes still get evaluated against cached prices
  polling=true;
  try{await Promise.all(keys.map(async([a,b])=>{const k=qkey(a,b);if(await fetchQ(a,b))delete QFAIL[k];else QFAIL[k]=Date.now()}))}finally{polling=false}
  paintLive();checkAlerts();
  if(pollAgain){pollAgain=false;pollQuotes(all)}
}
function renderAlerts(){
  const el=$('alerts');if(!el)return;
  el.innerHTML=ALERTS.map(a=>`<div class="alert"><span>${a.icon||'🔔'} ${esc(a.text)}</span><button class="btn" data-act="dismissAlert" data-id="${esc(a.id)}">✕</button></div>`).join('');
}
async function notify(title,body){
  try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}
  const cap=window.Capacitor,P=cap&&cap.Plugins;
  try{
    if(native&&P&&P.LocalNotifications){
      let perm=await P.LocalNotifications.checkPermissions();
      if(perm.display!=='granted')perm=await P.LocalNotifications.requestPermissions();
      if(perm.display==='granted')await P.LocalNotifications.schedule({notifications:[{id:Math.floor(Date.now()%2147483000),title,body,schedule:{at:new Date(Date.now()+300)}}]});
    }else if('Notification' in window&&Notification.permission==='granted'){
      new Notification(title,{body});
    }
  }catch(e){}
}
function checkAlerts(){
  const now=Date.now();let changed=false;
  S.notes.forEach(nt=>{
    if(nt.status!=='active'||!nt.alert)return;
    const c=S.acats.find(x=>x.id===nt.cat);if(!c)return;
    const p=catPrice(c),z=zone(nt);if(!p||!z||!inZone(p,z))return;
    if(nt.lastNotif&&now-nt.lastNotif<3600e3)return; // at most once per hour per analysis
    nt.lastNotif=now;changed=true;
    const text=`${c.name}: قیمت ${fp(p)} وارد محدوده‌ی «${nt.title}» شد — الان وقتشه!`;
    ALERTS.push({id:uid(),text});notify('Finora · '+c.name,text);
  });
  S.journal.forEach(t=>{
    if(t.status!=='open')return;
    const q=tquote(t);if(!q)return;
    const dir=t.side==='short'?-1:1;let hit='';
    if(t.tp>0&&(dir>0?q.p>=t.tp:q.p<=t.tp))hit='tp';
    else if(t.sl>0&&(dir>0?q.p<=t.sl:q.p>=t.sl))hit='sl';
    if(hit&&t.hit!==hit){
      t.hit=hit;changed=true;
      const text=`${t.symbol}: قیمت ${fp(q.p)} به ${hit==='tp'?'حد سود':'حد ضرر'} رسید`;
      ALERTS.push({id:uid(),icon:hit==='tp'?'🎯':'🛑',text});notify('Finora · '+t.symbol,text);
    }else if(!hit&&t.hit){t.hit='';changed=true}
  });
  if(changed){persist();renderAlerts()}
}
async function enableNotif(){
  const cap=window.Capacitor,P=cap&&cap.Plugins;
  try{
    if(native&&P&&P.LocalNotifications){const r=await P.LocalNotifications.requestPermissions();return toast(r.display==='granted'?'اعلان فعال شد':'اجازه‌ی اعلان داده نشد')}
    if(!('Notification' in window))return toast('این مرورگر اعلان را پشتیبانی نمی‌کند؛ هشدار داخل برنامه نمایش داده می‌شود');
    const r=await Notification.requestPermission();toast(r==='granted'?'اعلان فعال شد':'اجازه‌ی اعلان داده نشد');
  }catch(e){toast('فعال‌سازی اعلان ممکن نشد')}
}

/* ---------- AI ---------- */
async function callAI(system,user){
  const c=aiCfg();if(!c.key)throw new Error('کلید API در تنظیمات وارد نشده است');
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),90000),base=c.url.replace(/\/+$/,'');
  try{
    let r,j;
    if(c.provider==='anthropic'){
      r=await fetch(base+'/v1/messages',{method:'POST',signal:ctl.signal,headers:{'content-type':'application/json','x-api-key':c.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:c.model,max_tokens:1800,system,messages:[{role:'user',content:user}]})});
      j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j&&j.error&&j.error.message||'خطای سرور ('+r.status+')');
      return(j.content||[]).map(b=>b.text||'').join('').trim();
    }
    r=await fetch(base+'/chat/completions',{method:'POST',signal:ctl.signal,headers:{'content-type':'application/json','authorization':'Bearer '+c.key},body:JSON.stringify({model:c.model,messages:[{role:'system',content:system},{role:'user',content:user}]})});
    j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j&&j.error&&j.error.message||'خطای سرور ('+r.status+')');
    return str(j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content).trim();
  }catch(e){
    if(e&&e.name==='AbortError')throw new Error('پاسخی دریافت نشد (زمان تمام شد)');
    throw e;
  }finally{clearTimeout(t)}
}
const AI_SYS='تو دستیار تحلیل بازار هستی. کاربر چند تحلیل شخصی خودش را برای یک دارایی در طول زمان نوشته است. پاسخ را به فارسی و کوتاه بده با این ساختار: ۱) جمع‌بندی کلی ۲) هم‌خوانی‌ها و تناقض‌های تحلیل‌ها و تغییر دیدگاه در طول زمان ۳) سطوح و محدوده‌های کلیدی با توجه به قیمت فعلی ۴) سناریوهای محتمل ۵) ریسک‌ها. قطعی‌گویی نکن و فقط بر اساس داده‌ی همین تحلیل‌ها و قیمت داده‌شده نظر بده؛ این توصیه‌ی مالی قطعی نیست.';
function aiPrompt(c){
  const ns=S.notes.filter(x=>x.cat===c.id).sort((a,b)=>a.date.localeCompare(b.date)||a.created-b.created),p=catPrice(c);
  return`دسته: ${c.name}${c.symbol?' ('+c.symbol+')':''}\nقیمت فعلی: ${p?fp(p):'نامشخص'}\nتاریخ امروز: ${jfmt(todayISO())}\n\nتحلیل‌ها از قدیمی به جدید:\n`+ns.map((x,i)=>`${i+1}) تاریخ ${jfmt(x.date)} | ${x.title} | جهت: ${BIAS[x.bias]} | وضعیت: ${x.status==='active'?'فعال':'بسته'} | محدوده: ${x.lo||'-'} تا ${x.hi||'-'} | هدف: ${x.target||'-'} | حد ضرر: ${x.stop||'-'}\n${x.text||''}`).join('\n\n');
}

/* ---------- trading journal (4 accounts) ---------- */
const ps=a=>a.reduce((t,x)=>t+x.pnl,0);
const unitOf=id=>S.jUnits[id]||ACC[id].unit;
const am=(id,x)=>fmt(x)+' '+esc(unitOf(id));
const f1=x=>fa(n(x).toFixed(1)).replace('.','٫');
const pc=x=>(x>0.049?'+':x<-0.049?'−':'')+f1(Math.abs(x))+'٪';
const fmtQ=x=>n(x).toLocaleString('fa-IR',{maximumFractionDigits:8});
let jTab='cmp',jAcc='all',lastAcc='bourse';
function jStats(list){
  const c=list.filter(t=>t.status==='closed'),w=c.filter(t=>t.pnl>0),l=c.filter(t=>t.pnl<0);
  const gl=Math.abs(ps(l));
  return{total:list.length,open:list.length-c.length,closed:c.length,pnl:ps(c),
    win:c.length?w.length/c.length*100:0,avgW:w.length?ps(w)/w.length:0,avgL:l.length?ps(l)/l.length:0,
    pf:gl?ps(w)/gl:(ps(w)?Infinity:0),best:c.length?Math.max(...c.map(t=>t.pnl)):0,worst:c.length?Math.min(...c.map(t=>t.pnl)):0};
}
// Equity and growth per account. Deposits/withdrawals move equity but never count as profit:
// growth is a time-weighted return, so each trade's result is measured against the equity at that moment.
function accModel(id,upTo){
  const ev=[];
  S.flows.forEach((f,i)=>{if(f.acc===id&&(!upTo||f.date<=upTo))ev.push({d:f.date,o:0,i,flow:f.amount})});
  S.journal.forEach((t,i)=>{if(t.acc===id&&t.status==='closed'&&(!upTo||t.date<=upTo))ev.push({d:t.date,o:1,i,pnl:t.pnl})});
  ev.sort((a,b)=>a.d.localeCompare(b.d)||a.o-b.o||a.i-b.i);
  let eq=0,g=1,pnl=0,first=0,skipped=0,applied=0,netDep=0;const pts=[];
  ev.forEach(e=>{
    if(e.flow!==undefined){eq+=e.flow;netDep+=e.flow;if(!first&&e.flow>0)first=e.flow}
    else{
      pnl+=e.pnl;
      if(eq>0){g=Math.max(0,g*(1+e.pnl/eq));applied++}else skipped++;
      eq+=e.pnl;
    }
    pts.push([e.d,(g-1)*100]);
  });
  return{eq,pnl,initial:first,netDep,growth:(g-1)*100,pts,skipped,applied};
}
const monthPnl=id=>ps(S.journal.filter(t=>t.acc===id&&t.status==='closed'&&inM(t)));

function tradeLive(t){
  if(t.status!=='open'||!t.src)return'';
  if(!srcOk(t.src))return'منبع قیمت حذف شده است';
  const q=tquote(t);
  if(!q)return'قیمت لایو در دسترس نیست';
  const dir=t.side==='short'?-1:1,parts=[`قیمت فعلی <b dir="ltr">${fp(q.p)}</b>`];
  if(t.entry>0){
    const pct=(q.p-t.entry)/t.entry*100*dir;
    parts.push(`<b class="${pct>=0?'green':'red'}" dir="ltr">${pc(pct)}</b>`);
    if(t.size>0){const u=(q.p-t.entry)*t.size*dir;parts.push(`شناور <b class="${u>=0?'green':'red'}">${am(t.acc,u)}</b>`)}
  }
  if(t.hit==='tp')parts.push('🎯 به حد سود رسید');
  if(t.hit==='sl')parts.push('🛑 به حد ضرر رسید');
  return parts.join(' · ');
}
function floatPnl(id){
  let sum=0,k=0;
  S.journal.forEach(t=>{if(t.acc!==id||t.status!=='open')return;const q=tquote(t);if(q&&t.entry>0&&t.size>0){sum+=(q.p-t.entry)*t.size*(t.side==='short'?-1:1);k++}});
  return{sum,k};
}
function accLive(id){
  const m=accModel(id),f=floatPnl(id);
  if(!f.k||!(m.eq>0)||!m.pts.length)return null;
  const g=(1+m.growth/100)*(1+f.sum/m.eq)-1;
  return{pt:[todayISO(),g*100],g:g*100,sum:f.sum};
}
const liveGrowthHTML=id=>{const l=accLive(id);return l?`<b class="${l.g>=0?'green':'red'}" dir="ltr">${pc(l.g)}</b>`:'—'};
const floatHTML=id=>{const f=floatPnl(id);return f.k?`<b class="${f.sum>=0?'green':'red'}">${am(id,f.sum)}</b>`:'—'};
function tradeCard(t,showAcc){
  const bits=[];
  if(t.entry)bits.push('ورود '+fmt(t.entry));
  if(t.status==='closed'&&t.exit)bits.push('خروج '+fmt(t.exit));
  if(t.size)bits.push('حجم '+fmt(t.size));
  if(t.sl)bits.push('حد ضرر '+fmt(t.sl));
  if(t.tp)bits.push('حد سود '+fmt(t.tp));
  const a=ACC[t.acc];
  return`<div class="tcard" style="border-right:3px solid ${a.color}"><div class="row"><span><b>${esc(t.symbol)}</b> <span class="pill">${t.side==='short'?'Short':'Long'}</span> <span class="pill">${t.status==='open'?'باز':'بسته'}</span>${showAcc?` <span class="pill" style="color:${a.color}">${esc(a.name)}</span>`:''}</span><span class="mini">${jfmt(t.date)}</span></div>
${bits.length?`<div class="mini" style="margin-top:6px">${bits.join(' · ')}</div>`:''}${t.status==='open'&&t.src?`<div class="mini" style="margin-top:6px" data-tid="${esc(t.id)}">${tradeLive(t)}</div>`:''}${t.setup?`<div class="mini">ستاپ: ${esc(t.setup)}</div>`:''}${t.note?`<div class="tnote">${esc(t.note)}</div>`:''}
<div class="row" style="margin-top:8px"><b class="${t.status==='open'?'':t.pnl>=0?'green':'red'}">${t.status==='open'?'در جریان':am(t.acc,t.pnl)}</b><span>${t.status==='open'?`<button class="btn success" data-act="closeTrade" data-id="${esc(t.id)}">بستن معامله</button> `:''}<button class="btn danger" data-act="delTrade" data-id="${esc(t.id)}">×</button></span></div></div>`;
}
function renderJournal(){
  const tabs=[['cmp','📈 مقایسه'],['trades','🧾 معاملات'],['cap','💰 سرمایه']];
  const head=`<div class="seg">${tabs.map(t=>`<button class="${jTab===t[0]?'on':''}" data-act="jtab" data-t="${t[0]}">${t[1]}</button>`).join('')}</div>`;
  $('journal').innerHTML=head+(jTab==='cmp'?jCmp():jTab==='trades'?jTrades():jCap());
  if(jTab==='cmp')drawReturns('rc');
  if(S.journal.some(t=>t.status==='open'&&t.src))pollQuotes(false);
  if(jTab==='cap')prepSafe();
}
function jCmp(){
  const cards=ACCS.map(a=>{
    const m=accModel(a.id),st=jStats(S.journal.filter(t=>t.acc===a.id)),has=m.applied>0;
    return`<div class="card acard" style="border-top:3px solid ${a.color}"><div class="row"><b style="color:${a.color}">${esc(a.name)}</b><span class="pill">${esc(unitOf(a.id))}</span></div>
<div class="row"><span class="mini">سرمایه فعلی</span><b>${am(a.id,m.eq)}</b></div>
<div class="row"><span class="mini">سرمایه اولیه</span><span>${m.initial?am(a.id,m.initial):'—'}</span></div>
<div class="row"><span class="mini">سود/زیان معاملات</span><b class="${m.pnl>=0?'green':'red'}">${am(a.id,m.pnl)}</b></div>
<div class="row"><span class="mini">رشد سرمایه</span><b class="${m.growth>=0?'green':'red'}">${has?`<span dir="ltr">${pc(m.growth)}</span>`:'—'}</b></div>
${st.open?`<div class="row"><span class="mini">سود/زیان شناور (معاملات باز)</span><span data-fl="${a.id}">${floatHTML(a.id)}</span></div><div class="row"><span class="mini">رشد با احتساب شناور</span><span data-flg="${a.id}">${liveGrowthHTML(a.id)}</span></div>`:''}
<div class="row"><span class="mini">معاملات</span><span class="mini">${fa(st.closed)} بسته · ${fa(st.open)} باز · برد ${fa(st.win.toFixed(0))}٪</span></div>
${m.skipped?`<div class="mini" style="color:var(--y);margin-top:4px">${fa(m.skipped)} معامله بدون سرمایه ثبت‌شده در رشد حساب نشد (تب سرمایه)</div>`:''}</div>`}).join('');
  return`<div class="card"><h2>📈 رشد سرمایه هر حساب (٪)</h2><div class="legend">${ACCS.map(a=>`<span style="color:${a.color}">● ${esc(a.name)}</span>`).join('')}</div><canvas id="rc" class="chart"></canvas><div class="mini">فقط نتیجه‌ی معاملات حساب می‌شود؛ واریز و برداشت روی درصد رشد اثری ندارد. خط‌چین و دایره‌ی توخالی = وضعیت لایو با احتساب معاملات باز.</div></div><div class="grid g2 section">${cards}</div>`;
}
function jTrades(){
  const chips=[['all','همه'],...ACCS.map(a=>[a.id,a.name])];
  const chipH=`<div class="chips">${chips.map(c=>`<button class="chip${jAcc===c[0]?' on':''}" data-act="jacc" data-a="${c[0]}">${esc(c[1])}</button>`).join('')}</div>`;
  const list=S.journal.filter(t=>jAcc==='all'||t.acc===jAcc),mon=list.filter(t=>inM(t)),st=jStats(mon),one=jAcc!=='all';
  const pf=st.pf===Infinity?'∞':fa(st.pf.toFixed(2));
  const stats=one?`<div class="grid g4"><div class="card"><div class="label">سود/زیان ماه</div><div class="big ${st.pnl>=0?'green':'red'}" style="font-size:19px">${am(jAcc,st.pnl)}</div></div><div class="card"><div class="label">نرخ برد</div><div class="big blue">${fa(st.win.toFixed(0))}٪</div></div><div class="card"><div class="label">معاملات ماه</div><div class="big">${fa(st.total)}</div><div class="mini">${fa(st.closed)} بسته · ${fa(st.open)} باز</div></div><div class="card"><div class="label">ضریب سود</div><div class="big gold">${pf}</div></div></div>
<div class="grid g4 section"><div class="card"><div class="label">میانگین سود</div><div class="big green" style="font-size:16px">${am(jAcc,st.avgW)}</div></div><div class="card"><div class="label">میانگین ضرر</div><div class="big red" style="font-size:16px">${am(jAcc,st.avgL)}</div></div><div class="card"><div class="label">بهترین</div><div class="big green" style="font-size:16px">${am(jAcc,st.best)}</div></div><div class="card"><div class="label">بدترین</div><div class="big red" style="font-size:16px">${am(jAcc,st.worst)}</div></div></div>`
  :`<div class="grid g3"><div class="card"><div class="label">معاملات ماه</div><div class="big">${fa(st.total)}</div></div><div class="card"><div class="label">نرخ برد</div><div class="big blue">${fa(st.win.toFixed(0))}٪</div></div><div class="card"><div class="label">باز</div><div class="big gold">${fa(list.filter(t=>t.status==='open').length)}</div></div></div><div class="mini" style="margin:6px 2px">واحد حساب‌ها فرق دارد؛ برای سود/زیان دقیق یک حساب را انتخاب کنید یا تب «مقایسه» را ببینید.</div>`;
  const def=one?jAcc:lastAcc;
  const form=`<div class="card section"><h2>➕ ثبت معامله</h2><form class="form" data-form="journal"><div class="full"><label>حساب</label><select name="acc">${ACCS.map(a=>`<option value="${a.id}"${a.id===def?' selected':''}>${esc(a.name)}</option>`).join('')}</select></div><div><label>نماد</label><input name="symbol" required placeholder="BTC/USDT"></div><div><label>جهت</label><select name="side"><option value="long">Long (خرید)</option><option value="short">Short (فروش)</option></select></div><div><label>وضعیت</label><select name="status"><option value="closed">بسته</option><option value="open">باز</option></select></div>${dateField()}<div><label>قیمت ورود</label><input name="entry" type="number" step="any" min="0"></div><div><label>قیمت خروج</label><input name="exit" type="number" step="any" min="0"></div><div><label>حجم</label><input name="size" type="number" step="any" min="0"></div><div><label>سود/زیان (واحد حساب) — خالی = خودکار</label><input name="pnl" type="number" step="any"></div><div><label>حد ضرر</label><input name="sl" type="number" step="any" min="0"></div><div><label>حد سود</label><input name="tp" type="number" step="any" min="0"></div><div><label>منبع قیمت لایو</label><select name="src"><option value="auto" selected>خودکار (کریپتو ← Binance)</option>${srcOpts(null,'بدون قیمت لایو')}</select></div><div><label>نماد در منبع (اختیاری)</label><input name="psym" dir="ltr" placeholder="BTCUSDT"></div><div class="full"><label>ستاپ / استراتژی</label><input name="setup" placeholder="مثلاً شکست مقاومت"></div><div class="full"><label>یادداشت / درس‌های معامله</label><textarea name="note"></textarea></div><div class="full"><button class="btn primary">ثبت معامله</button></div></form></div>`;
  const open=list.filter(t=>t.status==='open').sort((p,q)=>q.date.localeCompare(p.date));
  const hist=mon.filter(t=>t.status==='closed').sort((p,q)=>q.date.localeCompare(p.date));
  return chipH+stats+form+`<div class="card section"><h2>🟢 معاملات باز</h2>${open.length?open.map(t=>tradeCard(t,!one)).join(''):'<div class="empty">معامله‌ی بازی نیست</div>'}</div>
<div class="card section"><h2>📚 معاملات بسته‌ی این ماه</h2>${hist.length?hist.map(t=>tradeCard(t,!one)).join(''):'<div class="empty">معامله‌ای ثبت نشده</div>'}</div>`;
}
function jCap(){
  const opts=ACCS.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');
  const asset=esc(S.invest.safe.asset);
  const units=ACCS.map(a=>`<div class="row" style="margin-top:6px"><span style="color:${a.color}">${esc(a.name)}</span><select data-unit="${a.id}" style="width:auto">${UNITS.map(u=>`<option${u===unitOf(a.id)?' selected':''}>${u}</option>`).join('')}</select></div>`).join('');
  const flows=S.flows.slice().sort((p,q)=>q.date.localeCompare(p.date)).slice(0,20).map(f=>`<div class="row todo" style="margin-top:6px"><span><b style="color:${ACC[f.acc].color}">${esc(ACC[f.acc].name)}</b><div class="mini">${jfmt(f.date)} · ${f.kind==='safe'?'انتقال به سرمایه امن':f.amount>0?'واریز':'برداشت'}${f.note&&f.kind!=='safe'?' · '+esc(f.note):''}</div></span><span><b class="${f.amount>0?'green':'red'}">${am(f.acc,Math.abs(f.amount))}</b> ${f.kind==='safe'?'':`<button class="btn danger" data-act="delFlow" data-id="${esc(f.id)}">×</button>`}</span></div>`).join('');
  const slog=S.safeLog.slice().sort((p,q)=>q.date.localeCompare(p.date)).map(s=>`<div class="row todo" style="margin-top:6px"><span><b style="color:${ACC[s.acc].color}">${esc(ACC[s.acc].name)}</b><div class="mini">${jfmt(s.date)} · قیمت ${fmt(s.price)} ${esc(s.unit)}</div></span><span><b class="gold">${fmt(s.amount)} ${esc(s.unit)} → ${fmtQ(s.qty)} ${esc(s.asset)}</b> <button class="btn danger" data-act="delSafe" data-id="${esc(s.id)}">×</button></span></div>`).join('');
  return`<div class="card"><h2>💰 تعیین / تغییر سرمایه</h2><form class="form" data-form="flow"><div class="full"><label>حساب</label><select name="acc">${opts}</select></div><div><label>نوع</label><select name="kind"><option value="deposit">واریز (افزایش سرمایه)</option><option value="withdraw">برداشت</option></select></div>${amountField().replace('مبلغ (تومان)','مبلغ (واحد حساب)')}${dateField()}<div><label>توضیح</label><input name="note" placeholder="سرمایه اولیه"></div><div class="full"><button class="btn primary">ثبت</button></div></form><div class="mini" style="margin-top:6px">اولین واریز هر حساب «سرمایه اولیه» حساب می‌شود. واریز و برداشت سود/زیان محسوب نمی‌شود؛ فقط نتیجه‌ی معاملات.</div>${flows?`<div style="margin-top:10px">${flows}</div>`:''}</div>
<div class="card section"><h2>🛡 انتقال پایان ماه به سرمایه امن (${asset})</h2><form class="form" data-form="tosafe" id="spf"><div class="full"><label>از حساب</label><select name="acc">${opts}</select></div><div><label>مبنای محاسبه</label><select name="basis"><option value="equity">درصد از سرمایه فعلی</option><option value="monthprofit">درصد از سود این ماه</option><option value="fixed">مبلغ ثابت</option></select></div><div><label>درصد</label><input name="pct" type="number" step="any" min="0" max="100" value="10"></div><div><label>مبلغ ثابت (واحد حساب)</label><input name="amount" type="number" step="any" min="0"></div><div><label>قیمت ۱ ${asset} (واحد حساب)</label><input name="price" type="number" step="any" min="0"></div>${dateField()}<div><label>توضیح</label><input name="note"></div><div class="full item" id="spPrev"></div><div class="full"><button class="btn success">انتقال</button></div></form>${slog?`<div style="margin-top:10px">${slog}</div>`:''}</div>
<div class="card section"><h2>⚙️ واحد هر حساب</h2>${units}<div class="mini" style="margin-top:6px">تغییر واحد فقط عنوان نمایش را عوض می‌کند و اعداد را تبدیل نمی‌کند.</div></div>`;
}
function spCompute(fd){
  const id=str(fd.get('acc')),basis=str(fd.get('basis')),pcnt=Math.min(100,Math.max(0,num(fd.get('pct')))),price=num(fd.get('price'));
  const m=accModel(id);let amount=0;
  if(basis==='fixed')amount=num(fd.get('amount'));
  else if(basis==='equity')amount=m.eq*pcnt/100;
  else amount=Math.max(0,monthPnl(id))*pcnt/100;
  amount=Math.round(amount*100)/100;
  return{id,basis,amount,price,qty:price>0?Math.round(amount/price*1e8)/1e8:0,eq:m.eq};
}
function spPreview(){
  const f=$('spf'),p=$('spPrev');if(!f||!p)return;
  const r=spCompute(new FormData(f));
  p.innerHTML=r.amount>0?`از ${esc(ACC[r.id].name)}: <b>${am(r.id,r.amount)}</b> ← <b class="gold">${r.qty?fmtQ(r.qty):'؟'} ${esc(S.invest.safe.asset)}</b>${r.price>0?'':' (قیمت را وارد کنید)'}`:'<span class="mini">مبلغ انتقال صفر است</span>';
}
function prepSafe(){
  const f=$('spf');if(!f)return;
  const fill=()=>{
    const pr_=f.elements.price,acc=f.elements.acc.value;
    if(pr_&&!pr_.value&&S.invest.safe.asset.toUpperCase()==='BTC'&&unitOf(acc)==='USDT'){
      const q=QUOTES['binance:BTCUSDT'];if(q)pr_.value=q.p;
    }
    spPreview();
  };
  fill();
  if(S.invest.safe.asset.toUpperCase()==='BTC'&&!QUOTES['binance:BTCUSDT'])fetchQ('binance','BTCUSDT').then(()=>{if($('spf')===f)fill()});
}

/* ---------- to-do (optional deadline: Jalali calendar + time) ---------- */
const PRIO={1:['مهم','red'],2:['متوسط','gold'],3:['کم','blue']};
const LEADS=[[0,'به‌موقع'],[10,'۱۰ دقیقه قبل'],[30,'۳۰ دقیقه قبل'],[60,'۱ ساعت قبل'],[1440,'۱ روز قبل']];
const LN=()=>{const c=window.Capacitor;return native&&c&&c.Plugins&&c.Plugins.LocalNotifications||null};
function remindAt(t){
  if(!t.due||t.done)return null;
  const [y,m,d]=t.due.split('-').map(Number),[hh,mm]=(t.time||'09:00').split(':').map(Number);
  return new Date(y,m-1,d,hh,mm-(t.lead||0));
}
const todoBody=t=>`${t.title} — مهلت ${jfmt(t.due)}${t.time?' ساعت '+fa(t.time):''}`;
async function scheduleTodo(t,ask){
  const P=LN(),at=remindAt(t);
  if(!P||!at||at<=new Date())return false;
  try{
    let p=await P.checkPermissions();
    if(p.display!=='granted'){if(!ask)return false;p=await P.requestPermissions();if(p.display!=='granted')return false}
    await P.schedule({notifications:[{id:t.nid,title:'Finora · یادآوری',body:todoBody(t),schedule:{at,allowWhileIdle:true},extra:{todo:t.id}}]});
    return true;
  }catch(e){return false}
}
const cancelTodo=t=>{const P=LN();if(P)try{P.cancel({notifications:[{id:t.nid}]}).catch(()=>{})}catch(e){}};
const cancelAllTodos=list=>{const P=LN();if(P&&list.length)try{P.cancel({notifications:list.map(t=>({id:t.nid}))}).catch(()=>{})}catch(e){}};
async function syncTodos(){for(const t of S.todos)if(!t.done&&t.due)await scheduleTodo(t,false)}
function checkTodos(){
  const now=new Date();let changed=false;
  S.todos.forEach(t=>{
    if(t.done||!t.due||t.notified)return;
    const at=remindAt(t);if(!at||at>now)return;
    t.notified=true;changed=true;
    if(now-at>10*60e3)return; // app was closed meanwhile; the system notification was already delivered
    ALERTS.push({id:uid(),icon:'⏰',text:todoBody(t)});
    if(!native)notify('Finora · یادآوری',todoBody(t));
  });
  if(changed){persist();renderAlerts()}
}
const dueNew=()=>({on:false,ym:'',iso:'',tOn:false,time:'09:00',lead:'0',title:'',prio:'2'});
let dueD=dueNew();
function jDays(y,m){
  if(m<=6)return 31;if(m<=11)return 30;
  const g=j2g(y,12,30),b=g2j(g[0],g[1],g[2]);
  return b[0]===y&&b[1]===12&&b[2]===30?30:29;
}
function calHTML(ym,sel){
  const [y,m]=ym.split('-').map(Number),g=j2g(y,m,1),first=(new Date(g[0],g[1]-1,g[2]).getDay()+1)%7,days=jDays(y,m),td=todayISO();
  let cells='';
  for(let i=0;i<first;i++)cells+='<span></span>';
  for(let d=1;d<=days;d++){
    const gg=j2g(y,m,d),iso=gg[0]+'-'+pad(gg[1])+'-'+pad(gg[2]);
    cells+=`<button type="button" class="${iso===sel?'sel':''}${iso===td?' today':''}" data-act="calpick" data-iso="${iso}">${fa(d)}</button>`;
  }
  return`<div class="cal"><div class="row"><button type="button" class="btn" data-act="calprev" aria-label="ماه قبل">›</button><b>${JM[m-1]} ${fa(y)}</b><button type="button" class="btn" data-act="calnext" aria-label="ماه بعد">‹</button></div><div class="cg">${['ش','ی','د','س','چ','پ','ج'].map(x=>`<i>${x}</i>`).join('')}${cells}</div><button type="button" class="btn" data-act="caltoday">امروز</button></div>`;
}
function dueHTML(){
  if(!dueD.on)return'';
  const sel=dueD.iso?`<div class="item">📅 ${jfmt(dueD.iso)}</div>`:'<div class="mini" style="margin-top:6px">یک روز را انتخاب کنید</div>';
  const tm=dueD.iso?`<div style="margin-top:8px"><label class="chkrow"><input type="checkbox" data-tgl="time"${dueD.tOn?' checked':''}> ساعت</label>${dueD.tOn?`<input type="time" id="dueTime" value="${esc(dueD.time)}" style="max-width:160px;margin-top:6px">`:''}</div><div style="margin-top:8px"><label>یادآوری</label><select id="dueLead" style="max-width:200px">${LEADS.map(l=>`<option value="${l[0]}"${String(l[0])===dueD.lead?' selected':''}>${l[1]}</option>`).join('')}</select>${dueD.tOn?'':'<div class="mini">بدون ساعت، یادآوری ساعت ۹ صبح همان روز است.</div>'}</div>`:'';
  return calHTML(dueD.ym,dueD.iso)+sel+tm;
}
const paintDue=()=>{const b=$('duebox');if(b)b.innerHTML=dueHTML()};
const dueKey=t=>(t.due||'9999-99-99')+(t.time||'24:00');
function renderTodo(){
  const T=S.todos,open=T.filter(t=>!t.done).length,done=T.length-open,now=todayISO(),nowT=now+'T'+new Date().toTimeString().slice(0,5);
  let a=T.filter(t=>todoFilter==='all'||(todoFilter==='open'?!t.done:t.done));
  a=a.slice().sort((p,q)=>(p.done-q.done)||(p.prio-q.prio)||dueKey(p).localeCompare(dueKey(q)));
  $('todo').innerHTML=`<div class="card"><h2>➕ کار جدید</h2><form class="form" data-form="todo"><div class="full"><label>عنوان</label><input name="title" required maxlength="200" autocomplete="off" value="${esc(dueD.title)}"></div><div class="full"><label>اولویت</label><select name="prio">${[['1','مهم'],['2','متوسط'],['3','کم']].map(p=>`<option value="${p[0]}"${dueD.prio===p[0]?' selected':''}>${p[1]}</option>`).join('')}</select></div><div class="full"><label class="chkrow"><input type="checkbox" data-tgl="due"${dueD.on?' checked':''}> مهلت</label><div id="duebox">${dueHTML()}</div></div><div class="full"><button class="btn primary">افزودن</button></div></form></div>
<div class="card section"><div class="row"><h2 style="margin:0">📝 لیست کارها</h2><span class="mini">${fa(open)} باز · ${fa(done)} انجام‌شده</span></div>
<div class="actions">${[['open','باز'],['done','انجام‌شده'],['all','همه']].map(f=>`<button class="btn${todoFilter===f[0]?' primary':''}" data-act="tfilter" data-f="${f[0]}">${f[1]}</button>`).join('')}${done?'<button class="btn danger" data-act="clearDone">حذف انجام‌شده‌ها</button>':''}</div>
<div style="margin-top:10px">${a.length?a.map(t=>{const late=!t.done&&t.due&&(t.time?t.due+'T'+t.time<nowT:t.due<now);return`<div class="todo${t.done?' done':''}"><button class="chk" data-act="toggleTodo" data-id="${esc(t.id)}" aria-label="تغییر وضعیت">${t.done?'✅':'⬜'}</button><div class="tb" data-act="editTodo" data-id="${esc(t.id)}"><div class="tt">${esc(t.title)}</div><div class="mini"><span class="${PRIO[t.prio][1]}">● ${PRIO[t.prio][0]}</span>${t.due?` · <span class="${late?'red':''}">${jfmt(t.due)}${t.time?' · ساعت '+fa(t.time):''}${late?' (گذشته)':''}</span>${t.lead&&!t.done?' · ⏰ '+(LEADS.find(l=>l[0]===t.lead)||[0,''])[1]:''}`:''}</div></div><button class="btn danger" data-act="delTodo" data-id="${esc(t.id)}">×</button></div>`}).join(''):'<div class="empty">موردی نیست</div>'}</div></div>`;
}

/* ---------- charts (RTL aware) ---------- */
function setup(c){
  const dpr=window.devicePixelRatio||1,W=Math.max(1,c.clientWidth*dpr),H=Math.max(1,c.clientHeight*dpr);
  c.width=W;c.height=H;
  const x=c.getContext('2d');x.clearRect(0,0,W,H);x.direction='rtl';
  x.font=`${11*dpr}px Tahoma,system-ui,sans-serif`;
  return{x,W,H,dpr};
}
const fmtM=v=>(v/1e6).toLocaleString('fa-IR',{maximumFractionDigits:1})+' م';
function drawCosts(id){
  const c=$(id);if(!c)return;
  const {x,W,H,dpr}=setup(c);
  const d={};S.wallet.expense.filter(e=>inM(e)).forEach(e=>d[e.cat]=(d[e.cat]||0)+e.amount);
  const a=Object.entries(d).sort((p,q)=>q[1]-p[1]).slice(0,7);
  if(!a.length){x.fillStyle='#9aa4b4';x.textAlign='center';x.fillText('هزینه‌ای ثبت نشده',W/2,H/2);return}
  const mx=Math.max(1,...a.map(e=>e[1])),p=6*dpr,x0=W-p-96*dpr,maxL=Math.max(10,x0-64*dpr-p);
  a.forEach(([k,v],i)=>{
    const y=(14+i*28)*dpr,L=maxL*v/mx;
    x.textAlign='right';x.fillStyle='#9aa4b4';x.fillText(k,W-p,y+11*dpr);
    x.fillStyle='#5ba7ff';x.fillRect(x0-L,y,L,14*dpr);
    x.fillStyle='#fff';x.fillText(fmtM(v),x0-L-4*dpr,y+11*dpr);
  });
}
function drawMonth(id,ms){
  const c=$(id);if(!c)return;
  const {x,W,H,dpr}=setup(c);
  const mx=Math.max(1,...ms.flatMap(r=>r.slice(1)));
  const L=24*dpr,R=24*dpr,T=14*dpr,B=28*dpr,cw=W-L-R,ch=H-T-B;
  const px=i=>W-R-i*cw/(ms.length-1); // oldest month on the right
  const py=v=>T+ch-(v/mx)*ch;
  x.strokeStyle='#2b3444';x.lineWidth=dpr;x.beginPath();x.moveTo(L,T+ch);x.lineTo(W-R,T+ch);x.stroke();
  [['#35d07f',1],['#ff6477',2],['#e7b84b',3]].forEach(([col,j])=>{
    x.strokeStyle=col;x.fillStyle=col;x.lineWidth=2*dpr;x.beginPath();
    ms.forEach((r,i)=>{i?x.lineTo(px(i),py(r[j])):x.moveTo(px(i),py(r[j]))});x.stroke();
    ms.forEach((r,i)=>{x.beginPath();x.arc(px(i),py(r[j]),2.5*dpr,0,7);x.fill()});
  });
  x.fillStyle='#9aa4b4';x.textAlign='center';
  ms.forEach((r,i)=>x.fillText(JM[+r[0].split('-')[1]-1],px(i),H-8*dpr));
}
function drawReturns(id){
  const c=$(id);if(!c)return;
  const {x,W,H,dpr}=setup(c);
  const ser=ACCS.map(a=>({a,pts:accModel(a.id).pts,live:accLive(a.id)})).filter(r=>r.pts.length);
  if(!ser.length){x.fillStyle='#9aa4b4';x.textAlign='center';x.fillText('هنوز سرمایه یا معامله‌ای ثبت نشده',W/2,H/2);return}
  const day=iso=>Date.parse(iso+'T00:00:00Z')/864e5,all=ser.flatMap(r=>r.live?[...r.pts,r.live.pt]:r.pts),dates=all.map(p=>p[0]).sort();
  const t0=day(dates[0]);let t1=day(dates[dates.length-1]);if(t1===t0)t1=t0+1;
  const mn=Math.min(0,...all.map(p=>p[1])),mxv=Math.max(0,...all.map(p=>p[1]));
  let lo=mn,hi=mxv;if(hi===lo)hi=lo+1;const pd=(hi-lo)*0.12;lo-=pd;hi+=pd;
  const L=48*dpr,R=14*dpr,T=12*dpr,B=26*dpr,cw=W-L-R,ch=H-T-B;
  const px=t=>W-R-(t-t0)/(t1-t0)*cw,py=v=>T+ch-(v-lo)/(hi-lo)*ch; // oldest date on the right
  x.font=`${10*dpr}px Tahoma,system-ui,sans-serif`;
  [...new Set([mn,0,mxv])].forEach(v=>{
    x.strokeStyle=v===0?'#456080':'#2b3444';x.lineWidth=dpr;x.setLineDash(v===0?[]:[4*dpr,4*dpr]);
    x.beginPath();x.moveTo(L,py(v));x.lineTo(W-R,py(v));x.stroke();x.setLineDash([]);
    x.fillStyle='#9aa4b4';x.textAlign='right';x.fillText(pc(v).replace('+',''),L-4*dpr,py(v)+3*dpr);
  });
  ser.forEach(({a,pts,live})=>{
    x.strokeStyle=a.color;x.fillStyle=a.color;x.lineWidth=2*dpr;x.beginPath();
    pts.forEach((p,i)=>{const X=px(day(p[0])),Y=py(p[1]);i?x.lineTo(X,Y):x.moveTo(X,Y)});x.stroke();
    pts.forEach(p=>{x.beginPath();x.arc(px(day(p[0])),py(p[1]),2.5*dpr,0,7);x.fill()});
    if(live){ // open trades at the current live price: dashed segment + hollow marker
      const last=pts[pts.length-1],X0=px(day(last[0])),Y0=py(last[1]),X1=px(day(live.pt[0])),Y1=py(live.pt[1]);
      x.setLineDash([5*dpr,4*dpr]);x.beginPath();x.moveTo(X0,Y0);x.lineTo(X1,Y1);x.stroke();x.setLineDash([]);
      x.beginPath();x.arc(X1,Y1,4*dpr,0,7);x.fillStyle='#0b0d12';x.fill();x.lineWidth=2*dpr;x.stroke();
    }
  });
  x.fillStyle='#9aa4b4';x.textAlign='right';x.fillText(jfmt(dates[0]),W-R,H-8*dpr);
  x.textAlign='left';x.fillText(jfmt(dates[dates.length-1]),L,H-8*dpr);
}
let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(page==='home'||(page==='journal'&&jTab==='cmp'))render()},150)});

/* ---------- forms ---------- */
const pdate=f=>{const d=parseJ(f.get('date'));if(!d)toast('تاریخ نامعتبر است (مثال: ۱۴۰۵/۰۷/۱۳)');return d};
function commit(msg,d){
  if(!save())return;
  toast(msg+(d&&mkey(d)!==S.month?` (در ${monthLabel(mkey(d))} نمایش داده می‌شود)`:''));
}
const FORMS={
  income(f){
    const a=n(f.get('amount'));if(!(a>0))return toast('مبلغ باید بیشتر از صفر باشد');
    const d=pdate(f);if(!d)return;
    S.wallet.income.push({id:uid(),amount:a,type:str(f.get('type')),date:d,note:str(f.get('note'))});commit('درآمد ثبت شد',d);
  },
  expense(f){
    const a=n(f.get('amount'));if(!(a>0))return toast('مبلغ باید بیشتر از صفر باشد');
    const d=pdate(f);if(!d)return;
    S.wallet.expense.push({id:uid(),amount:a,cat:str(f.get('cat')),date:d,note:str(f.get('note'))});commit('هزینه ثبت شد',d);
  },
  transfer(f){
    const a=n(f.get('amount'));if(!(a>0))return toast('مبلغ باید بیشتر از صفر باشد');
    const d=pdate(f);if(!d)return;
    // balance must cover the transfer at its own date and overall
    if(a>bal(x=>x.date<=d)||a>bal(()=>true))return toast('موجودی کیف پول کافی نیست');
    S.wallet.transfer.push({id:uid(),amount:a,dest:str(f.get('dest')),date:d,note:str(f.get('note'))});commit('انتقال ثبت شد',d);
  },
  safe(f){S.invest.safe={asset:str(f.get('asset')).trim()||'BTC',current:n(f.get('current')),target:n(f.get('target'))};save()&&toast('ذخیره شد')},
  asset(f){S.invest.assets.push({id:uid(),name:str(f.get('name')),symbol:str(f.get('symbol')),type:str(f.get('type')),qty:n(f.get('qty')),price:n(f.get('price'))});save()&&toast('دارایی افزوده شد')},
  journal(f){
    const d=pdate(f);if(!d)return;
    const acc=ACC[f.get('acc')]?f.get('acc'):'bourse';
    const status=f.get('status')==='open'?'open':'closed',side=f.get('side')==='short'?'short':'long';
    const entry=n(f.get('entry')),exit=n(f.get('exit')),size=n(f.get('size'));
    let pnl=0;
    if(status==='closed'){
      if(str(f.get('pnl')).trim()!=='')pnl=n(f.get('pnl'));
      else if(entry>0&&exit>0&&size>0)pnl=(exit-entry)*size*(side==='short'?-1:1);
      else return toast('سود/زیان را وارد کنید یا ورود، خروج و حجم را پر کنید');
    }
    let src=str(f.get('src'));
    if(src==='auto'&&acc!=='cryptosig'&&str(f.get('psym')).trim())return toast('برای این حساب منبع قیمت را انتخاب کنید');
    if(src==='auto')src=acc==='cryptosig'?'binance':'';if(src&&!srcOk(src))src='';
    const psym=str(f.get('psym')).trim().slice(0,40),tmp={src,psym,symbol:str(f.get('symbol')).trim()};
    if(src&&!symOk(src,tsym(tmp)))return toast('نماد قیمت نامعتبر است (مثال: BTCUSDT)');
    lastAcc=acc;
    S.journal.push({id:uid(),acc,src,psym,hit:'',symbol:str(f.get('symbol')).trim(),side,status,entry,exit,size,sl:n(f.get('sl')),tp:n(f.get('tp')),pnl,setup:str(f.get('setup')).trim(),note:str(f.get('note')).trim(),date:d});
    commit('معامله در «'+ACC[acc].name+'» ثبت شد',d);
  },
  flow(f){
    const acc=ACC[f.get('acc')]?f.get('acc'):'bourse',a=n(f.get('amount'));
    if(!(a>0))return toast('مبلغ باید بیشتر از صفر باشد');
    const d=pdate(f);if(!d)return;
    const w=f.get('kind')==='withdraw';
    if(w&&(a>accModel(acc,d).eq||a>accModel(acc).eq))return toast('سرمایه‌ی حساب برای این برداشت کافی نیست');
    S.flows.push({id:uid(),acc,date:d,amount:w?-a:a,kind:w?'withdraw':'deposit',note:str(f.get('note')).trim(),ref:''});
    save()&&toast(w?'برداشت ثبت شد':'سرمایه افزوده شد (سود حساب نمی‌شود)');
  },
  tosafe(f){
    const r=spCompute(f),d=pdate(f);if(!d)return;
    if(!(r.amount>0))return toast('مبلغ انتقال صفر است');
    if(!(r.price>0))return toast('قیمت دارایی امن را وارد کنید');
    if(r.amount>accModel(r.id,d).eq+1e-9||r.amount>r.eq+1e-9)return toast('سرمایه‌ی حساب کافی نیست');
    const sid_=uid(),asset=S.invest.safe.asset;
    S.safeLog.push({id:sid_,acc:r.id,date:d,amount:r.amount,unit:unitOf(r.id),price:r.price,qty:r.qty,asset,note:str(f.get('note')).trim()});
    S.flows.push({id:uid(),acc:r.id,date:d,amount:-r.amount,kind:'safe',note:'انتقال به سرمایه امن',ref:sid_});
    S.invest.safe.current=n(S.invest.safe.current)+r.qty;
    save()&&toast(`${fmtQ(r.qty)} ${asset} به دارایی امن اضافه شد`);
  },
  todo(f){
    const title=str(f.get('title')).trim();if(!title)return toast('عنوان را وارد کنید');
    let due='',time='';
    if(dueD.on){
      if(!dueD.iso)return toast('تاریخ مهلت را از تقویم انتخاب کنید');
      due=dueD.iso;
      if(dueD.tOn){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(dueD.time))return toast('ساعت را انتخاب کنید');time=dueD.time}
    }
    const t={id:uid(),title,due,time,lead:due?+dueD.lead||0:0,nid:newNid(),notified:false,prio:[1,2,3].includes(+f.get('prio'))?+f.get('prio'):2,done:false};
    const at=remindAt(t);if(at&&at<=new Date())t.notified=true;
    S.todos.push(t);
    dueD=dueNew();
    if(!save())return;
    if(!due)return toast('کار افزوده شد');
    if(at&&at<=new Date())return toast('کار افزوده شد (زمان یادآوری گذشته است)');
    if(!native)return toast('کار افزوده شد · یادآوری وقتی برنامه باز است کار می‌کند');
    toast('کار افزوده شد');
    scheduleTodo(t,true).then(okk=>toast(okk?'کار افزوده شد · یادآوری تنظیم شد':'کار افزوده شد · یادآوری تنظیم نشد (اجازه‌ی اعلان را بدهید)'));
  },
  acat(f){
    const name=str(f.get('name')).trim().slice(0,40);if(!name)return toast('نام دسته را وارد کنید');
    const src=srcOk(str(f.get('src')))?str(f.get('src')):'binance';
    let sym=str(f.get('symbol')).trim();if(src==='binance')sym=sym.toUpperCase();
    if(sym&&!symOk(src,sym))return toast('نماد نامعتبر است (مثال: BTCUSDT)');
    const c={id:uid(),name,src,symbol:sym,manual:0,manualAt:'',ai:null};
    S.acats.push(c);aCat=c.id;aNew=false;save()&&toast('دسته ساخته شد');
  },
  anote(f){
    const title=str(f.get('title')).trim();if(!title)return toast('عنوان را وارد کنید');
    const d=pdate(f);if(!d)return;
    const lo=n(f.get('lo')),hi=n(f.get('hi')),alert_=f.get('alert')==='on';
    if(alert_&&!(lo>0||hi>0))return toast('برای اعلان، محدوده‌ی قیمت را وارد کنید');
    S.notes.push({id:uid(),cat:aCat,date:d,title:title.slice(0,120),text:str(f.get('text')).trim().slice(0,5000),bias:['buy','sell','watch'].includes(f.get('bias'))?f.get('bias'):'watch',lo,hi,target:n(f.get('target')),stop:n(f.get('stop')),alert:alert_,status:'active',lastNotif:0,created:Date.now()});
    save()&&toast('تحلیل ثبت شد');
  },
  srcadd(f){
    const cfg=srcFromForm(f);if(typeof cfg==='string')return toast(cfg);
    SRC.push({id:'s'+uid(),...cfg});
    if(!saveSrc()){SRC.pop();return toast('ذخیره ناموفق بود')}
    render();toast('منبع قیمت افزوده شد');
  },
  aiset(f){
    const o={provider:f.get('provider')==='openai'?'openai':'anthropic',url:str(f.get('url')).trim(),model:str(f.get('model')).trim(),key:str(f.get('key')).trim()};
    if(o.url&&!/^https:\/\//.test(o.url))return toast('آدرس باید با https:// شروع شود');
    try{localStorage.setItem(AIK,JSON.stringify(o));toast('تنظیمات AI ذخیره شد')}catch(e){toast('ذخیره ناموفق بود')}
  }
};
document.addEventListener('submit',e=>{
  const f=e.target.closest('form[data-form]');if(!f)return;
  e.preventDefault();
  const h=FORMS[f.dataset.form];if(h)h(new FormData(f));
});

/* ---------- actions ---------- */
const ok=m=>confirm(m);
const ACTS={
  del(d){if(!ok('این تراکنش حذف شود؟'))return;if(!S.wallet[d.k])return;S.wallet[d.k]=S.wallet[d.k].filter(x=>x.id!==d.id);save()},
  delAsset(d){if(!ok('این دارایی حذف شود؟'))return;S.invest.assets=S.invest.assets.filter(x=>x.id!==d.id);save()},
  delTrade(d){if(!ok('این معامله حذف شود؟'))return;S.journal=S.journal.filter(x=>x.id!==d.id);save()},
  closeTrade(d){
    const t=S.journal.find(x=>x.id===d.id);if(!t)return;
    const lq=tquote(t),v=prompt('قیمت خروج '+t.symbol,lq?lq.p:'');if(v===null)return;
    const exit=num(v);if(!(exit>0))return toast('قیمت خروج نامعتبر است');
    let pnl;
    if(t.entry>0&&t.size>0)pnl=(exit-t.entry)*t.size*(t.side==='short'?-1:1);
    else{const p=prompt('سود/زیان ('+unitOf(t.acc)+')','');if(p===null)return;pnl=num(p)}
    t.exit=exit;t.pnl=pnl;t.status='closed';t.hit='';save()&&toast('معامله بسته شد');
  },
  toggleTodo(d){
    const t=S.todos.find(x=>x.id===d.id);if(!t)return;
    t.done=!t.done;
    if(t.done)cancelTodo(t);
    else{const at=remindAt(t);t.notified=!!(at&&at<=new Date());scheduleTodo(t,false)}
    save();
  },
  delTodo(d){if(!ok('این کار حذف شود؟'))return;const t0=S.todos.find(x=>x.id===d.id);if(t0)cancelTodo(t0);S.todos=S.todos.filter(x=>x.id!==d.id);save()},
  editTodo(d){const t=S.todos.find(x=>x.id===d.id);if(!t)return;const v=prompt('ویرایش عنوان',t.title);if(v===null)return;if(!v.trim())return toast('عنوان خالی است');t.title=v.trim().slice(0,200);if(t.due&&!t.done)scheduleTodo(t,false);save()},
  tfilter(d){todoFilter=['open','done','all'].includes(d.f)?d.f:'open';render()},
  clearDone(){if(!ok('همه‌ی کارهای انجام‌شده حذف شوند؟'))return;S.todos=S.todos.filter(t=>!t.done);save()},
  menu:goMenu,
  srcdel(d){
    const sx=SRC.find(x=>x.id===d.id);if(!sx)return;
    if(!ok('منبع «'+sx.name+'» حذف شود؟ معاملات و دسته‌هایی که از آن قیمت می‌گیرند قیمت لایو را از دست می‌دهند.'))return;
    SRC=SRC.filter(x=>x.id!==d.id);saveSrc();render();
  },
  async srctest(){
    const f=document.querySelector('form[data-form="srcadd"]');if(!f)return;
    const fd=new FormData(f),cfg=srcFromForm(fd,true);if(typeof cfg==='string')return toast(cfg);
    const sym=str(fd.get('test')).trim();
    if(cfg.url.includes('{symbol}')&&!sym)return toast('نماد تست را وارد کنید');
    toast('در حال تست…');
    const p=await fetchQ('__test',sym,cfg);
    toast(p?'قیمت دریافتی: '+fp(p):'پاسخ معتبر نگرفتیم؛ آدرس، مسیر JSON یا CORS را بررسی کنید');
  },
  async testNotif(){await enableNotif();notify('Finora','اعلان آزمایشی ✓')},
  async exactAlarm(){
    const P=LN();if(!P||!P.checkExactNotificationSetting)return toast('این گزینه فقط در نسخه‌ی اندروید است');
    try{const r=await P.checkExactNotificationSetting();if(r.exact_alarm==='granted')return toast('دقت زمان‌بندی از قبل فعال است');await P.changeExactNotificationSetting()}catch(e){toast('تنظیم ممکن نشد')}
  },
  jtab(d){jTab=['cmp','trades','cap'].includes(d.t)?d.t:'cmp';render()},
  jacc(d){jAcc=d.a==='all'||ACC[d.a]?d.a:'all';render()},
  delFlow(d){
    const f=S.flows.find(x=>x.id===d.id);if(!f||f.kind==='safe')return;
    if(!ok('این مورد حذف شود؟'))return;
    S.flows=S.flows.filter(x=>x.id!==d.id);
    if(accModel(f.acc).eq<-1e-9){S.flows.push(f);return toast('حذف این واریز سرمایه‌ی حساب را منفی می‌کند')}
    save();
  },
  delSafe(d){
    const s_=S.safeLog.find(x=>x.id===d.id);if(!s_)return;
    if(!ok('این انتقال حذف شود؟ مبلغ به حساب برمی‌گردد و از دارایی امن کم می‌شود.'))return;
    S.safeLog=S.safeLog.filter(x=>x.id!==d.id);S.flows=S.flows.filter(x=>x.ref!==d.id);
    S.invest.safe.current=Math.max(0,n(S.invest.safe.current)-s_.qty);save();
  },
  calpick(d){if(ISO_RE.test(d.iso||'')){dueD.iso=d.iso;paintDue()}},
  calprev(){dueD.ym=addMonth(dueD.ym||curMonth(),-1);paintDue()},
  calnext(){dueD.ym=addMonth(dueD.ym||curMonth(),1);paintDue()},
  caltoday(){dueD.iso=todayISO();dueD.ym=curMonth();paintDue()},
  acat(d){aCat=d.id;aNew=false;render()},
  toggleNewCat(){aNew=!aNew;render()},
  arefresh(){pollQuotes(true,true).then(()=>toast('قیمت به‌روز شد'))},
  setManual(){
    const c=S.acats.find(x=>x.id===aCat);if(!c)return;
    const v=prompt('قیمت فعلی «'+c.name+'»',c.manual||'');if(v===null)return;
    const p=num(v);if(!(p>0))return toast('قیمت نامعتبر است');
    c.manual=p;c.manualAt=new Date().toISOString();persist();paintLive();checkAlerts();toast('قیمت ثبت شد');
  },
  editCat(){
    const c=S.acats.find(x=>x.id===aCat);if(!c)return;
    const nm=prompt('نام دسته',c.name);if(nm===null)return;if(!nm.trim())return toast('نام خالی است');
    let src=c.src||'binance';
    if(SRC.length){
      const all=[{id:'binance',name:'Binance'},...SRC],sn=prompt('منبع قیمت: '+all.map(x=>x.name).join(' / '),srcName(src));if(sn===null)return;
      const hit=all.find(x=>x.name.toLowerCase()===sn.trim().toLowerCase());if(!hit)return toast('منبع پیدا نشد');src=hit.id;
    }
    const sy=prompt('نماد در منبع (خالی = بدون قیمت لایو)',c.symbol);if(sy===null)return;
    const sym=src==='binance'?sy.trim().toUpperCase():sy.trim();if(sym&&!symOk(src,sym))return toast('نماد نامعتبر است');
    c.name=nm.trim().slice(0,40);c.src=src;c.symbol=sym;save();
  },
  delCat(){
    const c=S.acats.find(x=>x.id===aCat);if(!c)return;
    if(!ok('دسته‌ی «'+c.name+'» با همه‌ی تحلیل‌هایش حذف شود؟'))return;
    S.acats=S.acats.filter(x=>x.id!==c.id);S.notes=S.notes.filter(x=>x.cat!==c.id);aCat='';save();
  },
  toggleAlert(d){const t=S.notes.find(x=>x.id===d.id);if(!t)return;if(!t.alert&&!zone(t))return toast('این تحلیل محدوده‌ی قیمت ندارد');t.alert=!t.alert;t.lastNotif=0;save()},
  toggleNote(d){const t=S.notes.find(x=>x.id===d.id);if(t){t.status=t.status==='done'?'active':'done';save()}},
  editNote(d){const t=S.notes.find(x=>x.id===d.id);if(!t)return;const v=prompt('ویرایش متن تحلیل',t.text);if(v===null)return;t.text=v.trim().slice(0,5000);save()},
  delNote(d){if(!ok('این تحلیل حذف شود؟'))return;S.notes=S.notes.filter(x=>x.id!==d.id);save()},
  dismissAlert(d){ALERTS=ALERTS.filter(a=>a.id!==d.id);renderAlerts()},
  enableNotif,
  async aiAnalyze(){
    const c=S.acats.find(x=>x.id===aCat);if(!c||aiBusy)return;
    if(!S.notes.some(x=>x.cat===c.id))return toast('ابتدا یک تحلیل ثبت کنید');
    if(!aiCfg().key)return toast('کلید API را در تنظیمات وارد کنید');
    aiBusy=true;
    const btn=document.querySelector('[data-act="aiAnalyze"]');if(btn){btn.disabled=true;btn.textContent='در حال دریافت…'}
    try{
      const txt=await callAI(AI_SYS,aiPrompt(c));
      if(!txt)throw new Error('پاسخ خالی بود');
      c.ai={text:txt.slice(0,10000),date:todayISO()};persist();
      const o=$('aiout');if(o&&aCat===c.id)o.innerHTML=`<div class="tnote" style="margin-top:10px">${esc(c.ai.text)}</div><div class="mini">پاسخ AI · ${jfmt(c.ai.date)}</div>`;
    }catch(e){toast('AI: '+(e&&e.message||'خطا'))}
    finally{aiBusy=false;const b=document.querySelector('[data-act="aiAnalyze"]');if(b){b.disabled=false;b.textContent='🤖 تحلیل با AI'}}
  },
  async aitest(){
    const f=document.querySelector('form[data-form="aiset"]');if(f)FORMS.aiset(new FormData(f));
    try{const t=await callAI('فقط یک کلمه پاسخ بده.','سلام');toast('اتصال برقرار است ✓ '+t.slice(0,30))}catch(e){toast('اتصال ناموفق: '+(e&&e.message||'خطا'))}
  },
  budget(d){
    const cur=(S.wallet.budget.find(x=>x.cat===d.cat)||{}).amount||'';
    const v=prompt('بودجه ماهانه «'+d.cat+'» (تومان)',cur);if(v===null)return;
    const a=Math.max(0,num(v)),x=S.wallet.budget.find(b=>b.cat===d.cat);
    if(x)x.amount=a;else S.wallet.budget.push({cat:d.cat,amount:a});save();
  },
  mprev(){S.month=addMonth(S.month,-1);save()},
  mnext(){S.month=addMonth(S.month,1);save()},
  setmonth(){
    const y=Math.round(num($('my').value)),m=+$('mm').value;
    if(y<1300||y>1500)return toast('سال نامعتبر است');
    S.month=y+'-'+pad(m);save();
  },
  backup,
  wipe(){if(!ok('همه اطلاعات حذف شود؟ این کار قابل بازگشت نیست.'))return;cancelAllTodos(S.todos);try{localStorage.removeItem(K)}catch(e){}S=fresh();save()&&toast('اطلاعات حذف شد')},
  live(){live(true)}
};
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.matches('select[data-unit]')){if(ACC[t.dataset.unit]&&UNITS.includes(t.value)){S.jUnits[t.dataset.unit]=t.value;save()}return}
  if(t.matches('[data-tgl="due"]')){dueD.on=t.checked;if(t.checked){dueD.ym=dueD.iso?mkey(dueD.iso):curMonth()}else{dueD.iso='';dueD.tOn=false}paintDue();return}
  if(t.matches('[data-tgl="time"]')){dueD.tOn=t.checked;paintDue();return}
  if(t.id==='dueTime'){dueD.time=t.value;return}
  if(t.id==='dueLead'){dueD.lead=t.value;return}
  if(t.matches('form[data-form="todo"] [name="prio"]')){dueD.prio=t.value;return}
  if(t.closest('#spf'))spPreview();
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.id==='dueTime')dueD.time=t.value;
  else if(t.matches('form[data-form="todo"] [name="title"]'))dueD.title=t.value;
  else if(t.closest('#spf'))spPreview();
});
document.addEventListener('click',e=>{
  const tile=e.target.closest('[data-p]');if(tile){openPage(tile.dataset.p,true);return}
  const b=e.target.closest('[data-act]');if(!b)return;
  const h=ACTS[b.dataset.act];if(h)h(b.dataset);
});

/* ---------- backup / restore ---------- */
async function backup(){
  const json=JSON.stringify(S,null,2),name=`finora-backup-${todayISO()}.json`;
  const cap=window.Capacitor,P=cap&&cap.Plugins;
  if(cap&&cap.isNativePlatform&&cap.isNativePlatform()&&P&&P.Filesystem&&P.Share){
    try{
      const r=await P.Filesystem.writeFile({path:name,data:json,directory:'CACHE',encoding:'utf8'});
      await P.Share.share({title:'Finora backup',files:[r.uri],dialogTitle:'ذخیره Backup'});
      return;
    }catch(e){if(/cancel/i.test(String(e&&e.message)))return}
  }
  const a=document.createElement('a'),u=URL.createObjectURL(new Blob([json],{type:'application/json'}));
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);
}
function restore(e){
  const input=e.target,f=input.files&&input.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{
    try{
      const x=JSON.parse(r.result);
      if(!x||!x.wallet||!x.invest)throw new Error('bad');
      if(!ok('اطلاعات فعلی با این Backup جایگزین می‌شود. ادامه می‌دهید؟'))return;
      cancelAllTodos(S.todos);S=normalize(x);save()&&toast('Backup بازیابی شد');syncTodos();
    }catch(_){alert('فایل معتبر نیست')}
    finally{input.value=''}
  };
  r.readAsText(f);
}

/* ---------- live prices ---------- */
let liveAt=0,prices=null,inflight=false;
const ENDPOINTS=['https://api.binance.com','https://data-api.binance.vision'];
function paintPrices(){
  const set=(id,v)=>{const el=$(id);if(el)el.textContent=v};
  if(inflight&&!prices){set('btc','...');set('eth','...');return}
  if(prices){set('btc','$'+prices.BTCUSDT.toLocaleString('en-US'));set('eth','$'+prices.ETHUSDT.toLocaleString('en-US'))}
  else{set('btc','در دسترس نیست');set('eth','در دسترس نیست')}
}
async function live(force){
  if(inflight){paintPrices();return}
  if(!force&&liveAt&&Date.now()-liveAt<20000){paintPrices();return}
  inflight=true;liveAt=Date.now();paintPrices();
  const q=encodeURIComponent(JSON.stringify(['BTCUSDT','ETHUSDT']));
  let got=null;
  for(const base of ENDPOINTS){
    try{
      const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),8000);
      const r=await fetch(`${base}/api/v3/ticker/price?symbols=${q}`,{signal:ctl.signal});clearTimeout(t);
      if(!r.ok)continue;
      const a=await r.json();got=Object.fromEntries(a.map(x=>[x.symbol,+x.price]));
      if(got.BTCUSDT&&got.ETHUSDT)break;got=null;
    }catch(e){}
  }
  inflight=false;prices=got;liveAt=Date.now();
  paintPrices();
  if(force)toast(got?`BTC $${got.BTCUSDT.toLocaleString('en-US')} · ETH $${got.ETHUSDT.toLocaleString('en-US')}`:'اتصال به Binance برقرار نشد (ممکن است فیلتر باشد)');
}

/* ---------- boot ---------- */
render();
setInterval(()=>{if(document.visibilityState==='visible')pollQuotes(page==='analysis',true);checkTodos()},30000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){pollQuotes(page==='analysis');checkTodos()}});
setTimeout(()=>pollQuotes(false),1500);
checkTodos();syncTodos();
if('serviceWorker' in navigator&&!native&&/^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}
})();
