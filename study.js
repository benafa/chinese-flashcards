/* Study and Reference tabs. Data lives in lessons.js; sound goes through the same player, voice, Slow and Mute as the cards */
const ICON_SAY = `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 8.5a5 5 0 0 1 0 7"/></svg>`;
const L = window.LESSONS;
let saying = null;

function inline(s){
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function clearSay(){ if (saying) saying.classList.remove("on"); saying = null; }

// Play one clip. Falls back to the device voice if the file can't load
function playClip(a, zh, btn, onend){
  if (state.muted) { nudgeMute(); return; }
  clearSay();
  try { speechSynthesis.cancel(); } catch (e) {}
  if (btn) { btn.classList.add("on"); saying = btn; }
  player.onended = () => { clearSay(); if (onend) onend(); };
  player.onerror = () => { clearSay(); speak(zh); };
  player.src = "audio-study/" + state.voice + "/" + a + ".mp3";
  player.preservesPitch = true;
  player.playbackRate = state.slow ? 0.7 : 1;
  const p = player.play();
  if (p && p.catch) p.catch(() => { clearSay(); speak(zh); });
}

function say(it, extra){
  const body = `<span class="tx"><span class="zh">${inline(it.zh)}</span>${it.py ? `<span class="py">${inline(it.py)}</span>` : ""}${extra || ""}</span>`;
  if (!it.a) return `<div class="say" aria-disabled="true">${body}</div>`;
  return `<button class="say" type="button" data-a="${it.a}" data-zh="${esc(it.zh)}" aria-label="Play ${esc(it.zh)}">${body}<span class="ic">${ICON_SAY}</span></button>`;
}
function block(b){
  if (b.t === "p") return `<p>${inline(b.h)}</p>`;
  if (b.t === "key") return `<p class="keyline">${inline(b.h)}</p>`;
  if (b.t === "lines") return `<div class="rows">` + b.rows.map(r => {
    const notes = r.note.map(n => `<div class="note">${n.k && n.k !== "English" ? `<i>${inline(n.k)}</i> ` : ""}${inline(n.v)}</div>`).join("");
    return `<div class="rowitem">${r.items.map(i => say(i)).join("")}${notes}</div>`;
  }).join("") + `</div>`;
  if (b.t === "talk") return `<div class="talkbar"><button class="play" type="button" data-playall>${ICON_SAY}Play conversation</button></div><div class="rows">` + b.rows.map(r =>
    `<div class="rowitem talkrow"><span class="who ${r.who === "B" ? "b" : ""} ${r.who ? "" : "none"}">${esc(r.who)}</span><div>${say(r, `<span class="en">${inline(r.en)}</span>`)}</div></div>`).join("") + `</div>`;
  if (b.t === "test") return `<p class="hint testhow">Say each one in Chinese, then check.</p><div class="rows testrows">` + b.rows.map(r =>
    `<div class="rowitem"><button class="reveal" type="button" aria-expanded="false"><span>${inline(r.q)}</span><em>Show</em></button><div hidden>${say(r)}<div class="tmark"><button class="btn again" type="button" data-mark="0" data-zh="${esc(r.zh)}">Again</button><button class="btn got" type="button" data-mark="1" data-zh="${esc(r.zh)}">Got it</button></div></div></div>`).join("") +
    `</div><p class="testscore" hidden></p><button class="btn wide" type="button" data-testcards="${esc(JSON.stringify(b.rows.map(r => r.zh)))}">Practise these as cards</button>`;
  return `<div class="grid" tabindex="0"><table><thead><tr>${b.head.map(h => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map(r => `<tr class="rowitem-t">${r.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function sectionHTML(s){ return `<section class="sec">${s.title ? `<h3>${inline(s.title)}</h3>` : ""}${s.blocks.map(block).join("")}</section>`; }

/* Study */
function renderStudy(){
  const v = $("view-study");
  const u = L.units.find(x => x.n === state.unit);
  if (!u) {
    v.innerHTML = `<p class="keyline">${inline(L.key)}</p><div class="ulist">` + L.units.map(x =>
      `<button class="ubtn" type="button" data-unit="${x.n}"><b>${x.n}</b><span><strong>${inline(x.title)}</strong><small>${inline(x.goal)}</small></span></button>`).join("") + `</div>`;
    return;
  }
  const i = L.units.indexOf(u), next = L.units[i + 1];
  v.innerHTML = `<button class="linkbtn" type="button" data-unit="">← All units</button>
    <div class="unit-head"><h2>Unit ${u.n} · ${inline(u.title)}</h2><p>${inline(u.goal)}</p></div>` +
    u.sections.map(sectionHTML).join("") +
    (u.n >= 1 ? `<button class="btn got" type="button" data-practise="${u.n}">Practise Unit ${u.n} flashcards</button>` : "") +
    (next ? `<button class="btn wide" type="button" data-unit="${next.n}">Next: Unit ${next.n} · ${inline(next.title)}</button>` : "");
}
function openUnit(n){
  stopAudio();
  state.unit = n;
  try { localStorage.setItem("studyUnit", n === null ? "" : n); } catch (e) {}
  renderStudy();
  window.scrollTo(0, 0);
}

/* Reference */
const fold = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function renderRef(){
  const v = $("view-ref");
  v.innerHTML = `<input class="search" id="refsearch" type="search" placeholder="Search Chinese, pinyin or English" aria-label="Search reference" autocomplete="off">` +
    L.ref.map(g => `<details class="group"><summary>${inline(g.title)}</summary><div class="groupbody">${g.sections.map(sectionHTML).join("")}</div></details>`).join("") +
    `<p class="none" id="refnone" hidden>Nothing found.</p>`;
  v.querySelectorAll(".rowitem, tbody tr").forEach(r => { r.dataset.s = fold(r.textContent) + " " + fold(r.textContent).replace(/\s+/g, ""); });
  $("refsearch").addEventListener("input", e => searchRef(e.target.value));
}
function searchRef(q){
  const v = $("view-ref"), t = fold(q.trim());
  let any = false;
  v.querySelectorAll("details.group").forEach(g => {
    let hit = false;
    g.querySelectorAll(".sec").forEach(s => {
      let sh = false;
      s.querySelectorAll(".rowitem, tbody tr").forEach(r => { const m = !t || r.dataset.s.includes(t); r.hidden = !m; sh = sh || m; });
      s.querySelectorAll(":scope > p, .talkbar").forEach(p => { p.hidden = !!t; });
      s.hidden = !!t && !sh;
      hit = hit || sh;
    });
    g.hidden = !!t && !hit;
    g.open = !!t && hit;
    any = any || hit;
  });
  $("refnone").hidden = !t || any;
}

// One answer per line; the score shows once every line in the test is marked
function markTest(btn){
  const right = btn.dataset.mark === "1", card = SENTENCES.find(c => c[0] === btn.dataset.zh);
  const box = btn.closest(".tmark");
  box.dataset.done = right ? "1" : "0";
  box.querySelectorAll("button").forEach(b => { b.disabled = true; b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
  if (card) record(card, right);
  const rows = btn.closest(".testrows"), marks = [...rows.querySelectorAll(".tmark")], done = marks.filter(m => m.dataset.done);
  if (done.length === marks.length) {
    const score = rows.nextElementSibling;
    score.textContent = `You got ${done.filter(m => m.dataset.done === "1").length} of ${marks.length}.`;
    score.hidden = false;
  }
}

/* Tabs */
const TABS = ["cards", "study", "ref"];
function setTab(t){
  if (state.tab !== t) stopAudio();
  state.tab = t;
  try { localStorage.setItem("tab", t); } catch (e) {}
  document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t ? "true" : "false"));
  TABS.forEach(x => { $("view-" + x).hidden = x !== t; });
  window.scrollTo(0, 0);
}

document.querySelector(".wrap").addEventListener("click", e => {
  const el = e.target.closest("[data-a],[data-unit],[data-practise],[data-playall],[data-mark],[data-testcards],.reveal");
  if (!el) return;
  if (el.dataset.a) return playClip(el.dataset.a, el.dataset.zh, el);
  if (el.dataset.unit !== undefined) return openUnit(el.dataset.unit === "" ? null : Number(el.dataset.unit));
  if (el.dataset.mark) return markTest(el);
  if (el.dataset.testcards) {
    const want = JSON.parse(el.dataset.testcards);
    start(SENTENCES.filter(c => want.includes(c[0])));
    setTab("cards");
    return;
  }
  if (el.dataset.practise) {
    if (state.deck === "today") state.deck = "words";
    state.units = new Set([Number(el.dataset.practise)]);
    if (!unitHasCards(Number(el.dataset.practise))) state.deck = "words";
    renderControls(); start(); setTab("cards");
    return;
  }
  if (el.hasAttribute("data-playall")) {
    const lines = [...el.parentElement.nextElementSibling.querySelectorAll("[data-a]")];
    const run = i => { if (i < lines.length) playClip(lines[i].dataset.a, lines[i].dataset.zh, lines[i], () => run(i + 1)); };
    return run(0);
  }
  const box = el.nextElementSibling, open = box.hidden;
  box.hidden = !open;
  el.setAttribute("aria-expanded", open ? "true" : "false");
  el.querySelector("em").textContent = open ? "Hide" : "Show";
});
$("tabs").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setTab(b.dataset.tab); });

try {
  const u = localStorage.getItem("studyUnit");
  state.unit = u === null || u === "" ? null : Number(u);
} catch (e) { state.unit = null; }
renderStudy();
renderRef();
let savedTab = null; try { savedTab = localStorage.getItem("tab"); } catch (e) {}
setTab(TABS.includes(savedTab) ? savedTab : "cards");
