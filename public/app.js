const $ = id => document.getElementById(id);
const N = QUESTIONS.length;
let i, lives, score, combo, best, hits, timer, tl, TL, locked, picked, player;

// ---- Sonido ----
let ac;
const beep = (f, d = .15, t = "sine") => { try { ac = ac || new AudioContext(); const o = ac.createOscillator(), g = ac.createGain();
  o.type = t; o.frequency.value = f; g.gain.value = .07; o.connect(g); g.connect(ac.destination); o.start();
  g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d); o.stop(ac.currentTime + d); } catch (e) {} };
const sOk = () => [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => beep(f, .15), k * 90));
const sBad = () => beep(150, .35, "sawtooth");

const show = id => { document.querySelectorAll(".screen").forEach(s => s.classList.remove("on")); $(id).classList.add("on"); };

// ---- Modos: solo / sala ----
let ws, room, finished = false;
const send = o => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const prog = done => send({ t: "progress", answered: done ? N : i + 1, score, lives, hits, done });
const sala = (new URLSearchParams(location.search).get("sala") || "").toUpperCase();
$("code").value = sala;
if (sala) show("joinS");
$("btnSolo").onclick = () => { player = "Tú"; $("posTxt").textContent = ""; start(); };
$("btnJoin").onclick = () => { show("joinS"); $("name").focus(); };
$("btnBack").onclick = () => show("home");
$("go").onclick = join; $("name").onkeydown = $("code").onkeydown = e => { if (e.key === "Enter") join(); };
$("again").onclick = () => location.href = location.pathname;
function join() {
  const n = $("name").value.trim(), c = $("code").value.trim().toUpperCase();
  if (!n || !c) { $("err").textContent = "Escribe tu nombre y el código de la sala."; return; }
  player = n; room = c; $("err").textContent = ""; connect(); beep(500, .05);
}
function connect() {
  ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host);
  ws.onopen = () => send({ t: "join", room, name: player });
  ws.onmessage = e => { const m = JSON.parse(e.data);
    if (m.t === "error") { finished = true; $("err").textContent = m.msg; show("joinS"); ws.close(); }
    else if (m.t === "joined") { player = m.name; if (!m.resumed) { $("who").textContent = player; show("wait"); } else prog(finished); }
    else if (m.t === "start") start();
    else if (m.t === "rank") $("posTxt").textContent = `🏅 Puesto ${m.pos}/${m.total}`;
    else if (m.t === "final") showFinal(m.list);
    else if (m.t === "end" && !finished && $("play").classList.contains("on")) { finished = true; finish(true); } };
  ws.onerror = () => { if (!finished && !$("wait").classList.contains("on") && !$("play").classList.contains("on")) $("err").textContent = "No se pudo conectar con el servidor."; };
  ws.onclose = () => { if (!finished) setTimeout(connect, 1500); };
}

// ---- Inicio de partida ----
function start() {
  i = 0; lives = 3; score = 0; combo = 0; best = 0; hits = 0; finished = false;
  $("finalBox").classList.toggle("hidden", !room); $("finalRank").innerHTML = '<p class="sub">Esperando a que terminen los demás<span class="dots"></span></p>';
  drawTower(); show("play"); load(); beep(520); }
function drawTower() {
  $("tower").innerHTML = QUESTIONS.map((_, k) => `<div class="fl${k === N - 1 ? " top" : ""}" id="f${k}"><span>${k + 1}</span><span>${k === N - 1 ? "💎" : ""}</span></div>`).join("");
}
function hud() {
  $("hearts").textContent = "❤️".repeat(lives) + "🖤".repeat(3 - lives);
  $("floorTxt").textContent = `Piso ${i + 1}/${N}`;
  $("scoreTxt").textContent = `${score} pts` + (combo >= 2 ? `  🔥x${mult().toFixed(2)}` : "");
}
const mult = () => Math.min(2, 1 + Math.max(0, combo - 1) * .25);

// ---- Preguntas ----
function load() {
  const q = QUESTIONS[i]; locked = false; picked = [];
  document.querySelectorAll(".fl").forEach((f, k) => { f.className = "fl" + (k === N - 1 ? " top" : "") + (k < i ? " done" : k === i ? " cur" : ""); f.firstChild.textContent = k === i ? "🧗 " + (k + 1) : k + 1; });
  $("guardEmoji").textContent = q.g; $("cat").textContent = q.cat; $("question").textContent = q.q;
  $("fb").textContent = ""; $("next").classList.add("hidden"); $("answer").className = ""; $("answer").innerHTML = "";
  const isT = q.type === "t";
  $("answer").style.display = isT ? "flex" : "none"; $("check").classList.toggle("hidden", !isT);
  $("options").className = isT ? "tokens" + (q.steps ? " steps" : "") : ""; $("answer").classList.toggle("steps", !!q.steps);
  if (isT) {
    const all = [...q.parts, ...q.extra].map((t, k) => ({ t, k }));
    const pool = q.show ? q.show.map(k => all[k]) : all.sort(() => Math.random() - .5);
    $("options").innerHTML = pool.map(p => `<button class="tok" data-k="${p.k}">${p.t}</button>`).join("");
    document.querySelectorAll("#options .tok").forEach(b => b.onclick = () => addTok(b));
  } else {
    $("options").innerHTML = q.o.map((t, k) => `<button class="opt" data-i="${k}"><b>${k + 1}</b>${t}</button>`).join("");
    document.querySelectorAll(".opt").forEach(b => b.onclick = () => grade(+b.dataset.i === q.a, b));
  }
  hud(); startTimer(15);
}
function addTok(b) { if (locked) return; b.disabled = true; picked.push(b.dataset.k + "|" + b.textContent);
  const s = document.createElement("button"); s.className = "tok"; s.textContent = b.textContent; s.dataset.src = b.dataset.k;
  s.onclick = () => { if (locked) return; picked = picked.filter(p => p.split("|")[0] !== s.dataset.src);
    document.querySelector(`#options .tok[data-k="${s.dataset.src}"]`).disabled = false; s.remove(); }; $("answer").append(s); beep(700, .05); }
$("check").onclick = () => { if (locked) return; const q = QUESTIONS[i];
  const got = picked.map(p => p.split("|").slice(1).join("|")).join(q.sep);
  grade(got === q.parts.join(q.sep), $("answer")); };

function startTimer(sec) { clearInterval(timer); TL = tl = sec; bar();
  timer = setInterval(() => { tl -= .25; bar(); if (tl <= 5 && tl % 1 === 0 && tl > 0) beep(950, .05); if (tl <= 0) grade(false, null, true); }, 250); }
function bar() { const p = Math.max(0, tl / TL * 100); $("bar").style.width = p + "%"; $("bar").style.background = p > 50 ? "var(--ok)" : p > 25 ? "var(--gold)" : "var(--bad)"; }

function grade(ok, el, timeout) {
  if (locked) return; locked = true; clearInterval(timer);
  const q = QUESTIONS[i];
  document.querySelectorAll("#options button").forEach(b => b.disabled = true);
  if (q.type === "c") document.querySelectorAll(".opt")[q.a].classList.add("ok"); else $("answer").classList.add(ok ? "ok" : "bad");
  if (ok) {
    combo++; hits++; best = Math.max(best, combo);
    const gain = Math.round((100 + tl / TL * 100) * mult()); score += gain; sOk(); burst(50);
    $("fb").innerHTML = `✅ <b>+${gain} pts.</b> ${q.why}`;
  } else {
    combo = 0; lives--; sBad(); if (el && q.type === "c") el.classList.add("bad");
    $("fb").innerHTML = `${timeout ? "⏰ Se acabó el tiempo." : "💥 Fallaste."} Pierdes una vida. <br>${q.type === "t" ? "Respuesta: <code>" + q.parts.join(q.sep) + "</code><br>" : ""}${q.why}`;
  }
  hud(); prog(false);
  $("next").textContent = lives <= 0 ? "Ver resultado" : i === N - 1 ? "Abrir el tesoro 💎" : "Subir al piso " + (i + 2);
  $("next").classList.remove("hidden"); $("next").focus();
}
$("next").onclick = () => { if (lives <= 0 || i === N - 1) { finished = true; return finish(); } i++; load(); };

document.addEventListener("keydown", e => { if (!$("play").classList.contains("on")) return;
  const q = QUESTIONS[i];
  if (!locked && q.type === "c" && e.key >= "1" && e.key <= "4") document.querySelectorAll(".opt")[+e.key - 1].click();
  if (!locked && q.type === "t" && e.key === "Enter") $("check").click(); });

// ---- Ranking completo (jugadores) ----
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function showFinal(list) {
  $("finalBox").classList.remove("hidden");
  $("finalRank").innerHTML = list.map((p, k) => `<div class="rkrow${p.name === player ? " me" : ""}"><b>${k + 1}º</b><span class="nm">${esc(p.name)}${p.name === player ? " (tú)" : ""}</span><span class="sc">${p.score} pts</span></div>`).join("");
  const mine = list.findIndex(p => p.name === player);
  if (mine >= 0) $("posTxt").textContent = `🏅 Puesto ${mine + 1}/${list.length}`;
}

// ---- Final ----
function finish(forced) {
  clearInterval(timer); finished = true; const win = lives > 0 && !forced && i === N - 1, floors = win ? N : i;
  if (win) score += lives * 100; // bonus por vidas
  prog(true);
  const rank = score >= 1800 ? "Maestro Redis 🏆" : score >= 1200 ? "Ingeniero de datos 🔧" : score >= 600 ? "Aprendiz de claves 🔑" : "Novato curioso 🌱";
  $("endIcon").textContent = win ? "💎" : "💀";
  $("endTitle").textContent = forced ? "Partida terminada" : win ? "¡Conquistaste los 10 pisos!" : "Se acabaron las vidas";
  $("endSub").textContent = `${player}, tu rango es: ${rank}` + (win ? ` (incluye ${lives * 100} pts por vidas restantes)` : ". Repasa los temas y vuelve a intentarlo.");
  $("stats").innerHTML = `<div><b>${score}</b>puntos</div><div><b>${hits}/${N}</b>aciertos</div><div><b>${best}</b>mejor racha</div><div><b>${floors}</b>pisos superados</div>`;
  show("end"); if (win) { sOk(); setTimeout(() => burst(250), 300); } else sBad();
}

// ---- Confeti ----
const cv = $("fx"), cx = cv.getContext("2d"); let ps = [];
const rs = () => { cv.width = innerWidth; cv.height = innerHeight; }; rs(); onresize = rs;
function burst(n) { const was = ps.length; for (let k = 0; k < n; k++) ps.push({ x: innerWidth / 2, y: innerHeight / 3, vx: (Math.random() - .5) * 15, vy: -Math.random() * 13 - 2,
  c: ["#ffd23f", "#19e6ff", "#ff3fa4", "#a98bff"][k % 4], s: 4 + Math.random() * 5, l: 100 }); if (!was) loop(); }
function loop() { cx.clearRect(0, 0, cv.width, cv.height); ps = ps.filter(p => p.l-- > 0);
  ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .35; cx.fillStyle = p.c; cx.fillRect(p.x, p.y, p.s, p.s); });
  ps.length ? requestAnimationFrame(loop) : cx.clearRect(0, 0, cv.width, cv.height); }


// ================= ANFITRIÓN =================
$("btnHost").onclick = () => {
  show("hlobby"); const N2 = QUESTIONS.length; let hws, started = false, ended = false, data = [];
  const hsend = o => hws && hws.readyState === 1 && hws.send(JSON.stringify(o));
  async function base() {
    if (!["localhost", "127.0.0.1"].includes(location.hostname)) return location.origin;
    try { const r = await (await fetch("/info")).json();
      if (r.ips.length) { $("note").textContent = "Modo local: los compañeros deben estar en la misma WiFi. Para usar internet, publica el juego (mira el README)."; return `http://${r.ips[0]}:${r.port}`; } } catch (e) {}
    return location.origin;
  }
  (async () => {
    const b = await base();
    hws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host);
    hws.onopen = () => hsend({ t: "create" });
    hws.onerror = () => { $("link").textContent = "No se pudo conectar. Abre el juego desde el servidor (npm start o tu enlace publicado)."; };
    hws.onmessage = e => { const m = JSON.parse(e.data);
      if (m.t === "created") { $("link").textContent = `${b}/?sala=${m.code}`; $("codeTxt").textContent = m.code; }
      if (m.t === "players") { data = m.list; render(); } };
    $("hHome").onclick = () => { ended = true; try { hws.close(); } catch (e) {} location.href = location.pathname; };
    hws.onclose = () => { if (!ended) $("liveTitle").textContent = "Conexión perdida. Recarga la página."; };
  })();
  $("start").onclick = () => { started = true; hsend({ t: "start" }); show("hlive"); render(); };
  $("endNow").onclick = () => { hsend({ t: "end" }); setTimeout(finalView, 800); };
  const rows = s => s.map((p, k) => `<div class="hostrow"><b>${k + 1}º</b><span class="nm">${esc(p.name)}</span>
    <div class="pbar"><i style="width:${p.answered / N2 * 100}%"></i></div>
    <span class="hh">${"❤️".repeat(p.lives)}${"🖤".repeat(3 - p.lives)}</span><span class="sc">${p.score}${p.done ? " ✔" : ""}</span></div>`).join("");
  function render() {
    $("count").textContent = data.length; $("start").disabled = data.length === 0;
    if (!started) { $("chips").innerHTML = data.map((p, k) => `<span class="chip ${p.online ? "" : "off"}"><em>${k + 1}</em>${esc(p.name)}</span>`).join(""); return; }
    const s = [...data].sort((a, b) => b.score - a.score || b.hits - a.hits); $("rows").innerHTML = rows(s);
    if (s.length && s.every(p => p.done)) setTimeout(finalView, 1200);
  }
  function finalView() {
    if (ended) return; ended = true; const s = [...data].sort((a, b) => b.score - a.score || b.hits - a.hits); show("hfinal");
    $("podium").innerHTML = [1, 0, 2].filter(k => s[k]).map(k => `<div class="pod" style="min-height:${80 + (3 - k) * 50}px;animation-delay:${(2 - k) * .4}s"><div style="font-size:2rem">${["🥇", "🥈", "🥉"][k]}</div><b>${esc(s[k].name)}</b><div class="pts">${s[k].score}</div></div>`).join("");
    $("rows2").innerHTML = rows(s); burst(250); setTimeout(() => burst(200), 700);
  }
};
