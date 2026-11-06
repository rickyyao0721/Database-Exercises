/* 電影院訂票管理系統 SQL 練習室 - 主程式 */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let SQL, db;
const TABLES = {
  Halls:    {pos:[40,30],  cols:[['hall_id','PK'],['hall_name'],['capacity'],['screen_type']]},
  Showtimes:{pos:[330,30], cols:[['showtime_id','PK'],['movie_id','FK'],['hall_id','FK'],['start_time'],['base_price']]},
  Movies:   {pos:[620,30], cols:[['movie_id','PK'],['title'],['genre'],['duration'],['rating'],['release_date']]},
  Bookings: {pos:[330,250],cols:[['booking_id','PK'],['member_id','FK'],['showtime_id','FK'],['seat_id','FK'],['status'],['booked_at'],['price']]},
  Members:  {pos:[40,250], cols:[['member_id','PK'],['name'],['email'],['join_date'],['tier']]},
  Seats:    {pos:[620,250],cols:[['seat_id','PK'],['seat_code'],['seat_type']]},
  Reviews:  {pos:[40,470], cols:[['review_id','PK'],['member_id','FK'],['movie_id','FK'],['score'],['comment'],['created_at']]}
};
const FKS = [['Showtimes','hall_id','Halls'],['Showtimes','movie_id','Movies'],['Bookings','member_id','Members'],['Bookings','showtime_id','Showtimes'],['Bookings','seat_id','Seats'],['Reviews','member_id','Members'],['Reviews','movie_id','Movies']];

function newDb(){ const d = new SQL.Database(); d.run('PRAGMA foreign_keys = ON;'); d.run(SEED_SQL); return d; }
function q(d, sql){ // 回傳最後一個有結果集的 {columns, values}
  const res = d.exec(sql); return res.length ? res[res.length-1] : {columns:[], values:[]};
}
function tableHtml(r, limit=500){
  if(!r.columns.length) return '<p class="meta">（沒有結果集）</p>';
  const rows = r.values.slice(0, limit);
  let h = '<table><thead><tr>' + r.columns.map(c=>`<th>${esc(c)}</th>`).join('') + '</tr></thead><tbody>';
  for(const row of rows) h += '<tr>' + row.map(v => v===null ? '<td class="null">NULL</td>' : `<td>${esc(v)}</td>`).join('') + '</tr>';
  h += '</tbody></table>';
  if(r.values.length > limit) h += `<p class="meta">僅顯示前 ${limit} 列，共 ${r.values.length} 列</p>`;
  return h;
}

/* ---------- 分頁 ---------- */
function go(tab){ location.hash = '#' + tab; }
function route(){
  const t = (location.hash.slice(1) || 'case').split('/')[0];
  const name = document.getElementById('tab-'+t) ? t : 'case';
  document.querySelectorAll('.tab').forEach(e => e.classList.toggle('show', e.id === 'tab-'+name));
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.tab === name));
  if(name==='compare' && db) renderCompare();
  const m = location.hash.match(/^#practice\/(q\d+)/);
  if(name==='practice' && m) selectEx(m[1], true);
}
window.addEventListener('hashchange', route);

/* ---------- 摘要、ERD、資料瀏覽 ---------- */
function renderSummary(){
  let total = 0; const cards = [];
  for(const t of Object.keys(TABLES)){ const n = q(db,`SELECT COUNT(*) FROM ${t}`).values[0][0]; total += n; }
  cards.push(['資料表', Object.keys(TABLES).length], ['資料列', total], ['練習題', EXERCISES.length], ['外鍵關聯', FKS.length]);
  $('#summary-cards').innerHTML = cards.map(c=>`<div class="card"><b>${c[1]}</b>${c[0]}</div>`).join('');
}
function renderErd(){
  const W=230, rowH=22, head=28; let svg = '<svg viewBox="0 0 900 700" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="13"><defs><marker id="ar" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 z" fill="#7b3fc4"/></marker></defs>';
  const rect = {}; // name -> {x,y,w,h}
  for(const [n,t] of Object.entries(TABLES)) rect[n] = {x:t.pos[0], y:t.pos[1], w:W, h:head + t.cols.length*rowH};
  const rowY = (n,col) => rect[n].y + head + TABLES[n].cols.findIndex(c=>c[0]===col)*rowH + rowH/2;
  for(const [from,col,to] of FKS){
    const a = rect[from], b = rect[to], y1 = rowY(from,col), y2 = rowY(to, TABLES[to].cols[0][0]);
    const right = b.x > a.x + a.w - 5, left = b.x + b.w < a.x + 5;
    let x1,x2;
    if(right){x1=a.x+a.w;x2=b.x;} else if(left){x1=a.x;x2=b.x+b.w;} else {x1=a.x+a.w/2; x2=b.x+b.w/2; const yy = b.y > a.y ? [a.y+a.h, b.y] : [a.y, b.y+b.h]; svg += `<path d="M${x1},${yy[0]} L${x2},${yy[1]}" stroke="#7b3fc4" fill="none" stroke-width="1.5" marker-end="url(#ar)"/>`; continue;}
    const mx = (x1+x2)/2;
    svg += `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" stroke="#7b3fc4" fill="none" stroke-width="1.5" marker-end="url(#ar)"/>`;
  }
  for(const [n,t] of Object.entries(TABLES)){
    const r = rect[n];
    svg += `<g class="erd-t" data-t="${n}"><rect class="box" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="8" fill="#fff" stroke="#b9c0e6" stroke-width="1.5"/><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${head}" rx="8" fill="#4457d8"/><text x="${r.x+12}" y="${r.y+19}" fill="#fff" font-weight="700">${n}</text>`;
    t.cols.forEach((c,i)=>{ const y = r.y+head+i*rowH+15; svg += `<text x="${r.x+12}" y="${y}" fill="#222">${c[0]}</text>`; if(c[1]) svg += `<text x="${r.x+r.w-12}" y="${y}" text-anchor="end" font-size="11" font-weight="700" fill="${c[1]==='PK'?'#d98b00':'#7b3fc4'}">${c[1]}</text>`; });
    svg += '</g>';
  }
  $('#erd-wrap').innerHTML = svg + '</svg>';
  document.querySelectorAll('.erd-t').forEach(g => g.onclick = () => showSchema(g.dataset.t));
  showSchema('Bookings');
}
function showSchema(t){
  const ddl = q(db, `SELECT sql FROM sqlite_master WHERE name='${t}'`).values[0][0];
  const info = q(db, `PRAGMA table_info(${t})`);
  const fk = FKS.filter(f=>f[0]===t).map(f=>`<li><code>${f[0]}.${f[1]}</code> → <code>${f[2]}</code></li>`).join('');
  $('#schema-detail').innerHTML = `<h2>${t}</h2>${tableHtml({columns:['#','欄位','型別','NOT NULL','預設','PK'],values:info.values})}${fk?`<h3>外鍵</h3><ul>${fk}</ul>`:''}<h3>建立語法 (DDL)</h3><pre>${esc(ddl)}</pre>`;
}
function renderData(){
  $('#data-tabs').innerHTML = Object.keys(TABLES).map((t,i)=>`<span class="chip${i?'':' on'}" data-t="${t}">${t}</span>`).join('');
  const show = t => { $('#data-view').innerHTML = tableHtml(q(db,`SELECT * FROM ${t}`)); document.querySelectorAll('#data-tabs .chip').forEach(c=>c.classList.toggle('on',c.dataset.t===t)); };
  document.querySelectorAll('#data-tabs .chip').forEach(c=>c.onclick=()=>show(c.dataset.t)); show('Halls');
}

/* ---------- 練習 ---------- */
let cur = null; const done = new Set(JSON.parse(localStorage.getItem('sqlDone') || '[]'));
const LV = {1:'基礎',2:'進階',3:'挑戰'};
function renderList(){
  const lv = $('#f-level').value, tp = $('#f-topic').value;
  let h = '<li class="free" data-id="free"><span class="lv">∞</span>自由練習（自己寫 SQL）</li>';
  for(const e of EXERCISES){
    if((lv && e.level != lv) || (tp && e.topic !== tp)) continue;
    h += `<li data-id="${e.id}" class="${cur&&cur.id===e.id?'on':''}"><span class="lv l${e.level}">${LV[e.level]}</span><span class="${done.has(e.id)?'done':''}" style="flex:1;display:flex">${e.id.slice(1)}. ${esc(e.title)}</span></li>`;
  }
  $('#ex-list').innerHTML = h;
  document.querySelectorAll('#ex-list li').forEach(li => li.onclick = () => selectEx(li.dataset.id));
  $('#progress').textContent = `已完成 ${done.size} / ${EXERCISES.length} 題（依「結果與預期一致」計算）`;
}
function selectEx(id, fromHash){
  cur = id === 'free' ? null : EXERCISES.find(e=>e.id===id);
  if(!fromHash) history.replaceState(null,'', '#practice' + (cur ? '/'+cur.id : ''));
  $('#hint-box').classList.add('hidden'); $('#verdict').innerHTML='';
  $('#expected').innerHTML=''; $('#actual').innerHTML=''; $('#exp-meta').textContent=''; $('#act-meta').textContent=''; $('#btn-csv').classList.add('hidden');
  if(cur){
    $('#ex-head').innerHTML = `<h2>${cur.id.slice(1)}. ${esc(cur.title)}</h2><p class="meta">難度：${LV[cur.level]}　主題：${esc(cur.topic)}</p><p>${esc(cur.q)}</p>`;
    $('#editor').value = cur.sql; $('#btn-hint').classList.remove('hidden'); 
    showExpected();
  } else {
    $('#ex-head').innerHTML = '<h2>自由練習</h2><p>在下方輸入任何 SQL（SELECT、INSERT、UPDATE、DELETE、PRAGMA、EXPLAIN…），多句用 ; 分隔。異動只影響你的瀏覽器，隨時可「重設資料庫」。</p>';
    $('#editor').value = 'SELECT * FROM Movies;'; ['#btn-hint'].forEach(b=>$(b).classList.add('hidden'));
  }
  renderList();
}
function showExpected(){
  const ref = newDb(); let r;
  try { ref.exec(cur.sql); r = cur.verify ? q(ref, cur.verify) : q(ref, cur.sql); } catch(e){ r = {columns:['error'],values:[[e.message]]}; }
  ref.close();
  cur._exp = r; $('#expected').innerHTML = tableHtml(r); $('#exp-meta').textContent = `${r.values.length} 列`;
}
function norm(v){ return typeof v === 'number' ? Math.round(v*1e6)/1e6 : v; }
function compare(a, b, ordered){
  if(a.columns.length !== b.columns.length) return `欄位數不同：預期 ${b.columns.length} 欄，你的結果 ${a.columns.length} 欄。`;
  const ncols = a.columns.map(c=>c.toLowerCase()).join(), ecols = b.columns.map(c=>c.toLowerCase()).join();
  if(a.values.length !== b.values.length) return `列數不同：預期 ${b.values.length} 列，你的結果 ${a.values.length} 列。`;
  const key = r => JSON.stringify(r.map(norm));
  let A = a.values.map(key), B = b.values.map(key);
  if(!ordered){ A.sort(); B.sort(); }
  for(let i=0;i<A.length;i++) if(A[i]!==B[i]) return ordered && [...A].sort().join()===[...B].sort().join() ? '資料正確，但排序不符合題目要求。' : '內容與預期不同。';
  if(ncols !== ecols) return 'OK-COLS';
  return '';
}
const history_ = [];
function run(){
  const sql = $('#editor').value.trim(); if(!sql) return;
  history_.unshift(sql); $('#history').innerHTML = history_.slice(0,30).map(s=>`<li>${esc(s)}</li>`).join('');
  document.querySelectorAll('#history li').forEach((li,i)=>li.onclick=()=>$('#editor').value=history_[i]);
  const t0 = performance.now(); let r, msg = '';
  try {
    const isWrite = /^\s*(insert|update|delete|replace|create|drop|alter)/i.test(sql);
    if(cur && cur.verify){ db.exec(sql); r = q(db, cur.verify); }
    else { r = q(db, sql); if(isWrite && !r.columns.length) msg = `已執行，異動 ${db.getRowsModified()} 列。`; }
  } catch(e){
    $('#actual').innerHTML = `<div class="err">❌ ${esc(e.message)}</div>`; $('#verdict').innerHTML = '<div class="v bad">SQL 有錯誤，請看右側訊息。</div>'; $('#act-meta').textContent=''; $('#btn-csv').classList.add('hidden'); return;
  }
  const ms = (performance.now()-t0).toFixed(1);
  $('#actual').innerHTML = (msg ? `<p class="meta">${msg}</p>` : '') + tableHtml(r); $('#act-meta').textContent = `${r.values.length} 列 · ${ms} ms`;
  window._last = r; $('#btn-csv').classList.toggle('hidden', !r.columns.length);
  if(cur && cur._exp){
    const diff = compare(r, cur._exp, !!cur.ordered);
    if(!diff || diff==='OK-COLS'){ done.add(cur.id); localStorage.setItem('sqlDone', JSON.stringify([...done])); $('#verdict').innerHTML = `<div class="v ok">✅ 結果與預期一致！${diff?'（欄位名稱不同，但內容相同）':''}</div><div class="box"><b>觀念：</b>${esc(cur.why)}</div>`; renderList(); }
    else $('#verdict').innerHTML = `<div class="v bad">❌ ${esc(diff)}</div>`;
  } else $('#verdict').innerHTML = '';
}
function csv(){
  const r = window._last; const c = v => v===null ? '' : '"'+String(v).replace(/"/g,'""')+'"';
  const text = '﻿' + [r.columns.map(c).join(','), ...r.values.map(x=>x.map(c).join(','))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text],{type:'text/csv'})); a.download = 'result.csv'; a.click();
}

/* ---------- 結果比較 ---------- */
function renderCompare(){
  const A = "SELECT m.title, SUM(b.price) AS box_office, COUNT(*) AS tickets\nFROM Bookings b JOIN Showtimes s ON s.showtime_id=b.showtime_id JOIN Movies m ON m.movie_id=s.movie_id\nWHERE b.status = 'paid'\nGROUP BY m.movie_id ORDER BY box_office DESC;";
  const B = A.replace("WHERE b.status = 'paid'\n",'');
  const ra = q(db,A), rb = q(db,B), sum = r => r.values.reduce((s,x)=>s+x[1],0);
  const ref = (name,sql,r)=>`<div><h3>${name}</h3><pre>${esc(sql)}</pre>${tableHtml(r)}<p><b>合計：${sum(r)} 元</b></p></div>`;
  $('#compare-out').innerHTML = `<div class="cmp">${ref('版本 A：只算 paid',A,ra)}${ref('版本 B：不限制狀態',B,rb)}</div><div class="note" style="margin-top:14px">差額 <b>${sum(rb)-sum(ra)} 元</b> 來自 pending（待付款）與 cancelled（已取消）訂單。「票房」代表實際成交，因此應採版本 A。</div>`;
}

/* ---------- 初始化 ---------- */
async function init(){
  try {
    const bin = Uint8Array.from(atob(window.SQL_WASM_B64), c => c.charCodeAt(0));
    SQL = await initSqlJs({ wasmBinary: bin.buffer });
    db = newDb();
  } catch(e){ $('#status').textContent = '❌ 載入失敗：' + e.message; $('#status').className='status err'; return; }
  $('#status').textContent = `✓ SQLite ${q(db,'select sqlite_version()').values[0][0]} 已就緒（離線執行）`; $('#status').className='status ok';
  const topics = [...new Set(EXERCISES.map(e=>e.topic))];
  $('#f-topic').innerHTML = '<option value="">全部主題</option>' + topics.map(t=>`<option>${esc(t)}</option>`).join('');
  $('#f-level').onchange = $('#f-topic').onchange = renderList;
  $('#tbl-chips').innerHTML = Object.keys(TABLES).map(t=>`<span class="t" data-t="${t}" title="點擊插入欄位清單">${t}</span>`).join('');
  document.querySelectorAll('#tbl-chips .t').forEach(s=>s.onclick=()=>{ const t=s.dataset.t; const e=$('#editor'); e.value += (e.value&&!/\s$/.test(e.value)?' ':'') + t; e.focus(); });
  $('#run').onclick = run;
  $('#editor').addEventListener('keydown', e => {
    if((e.ctrlKey||e.metaKey) && e.key==='Enter'){ e.preventDefault(); run(); }
    if(e.key==='Tab'){ e.preventDefault(); const t=e.target,s=t.selectionStart; t.value=t.value.slice(0,s)+'  '+t.value.slice(t.selectionEnd); t.selectionStart=t.selectionEnd=s+2; }
  });
  $('#btn-hint').onclick = () => { const b=$('#hint-box'); b.innerHTML='💡 '+esc(cur.hint); b.classList.toggle('hidden'); };
  $('#btn-plan').onclick = () => { const s=$('#editor').value.trim().replace(/;\s*$/,''); if(!s) return; try{ const r=q(db,'EXPLAIN QUERY PLAN '+s); $('#actual').innerHTML=tableHtml(r); $('#act-meta').textContent='執行計畫'; $('#verdict').innerHTML='<div class="v info">這是 SQLite 規劃的執行步驟（SCAN＝全表掃描、SEARCH＝使用索引／主鍵）。</div>'; }catch(e){ $('#actual').innerHTML=`<div class="err">❌ ${esc(e.message)}</div>`; } };
  $('#btn-reset').onclick = () => { db.close(); db = newDb(); $('#verdict').innerHTML='<div class="v info">資料庫已重設為初始狀態。</div>'; $('#actual').innerHTML=''; renderSummary(); renderData(); };
  $('#btn-csv').onclick = csv;
  renderSummary(); renderErd(); renderData(); renderList(); selectEx('q01', true);
  route();
}
init();
