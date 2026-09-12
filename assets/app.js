(function(){
"use strict";

/* ============================================================
   1. 定数・状態
   ============================================================ */
const LS = "kakeizu-drafter-v1";
const BASE_W = 236, BASE_H = 104;
const SIB_GAP = 30, GROUP_GAP = 52, ROOT_GAP = 96, COUPLE_GAP = 26, ROW_GAP = 96;
const GENDERS = { male:"男性", female:"女性", other:"その他" };

const S = {
  people: [], unions: [], pos: {},
  set: { cardScale:1, fontScale:1, tint:true, maiden:true, age:true, degree:true,
         autoLayout:true, packHidden:true },
  flt: { q:"", surnames:{}, gender:{male:true,female:true,other:true}, deg:0, dead:true },
  sel: null, tab:"detail", view:{x:0,y:0,k:1}, sample:true, mode:"tree"
};

const $  = (s,r)=> (r||document).querySelector(s);
const $$ = (s,r)=> Array.prototype.slice.call((r||document).querySelectorAll(s));
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const uid = p => (p||"x") + Math.random().toString(36).slice(2,9);
const clamp = (v,a,b)=> v<a?a:v>b?b:v;
const byId = id => S.people.find(p=>p.id===id) || null;
/* カードは文字が収まる大きさに自動で広がる（文字倍率が1を超えた分だけ拡大） */
const scl = ()=> Math.max(1, S.set.fontScale || 1);
const cw = ()=> Math.round(BASE_W * scl());
const ch = ()=> Math.round(BASE_H * scl());

/* ============================================================
   2. 日付ユーティリティ（年のみ・年月のみも許容）
   ============================================================ */
function parseDate(v){
  if(!v) return null;
  const t = String(v).trim().replace(/[年月]/g,"-").replace(/日/g,"").replace(/[./]/g,"-").replace(/-+$/,"");
  const m = t.match(/^(\d{3,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if(!m) return null;
  const y = +m[1], mo = m[2]?+m[2]:null, d = m[3]?+m[3]:null;
  if(mo!=null && (mo<1||mo>12)) return null;
  if(d!=null && (d<1||d>31)) return null;
  return { y:y, m:mo, d:d, prec: d!=null?3:(mo!=null?2:1) };
}
function fmtDate(v){
  const p = parseDate(v); if(!p) return "";
  const z = n => String(n).padStart(2,"0");
  return p.prec===1 ? p.y+"年" : p.prec===2 ? p.y+"."+z(p.m) : p.y+"."+z(p.m)+"."+z(p.d);
}
function sortKey(v){
  const p = parseDate(v); if(!p) return "9999-99-99";
  const z = n => String(n).padStart(2,"0");
  return p.y + "-" + z(p.m||99) + "-" + z(p.d||99);
}
function diffYears(a,b){
  if(!a||!b) return null;
  let y = b.y - a.y;
  const am = a.m||1, ad = a.d||1, bm = b.m||12, bd = b.d||31;
  if(bm < am || (bm===am && bd < ad)) y--;
  return y;
}
function ageOf(p){
  const b = parseDate(p.birth); if(!b) return null;
  const now = new Date();
  const end = p.death ? parseDate(p.death) : { y:now.getFullYear(), m:now.getMonth()+1, d:now.getDate(), prec:3 };
  if(!end) return null;
  const y = diffYears(b, end);
  return (y==null||y<0) ? null : { y:y, approx: b.prec<3 || end.prec<3, dead: !!p.death };
}
function fullName(p){
  const s = (p.surname||"").trim(), g = (p.given||"").trim();
  return (s && g) ? s + " " + g : (s || g || "名称未設定");
}
function isDead(p){ return !!(p.death || p.deceased); }

/* ============================================================
   3. 索引
   ============================================================ */
function index(){
  const childUnion = new Map(), asPartner = new Map();
  for(const u of S.unions){
    for(const pid of u.partners) if(pid){
      if(!asPartner.has(pid)) asPartner.set(pid, []);
      asPartner.get(pid).push(u);
    }
    for(const c of u.children) if(!childUnion.has(c)) childUnion.set(c, u);
  }
  return { childUnion:childUnion, asPartner:asPartner };
}
function parentsOf(id, ix){ const u = ix.childUnion.get(id); return u ? u.partners.filter(Boolean) : []; }
function childrenOf(id, ix){
  const out = []; for(const u of (ix.asPartner.get(id)||[])) for(const c of u.children) if(out.indexOf(c)<0) out.push(c);
  return out;
}
function spousesOf(id, ix){
  const out = []; for(const u of (ix.asPartner.get(id)||[])){
    const o = u.partners.find(p=>p && p!==id); if(o && out.indexOf(o)<0) out.push(o);
  } return out;
}

/* ============================================================
   4. サンプルデータ
   ============================================================ */
function sampleData(){
  const P = [], U = [];
  const add = (id,surname,given,maiden,gender,birth,death)=>{
    P.push({id:id,surname:surname,given:given,maiden:maiden||"",gender:gender,
            birth:birth||"",death:death||"",deceased:!!death,note:""});
  };
  const un = (a,b,children,status)=> U.push({id:uid("u"),partners:[a,b||null],children:children||[],status:status||"married"});

  add("y1","山田","源蔵","","male","1928-03-04","2009-11-18");
  add("y2","山田","きよ","中村","female","1931-07-22","2016-02-09");
  add("y3","山田","昭一","","male","1955-01-30");
  add("y4","山田","美代子","小林","female","1958-09-14");
  add("y5","佐藤","節子","山田","female","1959-05-02");
  add("y6","佐藤","直樹","","male","1956-11-08");
  add("y7","山田","洋二","","male","1963-04-19");
  add("y8","山田","健太","","male","1983-02-11");
  add("y9","山田","里美","高橋","female","1985-08-30");
  add("y10","山田","由紀","","female","1986-12-05");
  add("y11","佐藤","大輔","","male","1987-06-21");
  add("y12","佐藤","あゆみ","","female","1990-03-17");
  add("y13","山田","蓮","","male","2012-10-03");
  add("y14","山田","陽菜","","female","2015-05-26");
  add("t1","高橋","誠","","male","1957-02-26");
  add("t2","高橋","和子","渡辺","female","1960-10-11");

  un("y1","y2",["y3","y5","y7"]);
  un("y3","y4",["y8","y10"]);
  un("y6","y5",["y11","y12"]);
  un("t1","t2",["y9"]);
  un("y8","y9",["y13","y14"]);
  return { people:P, unions:U };
}

/* ============================================================
   5. 保存・読み込み
   ============================================================ */
function save(){
  try{ localStorage.setItem(LS, JSON.stringify({
    people:S.people, unions:S.unions, pos:S.pos, set:S.set, view:S.view, sample:S.sample }));
  }catch(e){}
}
function load(){
  let raw = null;
  try{ raw = localStorage.getItem(LS); }catch(e){}
  if(raw){
    try{
      const d = JSON.parse(raw);
      if(d && Array.isArray(d.people) && d.people.length){
        S.people = d.people; S.unions = d.unions||[]; S.pos = d.pos||{};
        Object.assign(S.set, d.set||{}); Object.assign(S.view, d.view||{});
        S.sample = !!d.sample; normalize(); return true;
      }
    }catch(e){}
  }
  const d = sampleData(); S.people = d.people; S.unions = d.unions; S.sample = true;
  return false;
}
function normalize(){
  for(const p of S.people){
    p.surname = p.surname||""; p.given = p.given||""; p.maiden = p.maiden||"";
    if(!GENDERS[p.gender]) p.gender = "other";
    p.birth = p.birth||""; p.death = p.death||""; p.note = p.note||"";
    if(p.death) p.deceased = true;
  }
  const ids = new Set(S.people.map(p=>p.id));
  S.unions = S.unions.filter(u=> u && Array.isArray(u.partners));
  for(const u of S.unions){
    u.partners = [u.partners[0]||null, u.partners[1]||null].map(x=> ids.has(x)?x:null);
    u.children = (u.children||[]).filter(c=> ids.has(c));
    if(!u.status) u.status = "married";
  }
  S.unions = S.unions.filter(u=> u.partners.some(Boolean) || u.children.length);
}

/* ============================================================
   6. インポート／エクスポート
   ============================================================ */
function importData(obj){
  if(Array.isArray(obj)) obj = { people: obj };
  if(!obj || !Array.isArray(obj.people)) throw new Error("people 配列が見つかりません");
  const legacy = !Array.isArray(obj.unions);
  if(!legacy){
    S.people = obj.people.map(p=>({
      id:p.id||uid("p"), surname:p.surname||"", given:p.given||p.givenName||"", maiden:p.maiden||p.maidenName||"",
      gender:p.gender||"other", birth:p.birth||p.birthDate||"", death:p.death||"",
      deceased:!!(p.deceased||p.death), note:p.note||"" }));
    S.unions = obj.unions.map(u=>({ id:u.id||uid("u"),
      partners:[(u.partners||[])[0]||null,(u.partners||[])[1]||null],
      children:(u.children||[]).slice(), status:u.status||"married" }));
    S.pos = obj.pos||{};
  }else{
    const people = obj.people.map(p=>{
      let sn = p.surname||"", gn = p.given||p.givenName||"";
      if(!sn && !gn && p.name){ const parts = String(p.name).split(/[\s　]+/); sn = parts[0]||""; gn = parts.slice(1).join(" "); }
      return { id:p.id||uid("p"), surname:sn, given:gn, maiden:p.maiden||p.maidenName||"", gender:p.gender||"other",
               birth:p.birth||p.birthDate||"", death:p.death||"", deceased:!!(p.deceased||p.death), note:p.note||"",
               _sp:(p.spouses||[]).slice(), _pa:(p.parents||[]).slice(), _x:p.x, _y:p.y };
    });
    const ids = new Set(people.map(p=>p.id));
    const unions = [], key = new Map();
    const getU = (a,b)=>{
      const k = [a||"",b||""].sort().join("|");
      if(key.has(k)) return key.get(k);
      const u = { id:uid("u"), partners:[a||null,b||null], children:[], status:"married" };
      unions.push(u); key.set(k,u); return u;
    };
    for(const p of people) for(const sp of p._sp) if(ids.has(sp)) getU(p.id, sp);
    for(const p of people){
      const pa = p._pa.filter(x=> ids.has(x));
      if(!pa.length) continue;
      const u = getU(pa[0], pa[1]||null);
      if(u.children.indexOf(p.id)<0) u.children.push(p.id);
    }
    for(const u of unions){
      const a = people.find(x=>x.id===u.partners[0]), b = people.find(x=>x.id===u.partners[1]);
      if(a && b && a.gender!=="male" && b.gender==="male") u.partners = [b.id, a.id];
    }
    S.pos = {};
    for(const p of people){
      if(typeof p._x==="number") S.pos[p.id] = { x:p._x, y:+p._y||0 };
      delete p._sp; delete p._pa; delete p._x; delete p._y;
    }
    S.people = people; S.unions = unions;
  }
  if(obj.set) Object.assign(S.set, obj.set);
  normalize(); S.sel = null; S.sample = false;
}
function exportObj(){
  return { format:"kakeizu-drafter", version:1, exportedAt:new Date().toISOString(),
           people:S.people.map(p=>({ id:p.id, surname:p.surname, given:p.given, maiden:p.maiden, gender:p.gender,
             birth:p.birth, death:p.death, deceased:!!p.deceased, note:p.note })),
           unions:S.unions.map(u=>({ id:u.id, partners:u.partners.slice(), children:u.children.slice(), status:u.status })),
           pos:S.pos, set:S.set };
}

/* ============================================================
   7. 自動配置
   世代を確定 → 夫婦を1ブロックにまとめる → 子ブロックを再帰的に
   詰め、親を子群の中央へ寄せる。兄弟は年長が左、夫婦は男性が左。
   ============================================================ */
function autoLayout(ids){
  const W = cw(), H = ch(), ROW = H + Math.round(ROW_GAP * scl());
  const CG = Math.round(COUPLE_GAP * scl());
  const SG = Math.round(SIB_GAP * scl());
  const GG = Math.round(GROUP_GAP * scl());
  const RG = Math.round(ROOT_GAP * scl());

  const set = new Set(ids);
  const person = new Map(); S.people.forEach(p=>{ if(set.has(p.id)) person.set(p.id,p); });
  const unions = S.unions.filter(u=> u.partners.some(p=>p&&set.has(p)) || u.children.some(c=>set.has(c)));

  /* --- 世代 ---
     ・子は親より必ず1段下
     ・夫婦は同じ段
     ・親は「いちばん上の子」のすぐ上まで引き下げる
       （引き下げないと、婚家の親が数段離れて縦線が他の段を貫く） */
  const gen = new Map(); ids.forEach(id=> gen.set(id,0));
  for(let it=0, lim=Math.min(600, ids.length*2+10); it<lim; it++){
    let changed = false;
    for(const u of unions){
      const ps = u.partners.filter(p=> p && set.has(p));
      const kids = u.children.filter(c=> set.has(c));
      let g = 0; ps.forEach(p=>{ g = Math.max(g, gen.get(p)); });
      if(ps.length && kids.length){
        let need = Infinity; kids.forEach(c=>{ need = Math.min(need, gen.get(c)); });
        if(need - 1 > g) g = need - 1;
      }
      ps.forEach(p=>{ if(gen.get(p) < g){ gen.set(p,g); changed = true; } });
      for(const c of kids){ if(gen.get(c) < g+1){ gen.set(c, g+1); changed = true; } }
    }
    if(!changed) break;
  }

  const childUnion = new Map(), asPartner = new Map();
  for(const u of unions){
    for(const p of u.partners) if(p && set.has(p)){
      if(!asPartner.has(p)) asPartner.set(p, []); asPartner.get(p).push(u);
    }
    for(const c of u.children) if(set.has(c) && !childUnion.has(c)) childUnion.set(c, u);
  }

  const claimed = new Set();
  const byBirth = (a,b)=> sortKey(person.get(a).birth).localeCompare(sortKey(person.get(b).birth)) || a.localeCompare(b);

  function makeBlock(anchor){
    claimed.add(anchor);
    const a = person.get(anchor);
    const mine = (asPartner.get(anchor)||[]).filter(u=>{
      const o = u.partners.find(p=> p && p!==anchor);
      return !o || !set.has(o) || !claimed.has(o);
    });
    const links = [];
    for(const u of mine){
      const o = u.partners.find(p=> p && p!==anchor && set.has(p));
      if(o){ claimed.add(o); links.push({u:u, other:o}); } else links.push({u:u, other:null});
    }
    const withP = links.filter(l=> l.other);
    let members;
    if(a.gender === "female" && withP.length){
      members = withP.length >= 2
        ? [withP[0].other, anchor].concat(withP.slice(1).map(l=>l.other))
        : [withP[0].other, anchor];
    }else{
      members = [anchor].concat(withP.map(l=>l.other));
    }
    const idx = {}; members.forEach((m,i)=>{ idx[m] = i; });
    const cx = i => i*(W+CG) + W/2;

    const blk = { members:members, gen:gen.get(anchor), w: members.length*W + (members.length-1)*CG, unions:[] };
    for(const l of links){
      const mid = l.other!=null ? (cx(idx[anchor]) + cx(idx[l.other]))/2 : cx(idx[anchor]);
      const kids = l.u.children.filter(c=> set.has(c) && !claimed.has(c)).sort(byBirth);
      const kb = [];
      for(const k of kids){ if(claimed.has(k)) continue; kb.push(makeBlock(k)); }
      blk.unions.push({ u:l.u, mid:mid, kids:kb });
    }
    return blk;
  }

  function measure(b){
    let cur = 0; const groups = [];
    for(const g of b.unions){
      if(!g.kids.length){ continue; }
      const start = cur;
      for(const k of g.kids){ measure(k); k._off = cur; cur += k._w + SG; }
      cur -= SG;
      groups.push({ start:start, end:cur, center:(start+cur)/2, mid:g.mid });
      cur += GG;
    }
    const kidsEnd = groups.length ? cur - GG : 0;
    let own = 0;
    if(groups.length){
      let sum = 0; groups.forEach(g=>{ sum += g.center - g.mid; });
      own = sum / groups.length;
    }
    const minX = Math.min(0, own);
    if(minX < 0){
      own -= minX;
      for(const g of b.unions) for(const k of g.kids) k._off -= minX;
    }
    b._own = own;
    b._w = Math.max(kidsEnd, own + b.w) - minX;
    return b._w;
  }

  const out = new Map();
  function apply(b, x){
    const bx = x + b._own;
    b.members.forEach((id,i)=>{ out.set(id, { x: bx + i*(W+CG), y: b.gen*ROW }); });
    for(const g of b.unions) for(const k of g.kids) apply(k, x + k._off);
  }

  /* --- 起点を決めてブロックを構築 --- */
  const order = ids.slice().sort((a,b)=>{
    const ga = gen.get(a), gb = gen.get(b);
    if(ga!==gb) return ga-gb;
    return byBirth(a,b);
  });
  const roots = [], rest = [];
  for(const id of order){
    if(claimed.has(id)) continue;
    if(childUnion.has(id)) continue;
    roots.push(makeBlock(id));
  }
  for(const id of order){ if(!claimed.has(id)) rest.push(makeBlock(id)); }

  const hasKids = b => b.unions.some(g=> g.kids.length);
  const trunk = roots.concat(rest).filter(hasKids);
  const floats = roots.concat(rest).filter(b=> !hasKids(b));

  let cursor = 0;
  for(const b of trunk){ measure(b); apply(b, cursor); cursor += b._w + RG; }

  /* --- 子を他ブロックに取られた「婚家の親」などを子の近くへ --- */
  const rows = new Map();
  out.forEach((pt,id)=>{
    if(!rows.has(pt.y)) rows.set(pt.y, []);
    rows.get(pt.y).push({ a: pt.x, b: pt.x + W });
  });
  const fits = (y, a, b)=>{
    const list = rows.get(y); if(!list) return true;
    for(const s of list) if(a < s.b + SG && s.a - SG < b) return false;
    return true;
  };
  for(const blk of floats){
    measure(blk);
    let want = null;
    for(const g of blk.unions){
      const xs = g.u.children.filter(c=> out.has(c)).map(c=> out.get(c).x + W/2);
      if(xs.length){ want = xs.reduce((s,v)=>s+v,0)/xs.length - g.mid; break; }
    }
    if(want == null){
      const sp = [];
      blk.members.forEach(m=>{
        for(const u of (asPartner.get(m)||[])){
          const o = u.partners.find(p=> p && p!==m);
          if(o && out.has(o)) sp.push(out.get(o).x);
        }
      });
      want = sp.length ? sp.reduce((s,v)=>s+v,0)/sp.length : cursor;
    }
    const y = blk.gen * ROW;
    let x = Math.round(want), dir = 0, step = W + SG;
    while(dir < 200 && !fits(y, x + blk._own, x + blk._own + blk.w)){
      dir++; x = Math.round(want) + (dir%2 ? 1 : -1) * Math.ceil(dir/2) * step;
    }
    apply(blk, x);
    blk.members.forEach(m=>{
      const pt = out.get(m); if(!pt) return;
      if(!rows.has(pt.y)) rows.set(pt.y, []);
      rows.get(pt.y).push({ a: pt.x, b: pt.x + W });
    });
    cursor = Math.max(cursor, x + blk._w + RG);
  }

  /* --- 左上を原点に寄せる --- */
  let minx = Infinity, miny = Infinity;
  out.forEach(pt=>{ minx = Math.min(minx, pt.x); miny = Math.min(miny, pt.y); });
  if(!isFinite(minx)) return;
  out.forEach((pt,id)=>{ S.pos[id] = { x: Math.round(pt.x-minx), y: Math.round(pt.y-miny) }; });
}

/* 位置が未定義の人物に仮位置を与える */
function ensurePositions(){
  const W = cw(), H = ch();
  let mx = 0, my = 0;
  for(const p of S.people){ const q = S.pos[p.id]; if(q){ mx = Math.max(mx,q.x); my = Math.max(my,q.y); } }
  let n = 0;
  for(const p of S.people){
    if(!S.pos[p.id]){ S.pos[p.id] = { x: mx + (n%4)*(W+30), y: my + H + 60 + Math.floor(n/4)*(H+60) }; n++; }
  }
}

/* ============================================================
   8. 親等の計算（民法の数え方）
   血族＝共通の祖先を経由する単調経路（上ってから下る）。
   姻族＝配偶者の血族／血族の配偶者。
   ============================================================ */
function bloodMap(from, ix){
  // key: id -> { up, down, deg, prev }
  const res = new Map();
  res.set(from, { up:0, down:0, deg:0, prev:null });
  const seen = new Set([from+"|0"]);
  let frontier = [{ id:from, phase:0, up:0, down:0 }];
  while(frontier.length){
    const next = [];
    for(const cur of frontier){
      const steps = [];
      if(cur.phase === 0) for(const p of parentsOf(cur.id, ix)) steps.push({ id:p, phase:0, up:cur.up+1, down:cur.down });
      for(const c of childrenOf(cur.id, ix)) steps.push({ id:c, phase:1, up:cur.up, down:cur.down+1 });
      for(const st of steps){
        const k = st.id + "|" + st.phase;
        if(seen.has(k)) continue;
        seen.add(k);
        const deg = st.up + st.down;
        const old = res.get(st.id);
        if(!old || deg < old.deg) res.set(st.id, { up:st.up, down:st.down, deg:deg, prev:cur.id });
        next.push(st);
      }
    }
    frontier = next;
  }
  res.delete(from);
  return res;
}

function pathTo(map, from, id){
  const out = [id]; let cur = id, guard = 0;
  while(guard++ < 60){
    const r = map.get(cur); if(!r || r.prev==null) break;
    out.unshift(r.prev); cur = r.prev;
    if(cur === from) break;
  }
  if(out[0] !== from) out.unshift(from);
  return out;
}

const ANC_M = ["","父","祖父","曽祖父","高祖父"];
const ANC_F = ["","母","祖母","曽祖母","高祖母"];
const DESC = ["","子","孫","曽孫","玄孫","来孫","昆孫"];

function genderPick(p, m, f, o){ return p.gender==="male" ? m : p.gender==="female" ? f : (o!=null?o:m+"・"+f); }

function birthOrderLabel(child, ix){
  const u = ix.childUnion.get(child.id);
  if(!u) return genderPick(child, "息子", "娘", "子");
  const sibs = u.children.map(byId).filter(Boolean)
    .filter(s=> s.gender === child.gender)
    .sort((a,b)=> sortKey(a.birth).localeCompare(sortKey(b.birth)));
  const i = sibs.findIndex(s=> s.id===child.id);
  if(child.gender!=="male" && child.gender!=="female") return "子";
  if(i < 0 || sibs.some(s=> !parseDate(s.birth))) return genderPick(child, "息子", "娘");
  const ord = ["長","次","三","四","五","六","七","八","九","十"][i] || (i+1);
  return ord + (child.gender==="male" ? "男" : "女");
}

function olderThan(a, b){
  const ka = sortKey(a.birth), kb = sortKey(b.birth);
  if(ka==="9999-99-99" || kb==="9999-99-99") return null;
  return ka < kb;
}

function bloodLabel(subject, target, rec, ix, map){
  const up = rec.up, down = rec.down;
  if(down === 0){
    if(up <= 4) return genderPick(target, ANC_M[up], ANC_F[up], up===1?"親":ANC_M[up]+"・"+ANC_F[up]);
    return up + "代前の直系尊属";
  }
  if(up === 0){
    if(down === 1) return birthOrderLabel(target, ix);
    return DESC[down] || (down + "代後の直系卑属");
  }
  if(up === 1 && down === 1){
    const o = olderThan(target, subject);
    if(o === null) return genderPick(target, "兄弟", "姉妹", "きょうだい");
    return genderPick(target, o?"兄":"弟", o?"姉":"妹", o?"年上のきょうだい":"年下のきょうだい");
  }
  if(up === 2 && down === 1){
    const path = pathTo(map, subject.id, target.id);
    const via = byId(path[1]);
    const o = via ? olderThan(target, via) : null;
    if(o === null) return genderPick(target, "おじ", "おば");
    return genderPick(target, o?"伯父":"叔父", o?"伯母":"叔母");
  }
  if(up === 1 && down === 2) return genderPick(target, "甥", "姪");
  if(up === 3 && down === 1) return genderPick(target, "大おじ", "大おば");
  if(up === 1 && down === 3) return genderPick(target, "又甥", "又姪");
  if(up === 2 && down === 2) return "いとこ";
  if(up === 3 && down === 2) return genderPick(target, "いとこおじ", "いとこおば");
  if(up === 2 && down === 3) return genderPick(target, "いとこ甥", "いとこ姪");
  if(up === 3 && down === 3) return "はとこ";
  return rec.deg + "親等の血族";
}

/* 選択中の人物から見た関係を全員分求める */
function kinship(subjectId, ix){
  const out = new Map();
  const subject = byId(subjectId);
  if(!subject) return out;
  out.set(subjectId, { label:"本人", deg:0, kind:"self", chip:null });

  const blood = bloodMap(subjectId, ix);
  blood.forEach((rec,id)=>{
    const t = byId(id); if(!t) return;
    out.set(id, { label: bloodLabel(subject, t, rec, ix, blood), deg: rec.deg, kind:"blood",
                  chip: "血 " + rec.deg, within: rec.deg <= 6 });
  });

  const spouses = spousesOf(subjectId, ix);
  for(const sid of spouses){
    out.set(sid, { label:"配偶者", deg:0, kind:"spouse", chip:null, within:true });
  }
  // 配偶者の血族
  for(const sid of spouses){
    const sp = byId(sid); if(!sp) continue;
    const sm = bloodMap(sid, ix);
    sm.forEach((rec,id)=>{
      if(id===subjectId || out.has(id)) return;
      const t = byId(id); if(!t) return;
      const base = bloodLabel(sp, t, rec, ix, sm);
      let label;
      if(rec.up===1 && rec.down===0) label = genderPick(t, "義父", "義母");
      else if(rec.up===1 && rec.down===1) label = "義" + base;
      else if(rec.up===0 && rec.down===1) label = "配偶者の子";
      else label = "配偶者の" + base;
      out.set(id, { label:label, deg:rec.deg, kind:"affine", chip:"姻 "+rec.deg, within: rec.deg <= 3 });
    });
  }
  // 血族の配偶者
  blood.forEach((rec,id)=>{
    const base = byId(id); if(!base) return;
    for(const sid of spousesOf(id, ix)){
      if(sid===subjectId || out.has(sid)) continue;
      const t = byId(sid); if(!t) continue;
      let label;
      if(rec.up===0 && rec.down===1) label = genderPick(t, "婿", "嫁", "子の配偶者");
      else if(rec.up===1 && rec.down===1){
        const o = olderThan(base, subject);
        label = o===null ? genderPick(t,"義兄弟","義姉妹") : genderPick(t, o?"義兄":"義弟", o?"義姉":"義妹");
      }
      else if(rec.up===1 && rec.down===0) label = genderPick(t, "継父", "継母");
      else label = bloodLabel(subject, base, rec, ix, blood) + "の配偶者";
      out.set(sid, { label:label, deg:rec.deg, kind:"affine", chip:"姻 "+rec.deg, within: rec.deg <= 3 });
    }
  });
  return out;
}

/* ============================================================
   9. フィルタ
   ============================================================ */
function surnameOf(p){ return (p.surname||"").trim() || "（姓なし）"; }

function visibleSet(){
  const ix = index();
  const q = S.flt.q.trim().toLowerCase();
  let degMap = null;
  if(S.flt.deg > 0 && S.sel) degMap = kinship(S.sel, ix);
  const out = new Set();
  for(const p of S.people){
    if(S.flt.surnames[surnameOf(p)] === false) continue;
    if(S.flt.gender[p.gender] === false) continue;
    if(!S.flt.dead && isDead(p)) continue;
    if(q){
      const hay = (p.surname+p.given+p.maiden+p.note+" "+fullName(p)).toLowerCase();
      if(hay.indexOf(q) < 0) continue;
    }
    if(degMap){
      const r = degMap.get(p.id);
      if(!r || (r.kind!=="self" && r.deg > S.flt.deg)) continue;
    }
    out.add(p.id);
  }
  return out;
}

/* ============================================================
   10. 描画
   ============================================================ */
const stage = document.getElementById("stage");
const wires = document.getElementById("wires");
const nodesEl = document.getElementById("nodes");
const canvas = document.getElementById("canvas");

const SYM = {
  male:'<rect class="s" x="2.6" y="2.6" width="12.8" height="12.8" rx="1"/>',
  female:'<circle class="s" cx="9" cy="9" r="6.5"/>',
  other:'<path class="s" d="M9 2.2 15.8 9 9 15.8 2.2 9Z"/>'
};
function symbol(g, size){
  const s = size||18;
  return '<svg class="sym" viewBox="0 0 18 18" width="'+s+'" height="'+s+'" aria-hidden="true">'+(SYM[g]||SYM.other)+'</svg>';
}

let VIS = new Set(), KIN = new Map(), IX = null;

function recompute(){
  IX = index();
  VIS = visibleSet();
  KIN = S.sel ? kinship(S.sel, IX) : new Map();
}

function relayout(){
  const ids = S.set.packHidden ? Array.from(VIS) : S.people.map(p=>p.id);
  if(ids.length) autoLayout(ids);
  ensurePositions();
}

function render(){
  const W = cw(), H = ch();
  stage.style.setProperty("--cw", W+"px");
  stage.style.setProperty("--ch", H+"px");
  stage.style.setProperty("--fs", (13*S.set.fontScale).toFixed(2)+"px");
  ensurePositions();
  renderNodes();
  renderWires();
  renderRail();
  renderSelbar();
  updateEmpty();
}

/* 画面上部の「選択中：〇〇」表示 */
function renderSelbar(){
  const bar = document.getElementById("selbar");
  const p = S.sel ? byId(S.sel) : null;
  if(!p){ bar.hidden = true; return; }
  const who = document.getElementById("selbar-name");
  who.innerHTML = '<span class="g-'+p.gender+'">'+symbol(p.gender, 14)+'</span>'+esc(fullName(p));
  bar.hidden = false;
}

function renderNodes(){
  const frag = document.createDocumentFragment();
  const nowShown = new Set();
  for(const p of S.people){
    if(!VIS.has(p.id) || !tlShown(p.id)) continue;
    nowShown.add(p.id);
    const pos = S.pos[p.id] || {x:0,y:0};
    const n = document.createElement("div");
    n.className = "node g-" + p.gender + (S.set.tint ? " tint" : "") + (S.sel===p.id ? " sel" : "")
                + (TL.on && !TL.silent && !TL.shown.has(p.id) ? " pop" : "");
    n.dataset.id = p.id;
    n.style.transform = "translate(" + pos.x + "px," + pos.y + "px)";
    n.style.setProperty("--tf", "translate(" + pos.x + "px," + pos.y + "px)");

    const rel = S.set.degree && KIN.get(p.id);
    let html = "";
    if(rel){
      html += '<div class="rel'+(rel.kind==="self"?" self":"")+'"><b>'+esc(rel.label)+'</b>'
            + (rel.chip ? '<span>'+esc(rel.chip)+'</span>' : '') + '</div>';
    }
    html += symbol(p.gender);
    html += '<div class="body">';
    html += '<div class="nm">'+esc(fullName(p))+'</div>';
    if(S.set.maiden && p.maiden) html += '<div class="maiden"><i>旧姓</i> '+esc(p.maiden)+'</div>';
    const b = fmtDate(p.birth), d = fmtDate(p.death), ag = ageOf(p);
    const dead = isDead(p);
    let line = "";
    if(b || d) line = (b||"?") + (dead ? " – " + (d||"?") : "");
    const agText = (S.set.age && ag)
      ? "<em>" + (ag.dead ? "享年" : "") + (ag.approx?"約":"") + ag.y + (ag.dead?"":"歳") + "</em>"
      : "";
    /* 生没年と享年を1行に並べるとカードからはみ出るので、故人は2段に分ける */
    if(dead){
      if(line) html += '<div class="dt">'+line+'</div>';
      if(agText) html += '<div class="dt">'+agText+'</div>';
    }else{
      const one = line + (line && agText ? "  " : "") + agText;
      if(one) html += '<div class="dt">'+one+'</div>';
    }
    html += '</div>';
    const tags = [];
    if(isDead(p)) tags.push('<span class="tag dead">故</span>');
    if(tags.length) html += '<div class="tags">'+tags.join("")+'</div>';
    n.innerHTML = html;
    frag.appendChild(n);
  }
  nodesEl.textContent = "";
  nodesEl.appendChild(frag);
  TL.shown = nowShown;
  stage.classList.toggle("lod", S.view.k < 0.42);
}

/* 線の座標 */
function geo(id){
  const p = S.pos[id] || {x:0,y:0}, W = cw(), H = ch();
  return { x:p.x, y:p.y, cx:p.x+W/2, cy:p.y+H/2, top:p.y, bottom:p.y+H, left:p.x, right:p.x+W };
}

function wireData(){
  const sc = scl();
  const drop = Math.round(40*sc), laneStep = Math.round(13*sc), MAXLANE = 3;
  const below = Math.round(11*sc), slash = Math.round(9*sc);
  const parts = [], groups = [];

  /* 同じ段に並ぶカード（夫婦線が他人のカードを跨いでいないか調べるため） */
  const rowCards = new Map();
  const shown = id => VIS.has(id) && tlShown(id);
  for(const p of S.people){
    if(!shown(p.id)) continue;
    const g = geo(p.id);
    if(!rowCards.has(g.y)) rowCards.set(g.y, []);
    rowCards.get(g.y).push({ id:p.id, left:g.left, right:g.right });
  }

  for(const u of S.unions){
    const ps = u.partners.filter(x=> x && shown(x));
    const kids = u.children.filter(c=> shown(c));
    let sx = null, sy = null;
    const K = u.id;

    if(ps.length === 2){
      const a = geo(ps[0]), b = geo(ps[1]);
      const L = a.cx <= b.cx ? a : b, R = a.cx <= b.cx ? b : a;
      const dash = u.status === "partner";
      if(Math.abs(a.y - b.y) < 2){
        const blocked = (rowCards.get(a.y)||[]).some(c=>
          c.id !== ps[0] && c.id !== ps[1] && c.left < R.left && L.right < c.right);
        if(!blocked){
          const y = a.cy;
          parts.push({ t:"line", k:K+":cp", x1:L.right, y1:y, x2:R.left, y2:y, dash:dash });
          sx = (L.right + R.left)/2; sy = y;
          if(u.status === "divorced"){
            parts.push({ t:"line", k:K+":dv1", x1:sx-slash*0.8, y1:y-slash, x2:sx-slash*1.5, y2:y+slash });
            parts.push({ t:"line", k:K+":dv2", x1:sx+slash*1.5, y1:y-slash, x2:sx+slash*0.8, y2:y+slash });
          }
        }else{
          /* 間に別の人物がいるときはカードの下を回す */
          const y = Math.max(L.bottom, R.bottom) + below;
          parts.push({ t:"line", k:K+":cpL", x1:L.cx, y1:L.bottom, x2:L.cx, y2:y });
          parts.push({ t:"line", k:K+":cp", x1:L.cx, y1:y, x2:R.cx, y2:y, dash:dash });
          parts.push({ t:"line", k:K+":cpR", x1:R.cx, y1:R.bottom, x2:R.cx, y2:y });
          sx = (L.cx + R.cx)/2; sy = y;
        }
      }else{
        parts.push({ t:"line", k:K+":cp", x1:L.right, y1:L.cy, x2:R.left, y2:R.cy, dash:dash });
        sx = (L.right + R.left)/2; sy = (L.cy + R.cy)/2;
      }
      if(sx != null && !kids.length) parts.push({ t:"dot", k:K+":dot", x:sx, y:sy });
    }else if(ps.length === 1){
      const a = geo(ps[0]); sx = a.cx; sy = a.bottom;
    }

    if(!kids.length || sx == null) continue;
    let minx = Infinity, maxx = -Infinity, topY = Infinity;
    const tops = [];
    for(const c of kids){
      const g = geo(c); g.id = c; tops.push(g);
      minx = Math.min(minx, g.cx); maxx = Math.max(maxx, g.cx); topY = Math.min(topY, g.top);
    }
    groups.push({ k:K, sx:sx, sy:sy, tops:tops, minx:minx, maxx:maxx, topY:topY, couple: ps.length===2 });
  }

  /* 横線（きょうだいバー）が同じ高さで重ならないよう、段ごとに車線を割り当てる */
  const rows = new Map();
  for(const g of groups){
    if(!rows.has(g.topY)) rows.set(g.topY, []);
    rows.get(g.topY).push(g);
  }
  rows.forEach(list=>{
    list.sort((a,b)=> Math.min(a.minx,a.sx) - Math.min(b.minx,b.sx));
    const lanes = [];
    for(const g of list){
      const a = Math.min(g.minx, g.sx), b = Math.max(g.maxx, g.sx);
      let L = 0;
      while(L < MAXLANE){
        if(!lanes[L]) lanes[L] = [];
        if(!lanes[L].some(s=> a < s[1] + 6 && s[0] - 6 < b)){ lanes[L].push([a,b]); break; }
        L++;
      }
      g.lane = Math.min(L, MAXLANE - 1);
      if(L >= MAXLANE) lanes[g.lane].push([a,b]);
    }
  });

  for(const g of groups){
    let busY = g.topY - drop - (g.lane||0)*laneStep;
    if(busY <= g.sy + 4) busY = g.sy + Math.max(6, drop*0.4);
    parts.push({ t:"line", k:g.k+":v", x1:g.sx, y1:g.sy, x2:g.sx, y2:busY });
    parts.push({ t:"line", k:g.k+":bus", x1:Math.min(g.minx,g.sx), y1:busY, x2:Math.max(g.maxx,g.sx), y2:busY });
    for(const t of g.tops) parts.push({ t:"line", k:g.k+":c:"+t.id, x1:t.cx, y1:busY, x2:t.cx, y2:t.top });
    if(g.couple) parts.push({ t:"dot", k:g.k+":dot", x:g.sx, y:g.sy });
  }
  return parts;
}

wires.addEventListener("animationend", function(e){
  const el = e.target;
  if(el.classList && el.classList.contains("grow")){ el.classList.remove("grow"); el.removeAttribute("pathLength"); }
});
nodesEl.addEventListener("animationend", function(e){
  const el = e.target;
  if(el.classList && el.classList.contains("pop")) el.classList.remove("pop");
});

function renderWires(){
  const parts = wireData();
  const keys = new Set();
  let s = "";
  for(const p of parts){
    if(p.k) keys.add(p.k);
    const fresh = TL.on && !TL.silent && p.k && !TL.wireKeys.has(p.k);
    if(p.t === "line"){
      const cls = [p.dash ? "dashed" : "", fresh ? "grow" : ""].filter(Boolean).join(" ");
      s += '<line x1="'+p.x1.toFixed(1)+'" y1="'+p.y1.toFixed(1)+'" x2="'+p.x2.toFixed(1)+'" y2="'+p.y2.toFixed(1)+'"'
         + (cls ? ' class="'+cls+'"' : '') + (fresh ? ' pathLength="1"' : '') + '/>';
    }else{
      s += '<circle class="join'+(fresh?" pop":"")+'" cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3.4"/>';
    }
  }
  wires.innerHTML = s;
  TL.wireKeys = keys;
}

function bounds(){
  const W = cw(), H = ch();
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for(const p of S.people){
    if(!VIS.has(p.id)) continue;
    const q = S.pos[p.id]; if(!q) continue;
    a = Math.min(a,q.x); b = Math.min(b,q.y); c = Math.max(c,q.x+W); d = Math.max(d,q.y+H);
  }
  if(!isFinite(a)) return null;
  return { x:a, y:b, w:c-a, h:d-b };
}

/* ============================================================
   11. ビューポート（パン・ズーム）
   ============================================================ */
function applyView(){
  stage.style.transform = "translate("+S.view.x.toFixed(2)+"px,"+S.view.y.toFixed(2)+"px) scale("+S.view.k.toFixed(4)+")";
  const pct = document.getElementById("z-pct");
  if(pct) pct.textContent = Math.round(S.view.k*100) + "%";
  stage.classList.toggle("lod", S.view.k < 0.42);
}
function setView(v, animate){
  const to = { x:v.x, y:v.y, k:clamp(v.k, 0.1, 4) };
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(!animate || reduce){ S.view = to; applyView(); saveSoon(); return; }
  const from = { x:S.view.x, y:S.view.y, k:S.view.k }, t0 = performance.now(), dur = 340;
  function step(t){
    const e = clamp((t-t0)/dur, 0, 1), u = 1 - Math.pow(1-e, 3);
    S.view = { x: from.x+(to.x-from.x)*u, y: from.y+(to.y-from.y)*u, k: from.k+(to.k-from.k)*u };
    applyView();
    if(e < 1) requestAnimationFrame(step); else saveSoon();
  }
  requestAnimationFrame(step);
}
function fitView(animate){
  const bb = bounds(); if(!bb) return;
  const r = canvas.getBoundingClientRect();
  const pad = Math.max(12, Math.min(56, Math.min(r.width, r.height) * 0.07));
  const k = clamp(Math.min((r.width-pad*2)/bb.w, (r.height-pad*2)/bb.h), 0.1, 1.6);
  setView({ k:k, x: r.width/2 - (bb.x+bb.w/2)*k, y: r.height/2 - (bb.y+bb.h/2)*k }, animate!==false);
}
/* 選んだ人物を画面中央へ。倍率は「本人が読めて、周りの数人も見える」程度に自動調整する。
   すでにその範囲内の倍率なら、利用者が決めた倍率を尊重して変えない。 */
function focusScale(){
  const r = canvas.getBoundingClientRect();
  return clamp(Math.min(r.width/(cw()*3.1), r.height/(ch()*4.6)), 0.45, 0.9);
}
function centerOn(id, animate){
  const q = S.pos[id]; if(!q) return;
  const r = canvas.getBoundingClientRect();
  const t = focusScale();
  let k = S.view.k;
  if(k < t*0.7 || k > t*1.6) k = t;
  setView({ k:k, x: r.width/2 - (q.x+cw()/2)*k, y: r.height/2 - (q.y+ch()/2)*k }, animate!==false);
}
function zoomBy(f){
  const r = canvas.getBoundingClientRect(), mx = r.width/2, my = r.height/2;
  const k2 = clamp(S.view.k*f, 0.1, 4);
  setView({ k:k2, x: mx-(mx-S.view.x)*(k2/S.view.k), y: my-(my-S.view.y)*(k2/S.view.k) }, true);
}

let saveTimer = null;
function saveSoon(){ clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }

/* ---- ホイール／ピンチ ---- */
canvas.addEventListener("wheel", function(e){
  if(onOverlay(e)) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect(), mx = e.clientX-r.left, my = e.clientY-r.top;
  if(e.shiftKey && !e.ctrlKey){
    S.view.x -= e.deltaY; applyView(); saveSoon(); return;
  }
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
  const k2 = clamp(S.view.k * Math.exp(-e.deltaY*unit*0.0018), 0.1, 4);
  S.view.x = mx - (mx-S.view.x)*(k2/S.view.k);
  S.view.y = my - (my-S.view.y)*(k2/S.view.k);
  S.view.k = k2;
  applyView(); saveSoon();
}, { passive:false });

/* ---- ポインタ操作（パン・カードドラッグ・ピンチ） ---- */
const ptrs = new Map();
let mode = null, dragId = null, dragStart = null, moved = false, pinch = null;
let tapId = null, threshold = 4;

/* キャンバス上に重ねた操作部品（ズーム・時系列バー・選択中バッジ）は、
   キャンバスのドラッグ処理に横取りされないようにする */
function onOverlay(e){ return !!(e.target.closest && e.target.closest(".zoombox, .tlbar, .selbar, .hint")); }

canvas.addEventListener("pointerdown", function(e){
  if(onOverlay(e)) return;
  if(e.button !== 0 && e.button !== 1) return;
  try{ canvas.setPointerCapture(e.pointerId); }catch(err){}
  ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY });
  if(ptrs.size === 2){
    const a = Array.from(ptrs.values());
    pinch = { d: Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y), k:S.view.k,
              cx:(a[0].x+a[1].x)/2, cy:(a[0].y+a[1].y)/2, vx:S.view.x, vy:S.view.y };
    mode = "pinch"; return;
  }
  const card = e.target.closest ? e.target.closest(".node") : null;
  moved = false;
  tapId = null;
  /* 指の震えでカードが動かないよう、タッチはしきい値を広めに取る */
  threshold = e.pointerType === "touch" ? 10 : 4;
  /* カードを動かせるのは、その人物を選択しているときだけ。
     未選択のカードを触った場合は画面のパンとして扱い、指を離した位置で選択する。 */
  if(card && e.button === 0 && card.dataset.id === S.sel){
    mode = "drag"; dragId = card.dataset.id;
    const q = S.pos[dragId] || {x:0,y:0};
    dragStart = { mx:e.clientX, my:e.clientY, ox:q.x, oy:q.y, el:card };
    card.classList.add("drag");
  }else{
    mode = "pan"; canvas.classList.add("panning");
    tapId = card ? card.dataset.id : null;
    dragStart = { mx:e.clientX, my:e.clientY, ox:S.view.x, oy:S.view.y };
  }
});

canvas.addEventListener("pointermove", function(e){
  if(!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY });
  if(mode === "pinch" && ptrs.size >= 2 && pinch){
    const a = Array.from(ptrs.values());
    const d = Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y);
    const r = canvas.getBoundingClientRect();
    const k2 = clamp(pinch.k * (d/(pinch.d||1)), 0.1, 4);
    const mx = pinch.cx - r.left, my = pinch.cy - r.top;
    S.view.x = mx - (mx-pinch.vx)*(k2/pinch.k);
    S.view.y = my - (my-pinch.vy)*(k2/pinch.k);
    S.view.k = k2; applyView(); return;
  }
  if(!dragStart) return;
  const dx = e.clientX-dragStart.mx, dy = e.clientY-dragStart.my;
  if(!moved && Math.abs(dx)+Math.abs(dy) > threshold) moved = true;
  if(!moved) return;
  if(mode === "pan"){
    S.view.x = dragStart.ox + dx; S.view.y = dragStart.oy + dy; applyView();
  }else if(mode === "drag" && dragId){
    S.pos[dragId] = { x: Math.round(dragStart.ox + dx/S.view.k), y: Math.round(dragStart.oy + dy/S.view.k) };
    dragStart.el.style.transform = "translate("+S.pos[dragId].x+"px,"+S.pos[dragId].y+"px)";
    dragStart.el.style.setProperty("--tf", dragStart.el.style.transform);
    renderWires();
  }
});

function endPointer(e){
  if(ptrs.has(e.pointerId)) ptrs.delete(e.pointerId);
  if(mode === "pinch" && ptrs.size < 2){ mode = null; pinch = null; dragStart = null; saveSoon(); return; }
  if(mode === "drag" && dragId){
    const c = dragStart && dragStart.el; if(c) c.classList.remove("drag");
    if(!moved) select(null);   /* 選択中のカードをタップ＝選択を外す */
    else { save(); toast("配置を手動で変更しました。「自動整列」で元の並びに戻せます"); }
  }else if(mode === "pan"){
    canvas.classList.remove("panning");
    if(!moved){
      if(tapId){ select(tapId); centerOn(tapId, true); }
      else{
        if(S.sel) select(null);
        if(isPhone()) hideRail();   /* 家系図の余白をタップ → 詳細シートを閉じる */
      }
    }
    saveSoon();
  }
  mode = null; dragId = null; dragStart = null; tapId = null;
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("dblclick", function(e){
  const card = e.target.closest ? e.target.closest(".node") : null;
  if(card) openPersonDialog(card.dataset.id);
});

let toastTimer = null;
function toast(msg){
  const h = document.getElementById("hint");
  h.textContent = msg; h.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(()=> h.classList.remove("show"), 2600);
}
function updateEmpty(){
  let e = document.getElementById("empty");
  const none = VIS.size === 0;
  if(none && !e){
    e = document.createElement("div"); e.className = "empty"; e.id = "empty";
    e.innerHTML = S.people.length
      ? '<div>表示できる人物がありません。<br>フィルタの条件を見直してください。</div>'
      : '<div>まだ人物がいません。</div>';
    canvas.appendChild(e);
  }else if(!none && e){ e.remove(); }
}

/* ============================================================
   12. 変更操作
   ============================================================ */
function commit(opts){
  const o = opts || {};
  recompute();
  if(o.layout && S.set.autoLayout) relayout();
  render();
  save();
  /* 年齢管理タブは家系図の人物を直接参照しているので、開いていれば描き直す */
  if(S.mode === "age" && typeof ageRender === "function") ageRender();
}
function select(id){
  S.sel = id;
  if(id && S.tab !== "detail") S.tab = "detail";
  recompute();
  render();
}
function newPerson(d){
  const p = { id:uid("p"), surname:(d&&d.surname)||"", given:(d&&d.given)||"", maiden:(d&&d.maiden)||"",
              gender:(d&&d.gender)||"other", birth:(d&&d.birth)||"", death:(d&&d.death)||"",
              deceased:!!(d&&d.death), note:"" };
  S.people.push(p); S.sample = false; return p;
}
function unionOf(a, b){
  for(const u of S.unions){
    const set = u.partners.filter(Boolean);
    if(b){ if(set.length===2 && set.indexOf(a)>=0 && set.indexOf(b)>=0) return u; }
    else if(set.length===1 && set[0]===a) return u;
  }
  return null;
}
function makeUnion(a, b, status){
  const A = byId(a), B = b ? byId(b) : null;
  let pa = a, pb = b || null;
  if(A && B && A.gender!=="male" && B.gender==="male"){ pa = b; pb = a; }
  const u = { id:uid("u"), partners:[pa, pb], children:[], status:status||"married" };
  S.unions.push(u); return u;
}

/* 選択中の人物 base に対して type の関係で人物を追加 */
function addRelative(baseId, type, data){
  const ix = index();
  const base = byId(baseId);
  if(!base && type !== "solo") return null;
  const np = newPerson(data);

  if(type === "solo"){ /* 単独 */ }
  else if(type === "spouse"){
    makeUnion(baseId, np.id, (data && data.status) || "married");
  }
  else if(type === "child"){
    let u = (ix.asPartner.get(baseId)||[])[0];
    if(data && data.unionId) u = S.unions.find(x=>x.id===data.unionId) || u;
    if(!u) u = makeUnion(baseId, null);
    u.children.push(np.id);
  }
  else if(type === "parent"){
    let u = ix.childUnion.get(baseId);
    if(!u){ u = makeUnion(np.id, null); u.children.push(baseId); }
    else{
      const empty = u.partners.indexOf(null);
      if(empty >= 0) u.partners[empty] = np.id;
      else u.partners.push(np.id);
      const A = byId(u.partners[0]), B = byId(u.partners[1]);
      if(A && B && A.gender!=="male" && B.gender==="male") u.partners = [B.id, A.id];
    }
  }
  else if(type === "sibling"){
    let u = ix.childUnion.get(baseId);
    if(!u){ u = makeUnion(null, null); u.partners = [null,null]; u.children.push(baseId); }
    u.children.push(np.id);
    u.children.sort((a,b)=> sortKey((byId(a)||{}).birth).localeCompare(sortKey((byId(b)||{}).birth)));
  }
  normalize();
  const b = base ? (S.pos[baseId]||{x:0,y:0}) : {x:0,y:0};
  S.pos[np.id] = { x: b.x + (type==="parent"?0:cw()+40), y: b.y + (type==="parent" ? -(ch()+90) : type==="child" ? (ch()+90) : 0) };
  commit({ layout:true });
  select(np.id);
  return np;
}

function removePerson(id){
  S.people = S.people.filter(p=> p.id !== id);
  for(const u of S.unions){
    u.partners = u.partners.map(p=> p===id ? null : p);
    u.children = u.children.filter(c=> c !== id);
  }
  normalize();
  delete S.pos[id];
  if(S.sel === id) S.sel = null;
  commit({ layout:true });
}
function removeUnion(uid_){
  S.unions = S.unions.filter(u=> u.id !== uid_);
  commit({ layout:true });
}

/* ============================================================
   13. 右パネル
   ============================================================ */
const pane = document.getElementById("pane");
const railEl = document.getElementById("rail");

function renderRail(){
  $$("#tabs button").forEach(b=> b.setAttribute("aria-selected", b.dataset.tab===S.tab ? "true":"false"));
  if(S.tab === "detail") paneDetail();
  else if(S.tab === "filter") paneFilter();
  else if(S.tab === "view") paneView();
  else paneData();
}

function h(html){ const d = document.createElement("div"); d.innerHTML = html; return d; }

function paneDetail(){
  const p = S.sel ? byId(S.sel) : null;
  if(!p){
    const stats = { people:S.people.length, gens:0, unions:S.unions.filter(u=>u.partners.filter(Boolean).length===2).length };
    const ids = S.people.map(x=>x.id);
    if(ids.length){
      const g = new Set(); Object.keys(S.pos).forEach(k=>{ if(S.pos[k]) g.add(S.pos[k].y); });
      stats.gens = g.size;
    }
    pane.innerHTML =
      '<div class="stat"><div><b>'+stats.people+'</b><span>人物</span></div>'+
      '<div><b>'+stats.gens+'</b><span>世代</span></div>'+
      '<div><b>'+stats.unions+'</b><span>婚姻</span></div></div>'+
      '<div class="blank">カードをクリックすると、<br>その人物から見た<b>親等</b>が<br>周囲のカードに表示されます。</div>'+
      '<div class="sect"><h3>操作</h3><p class="note">'+
      'ドラッグ＝画面の移動　ホイール／ピンチ＝拡大縮小<br>' +
      'カードは<b>選択してから</b>ドラッグすると個別に動かせます<br>' +
      'ダブルクリック（ダブルタップ）＝編集<br>' +
      '<code>+</code> <code>-</code> 拡大縮小　<code>0</code> 全体表示　<code>F</code> 自動整列</p></div>';
    return;
  }

  const ag = ageOf(p), b = fmtDate(p.birth), d = fmtDate(p.death);
  let sub = b ? b : "生年不明";
  if(isDead(p)) sub += " – " + (d || "没年不明");
  if(ag) sub += "　" + (ag.dead?"享年":"") + (ag.approx?"約":"") + ag.y + (ag.dead?"":"歳");

  let html = '<div class="card"><div class="hd">'+
    '<span class="g-'+p.gender+'" style="display:flex;flex:0 0 auto">'+symbol(p.gender,22)+'</span>'+
    '<div style="min-width:0"><div class="nm">'+esc(fullName(p))+'</div>'+
    (p.maiden ? '<div class="sub">旧姓 '+esc(p.maiden)+'</div>' : '')+
    '</div></div><div class="sub mono" style="margin-top:6px">'+esc(sub)+'</div></div>';

  html += '<div class="sect"><h3>基本情報</h3>'+
    '<div class="row2"><div class="field"><label>姓</label><input class="inp" id="f-surname" value="'+esc(p.surname)+'"></div>'+
    '<div class="field"><label>名</label><input class="inp" id="f-given" value="'+esc(p.given)+'"></div></div>'+
    '<div class="field" style="margin-top:10px"><label>旧姓（結婚前の姓）</label><input class="inp" id="f-maiden" value="'+esc(p.maiden)+'" placeholder="例：中村"></div>'+
    '<div class="field"><label>性別</label><div class="seg" id="f-gender">'+
      ['male','female','other'].map(g=>'<button type="button" data-g="'+g+'" aria-pressed="'+(p.gender===g)+'">'+
        '<svg viewBox="0 0 18 18">'+SYM[g]+'</svg>'+GENDERS[g]+'</button>').join("")+
    '</div></div>'+
    '<div class="row2"><div class="field"><label>生年月日</label><input class="inp mono" id="f-birth" value="'+esc(p.birth)+'" placeholder="1955-01-30"></div>'+
    '<div class="field"><label>没年月日</label><input class="inp mono" id="f-death" value="'+esc(p.death)+'" placeholder="空欄可"></div></div>'+
    '<label class="sw" style="margin-top:8px">故人として扱う<input type="checkbox" id="f-dead"'+(isDead(p)?" checked":"")+'></label>'+
    '<div class="field" style="margin-top:10px"><label>メモ</label><textarea class="inp" id="f-note" rows="2" placeholder="続柄の補足、出身地など">'+esc(p.note)+'</textarea></div>'+
    '</div>';

  html += '<div class="sect"><h3>この人物を基点に追加</h3><div class="addgrid" id="addgrid">'+
    '<button data-t="parent"><svg viewBox="0 0 18 18"><path d="M9 15V6M9 6 5.5 9.5M9 6l3.5 3.5"/><path d="M3 3h12"/></svg>親</button>'+
    '<button data-t="spouse"><svg viewBox="0 0 18 18"><rect x="1.5" y="6" width="6" height="6"/><circle cx="13.5" cy="9" r="3"/><path d="M7.5 9h3"/></svg>配偶者</button>'+
    '<button data-t="child"><svg viewBox="0 0 18 18"><path d="M9 3v9M9 12l-3.5-3.5M9 12l3.5-3.5"/><path d="M3 15h12"/></svg>子</button>'+
    '<button data-t="sibling"><svg viewBox="0 0 18 18"><path d="M9 2v4M4 10V6.5h10V10"/><rect x="2" y="10" width="4" height="4"/><rect x="12" y="10" width="4" height="4"/></svg>きょうだい</button>'+
    '<button data-t="link"><svg viewBox="0 0 18 18"><path d="M7 11 11 7M6.5 4.5 8 3a3.2 3.2 0 0 1 4.5 4.5L11 9M7 9l-1.5 1.5A3.2 3.2 0 0 0 10 15l1.5-1.5"/></svg>既存と結ぶ</button>'+
    '<button data-t="del"><svg viewBox="0 0 18 18"><path d="M3.5 5h11M7 5V3h4v2M5 5l.8 10h6.4L13 5"/></svg>削除</button>'+
    '</div></div>';

  // 近親者リスト
  const rows = [];
  KIN.forEach((r,id)=>{ if(id!==p.id) rows.push({ id:id, r:r }); });
  rows.sort((a,b)=>{
    const ka = a.r.kind==="spouse"?-1:a.r.deg, kb = b.r.kind==="spouse"?-1:b.r.deg;
    if(ka!==kb) return ka-kb;
    return sortKey((byId(a.id)||{}).birth).localeCompare(sortKey((byId(b.id)||{}).birth));
  });
  if(rows.length){
    html += '<div class="sect"><h3>この人物から見た親族　'+rows.length+'名</h3><div class="kin" id="kinlist">'+
      rows.slice(0,60).map(x=>{
        const q = byId(x.id);
        return '<div class="r" data-id="'+x.id+'"><span class="lb">'+esc(x.r.label)+'</span>'+
               '<span class="nn">'+esc(fullName(q))+'</span>'+
               (x.r.chip ? '<span class="dg">'+esc(x.r.chip)+'</span>' : '<span></span>')+'</div>';
      }).join("")+'</div>'+
      '<p class="note" style="margin-top:8px">民法上の親族は<b>6親等内の血族・配偶者・3親等内の姻族</b>です。</p></div>';
  }
  pane.innerHTML = html;
  bindDetail(p);
}

function bindDetail(p){
  const fields = { "f-surname":"surname", "f-given":"given", "f-maiden":"maiden",
                   "f-birth":"birth", "f-death":"death", "f-note":"note" };
  Object.keys(fields).forEach(fid=>{
    const inp = document.getElementById(fid); if(!inp) return;
    inp.addEventListener("input", function(){
      const cur = byId(p.id); if(!cur) return;
      cur[fields[fid]] = inp.value;
      if(fields[fid]==="death") cur.deceased = !!inp.value;
      S.sample = false;
      recompute(); renderNodes(); renderWires(); save();
    });
    inp.addEventListener("change", function(){
      if(fields[fid]==="birth" || fields[fid]==="death"){ commit({ layout: fields[fid]==="birth" }); }
    });
  });
  const dead = document.getElementById("f-dead");
  if(dead) dead.addEventListener("change", function(){
    const cur = byId(p.id); if(!cur) return;
    cur.deceased = dead.checked; if(!dead.checked) cur.death = "";
    commit({ layout:false });
  });
  const seg = document.getElementById("f-gender");
  if(seg) seg.addEventListener("click", function(e){
    const b = e.target.closest("button"); if(!b) return;
    const cur = byId(p.id); if(!cur) return;
    cur.gender = b.dataset.g;
    for(const u of S.unions){
      const A = byId(u.partners[0]), B = byId(u.partners[1]);
      if(A && B && A.gender!=="male" && B.gender==="male") u.partners = [B.id, A.id];
    }
    commit({ layout:true });
  });
  const grid = document.getElementById("addgrid");
  if(grid) grid.addEventListener("click", function(e){
    const b = e.target.closest("button"); if(!b) return;
    const t = b.dataset.t;
    if(t === "del") confirmDelete(p.id);
    else if(t === "link") openLinkDialog(p.id);
    else openAddDialog(p.id, t);
  });
  const kin = document.getElementById("kinlist");
  if(kin) kin.addEventListener("click", function(e){
    const r = e.target.closest(".r"); if(!r) return;
    select(r.dataset.id); centerOn(r.dataset.id, true);
  });
}

/* ---------- フィルタ ---------- */
function paneFilter(){
  const counts = {};
  for(const p of S.people){ const s = surnameOf(p); counts[s] = (counts[s]||0)+1; }
  const names = Object.keys(counts).sort((a,b)=> counts[b]-counts[a] || a.localeCompare(b,"ja"));
  const sel = S.sel ? byId(S.sel) : null;

  let html = '<div class="sect"><h3>検索</h3>'+
    '<input class="inp" id="q" placeholder="氏名・旧姓・メモ" value="'+esc(S.flt.q)+'"></div>';

  html += '<div class="sect"><h3>姓で絞り込む　'+names.length+'種</h3><div id="snlist">'+
    names.map(n=> '<label class="chk"><input type="checkbox" data-sn="'+esc(n)+'"'+
      (S.flt.surnames[n]===false?"":" checked")+'><span>'+esc(n)+'</span><span class="n">'+counts[n]+'</span></label>').join("")+
    '</div><div class="mini"><button id="sn-all">すべて表示</button><button id="sn-none">すべて隠す</button></div></div>';

  html += '<div class="sect"><h3>性別</h3><div id="gflt">'+
    ["male","female","other"].map(g=> '<label class="chk"><input type="checkbox" data-g="'+g+'"'+
      (S.flt.gender[g]===false?"":" checked")+'><span>'+GENDERS[g]+'</span></label>').join("")+
    '</div><label class="chk"><input type="checkbox" id="f-showdead"'+(S.flt.dead?" checked":"")+'><span>故人を表示</span></label></div>';

  html += '<div class="sect"><h3>親等で絞り込む</h3>'+
    (sel ? '<p class="note" style="margin-bottom:8px">基点：<b>'+esc(fullName(sel))+'</b></p>' :
           '<p class="note" style="margin-bottom:8px">先にカードを1つ選んでください。</p>')+
    '<div class="slider"><input type="range" id="degr" min="0" max="6" step="1" value="'+S.flt.deg+'"'+(sel?"":" disabled")+'>'+
    '<span class="val" id="degv">'+(S.flt.deg?S.flt.deg+"親等":"制限なし")+'</span></div></div>';

  html += '<div class="sect"><label class="sw">非表示の人物を詰めて配置<input type="checkbox" id="f-pack"'+(S.set.packHidden?" checked":"")+'></label>'+
    '<div class="mini"><button id="flt-reset">フィルタを解除</button></div></div>';

  pane.innerHTML = html;

  document.getElementById("q").addEventListener("input", function(){
    S.flt.q = this.value; recompute(); renderNodes(); renderWires(); updateEmpty();
  });
  document.getElementById("snlist").addEventListener("change", function(e){
    const c = e.target.closest("input"); if(!c) return;
    S.flt.surnames[c.dataset.sn] = c.checked;
    commit({ layout:true });
  });
  document.getElementById("sn-all").onclick = ()=>{ names.forEach(n=> S.flt.surnames[n]=true); commit({layout:true}); };
  document.getElementById("sn-none").onclick = ()=>{ names.forEach(n=> S.flt.surnames[n]=false); commit({layout:true}); };
  document.getElementById("gflt").addEventListener("change", function(e){
    const c = e.target.closest("input"); if(!c) return;
    S.flt.gender[c.dataset.g] = c.checked; commit({ layout:true });
  });
  document.getElementById("f-showdead").addEventListener("change", function(){ S.flt.dead = this.checked; commit({layout:true}); });
  const dr = document.getElementById("degr");
  dr.addEventListener("input", function(){
    S.flt.deg = +this.value;
    document.getElementById("degv").textContent = S.flt.deg ? S.flt.deg+"親等" : "制限なし";
  });
  dr.addEventListener("change", ()=> commit({ layout:true }));
  document.getElementById("f-pack").addEventListener("change", function(){ S.set.packHidden = this.checked; commit({layout:true}); });
  document.getElementById("flt-reset").onclick = ()=>{
    S.flt = { q:"", surnames:{}, gender:{male:true,female:true,other:true}, deg:0, dead:true };
    commit({ layout:true });
  };
}

/* ---------- 表示 ---------- */
function paneView(){
  const sl = (id,label,min,max,step,val,fmt)=>
    '<div class="field"><label>'+label+'</label><div class="slider">'+
    '<input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'">'+
    '<span class="val" id="'+id+'-v">'+fmt+'</span></div></div>';

  pane.innerHTML =
    '<div class="sect"><h3>文字の大きさ</h3>'+
      sl("s-font","文字の大きさ",0.75,3,0.05,S.set.fontScale,Math.round(S.set.fontScale*100)+"%")+
      '<p class="note" style="margin-top:-2px;margin-bottom:8px">文字を大きくすると、収まるようにカードも自動で広がります。</p>'+
      '<div class="mini"><button id="s-reset">標準に戻す</button></div></div>'+
    '<div class="sect"><h3>カードの表示</h3>'+
      '<label class="sw">性別で色分けする<input type="checkbox" id="v-tint"'+(S.set.tint?" checked":"")+'></label>'+
      '<label class="sw">旧姓を表示する<input type="checkbox" id="v-maiden"'+(S.set.maiden?" checked":"")+'></label>'+
      '<label class="sw">年齢・享年を表示する<input type="checkbox" id="v-age"'+(S.set.age?" checked":"")+'></label>'+
      '<label class="sw">選択時に親等を表示する<input type="checkbox" id="v-deg"'+(S.set.degree?" checked":"")+'></label>'+
    '</div>'+
    '<div class="sect"><h3>配置</h3>'+
      '<label class="sw">変更したら自動で整列する<input type="checkbox" id="v-auto"'+(S.set.autoLayout?" checked":"")+'></label>'+
      '<p class="note" style="margin-top:8px">整列の規則：夫婦は<b>男性が左</b>、きょうだいは<b>年長が左</b>。親は子の中央に揃えます。</p>'+
      '<div class="mini"><button id="v-arrange">いま整列する</button></div></div>';

  const bindS = (id, key, fmt)=>{
    const r = document.getElementById(id), v = document.getElementById(id+"-v");
    r.addEventListener("input", function(){
      S.set[key] = +this.value; v.textContent = fmt(+this.value);
      stage.style.setProperty("--cw", cw()+"px"); stage.style.setProperty("--ch", ch()+"px");
      stage.style.setProperty("--fs", (13*S.set.fontScale).toFixed(2)+"px");
      renderWires();
    });
    r.addEventListener("change", ()=> commit({ layout:true }));
  };
  bindS("s-font","fontScale", v=> Math.round(v*100)+"%");
  document.getElementById("s-reset").onclick = ()=>{ S.set.fontScale = 1; commit({layout:true}); };
  const tog = (id,key,relay)=> document.getElementById(id).addEventListener("change", function(){
    S.set[key] = this.checked; commit({ layout:!!relay });
  });
  tog("v-tint","tint"); tog("v-maiden","maiden"); tog("v-age","age"); tog("v-deg","degree");
  tog("v-auto","autoLayout");
  document.getElementById("v-arrange").onclick = ()=>{ relayout(); render(); save(); fitView(true); };
}

/* ---------- データ ---------- */
function paneData(){
  pane.innerHTML =
    '<div class="sect"><h3>エクスポート</h3>'+
      '<p class="note" style="margin-bottom:9px">家系図の全データ（人物・続柄・配置・表示設定）を書き出します。JSON はこのアプリに読み込み直せます。</p>'+
      '<div class="mini"><button id="ex-json">JSON で保存</button><button id="ex-svg">SVG で保存</button></div>'+
      '<div class="mini"><button id="ex-copy">JSON をコピー</button></div>'+
      '<div id="ex-msg"></div></div>'+
    '<div class="sect"><h3>インポート</h3>'+
      '<p class="note" style="margin-bottom:9px">JSON ファイルを選ぶか、下に貼り付けて読み込みます。旧形式（<code>parents</code>／<code>spouses</code>／<code>children</code> を持つ配列）にも対応します。</p>'+
      '<div class="mini"><button id="im-file">ファイルを選ぶ</button></div>'+
      '<input type="file" id="im-input" accept=".json,application/json" style="display:none">'+
      '<div class="field" style="margin-top:10px"><label>JSON を貼り付け</label>'+
      '<textarea class="inp" id="im-text" rows="6" placeholder=\'{"people":[…],"unions":[…]}\'></textarea></div>'+
      '<div class="mini"><button id="im-run">貼り付けたデータを読み込む</button></div>'+
      '<div id="im-msg"></div></div>'+
    '<div class="sect"><h3>この端末の保存</h3>'+
      '<p class="note" style="margin-bottom:9px">編集内容はこのブラウザに自動保存されます。'+(S.sample?'いま表示しているのは<b>サンプルの家系図</b>です。':'')+'</p>'+
      '<div class="mini"><button id="d-sample">サンプルを読み込む</button><button id="d-clear">全部消して新規作成</button></div></div>';

  const msg = (el_, cls, text)=>{ el_.innerHTML = '<div class="msg '+cls+'">'+esc(text)+'</div>'; };
  const exm = document.getElementById("ex-msg"), imm = document.getElementById("im-msg");

  document.getElementById("ex-json").onclick = function(){
    const name = "kakeizu-" + new Date().toISOString().slice(0,10) + ".json";
    saveFile(name, JSON.stringify(exportObj(), null, 2), exm);
  };
  document.getElementById("ex-svg").onclick = function(){
    const name = "kakeizu-" + new Date().toISOString().slice(0,10) + ".svg";
    saveFile(name, buildSVG(), exm);
  };
  document.getElementById("ex-copy").onclick = async function(){
    const t = JSON.stringify(exportObj(), null, 2);
    try{ await navigator.clipboard.writeText(t); msg(exm,"ok","JSON をクリップボードにコピーしました"); }
    catch(e){
      const ta = document.getElementById("im-text"); ta.value = t; ta.select();
      msg(exm,"err","コピーできませんでした。下の欄に出力したので手動でコピーしてください");
    }
  };
  document.getElementById("im-file").onclick = ()=> document.getElementById("im-input").click();
  document.getElementById("im-input").addEventListener("change", function(){
    const f = this.files && this.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{ runImport(String(r.result), imm); };
    r.onerror = ()=> msg(imm,"err","ファイルを読み込めませんでした");
    r.readAsText(f);
  });
  document.getElementById("im-run").onclick = function(){
    const t = document.getElementById("im-text").value.trim();
    if(!t){ msg(imm,"err","JSON が空です"); return; }
    runImport(t, imm);
  };
  document.getElementById("d-sample").onclick = function(){
    if(!confirm("いまのデータを破棄してサンプルを読み込みます。よろしいですか？")) return;
    const d = sampleData(); S.people = d.people; S.unions = d.unions; S.pos = {}; S.sel = null; S.sample = true;
    S.flt = { q:"", surnames:{}, gender:{male:true,female:true,other:true}, deg:0, dead:true };
    recompute(); relayout(); render(); save(); fitView(true);
  };
  document.getElementById("d-clear").onclick = function(){
    if(!confirm("すべての人物を削除して新規作成します。元に戻せません。よろしいですか？")) return;
    S.people = []; S.unions = []; S.pos = {}; S.sel = null; S.sample = false;
    recompute(); render(); save();
  };

  function runImport(text, box){
    let obj;
    try{ obj = JSON.parse(text); }
    catch(e){ msg(box,"err","JSON の書式が正しくありません: "+e.message); return; }
    try{
      importData(obj);
      recompute();
      if(!Object.keys(S.pos).length) relayout();
      render(); save(); fitView(true);
      msg(box,"ok", S.people.length + "名を読み込みました");
    }catch(e){ msg(box,"err","読み込めませんでした: "+e.message); }
  }
}

/* ---------- ファイル保存 ---------- */
const MIME = { json:"application/json", svg:"image/svg+xml", txt:"text/plain" };
async function saveFile(filename, text, box){
  const show = (cls,t)=>{ if(box) box.innerHTML = '<div class="msg '+cls+'">'+esc(t)+'</div>'; };
  const ext = (filename.split(".").pop()||"txt").toLowerCase();
  try{
    const blob = new Blob([text], { type:(MIME[ext]||"application/octet-stream") + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 8000);
    show("ok", filename + " をダウンロードしました");
  }catch(e){
    try{
      await navigator.clipboard.writeText(text);
      show("ok","保存できない環境のため、内容をクリップボードにコピーしました");
    }catch(e2){ show("err","保存できませんでした。「JSON をコピー」をお試しください"); }
  }
}

/* ---------- SVG 書き出し ---------- */
function buildSVG(){
  const W = cw(), H = ch(), F = 13*S.set.fontScale, pad = 40;
  const bb = bounds() || { x:0, y:0, w:200, h:100 };
  const ox = -bb.x + pad, oy = -bb.y + pad;
  const X = v => (v+ox).toFixed(1), Y = v => (v+oy).toFixed(1);
  const col = { ink:"#131A21", ink2:"#4A5867", ink3:"#7C8B9A", line:"#AAB7C4", edge:"#41556B", bg:"#FFFFFF",
                male:"#2C5F8A", female:"#96375A", other:"#4F6B4A" };
  const tint = { male:"#E4EDF5", female:"#F7E4EB", other:"#E7EEE5" };
  let s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+Math.round(bb.w+pad*2)+'" height="'+Math.round(bb.h+pad*2)+
          '" viewBox="0 0 '+Math.round(bb.w+pad*2)+' '+Math.round(bb.h+pad*2)+'" font-family="Hiragino Kaku Gothic ProN, Yu Gothic, Meiryo, sans-serif">';
  s += '<rect width="100%" height="100%" fill="'+col.bg+'"/>';
  s += '<g stroke="'+col.edge+'" stroke-width="1.7" fill="none">';
  for(const p of wireData()){
    if(p.t==="line") s += '<line x1="'+X(p.x1)+'" y1="'+Y(p.y1)+'" x2="'+X(p.x2)+'" y2="'+Y(p.y2)+'"'+(p.dash?' stroke-dasharray="7 5"':'')+'/>';
    else s += '<circle cx="'+X(p.x)+'" cy="'+Y(p.y)+'" r="3.4" fill="'+col.bg+'"/>';
  }
  s += '</g>';
  for(const p of S.people){
    if(!VIS.has(p.id)) continue;
    const q = S.pos[p.id]; if(!q) continue;
    const g = p.gender, c = col[g] || col.other;
    s += '<g transform="translate('+X(q.x)+','+Y(q.y)+')">';
    s += '<rect width="'+W+'" height="'+H+'" rx="3" fill="'+(S.set.tint?tint[g]:col.bg)+'" stroke="'+(S.sel===p.id?"#B93A22":col.line)+'" stroke-width="1.5"/>';
    const sy = H/2 - F*0.75, ss = F*1.5;
    if(g==="male") s += '<rect x="'+(F*0.72)+'" y="'+sy+'" width="'+ss+'" height="'+ss+'" rx="1" fill="none" stroke="'+c+'" stroke-width="1.6"/>';
    else if(g==="female") s += '<circle cx="'+(F*0.72+ss/2)+'" cy="'+(sy+ss/2)+'" r="'+(ss/2)+'" fill="none" stroke="'+c+'" stroke-width="1.6"/>';
    else s += '<path d="M'+(F*0.72+ss/2)+' '+sy+' L'+(F*0.72+ss)+' '+(sy+ss/2)+' L'+(F*0.72+ss/2)+' '+(sy+ss)+' L'+(F*0.72)+' '+(sy+ss/2)+' Z" fill="none" stroke="'+c+'" stroke-width="1.6"/>';
    const tx = F*0.72 + ss + F*0.62;
    let ty = H/2 - F*0.5;
    const has2 = (S.set.maiden && p.maiden), b = fmtDate(p.birth), d2 = fmtDate(p.death), ag = ageOf(p);
    const gone = isDead(p);
    const sub = [];
    if(has2) sub.push({ t:"旧姓 " + p.maiden, c: col.ink3 });
    const dates = (b||d2) ? ((b||"?") + (gone ? " – " + (d2||"?") : "")) : "";
    const agTx = (S.set.age && ag) ? ((ag.dead?"享年":"") + (ag.approx?"約":"") + ag.y + (ag.dead?"":"歳")) : "";
    if(gone){
      if(dates) sub.push({ t:dates, c: col.ink2 });
      if(agTx) sub.push({ t:agTx, c: col.ink3 });
    }else{
      const one = dates + (dates && agTx ? "  " : "") + agTx;
      if(one) sub.push({ t:one, c: col.ink2 });
    }
    ty = H/2 - sub.length*F*0.55 + F*0.34;
    s += '<text x="'+tx+'" y="'+ty.toFixed(1)+'" font-size="'+(F*1.22).toFixed(1)+'" font-weight="600" fill="'+col.ink+'" font-family="Hiragino Mincho ProN, Yu Mincho, serif">'+esc(fullName(p))+'</text>';
    for(const row of sub){
      ty += F*1.05;
      s += '<text x="'+tx+'" y="'+ty.toFixed(1)+'" font-size="'+(F*0.78).toFixed(1)+'" fill="'+row.c+'">'+esc(row.t)+'</text>';
    }
    s += '</g>';
  }
  s += '</svg>';
  return s;
}

/* ============================================================
   14. ダイアログ
   ============================================================ */
const modal = document.getElementById("modal");
function closeModal(){ modal.textContent = ""; }
function openModal(title, bodyHTML, footHTML){
  modal.innerHTML = '<div class="scrim"><div class="dlg" role="dialog" aria-modal="true">'+
    '<div class="h"><h2>'+esc(title)+'</h2><button class="x" data-close aria-label="閉じる">×</button></div>'+
    '<div class="b">'+bodyHTML+'</div><div class="f">'+footHTML+'</div></div></div>';
  modal.querySelector(".scrim").addEventListener("mousedown", function(e){ if(e.target===this) closeModal(); });
  $$("[data-close]", modal).forEach(b=>{ b.onclick = closeModal; });
  const first = modal.querySelector("input,select,textarea,button");
  if(first) setTimeout(()=> first.focus(), 20);
}

const REL_LABEL = { parent:"親", spouse:"配偶者", child:"子", sibling:"きょうだい", solo:"人物" };

function personForm(pre){
  const p = pre || {};
  return '<div class="row2"><div class="field"><label>姓</label><input class="inp" id="n-surname" value="'+esc(p.surname||"")+'"></div>'+
    '<div class="field"><label>名</label><input class="inp" id="n-given" value="'+esc(p.given||"")+'"></div></div>'+
    '<div class="field" style="margin-top:10px"><label>旧姓（任意）</label><input class="inp" id="n-maiden" value="'+esc(p.maiden||"")+'"></div>'+
    '<div class="field"><label>性別</label><div class="seg" id="n-gender">'+
      ["male","female","other"].map(g=>'<button type="button" data-g="'+g+'" aria-pressed="'+((p.gender||"other")===g)+'">'+
      '<svg viewBox="0 0 18 18">'+SYM[g]+'</svg>'+GENDERS[g]+'</button>').join("")+'</div></div>'+
    '<div class="row2"><div class="field"><label>生年月日</label><input class="inp mono" id="n-birth" placeholder="1955-01-30" value="'+esc(p.birth||"")+'"></div>'+
    '<div class="field"><label>没年月日</label><input class="inp mono" id="n-death" placeholder="空欄可" value="'+esc(p.death||"")+'"></div></div>'+
    '<p class="note" style="margin-top:10px">日付は <code>1955</code> や <code>1955-01</code> のように分かる範囲だけでも入力できます。</p>';
}
function readPersonForm(){
  const g = modal.querySelector('#n-gender [aria-pressed="true"]');
  return { surname: modal.querySelector("#n-surname").value.trim(),
           given: modal.querySelector("#n-given").value.trim(),
           maiden: modal.querySelector("#n-maiden").value.trim(),
           gender: g ? g.dataset.g : "other",
           birth: modal.querySelector("#n-birth").value.trim(),
           death: modal.querySelector("#n-death").value.trim() };
}
function bindGenderSeg(){
  const seg = modal.querySelector("#n-gender");
  if(seg) seg.addEventListener("click", function(e){
    const b = e.target.closest("button"); if(!b) return;
    $$("button", seg).forEach(x=> x.setAttribute("aria-pressed", x===b ? "true":"false"));
  });
}

function openAddDialog(baseId, type){
  const base = baseId ? byId(baseId) : null;
  const pre = { gender: type==="spouse" ? (base && base.gender==="male" ? "female" : "male") : "other" };
  if(base && (type==="child" || type==="sibling")) pre.surname = base.surname;
  if(base && type==="parent") pre.surname = base.surname;
  const lead = base
    ? '<p class="lead"><b>'+esc(fullName(base))+'</b> の<b>'+REL_LABEL[type]+'</b>として追加します。</p>'
    : '<p class="lead">どこにも繋がらない人物を追加します。あとから「既存と結ぶ」で関係を設定できます。</p>';

  let extra = "";
  if(type === "spouse"){
    extra = '<div class="field" style="margin-top:6px"><label>関係</label><div class="seg" id="n-status">'+
      [["married","婚姻"],["partner","内縁"],["divorced","離婚・死別"]].map((x,i)=>
        '<button type="button" data-s="'+x[0]+'" aria-pressed="'+(i===0)+'">'+x[1]+'</button>').join("")+'</div></div>';
  }
  if(type === "child" && base){
    const ix = index();
    const us = ix.asPartner.get(baseId) || [];
    if(us.length > 1){
      extra = '<div class="field" style="margin-top:6px"><label>どの配偶者との子か</label><select class="inp" id="n-union">'+
        us.map(u=>{ const o = u.partners.find(x=>x&&x!==baseId); const q = o?byId(o):null;
          return '<option value="'+u.id+'">'+esc(q?fullName(q):"（相手なし）")+'</option>'; }).join("")+'</select></div>';
    }
  }
  openModal((base ? REL_LABEL[type]+"を追加" : "人物を追加"), lead + personForm(pre) + extra,
    '<button class="btn" data-close>キャンセル</button><button class="btn primary" id="n-ok">追加する</button>');
  bindGenderSeg();
  const st = modal.querySelector("#n-status");
  if(st) st.addEventListener("click", function(e){
    const b = e.target.closest("button"); if(!b) return;
    $$("button", st).forEach(x=> x.setAttribute("aria-pressed", x===b ? "true":"false"));
  });
  modal.querySelector("#n-ok").onclick = function(){
    const d = readPersonForm();
    if(!d.surname && !d.given){ modal.querySelector("#n-given").focus(); toast("姓か名のどちらかを入力してください"); return; }
    if(st){ const on = st.querySelector('[aria-pressed="true"]'); d.status = on ? on.dataset.s : "married"; }
    const us = modal.querySelector("#n-union"); if(us) d.unionId = us.value;
    closeModal();
    addRelative(baseId, base ? type : "solo", d);
    centerOn(S.sel, true);
  };
  modal.querySelector(".dlg").addEventListener("keydown", function(e){
    if(e.key === "Enter" && e.target.tagName === "INPUT"){
      e.preventDefault();
      const ok = modal.querySelector("#n-ok"); if(ok) ok.click();
    }
  });
}

function openLinkDialog(baseId){
  const base = byId(baseId);
  const others = S.people.filter(p=> p.id !== baseId)
    .sort((a,b)=> sortKey(a.birth).localeCompare(sortKey(b.birth)));
  if(!others.length){ toast("結ぶ相手がまだいません"); return; }
  const opt = others.map(p=> '<option value="'+p.id+'">'+esc(fullName(p))+(p.birth?"（"+fmtDate(p.birth)+"）":"")+'</option>').join("");
  const ix = index();
  const links = [];
  for(const u of S.unions){
    if(u.partners.indexOf(baseId) >= 0){
      const o = u.partners.find(x=> x && x!==baseId);
      links.push({ t:"配偶者", name:o?fullName(byId(o)):"（相手なし）", uid:u.id, kind:"union" });
    }
  }
  const pu = ix.childUnion.get(baseId);
  if(pu) links.push({ t:"親", name: pu.partners.filter(Boolean).map(x=>fullName(byId(x))).join("・")||"（不明）", uid:pu.id, kind:"childof" });

  openModal("既存の人物と結ぶ",
    '<p class="lead"><b>'+esc(fullName(base))+'</b> と、すでにいる人物との関係を設定します。</p>'+
    '<div class="field"><label>関係</label><div class="seg" id="l-type">'+
      [["spouse","配偶者にする"],["child","子にする"],["parent","親にする"]].map((x,i)=>
        '<button type="button" data-t="'+x[0]+'" aria-pressed="'+(i===0)+'">'+x[1]+'</button>').join("")+'</div></div>'+
    '<div class="field"><label>相手</label><select class="inp" id="l-who">'+opt+'</select></div>'+
    (links.length ? '<div class="sect" style="margin-top:16px"><h3>いまの関係</h3><div class="kin">'+
      links.map(l=> '<div class="r" style="cursor:default"><span class="lb">'+esc(l.t)+'</span><span class="nn">'+esc(l.name)+
        '</span><button class="dg" data-cut="'+l.uid+'" data-kind="'+l.kind+'" style="cursor:pointer">解除</button></div>').join("")+
      '</div></div>' : ''),
    '<button class="btn" data-close>閉じる</button><button class="btn primary" id="l-ok">この関係にする</button>');

  const seg = modal.querySelector("#l-type");
  seg.addEventListener("click", function(e){
    const b = e.target.closest("button"); if(!b) return;
    $$("button", seg).forEach(x=> x.setAttribute("aria-pressed", x===b?"true":"false"));
  });
  modal.querySelector(".dlg").addEventListener("click", function(e){
    const c = e.target.closest("[data-cut]"); if(!c) return;
    const u = S.unions.find(x=> x.id === c.dataset.cut); if(!u) return;
    if(c.dataset.kind === "union"){ u.partners = u.partners.map(x=> x===baseId ? null : x); }
    else { u.children = u.children.filter(x=> x !== baseId); }
    normalize(); closeModal(); commit({ layout:true }); toast("関係を解除しました");
  });
  modal.querySelector("#l-ok").onclick = function(){
    const t = seg.querySelector('[aria-pressed="true"]').dataset.t;
    const who = modal.querySelector("#l-who").value;
    const ix2 = index();
    if(t === "spouse"){
      if(!unionOf(baseId, who)) makeUnion(baseId, who);
    }else if(t === "child"){
      let u = (ix2.asPartner.get(baseId)||[])[0] || makeUnion(baseId, null);
      const cu = ix2.childUnion.get(who);
      if(cu) cu.children = cu.children.filter(x=> x!==who);
      if(u.children.indexOf(who) < 0) u.children.push(who);
      u.children.sort((a,b)=> sortKey((byId(a)||{}).birth).localeCompare(sortKey((byId(b)||{}).birth)));
    }else{
      let u = ix2.childUnion.get(baseId);
      if(!u){ u = makeUnion(who, null); u.children.push(baseId); }
      else if(u.partners.indexOf(who) < 0){
        const empty = u.partners.indexOf(null);
        if(empty >= 0) u.partners[empty] = who; else u.partners.push(who);
        const A = byId(u.partners[0]), B = byId(u.partners[1]);
        if(A && B && A.gender!=="male" && B.gender==="male") u.partners = [B.id, A.id];
      }
    }
    normalize(); closeModal(); commit({ layout:true }); toast("関係を設定しました");
  };
}

function confirmDelete(id){
  const p = byId(id); if(!p) return;
  openModal("人物を削除",
    '<p class="lead"><b>'+esc(fullName(p))+'</b> を家系図から削除します。<br>この人物に繋がる線もすべて外れます。元に戻せません。</p>',
    '<button class="btn" data-close>キャンセル</button><button class="btn danger" id="del-ok">削除する</button>');
  modal.querySelector("#del-ok").onclick = function(){ closeModal(); removePerson(id); toast("削除しました"); };
}

function openPersonDialog(id){ select(id); S.tab = "detail"; showRail(); renderRail(); }

/* ============================================================
   15. ツールバー・キーボード・起動
   ============================================================ */
document.getElementById("tabs").addEventListener("click", function(e){
  const b = e.target.closest("button"); if(!b) return;
  S.tab = b.dataset.tab; renderRail(); pane.scrollTop = 0;
});
document.getElementById("b-add").onclick = ()=> openAddDialog(null, "solo");
document.getElementById("b-arrange").onclick = ()=>{ relayout(); render(); save(); fitView(true); toast("自動整列しました"); };
document.getElementById("z-in").onclick = ()=> zoomBy(1.25);
document.getElementById("z-out").onclick = ()=> zoomBy(1/1.25);
document.getElementById("z-pct").onclick = ()=>{
  const r = canvas.getBoundingClientRect(), mx = r.width/2, my = r.height/2, k2 = 1;
  setView({ k:k2, x: mx-(mx-S.view.x)*(k2/S.view.k), y: my-(my-S.view.y)*(k2/S.view.k) }, true);
};
/* ---- 右パネル（スマホではボトムシート）の開閉 ---- */
const railBtn = document.getElementById("b-rail");
function isPhone(){ return window.matchMedia("(max-width: 640px)").matches; }
function syncRailBtn(){ railBtn.classList.toggle("on", !railEl.classList.contains("hide")); }
function hideRail(){ railEl.classList.add("hide"); railEl.style.transform = ""; syncRailBtn(); }
function showRail(){ railEl.classList.remove("hide"); railEl.style.transform = ""; syncRailBtn(); }
railBtn.onclick = function(){ if(railEl.classList.contains("hide")) showRail(); else hideRail(); };
/* スマートフォンではパネルを閉じた状態から始める（キャンバスを広く使うため） */
if(isPhone()) railEl.classList.add("hide");
syncRailBtn();

/* スマホ：シート上部（つまみ・タブ）を下へスワイプすると閉じる */
(function(){
  const grip = document.getElementById("tabs");
  let y0 = null, dy = 0, active = false;
  grip.addEventListener("pointerdown", function(e){
    if(!isPhone()) return;
    y0 = e.clientY; dy = 0; active = true;
    railEl.style.transition = "none";
    try{ grip.setPointerCapture(e.pointerId); }catch(err){}
  });
  grip.addEventListener("pointermove", function(e){
    if(!active || y0 == null) return;
    dy = Math.max(0, e.clientY - y0);
    railEl.style.transform = "translateY(" + dy + "px)";
  });
  const end = function(){
    if(!active) return;
    active = false;
    railEl.style.transition = "";
    if(dy > 70){ hideRail(); }
    else{ railEl.style.transform = ""; }
    y0 = null; dy = 0;
  };
  grip.addEventListener("pointerup", end);
  grip.addEventListener("pointercancel", end);
})();

/* 画面上部の「選択中」表示 */
document.getElementById("selbar-name").onclick = function(){ if(S.sel) openPersonDialog(S.sel); };
document.getElementById("selbar-x").onclick = function(){ select(null); };

const themeBtn = document.getElementById("b-theme");
themeBtn.onclick = function(){
  const cur = document.documentElement.getAttribute("data-theme");
  const dark = cur ? cur === "dark"
    : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "light" : "dark");
  try{ localStorage.setItem(LS+"-theme", dark ? "light" : "dark"); }catch(e){}
};
try{ const t = localStorage.getItem(LS+"-theme"); if(t) document.documentElement.setAttribute("data-theme", t); }catch(e){}

document.addEventListener("keydown", function(e){
  if(e.key === "Escape"){ if(modal.firstChild){ closeModal(); return; } if(S.sel) select(null); return; }
  const el = e.target, tag = (el.tagName||"").toLowerCase();
  const typing = tag === "textarea" || tag === "select" ||
    (tag === "input" && !/^(checkbox|radio|range|button|submit|reset|file)$/i.test(el.type || "text"));
  if(typing) return;
  if(e.metaKey || e.ctrlKey) return;
  if(e.key === "1"){ e.preventDefault(); setMode("tree"); return; }
  if(e.key === "2"){ e.preventDefault(); setMode("age"); return; }
  if(S.mode !== "tree") return;
  if(e.key === "+" || e.key === "=") { e.preventDefault(); zoomBy(1.25); }
  else if(e.key === "-" || e.key === "_"){ e.preventDefault(); zoomBy(1/1.25); }
  else if(e.key === "0"){ e.preventDefault(); fitView(true); }
  else if(e.key === "f" || e.key === "F"){ e.preventDefault(); relayout(); render(); save(); fitView(true); }
  else if((e.key === "Delete" || e.key === "Backspace") && S.sel){ e.preventDefault(); confirmDelete(S.sel); }
});

window.addEventListener("beforeunload", save);


/* ============================================================
   16. 年齢管理タブ
   リスト（グループ）ごとに人物と生年月日を持ち、年齢と次の誕生日を
   自動計算する。家系図タブとはデータを共有せず、取り込みだけできる。
   ============================================================ */
const AGE_LS = "kakeizu-age-v1";
const AGE_LEGACY = "age-app-data-v1";
const ALL_ID = "__all__";
const TREE_ID = "__tree__";

const A = { groups: [], active: ALL_ID, sort: "birthday", showDead: false };

function ageDefault(){ return [{ id: uid("g"), name: "マイリスト", people: [] }]; }

function ageLoad(){
  const take = (raw)=>{
    const d = JSON.parse(raw);
    if(!Array.isArray(d) || !d.length) return null;
    /* 旧形式（人物の配列のみ）も受け入れる */
    if(d[0] && "dob" in d[0]) return [{ id: uid("g"), name: "マイリスト", people: d }];
    return d;
  };
  for(const key of [AGE_LS, AGE_LEGACY]){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      const g = take(raw);
      if(g){ A.groups = ageClean(g); return; }
    }catch(e){}
  }
  A.groups = ageDefault();
}
function ageClean(groups){
  return groups.filter(g=> g && typeof g === "object").map(g=>({
    id: g.id || uid("g"),
    name: String(g.name || "無題のリスト"),
    people: (Array.isArray(g.people) ? g.people : []).filter(p=> p && p.dob && parseDate(p.dob))
      .map(p=>({ id: p.id || uid("m"), pid: p.pid || "", name: String(p.name || "名称未設定"),
                 dob: normDob(p.dob), createdAt: p.createdAt || new Date().toISOString() }))
  }));
}
function ageSave(){
  try{ localStorage.setItem(AGE_LS, JSON.stringify(A.groups)); }catch(e){}
}

/* ---------- 日付ユーティリティ ---------- */
function normDob(v){
  const p = parseDate(v); if(!p) return "";
  const z = n => String(n).padStart(2,"0");
  return p.y + "-" + z(p.m || 1) + "-" + z(p.d || 1);
}
function ageOfDob(dob){
  const b = parseDate(dob); if(!b) return null;
  const t = new Date();
  let a = t.getFullYear() - b.y;
  const m = (t.getMonth() + 1) - (b.m || 1);
  if(m < 0 || (m === 0 && t.getDate() < (b.d || 1))) a--;
  return a;
}
function fmtJa(dob){
  const p = parseDate(dob); if(!p) return "";
  return p.y + "年" + (p.m || 1) + "月" + (p.d || 1) + "日";
}
function daysToBirthday(dob){
  const p = parseDate(dob); if(!p) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), (p.m || 1) - 1, p.d || 1);
  if(next < today) next = new Date(today.getFullYear() + 1, (p.m || 1) - 1, p.d || 1);
  return Math.round((next - today) / 86400000);
}
function daysInMonth(y, m){
  const yy = parseInt(y, 10), mm = parseInt(m, 10);
  if(isNaN(yy) || isNaN(mm) || mm < 1 || mm > 12) return 31;
  return new Date(yy, mm, 0).getDate();
}

/* ---------- 参照 ---------- */
/* 家系図タブの人物から作る「連動リスト」。実体は持たず毎回組み立てるので、
   家系図に人物を足す・直す・消すと、そのまま年齢管理にも反映される。 */
function treeAgePeople(){
  const out = [];
  for(const p of S.people){
    const d = parseDate(p.birth);
    if(!d) continue;
    out.push({ id: "t:" + p.id, pid: p.id, tree: true,
               name: fullName(p), dob: normDob(p.birth),
               approx: d.prec < 3, dead: isDead(p), death: p.death || "" });
  }
  return out;
}
function treeGroup(){
  const people = treeAgePeople();
  return { id: TREE_ID, name: "家系図", people: people, tree: true };
}
function ageGroup(id){
  if(id === TREE_ID) return treeGroup();
  return A.groups.find(g=> g.id === id) || null;
}
function ageGroups(){ return [treeGroup()].concat(A.groups); }

function ageVisible(list){ return A.showDead ? list : list.filter(p=> !p.dead); }

/* 自分のリストのメンバーが家系図の人物を指している（pid あり）場合は、
   家系図側の最新の名前・生年月日・故人情報で上書きして表示する */
function ageResolve(p){
  if(!p.pid) return p;
  const t = byId(p.pid);
  if(!t) return p;
  const d = parseDate(t.birth);
  return Object.assign({}, p, { name: fullName(t), dob: d ? normDob(t.birth) : p.dob,
    approx: !!d && d.prec < 3, dead: isDead(t), death: t.death || "", linked:true });
}
function ageView(){
  const tag = (g)=> g.people.map(p=> Object.assign({}, ageResolve(p), { gid:g.id, gname:g.name }));
  if(A.active === ALL_ID || !ageGroup(A.active)){
    let people = [];
    ageGroups().forEach(g=>{ people = people.concat(tag(g)); });
    return { id: ALL_ID, name: "すべて", raw: people, people: ageVisible(people), all: true, tree: false };
  }
  const g = ageGroup(A.active);
  const raw = tag(g);
  return { id: g.id, name: g.name, raw: raw, people: ageVisible(raw), all: false, tree: !!g.tree };
}
function ageSorted(people){
  const list = people.slice();
  const alive = p => p.dead ? 1 : 0;
  if(A.sort === "birthday") return list.sort((a,b)=>
    alive(a) - alive(b) || (daysToBirthday(a.dob) - daysToBirthday(b.dob)) || a.name.localeCompare(b.name,"ja"));
  if(A.sort === "age-asc")  return list.sort((a,b)=> b.dob.localeCompare(a.dob) || a.name.localeCompare(b.name,"ja"));
  return list.sort((a,b)=> a.dob.localeCompare(b.dob) || a.name.localeCompare(b.name,"ja"));
}
/* 故人は「享年」を返す */
function shownAge(p){
  if(!p.dead) return { n: ageOfDob(p.dob), unit:"歳", approx: !!p.approx, dead:false };
  const b = parseDate(p.dob), d = parseDate(p.death);
  if(!b || !d) return { n: null, unit:"歳", approx:false, dead:true };
  return { n: diffYears(b, d), unit:"享年", approx: !!p.approx || d.prec < 3, dead:true };
}

/* ---------- 描画 ---------- */
const ageRoot = document.getElementById("agei");
const ageForm = { name:"", to:"", y:"", m:"", d:"", pid:"" };

function ageSnapshot(){
  const g = id => { const e = document.getElementById(id); return e ? e.value : null; };
  const n = g("a-name"); if(n !== null) ageForm.name = n;
  const t = g("a-to");   if(t !== null) ageForm.to = t;
  ["y","m","d"].forEach(k=>{
    const e = ageRoot.querySelector('.cbox[data-cb="'+k+'"] input');
    if(e) ageForm[k] = e.value;
  });
}

function ageRender(){
  ageSnapshot();
  const v = ageView();
  const people = ageSorted(v.people);
  const living = v.people.filter(p=> !p.dead);
  const ages = living.map(p=> ageOfDob(p.dob)).filter(a=> a != null);
  const avg = ages.length ? Math.round(ages.reduce((s,x)=>s+x,0) / ages.length * 10) / 10 : null;
  let oldest = null, youngest = null;
  living.forEach(p=>{
    if(!oldest || p.dob < oldest.dob) oldest = p;
    if(!youngest || p.dob > youngest.dob) youngest = p;
  });
  const groups = ageGroups();
  const deadCount = v.raw.filter(p=> p.dead).length;
  if(!ageGroup(ageForm.to)) ageForm.to = (A.groups[0] || {}).id || TREE_ID;

  const ico = {
    all:'<svg viewBox="0 0 16 16"><path d="M2.2 5.6 8 2.6l5.8 3-5.8 3z"/><path d="M2.2 8.6 8 11.6l5.8-3M2.2 11.2 8 14.2l5.8-3"/></svg>',
    tree:'<svg viewBox="0 0 16 16"><path d="M8 2.4v3.2M3.6 9.4V7.2h8.8v2.2"/><rect x="6" y="1.2" width="4" height="2.6" rx=".5"/><rect x="1.7" y="9.4" width="3.8" height="2.6" rx=".5"/><rect x="10.5" y="9.4" width="3.8" height="2.6" rx=".5"/></svg>',
    folder:'<svg viewBox="0 0 16 16"><path d="M1.8 4.2h4.1l1.3 1.5h7v7.1H1.8z"/></svg>',
    plus:'<svg viewBox="0 0 16 16"><path d="M8 3.6v8.8M3.6 8h8.8"/></svg>',
    open:'<svg viewBox="0 0 16 16"><path d="M6.2 3.4h-3v9.2h9.2v-3M9.4 2.8h3.8v3.8M13 3 7.6 8.4"/></svg>'
  };
  const count = g => ageVisible(g.people).length;

  let h = "";

  /* リストのタブ */
  h += '<div class="chips" id="a-chips">';
  h += '<button class="chip" data-g="'+ALL_ID+'" aria-selected="'+(v.all?"true":"false")+'">'+ico.all+
       '<span class="nm">すべて</span><span class="c">'+groups.reduce((s,g)=>s+count(g),0)+'</span></button>';
  for(const g of groups){
    h += '<button class="chip'+(g.tree?" linked":"")+'" data-g="'+g.id+'" aria-selected="'+(!v.all && g.id===v.id ?"true":"false")+'">'+
         (g.tree?ico.tree:ico.folder)+'<span class="nm">'+esc(g.name)+'</span><span class="c">'+count(g)+'</span></button>';
  }
  h += '<button class="chip add" id="a-newgroup" title="リストを追加" aria-label="リストを追加">'+ico.plus+'</button>';
  h += '</div>';

  /* 見出し */
  h += '<div class="ghead"><div class="t"><h1>'+esc(v.name)+
       (v.tree?'<i class="synced">自動連動</i>':'')+'</h1>'+
       '<div class="sub">'+(v.all ? groups.length+" 件のリスト・" : "")+v.people.length+' 名を管理中'+
       (v.tree ? '　家系図タブの人物がそのまま並びます' : '')+'</div></div>';
  if(!v.all && !v.tree){
    h += '<div class="acts">'+
         '<button class="btn" id="a-rename">名前を変更</button>'+
         (A.groups.length > 1 ? '<button class="btn danger" id="a-delgroup">リストを削除</button>' : '')+
         '</div>';
  }
  if(v.tree){
    h += '<div class="acts"><button class="btn" id="a-gotree">家系図タブを開く</button></div>';
  }
  h += '</div>';

  /* 集計 */
  h += '<div class="astat">'+
    '<div><span class="v">'+v.people.length+'<em>名</em></span><span class="k">人数</span></div>'+
    '<div><span class="v">'+(avg==null?"—":avg)+'<em>歳</em></span><span class="k">平均年齢</span></div>'+
    '<div><span class="v">'+(oldest?ageOfDob(oldest.dob):"—")+(oldest?'<em>歳</em>':'')+'</span>'+
      '<span class="k">最年長</span><span class="n">'+(oldest?esc(oldest.name):"")+'</span></div>'+
    '<div><span class="v">'+(youngest?ageOfDob(youngest.dob):"—")+(youngest?'<em>歳</em>':'')+'</span>'+
      '<span class="k">最年少</span><span class="n">'+(youngest?esc(youngest.name):"")+'</span></div>'+
  '</div>';

  /* 一覧 */
  h += '<div class="lbar"><h2>メンバー</h2><div class="lopt">';
  if(deadCount){
    h += '<label class="deadsw"><input type="checkbox" id="a-dead"'+(A.showDead?" checked":"")+'>'+
         '<span>故人も表示（'+deadCount+'）</span></label>';
  }
  if(v.people.length){
    h += '<div class="sortseg" id="a-sort">'+
      [["birthday","誕生日が近い順","誕生日"],["age-asc","年下から","年下順"],["age-desc","年上から","年上順"]]
        .map(x=> '<button data-s="'+x[0]+'" title="'+x[1]+'" aria-pressed="'+(A.sort===x[0])+'">'+x[2]+'</button>').join("")+
      '</div>';
  }
  h += '</div></div>';

  if(!people.length){
    h += '<div class="pempty">'+
      (v.tree ? '家系図タブに生年月日つきの人物がまだありません。<br>家系図に人物と生年月日を登録すると、ここに自動で並びます。'
              : 'まだメンバーがいません。<br>下の「新規登録」から追加してください。')+'</div>';
  }else{
    h += '<div class="plist" id="a-list">';
    for(const p of people){
      const sa = shownAge(p);
      const dd = p.dead ? null : daysToBirthday(p.dob);
      const today = dd === 0;
      const inTree = p.tree || p.linked;
      h += '<div class="prow'+(today?" today":"")+(p.dead?" gone":"")+
           '" data-id="'+p.id+'" data-g="'+p.gid+'"'+(p.pid?' data-pid="'+p.pid+'"':'')+'>'+
        '<div class="abadge"><b>'+(sa.n==null?"—":(sa.approx?"約":"")+sa.n)+'</b><span>'+sa.unit+'</span></div>'+
        '<div class="pmain"><div class="pname">'+esc(p.name)+(p.dead?'<i class="gonetag">故</i>':'')+'</div>'+
          '<div class="pmeta"><span class="d">'+esc(fmtJa(p.dob))+
            (p.dead && p.death ? ' – '+esc(fmtJa(p.death)) : '')+'</span>'+
          (v.all ? '<span class="gchip'+(p.tree?" tree":"")+'">'+esc(p.gname)+'</span>' : '')+
          (p.linked && !v.all ? '<span class="gchip tree">家系図</span>' : '')+'</div></div>'+
        '<div class="tochip'+(dd!=null && dd<=30 ? " soon":"")+'">'+
          (dd==null ? "" : today ? "本日 誕生日" : "あと "+dd+" 日")+'</div>'+
        (inTree
          ? '<button class="pdel keep" data-act="tree" title="家系図で開く" aria-label="'+esc(p.name)+'を家系図で開く">'+ico.open+'</button>'
          : '<button class="pdel" data-act="del" title="削除" aria-label="'+esc(p.name)+'を削除">'+
            '<svg viewBox="0 0 16 16"><path d="M2.8 4.4h10.4M6.2 4.4V2.6h3.6v1.8M4.4 4.4l.7 9h5.8l.7-9"/></svg></button>')+
      '</div>';
    }
    h += '</div>';
  }

  /* 新規登録 */
  const yNow = new Date().getFullYear();
  const toTree = ageForm.to === TREE_ID;
  const picked = ageForm.pid && byId(ageForm.pid) ? byId(ageForm.pid) : null;
  h += '<div class="aform"><h2>新規登録</h2><div class="in">';
  if(!toTree){
    /* 家系図の人物をリストに入れる（名前や生年月日は家系図と連動したままになる） */
    const cands = S.people.filter(p=> parseDate(p.birth))
      .sort((a,b)=> sortKey(a.birth).localeCompare(sortKey(b.birth)));
    h += '<div class="field"><label for="a-pick">家系図の人物から選ぶ</label>'+
      '<select class="inp" id="a-pick"><option value="">（選ばずに手入力する）</option>'+
      cands.map(p=> '<option value="'+p.id+'"'+(ageForm.pid===p.id?" selected":"")+'>'+
        esc(fullName(p))+'　'+esc(fmtJa(normDob(p.birth)))+(isDead(p)?"　故":"")+'</option>').join("")+
      '</select>'+
      (picked ? '<p class="note" style="margin-top:5px">家系図の <b>'+esc(fullName(picked))+'</b> をこのリストに入れます。名前と生年月日は家系図側と連動します。</p>' : '')+
      '</div>';
  }
  h += '<div class="field"><label for="a-name">お名前</label>'+
      '<input class="inp" id="a-name" placeholder="山田 太郎" value="'+esc(picked?fullName(picked):ageForm.name)+'" autocomplete="off"'+(picked?" readonly":"")+'></div>';
  if(v.all || v.tree){
    h += '<div class="field"><label for="a-to">追加先</label><select class="inp" id="a-to">'+
      '<option value="'+TREE_ID+'"'+(toTree?" selected":"")+'>家系図（家系図タブにも追加）</option>'+
      A.groups.map(g=> '<option value="'+g.id+'"'+(g.id===ageForm.to?" selected":"")+'>'+esc(g.name)+'</option>').join("")+
      '</select>'+
      (toTree ? '<p class="note" style="margin-top:5px">姓と名は空白で区切ってください。家系図には単独の人物として追加され、続柄はあとから設定できます。</p>' : '')+
      '</div>';
  }
  if(picked){
    const d = parseDate(picked.birth);
    ageForm.y = String(d.y); ageForm.m = String(d.m || 1); ageForm.d = String(d.d || 1);
  }
  h += '<div class="field"><label>生年月日</label><div class="dob'+(picked?" locked":"")+'">'+
      cboxHTML("y","年", String(yNow-30), ageForm.y)+
      cboxHTML("m","月","1", ageForm.m)+
      cboxHTML("d","日","1", ageForm.d)+
    '</div></div>'+
    '<button class="btn primary wide" id="a-add">'+(toTree?"家系図に追加":"リストに追加")+'</button>'+
  '</div></div>';

  ageRoot.innerHTML = h;
  ageBind();
}

function cboxHTML(key, unit, ph, val){
  return '<div class="cbox" data-cb="'+key+'">'+
    '<input inputmode="numeric" autocomplete="off" aria-label="'+unit+'" placeholder="'+ph+'" value="'+esc(val||"")+'">'+
    '<span class="u">'+unit+'</span>'+
    '<button class="tg" type="button" tabindex="-1" aria-label="'+unit+'の候補"><svg viewBox="0 0 12 12"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg></button>'+
    '<div class="cmenu" hidden></div></div>';
}

/* ---------- コンボボックス ---------- */
function cboxOptions(key){
  const y = ageRoot.querySelector('.cbox[data-cb="y"] input');
  const m = ageRoot.querySelector('.cbox[data-cb="m"] input');
  const now = new Date().getFullYear();
  if(key === "y"){ const out = []; for(let i=0;i<130;i++) out.push(now - i); return out; }
  if(key === "m"){ const out = []; for(let i=1;i<=12;i++) out.push(i); return out; }
  const n = daysInMonth(y ? y.value : "", m ? m.value : "");
  const out = []; for(let i=1;i<=n;i++) out.push(i);
  return out;
}
function cboxMenu(box, open){
  const key = box.dataset.cb, menu = box.querySelector(".cmenu"), inp = box.querySelector("input");
  if(!open){ menu.hidden = true; return; }
  ageRoot.querySelectorAll(".cmenu").forEach(m=>{ if(m !== menu) m.hidden = true; });
  const q = inp.value.trim();
  const list = cboxOptions(key).filter(o=> !q || String(o).indexOf(q) === 0);
  menu.innerHTML = list.length
    ? list.map(o=> '<button type="button" data-v="'+o+'" aria-selected="'+(String(o)===q)+'">'+o+'</button>').join("")
    : '<div class="none">候補がありません</div>';
  menu.hidden = false;
  const sel = menu.querySelector('[aria-selected="true"]');
  if(sel) menu.scrollTop = Math.max(0, sel.offsetTop - 80);
}

/* ---------- 入力の検証 ---------- */
function ageFormValue(){
  const nameEl = document.getElementById("a-name");
  const get = k => { const e = ageRoot.querySelector('.cbox[data-cb="'+k+'"] input'); return e ? e.value.trim() : ""; };
  const name = nameEl ? nameEl.value.trim() : "";
  const y = parseInt(get("y"),10), m = parseInt(get("m"),10), d = parseInt(get("d"),10);
  if(!name || isNaN(y) || isNaN(m) || isNaN(d)) return null;
  if(y < 1000 || y > new Date().getFullYear() + 1) return null;
  if(m < 1 || m > 12) return null;
  if(d < 1 || d > daysInMonth(y, m)) return null;
  const z = n => String(n).padStart(2,"0");
  return { name: name, dob: y + "-" + z(m) + "-" + z(d) };
}
function ageSyncAdd(){
  const btn = document.getElementById("a-add");
  if(btn) btn.disabled = !ageFormValue();
}

/* ---------- イベント ---------- */
function ageBind(){
  const chips = document.getElementById("a-chips");
  chips.addEventListener("click", function(e){
    const b = e.target.closest(".chip"); if(!b || b.id === "a-newgroup") return;
    A.active = b.dataset.g; ageRender();
  });
  document.getElementById("a-newgroup").onclick = ()=> ageGroupDialog("create");

  const rn = document.getElementById("a-rename");
  if(rn) rn.onclick = ()=> ageGroupDialog("rename");
  const dg = document.getElementById("a-delgroup");
  if(dg) dg.onclick = ()=> ageDeleteGroup(A.active);
  const gt = document.getElementById("a-gotree");
  if(gt) gt.onclick = ()=> setMode("tree");

  const dead = document.getElementById("a-dead");
  if(dead) dead.addEventListener("change", function(){ A.showDead = this.checked; ageRender(); });

  const sort = document.getElementById("a-sort");
  if(sort) sort.addEventListener("click", function(e){
    const b = e.target.closest("button"); if(!b) return;
    A.sort = b.dataset.s; ageRender();
  });

  const list = document.getElementById("a-list");
  if(list) list.addEventListener("click", function(e){
    const row = e.target.closest(".prow"); if(!row) return;
    const act = e.target.closest(".pdel");
    if(act){
      e.stopPropagation();
      if(act.dataset.act === "tree" && row.dataset.pid) ageOpenInTree(row.dataset.pid);
      else if(act.dataset.act === "del") ageDeletePerson(row.dataset.g, row.dataset.id);
      return;
    }
    ageDetail(row.dataset.g, row.dataset.id);   /* 行そのもの＝詳細を開く */
  });

  const pick = document.getElementById("a-pick");
  if(pick) pick.addEventListener("change", function(){
    ageForm.pid = this.value;
    if(!this.value){ ageForm.name = ""; ageForm.y = ""; ageForm.m = ""; ageForm.d = ""; }
    ageRender();
  });

  const to = document.getElementById("a-to");
  if(to) to.addEventListener("change", function(){
    ageForm.to = this.value;
    if(this.value === TREE_ID) ageForm.pid = "";
    ageRender();
  });

  /* コンボボックス */
  ageRoot.querySelectorAll(".cbox").forEach(box=>{
    const inp = box.querySelector("input");
    inp.addEventListener("input", function(){
      this.value = this.value.replace(/[^\d]/g,"");
      if(box.dataset.cb !== "d"){
        const d = ageRoot.querySelector('.cbox[data-cb="d"] input');
        if(d && d.value && parseInt(d.value,10) > daysInMonth(
             ageRoot.querySelector('.cbox[data-cb="y"] input').value,
             ageRoot.querySelector('.cbox[data-cb="m"] input').value)) d.value = "";
      }
      cboxMenu(box, true); ageSyncAdd();
    });
    inp.addEventListener("focus", ()=> cboxMenu(box, true));
    inp.addEventListener("keydown", function(e){
      if(e.key === "Escape"){ cboxMenu(box, false); e.stopPropagation(); }
      if(e.key === "Enter"){ cboxMenu(box, false); }
    });
    box.querySelector(".tg").onclick = function(){
      const hidden = box.querySelector(".cmenu").hidden;
      cboxMenu(box, hidden);
      if(hidden) inp.focus();
    };
    box.querySelector(".cmenu").addEventListener("mousedown", function(e){
      const b = e.target.closest("button[data-v]"); if(!b) return;
      e.preventDefault();
      inp.value = b.dataset.v;
      cboxMenu(box, false);
      ageSyncAdd();
      const order = ["y","m","d"], i = order.indexOf(box.dataset.cb);
      if(i >= 0 && i < 2){
        const nx = ageRoot.querySelector('.cbox[data-cb="'+order[i+1]+'"] input');
        if(nx && !nx.value) nx.focus();
      }
    });
  });

  const nm = document.getElementById("a-name");
  if(nm){
    nm.addEventListener("input", ageSyncAdd);
    nm.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); ageAddPerson(); } });
  }
  document.getElementById("a-add").onclick = ageAddPerson;
  ageSyncAdd();
}

document.addEventListener("mousedown", function(e){
  if(S.mode !== "age") return;
  if(e.target.closest(".cbox")) return;
  ageRoot.querySelectorAll(".cmenu").forEach(m=> m.hidden = true);
});

/* ---------- 操作 ---------- */
function ageOpenInTree(pid){
  if(!byId(pid)) return;
  closeModal();
  setMode("tree");
  select(pid);
  centerOn(pid, true);
}

/* ---------- 行をタップしたときの詳細 ---------- */
function ageDetail(gid, mid){
  const g = ageGroup(gid); if(!g) return;
  const raw = g.people.find(x=> x.id === mid); if(!raw) return;
  const p = ageResolve(raw);
  const t = p.pid ? byId(p.pid) : null;
  const sa = shownAge(p);
  const dd = p.dead ? null : daysToBirthday(p.dob);
  const ageText = sa.n == null ? "—" : (sa.approx ? "約" : "") + sa.n + (sa.dead ? "（享年）" : "歳");
  const nextText = dd == null ? "—" : dd === 0 ? "本日" : "あと " + dd + " 日";
  const nb = (()=>{ const b = parseDate(p.dob); if(!b || p.dead) return "";
    const now = new Date(); let y = now.getFullYear();
    const n = new Date(y, (b.m||1)-1, b.d||1); if(n < new Date(now.getFullYear(), now.getMonth(), now.getDate())) y++;
    return y + "年" + (b.m||1) + "月" + (b.d||1) + "日"; })();
  const canEdit = !p.pid && !g.tree;

  let body = '<div class="card"><div class="hd">'+
    (t ? '<span class="g-'+t.gender+'" style="display:flex;flex:0 0 auto">'+symbol(t.gender,22)+'</span>' : '')+
    '<div style="min-width:0"><div class="nm">'+esc(p.name)+(p.dead?' <i class="gonetag">故</i>':'')+'</div>'+
    (t && t.maiden ? '<div class="sub">旧姓 '+esc(t.maiden)+'</div>' : '')+
    '</div></div></div>';

  body += '<div class="kin" style="margin-bottom:14px">'+
    '<div class="r" style="cursor:default"><span class="lb">年齢</span><span class="nn mono">'+esc(ageText)+'</span><span></span></div>'+
    '<div class="r" style="cursor:default"><span class="lb">生年月日</span><span class="nn mono">'+esc(fmtJa(p.dob))+'</span><span></span></div>'+
    (p.dead && p.death ? '<div class="r" style="cursor:default"><span class="lb">没年月日</span><span class="nn mono">'+esc(fmtJa(p.death))+'</span><span></span></div>' : '')+
    (!p.dead ? '<div class="r" style="cursor:default"><span class="lb">次の誕生日</span><span class="nn mono">'+esc(nb)+'</span><span class="dg">'+esc(nextText)+'</span></div>' : '')+
    '<div class="r" style="cursor:default"><span class="lb">リスト</span><span class="nn">'+esc(g.name)+(p.pid||g.tree?'　<span class="gchip tree">家系図と連動</span>':'')+'</span><span></span></div>'+
    '</div>';

  if(canEdit){
    body += '<div class="sect"><h3>編集</h3>'+
      '<div class="field"><label for="ad-name">お名前</label><input class="inp" id="ad-name" value="'+esc(raw.name)+'"></div>'+
      '<div class="field"><label for="ad-dob">生年月日</label><input class="inp mono" id="ad-dob" value="'+esc(raw.dob)+'" placeholder="1985-08-30"></div>'+
      '</div>';
  }else if(t){
    body += '<p class="note">名前や生年月日の変更は家系図タブで行います。</p>';
  }

  const foot =
    (t ? '<button class="btn" id="ad-tree">家系図で開く</button>' : '')+
    (!g.tree ? '<button class="btn danger" id="ad-del">'+(p.pid?"リストから外す":"削除")+'</button>' : '')+
    (canEdit ? '<button class="btn primary" id="ad-save">保存</button>' : '<button class="btn" data-close>閉じる</button>');
  openModal("メンバーの詳細", body, foot);

  const tb = modal.querySelector("#ad-tree"); if(tb) tb.onclick = ()=> ageOpenInTree(p.pid);
  const db = modal.querySelector("#ad-del");  if(db) db.onclick = ()=>{ closeModal(); ageDeletePerson(gid, mid); };
  const sv = modal.querySelector("#ad-save");
  if(sv) sv.onclick = ()=>{
    const name = modal.querySelector("#ad-name").value.trim();
    const dob = normDob(modal.querySelector("#ad-dob").value.trim());
    if(!name){ modal.querySelector("#ad-name").focus(); return; }
    if(!dob){ modal.querySelector("#ad-dob").focus(); toastAge("生年月日は 1985-08-30 のように入力してください"); return; }
    raw.name = name; raw.dob = dob;
    closeModal(); ageSave(); ageRender();
  };
}

function ageAddPerson(){
  const val = ageFormValue();
  if(!val){ toastAge("お名前と生年月日を正しく入力してください"); return; }
  const v = ageView();
  const toEl = document.getElementById("a-to");
  const gid = toEl ? toEl.value : (v.all || v.tree ? TREE_ID : v.id);

  const clear = ()=>{
    ageForm.name = ""; ageForm.y = ""; ageForm.m = ""; ageForm.d = "";
    const nm = document.getElementById("a-name"); if(nm) nm.value = "";
    ageRoot.querySelectorAll(".cbox input").forEach(i=> i.value = "");
  };

  if(gid === TREE_ID){
    /* 家系図タブにも人物として追加する */
    const parts = val.name.split(/[\s　]+/);
    const surname = parts.length > 1 ? parts[0] : "";
    const given = parts.length > 1 ? parts.slice(1).join(" ") : val.name;
    const np = newPerson({ surname: surname, given: given, birth: val.dob, gender: "other" });
    clear();
    commit({ layout:true });
    toastAge(fullName(np) + " を家系図に追加しました。続柄は家系図タブで設定できます");
    const first = document.getElementById("a-name"); if(first) first.focus();
    return;
  }

  const g = ageGroup(gid);
  if(!g || g.tree){ toastAge("追加先のリストがありません"); return; }
  const pid = ageForm.pid && byId(ageForm.pid) ? ageForm.pid : "";
  if(pid && g.people.some(x=> x.pid === pid)){ toastAge("その人物はすでにこのリストにいます"); return; }
  g.people.unshift({ id: uid("m"), pid: pid, name: val.name, dob: val.dob, createdAt: new Date().toISOString() });
  ageForm.pid = "";
  clear();
  ageSave(); ageRender();
  const first = document.getElementById("a-name"); if(first) first.focus();
}

function ageDeletePerson(gid, pid){
  const g = ageGroup(gid); if(!g) return;
  const p = g.people.find(x=> x.id === pid); if(!p) return;
  openModal("メンバーを削除",
    '<p class="lead"><b>'+esc(p.name)+'</b> を「'+esc(g.name)+'」から削除します。元に戻せません。</p>',
    '<button class="btn" data-close>キャンセル</button><button class="btn danger" id="ad-ok">削除する</button>');
  modal.querySelector("#ad-ok").onclick = function(){
    g.people = g.people.filter(x=> x.id !== pid);
    closeModal(); ageSave(); ageRender();
  };
}

function ageGroupDialog(kind){
  if(kind === "rename" && A.active === TREE_ID){ toastAge("「家系図」の名前は変更できません"); return; }
  const cur = kind === "rename" ? ageGroup(A.active) : null;
  if(kind === "rename" && !cur) return;
  openModal(kind === "create" ? "新しいリスト" : "リスト名を変更",
    '<div class="field"><label for="ag-name">リスト名</label>'+
    '<input class="inp" id="ag-name" placeholder="例：現場メンバー" value="'+esc(cur?cur.name:"")+'"></div>',
    '<button class="btn" data-close>キャンセル</button><button class="btn primary" id="ag-ok">保存</button>');
  const inp = modal.querySelector("#ag-name");
  const ok = ()=>{
    const n = inp.value.trim(); if(!n){ inp.focus(); return; }
    if(kind === "create"){
      const g = { id: uid("g"), name: n, people: [] };
      A.groups.push(g); A.active = g.id; ageForm.to = g.id;
    }else cur.name = n;
    closeModal(); ageSave(); ageRender();
  };
  modal.querySelector("#ag-ok").onclick = ok;
  inp.addEventListener("keydown", e=>{ if(e.key === "Enter"){ e.preventDefault(); ok(); } });
}

function ageDeleteGroup(gid){
  if(gid === TREE_ID){ toastAge("「家系図」は家系図タブと連動しているため削除できません"); return; }
  const g = ageGroup(gid); if(!g) return;
  if(A.groups.length <= 1){ toastAge("最後のリストは削除できません"); return; }
  openModal("リストを削除",
    '<p class="lead">「<b>'+esc(g.name)+'</b>」と、その中の '+g.people.length+' 名を削除します。元に戻せません。</p>',
    '<button class="btn" data-close>キャンセル</button><button class="btn danger" id="agd-ok">削除する</button>');
  modal.querySelector("#agd-ok").onclick = function(){
    A.groups = A.groups.filter(x=> x.id !== gid);
    A.active = ALL_ID;
    closeModal(); ageSave(); ageRender();
  };
}

function toastAge(msg){ toast(msg); }

/* ---------- データ管理 ---------- */
function b64enc(s){ return btoa(String.fromCharCode.apply(null, new TextEncoder().encode(s))); }
function b64dec(s){
  const bin = atob(s.replace(/\s+/g,""));
  const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(arr);
}

function openAgeData(){
  let tab = "export", target = A.active === ALL_ID ? "ALL" : A.active;

  const body = ()=>{
    let s = '<div class="dtabs" id="dd-tabs">'+
      '<button data-t="export" aria-selected="'+(tab==="export")+'">書き出し</button>'+
      '<button data-t="import" aria-selected="'+(tab==="import")+'">読み込み</button></div>';
    if(tab === "export"){
      s += '<div class="field"><label for="dd-target">対象</label><select class="inp" id="dd-target">'+
        '<option value="ALL"'+(target==="ALL"?" selected":"")+'>すべてのリスト</option>'+
        A.groups.map(g=> '<option value="'+g.id+'"'+(target===g.id?" selected":"")+'>'+esc(g.name)+'</option>').join("")+
        '</select></div>'+
        '<textarea class="code" id="dd-code" readonly></textarea>'+
        '<div class="mini"><button id="dd-copy">コードをコピー</button><button id="dd-file">JSON ファイルで保存</button></div>'+
        '<p class="note" style="margin-top:10px">コードは他の端末の同じアプリに貼り付けて読み込めます。</p>';
    }else{
      s += '<div class="field"><label for="dd-in">コードまたは JSON を貼り付け</label>'+
        '<textarea class="code" id="dd-in" placeholder="ここに貼り付け"></textarea></div>'+
        '<div class="mini"><button id="dd-pick">ファイルを選ぶ</button><button id="dd-run">読み込む</button></div>'+
        '<input type="file" id="dd-fileinput" accept=".json,.txt,application/json" style="display:none">'+
        '<p class="note" style="margin-top:10px">「家系図」リストは家系図タブと連動しているため、ここでの読み込み対象外です。家系図のデータは家系図タブの「データ」から入出力してください。</p>';
    }
    s += '<div id="dd-msg"></div>';
    return s;
  };

  const bind = ()=>{
    modal.querySelector("#dd-tabs").addEventListener("click", function(e){
      const b = e.target.closest("button"); if(!b) return;
      tab = b.dataset.t; redraw();
    });
    const msg = (cls,t)=>{ modal.querySelector("#dd-msg").innerHTML = '<div class="msg '+cls+'">'+esc(t)+'</div>'; };

    if(tab === "export"){
      const sel = modal.querySelector("#dd-target"), code = modal.querySelector("#dd-code");
      const build = ()=>{
        const data = target === "ALL" ? A.groups : A.groups.filter(g=> g.id === target);
        code.value = data.length ? b64enc(JSON.stringify(data)) : "";
      };
      sel.addEventListener("change", function(){ target = this.value; build(); });
      code.addEventListener("click", function(){ this.select(); });
      build();
      modal.querySelector("#dd-copy").onclick = async function(){
        try{ await navigator.clipboard.writeText(code.value); msg("ok","コードをコピーしました"); }
        catch(e){ code.select(); msg("err","コピーできませんでした。選択して手動でコピーしてください"); }
      };
      modal.querySelector("#dd-file").onclick = function(){
        const data = target === "ALL" ? A.groups : A.groups.filter(g=> g.id === target);
        saveFile("nenrei-" + new Date().toISOString().slice(0,10) + ".json",
                 JSON.stringify(data, null, 2), modal.querySelector("#dd-msg"));
      };
    }else{
      const ta = modal.querySelector("#dd-in");
      const run = (text)=>{
        const input = String(text || "").trim();
        if(!input){ msg("err","内容が空です"); return; }
        let parsed = null;
        try{ parsed = JSON.parse(input); }catch(e){}
        if(!parsed){ try{ parsed = JSON.parse(b64dec(input)); }catch(e){} }
        if(!parsed){ msg("err","読み込めませんでした。コードまたは JSON を確認してください"); return; }
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        const ok = arr.every(g=> g && typeof g === "object" && Array.isArray(g.people) && g.name);
        if(!ok){ msg("err","データの形式が正しくありません"); return; }
        const add = ageClean(arr).map(g=> Object.assign({}, g, { id: uid("g"), name: g.name + "（取込）",
          people: g.people.map(p=> Object.assign({}, p, { id: uid("m") })) }));
        A.groups = A.groups.concat(add);
        A.active = add.length === 1 ? add[0].id : ALL_ID;
        ageSave(); ageRender(); closeModal();
        toast(add.length + " 件のリスト・" + add.reduce((s,g)=>s+g.people.length,0) + " 名を読み込みました");
      };
      modal.querySelector("#dd-run").onclick = ()=> run(ta.value);
      modal.querySelector("#dd-pick").onclick = ()=> modal.querySelector("#dd-fileinput").click();
      modal.querySelector("#dd-fileinput").addEventListener("change", function(){
        const f = this.files && this.files[0]; if(!f) return;
        const r = new FileReader();
        r.onload = ()=> run(String(r.result));
        r.onerror = ()=> msg("err","ファイルを読み込めませんでした");
        r.readAsText(f);
      });
    }
  };

  const redraw = ()=>{
    openModal("年齢管理のデータ", body(),
      '<button class="btn" data-close>閉じる</button>');
    bind();
  };
  redraw();
}


/* ============================================================
   16b. 時系列モード
   生年の順に人物が現れ、親から子への線が伸びていく様子を再生する。
   配置は全員ぶんを先に確定させ、表示だけを年で絞る（カードが跳ねないように）。
   ============================================================ */
const TL = { on:false, year:0, min:0, max:0, playing:false, speed:"normal", timer:null, silent:false,
             years:new Map(), shown:new Set(), wireKeys:new Set() };
const TL_SPEED = { slow:1400, normal:700, fast:280 };   /* 1年あたりのミリ秒 */

function tlShown(id){
  if(!TL.on) return true;
  const y = TL.years.get(id);
  return y != null && y <= TL.year;
}

/* 各人物が「現れる年」。生年が分かればその年。
   分からない人は配偶者の年、それも無ければ最初の子の年から逆算、最後は最初の年。 */
function tlComputeYears(){
  const ix = IX || index();
  const yrs = new Map();
  const ids = Array.from(VIS);
  for(const id of ids){
    const p = byId(id); const d = p && parseDate(p.birth);
    if(d) yrs.set(id, d.y);
  }
  for(let round=0; round<6; round++){
    let changed = false;
    for(const id of ids){
      if(yrs.has(id)) continue;
      let y = null;
      for(const sp of spousesOf(id, ix)) if(yrs.has(sp)) y = Math.min(y==null?Infinity:y, yrs.get(sp));
      if(y == null){
        for(const c of childrenOf(id, ix)) if(yrs.has(c)) y = Math.min(y==null?Infinity:y, yrs.get(c) - 25);
      }
      if(y != null){ yrs.set(id, y); changed = true; }
    }
    if(!changed) break;
  }
  let min = Infinity, max = -Infinity;
  yrs.forEach(y=>{ min = Math.min(min,y); max = Math.max(max,y); });
  if(!isFinite(min)){ min = new Date().getFullYear(); max = min; }
  for(const id of ids) if(!yrs.has(id)) yrs.set(id, min);
  TL.years = yrs; TL.min = min; TL.max = max;
}

function tlBornIn(year){
  const out = [];
  TL.years.forEach((y,id)=>{
    if(y !== year) return;
    const p = byId(id); const d = p && parseDate(p.birth);
    if(d && d.y === year) out.push(p);
  });
  return out;
}

function tlUpdateUI(){
  document.getElementById("tl-year").textContent = TL.year;
  const born = tlBornIn(TL.year);
  document.getElementById("tl-note").textContent = born.length ? born.map(fullName).join("・") + " 誕生" : "";
  const r = document.getElementById("tl-range");
  r.min = TL.min; r.max = TL.max; r.value = TL.year;
  document.getElementById("tlbar").classList.toggle("playing", TL.playing);
  document.getElementById("tl-play").title = TL.playing ? "停止" : "再生";
  $$("#tl-speed button").forEach(b=> b.setAttribute("aria-pressed", b.dataset.s === TL.speed ? "true" : "false"));
}

/* animate=false（スライダー操作など）のときは伸びるアニメーションを付けない */
function tlSetYear(y, animate){
  TL.year = clamp(y, TL.min, TL.max);
  TL.silent = !animate;
  renderNodes(); renderWires();
  TL.silent = false;
  tlUpdateUI();
}

function tlTick(){
  if(!TL.playing) return;
  if(TL.year >= TL.max){ tlPause(); return; }
  tlSetYear(TL.year + 1, true);
  /* 誰も生まれない年は速く飛ばす */
  let someone = false; TL.years.forEach(v=>{ if(v === TL.year + 1) someone = true; });
  TL.timer = setTimeout(tlTick, TL_SPEED[TL.speed] * (someone ? 1 : 0.18));
}
function tlPlay(){
  if(TL.year >= TL.max) tlSetYear(TL.min, false);
  TL.playing = true; tlUpdateUI();
  clearTimeout(TL.timer);
  TL.timer = setTimeout(tlTick, TL_SPEED[TL.speed]);
}
function tlPause(){ TL.playing = false; clearTimeout(TL.timer); TL.timer = null; tlUpdateUI(); }

function tlStart(){
  if(S.mode !== "tree") setMode("tree");
  if(S.sel) select(null);
  recompute();
  relayout();                 /* 最終形の配置を先に決めておく */
  tlComputeYears();
  TL.on = true;
  TL.year = TL.min;
  TL.shown = new Set(); TL.wireKeys = new Set();
  document.getElementById("tlbar").hidden = false;
  document.getElementById("b-tl").classList.add("on");
  canvas.classList.add("tl");
  if(isPhone()) hideRail();
  render();
  fitView(true);
  tlUpdateUI();
  tlPlay();
}
function tlStop(){
  tlPause();
  TL.on = false;
  document.getElementById("tlbar").hidden = true;
  document.getElementById("b-tl").classList.remove("on");
  canvas.classList.remove("tl");
  render();
}

document.getElementById("b-tl").onclick = ()=>{ if(TL.on) tlStop(); else tlStart(); };
document.getElementById("tl-close").onclick = tlStop;
document.getElementById("tl-play").onclick = ()=>{ if(TL.playing) tlPause(); else tlPlay(); };
document.getElementById("tl-speed").addEventListener("click", function(e){
  const b = e.target.closest("button"); if(!b) return;
  TL.speed = b.dataset.s; tlUpdateUI();
  if(TL.playing){ clearTimeout(TL.timer); TL.timer = setTimeout(tlTick, TL_SPEED[TL.speed] * 0.5); }
});
document.getElementById("tl-range").addEventListener("input", function(){
  const y = +this.value;          /* tlPause が UI を描き直す前に読む */
  tlPause();
  tlSetYear(y, false);
});
/* ============================================================
   17. モード切り替え
   ============================================================ */
const shellEl = document.querySelector(".shell");
const treePane = document.getElementById("mode-tree");
const agePane = document.getElementById("mode-age");

function setMode(m){
  S.mode = m;
  shellEl.dataset.mode = m;
  treePane.hidden = m !== "tree";
  agePane.hidden = m !== "age";
  $$("#modes button").forEach(b=> b.setAttribute("aria-selected", b.dataset.mode === m ? "true" : "false"));
  try{ localStorage.setItem(LS + "-mode", m); }catch(e){}
  if(m === "age"){ if(typeof tlPause === "function" && TL.playing) tlPause(); ageRender(); }
  else applyView();
}

document.getElementById("modes").addEventListener("click", function(e){
  const b = e.target.closest("button"); if(!b) return;
  setMode(b.dataset.mode);
});
document.getElementById("b-age-data").onclick = openAgeData;
/* ---- 起動 ---- */
const restored = load();
recompute();
if(!restored || !Object.keys(S.pos).length) relayout();
render();
applyView();
if(!restored || !S.view.k || (S.view.x===0 && S.view.y===0)) fitView(false);

ageLoad();
let startMode = "tree";
try{ const m = localStorage.getItem(LS + "-mode"); if(m === "age") startMode = "age"; }catch(e){}
setMode(startMode);
window.addEventListener("beforeunload", ageSave);

})();
