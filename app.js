(()=>{
'use strict';
const K='finora_full_v4';
const JM=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const CATS=['خانه','غذا و رستوران','حمل‌ونقل','خودرو','خرید','تفریح','سلامت','قبوض و اینترنت','اقساط','سفر','هدیه','آموزش','سایر'];
const INCOME_TYPES=['درآمد دندانپزشکی','حقوق','درآمد جانبی','سود دریافتی','سایر'];
const DESTS=['سرمایه در گردش','دارایی امن'];

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
const fresh=()=>({wallet:{income:[],expense:[],transfer:[],budget:[]},invest:{safe:{asset:'BTC',current:0,target:2},assets:[],trades:[]},month:curMonth()});
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
  f.invest.trades=arr(iv.trades).map(o=>({id:sid(o),symbol:str(o.symbol),status:o.status==='closed'?'closed':'open',entry:n(o.entry),exit:n(o.exit),pnl:n(o.pnl),date:dt(o.date)}));
  const m=str(x.month),y=+m.slice(0,4);
  f.month=/^\d{4}-\d{2}$/.test(m)&&y>=1300&&y<=1500&&+m.slice(5)>=1&&+m.slice(5)<=12?m:curMonth();
  return f;
}
let S=(()=>{try{return normalize(JSON.parse(localStorage.getItem(K)))}catch(e){return fresh()}})();
let page='home';
function save(){
  let ok=true;
  try{localStorage.setItem(K,JSON.stringify(S))}catch(e){ok=false;toast('ذخیره‌سازی ناموفق بود؛ از Backup استفاده کنید')}
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
const RENDER={home:renderHome,wallet:renderWallet,invest:renderInvest,analysis:renderAnalysis,settings:renderSettings};
function render(){
  $('mlabel').textContent=monthLabel(S.month);
  RENDER[page]();
}
document.querySelectorAll('.nav button').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  page=b.dataset.p;$(page).classList.add('active');render();
}));

function renderHome(){
  const I=inc(),E=exp(),T=tr(),sv=I-E,sf=S.invest.safe;
  const iv=S.invest.assets.reduce((a,x)=>a+x.qty*x.price,0),sp=sf.target?sf.current/sf.target*100:0;
  $('home').innerHTML=`<div class="grid g4"><div class="card"><div class="label">درآمد ماه</div><div class="big green">${money(I)}</div></div><div class="card"><div class="label">هزینه ماه</div><div class="big red">${money(E)}</div></div><div class="card"><div class="label">پس‌انداز ماه</div><div class="big blue">${money(sv)}</div></div><div class="card"><div class="label">انتقال به سرمایه‌گذاری</div><div class="big gold">${money(T)}</div></div></div>
<div class="grid g2 section"><div class="card"><div class="row"><h2>🛡 دارایی امن</h2><span class="pill">${esc(sf.asset)}</span></div><div class="big">${fmt(sf.current)} / ${fmt(sf.target)}</div><div class="progress" style="margin-top:10px"><i style="width:${Math.max(0,Math.min(100,sp))}%"></i></div><div class="mini">${fa(sp.toFixed(1))}٪ از هدف</div></div>
<div class="card"><h2>⚡ شاخص‌های کلیدی</h2><div class="list"><div class="row"><span>نرخ پس‌انداز</span><b class="green">${fa((I?sv/I*100:0).toFixed(1))}٪</b></div><div class="row"><span>نرخ سرمایه‌گذاری</span><b class="gold">${fa((I?T/I*100:0).toFixed(1))}٪</b></div><div class="row"><span>مانده کیف پول (تا پایان ماه)</span><b>${money(balance())}</b></div><div class="row"><span>ارزش دارایی‌ها</span><b>${money(iv)}</b></div></div></div></div>
<div class="grid g2 section"><div class="card"><h2>📊 هزینه‌های ماه</h2><canvas id="hc" class="chart"></canvas></div><div class="card"><h2>🎯 مسیر مالی</h2><p class="mini">درآمد ← هزینه‌های ضروری ← پس‌انداز ← انتقال به سرمایه‌گذاری ← دارایی امن</p><div class="item">انتقال از کیف پول به سرمایه‌گذاری در این ماه: <b class="gold">${money(T)}</b></div></div></div>`;
  drawCosts('hc');
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
  $('invest').innerHTML=`<div class="grid g3"><div class="card"><div class="label">دارایی امن</div><div class="big gold">${fmt(sf.current)} ${esc(sf.asset)}</div><div class="mini">هدف ${fmt(sf.target)} · واریز تا امروز: ${money(transferTo('دارایی امن'))}</div></div><div class="card"><div class="label">ارزش دارایی‌های در گردش</div><div class="big">${money(v)}</div><div class="mini">واریز به سرمایه در گردش: ${money(transferTo('سرمایه در گردش'))}</div></div><div class="card"><div class="label">معاملات</div><div class="big blue">${fa(S.invest.trades.length)}</div></div></div>
<div class="grid g2 section"><div class="card"><h2>🛡 هدف دارایی امن</h2><form class="form" data-form="safe"><div><label>دارایی</label><input name="asset" value="${esc(sf.asset)}"></div><div><label>مقدار فعلی</label><input name="current" type="number" step="any" min="0" value="${esc(sf.current)}"></div><div><label>هدف</label><input name="target" type="number" step="any" min="0" value="${esc(sf.target)}"></div><div><button class="btn success">ذخیره</button></div></form></div>
<div class="card"><h2>➕ دارایی</h2><form class="form" data-form="asset"><div><label>نام</label><input name="name" required placeholder="طلای ۱۸"></div><div><label>نماد</label><input name="symbol" required placeholder="GERAM18"></div><div><label>دسته</label><select name="type"><option>کریپتو</option><option>طلا</option><option>ارز</option><option>بورس</option><option>نفت</option><option>سایر</option></select></div><div><label>مقدار</label><input name="qty" type="number" step="any" min="0" value="0"></div><div><label>قیمت (تومان)</label><input name="price" type="number" step="any" min="0" value="0"></div><div><button class="btn primary">افزودن</button></div></form></div></div>
<div class="card section"><h2>💰 دارایی‌ها</h2>${a.length?`<table class="table"><tr><th>نام</th><th>دسته</th><th>مقدار</th><th>قیمت</th><th>ارزش</th><th></th></tr>${a.map(x=>`<tr><td>${esc(x.name)}<span class="mini"> ${esc(x.symbol)}</span></td><td>${esc(x.type)}</td><td>${fmt(x.qty)}</td><td>${money(x.price)}</td><td>${money(x.qty*x.price)}</td><td><button class="btn danger" data-act="delAsset" data-id="${esc(x.id)}">×</button></td></tr>`).join('')}</table>`:'<div class="empty">دارایی ثبت نشده</div>'}</div>
<div class="card section"><h2>📈 ثبت معامله</h2><form class="form" data-form="trade"><div><label>نماد</label><input name="symbol" required placeholder="BTC"></div><div><label>وضعیت</label><select name="status"><option value="open">باز</option><option value="closed">بسته</option></select></div><div><label>ورود</label><input name="entry" type="number" step="any"></div><div><label>خروج</label><input name="exit" type="number" step="any"></div><div><label>سود/زیان (تومان)</label><input name="pnl" type="number" step="any"></div>${dateField()}<div class="full"><button class="btn primary">ثبت معامله</button></div></form>${tradesTable()}</div>`;
}
function tradesTable(){
  if(!S.invest.trades.length)return'<div class="empty">معامله‌ای ثبت نشده</div>';
  return`<table class="table"><tr><th>نماد</th><th>وضعیت</th><th>تاریخ</th><th>P/L</th><th></th></tr>${S.invest.trades.slice().reverse().map(x=>`<tr><td>${esc(x.symbol)}</td><td>${x.status==='open'?'باز':'بسته'}</td><td>${jfmt(x.date)}</td><td class="${x.pnl>=0?'green':'red'}">${money(x.pnl)}</td><td><button class="btn danger" data-act="delTrade" data-id="${esc(x.id)}">×</button></td></tr>`).join('')}</table>`;
}

function renderAnalysis(){
  const ms=[];
  for(let i=5;i>=0;i--){const k=addMonth(S.month,-i);ms.push([k,tot('income',k),tot('expense',k),tot('transfer',k)])}
  const I=inc();
  $('analysis').innerHTML=`<div class="grid g3"><div class="card"><div class="label">درآمد ماه</div><div class="big green">${money(I)}</div></div><div class="card"><div class="label">هزینه ماه</div><div class="big red">${money(exp())}</div></div><div class="card"><div class="label">نرخ سرمایه‌گذاری</div><div class="big gold">${fa((I?tr()/I*100:0).toFixed(1))}٪</div></div></div>
<div class="grid g2 section"><div class="card"><h2>📈 روند ۶ ماهه</h2><div class="legend"><span class="green">● درآمد</span><span class="red">● هزینه</span><span class="gold">● سرمایه‌گذاری</span></div><canvas id="mc" class="chart"></canvas></div><div class="card"><h2>📊 ترکیب هزینه</h2><canvas id="cc" class="chart"></canvas></div></div>
<div class="card section"><h2>📅 گزارش ماهانه</h2><table class="table"><tr><th>ماه</th><th>درآمد</th><th>هزینه</th><th>سرمایه‌گذاری</th><th>مانده</th></tr>${ms.slice().reverse().map(x=>`<tr><td>${monthLabel(x[0])}</td><td class="green">${money(x[1])}</td><td class="red">${money(x[2])}</td><td class="gold">${money(x[3])}</td><td>${money(x[1]-x[2]-x[3])}</td></tr>`).join('')}</table></div>`;
  drawMonth('mc',ms);drawCosts('cc');
}

function renderSettings(){
  const [y,m]=S.month.split('-').map(Number);
  $('settings').innerHTML=`<div class="grid g2"><div class="card"><h2>💾 Backup / Restore</h2><div class="actions"><button class="btn primary" data-act="backup">دانلود Backup</button><label class="btn">Restore<input type="file" accept=".json,application/json" hidden id="rf"></label></div></div><div class="card"><h2>🗓 ماه گزارش</h2><div class="form"><div><label>سال</label><input id="my" type="number" min="1300" max="1500" value="${y}"></div><div><label>ماه</label><select id="mm">${JM.map((x,i)=>`<option value="${i+1}"${i+1===m?' selected':''}>${x}</option>`).join('')}</select></div></div><button class="btn" style="margin-top:7px" data-act="setmonth">اعمال</button></div></div>
<div class="card section"><h2>📡 Live Crypto</h2><div class="row"><span>BTC/USDT</span><b id="btc" dir="ltr">...</b></div><div class="row"><span>ETH/USDT</span><b id="eth" dir="ltr">...</b></div><p class="mini">قیمت زنده کریپتو از Binance دریافت می‌شود. اگر دسترسی به Binance محدود باشد، پیام «در دسترس نیست» نمایش داده می‌شود. برای طلا/ارز/بورس/نفت باید API معتبر بازار مربوطه اضافه شود.</p></div>
<div class="card section"><h2>⚠️ حذف اطلاعات</h2><button class="btn danger" data-act="wipe">حذف همه اطلاعات</button></div>`;
  $('rf').addEventListener('change',restore);
  live(false);
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
let rz;window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(page==='home'||page==='analysis')render()},150)});

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
  trade(f){
    const d=pdate(f);if(!d)return;
    S.invest.trades.push({id:uid(),symbol:str(f.get('symbol')),status:f.get('status')==='closed'?'closed':'open',entry:n(f.get('entry')),exit:n(f.get('exit')),pnl:n(f.get('pnl')),date:d});save()&&toast('معامله ثبت شد');
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
  delTrade(d){if(!ok('این معامله حذف شود؟'))return;S.invest.trades=S.invest.trades.filter(x=>x.id!==d.id);save()},
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
  wipe(){if(!ok('همه اطلاعات حذف شود؟ این کار قابل بازگشت نیست.'))return;try{localStorage.removeItem(K)}catch(e){}S=fresh();save()&&toast('اطلاعات حذف شد')},
  live(){live(true)}
};
document.addEventListener('click',e=>{
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
      S=normalize(x);save()&&toast('Backup بازیابی شد');
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
const native=window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform();
if('serviceWorker' in navigator&&!native&&/^https?:$/.test(location.protocol)){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}
})();
