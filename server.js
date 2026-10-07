// Servidor: sirve la web y gestiona las salas en tiempo real (WebSocket).
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const { WebSocketServer } = require("ws");
const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, "public");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };
const rooms = {};

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/info") {
    const ips = Object.values(os.networkInterfaces()).flat().filter(n => n.family === "IPv4" && !n.internal).map(n => n.address);
    res.writeHead(200, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ ips, port: PORT }));
  }
  if (url === "/") url = "/index.html";
  const file = path.normalize(path.join(PUB, url));
  if (!file.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("No encontrado"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }); res.end(data);
  });
});

const wss = new WebSocketServer({ server, maxPayload: 4096 });
const send = (ws, o) => ws && ws.readyState === 1 && ws.send(JSON.stringify(o));
const num = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v)) || 0));
const code = () => { let c; do { c = Array.from({ length: 5 }, () => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.random() * 31 | 0]).join(""); } while (rooms[c]); return c; };
const list = r => [...r.players.values()].map(p => ({ name: p.name, answered: p.answered, score: p.score, lives: p.lives, hits: p.hits, done: p.done, online: p.ws.readyState === 1 }));
const sorted = r => [...r.players.values()].sort((a, b) => b.score - a.score || b.hits - a.hits);
const sendFinal = r => { const l = sorted(r).map(p => ({ name: p.name, score: p.score, hits: p.hits, done: p.done }));
  r.players.forEach(p => send(p.ws, { t: "final", list: l })); };
const pushHost = r => { send(r.host, { t: "players", started: r.started, list: list(r) });
  const s = sorted(r); s.forEach((p, k) => send(p.ws, { t: "rank", pos: k + 1, total: s.length })); };

wss.on("connection", ws => {
  ws.on("message", raw => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === "create") {
      const c = code(); rooms[c] = { host: ws, players: new Map(), started: false, ts: Date.now() };
      ws.room = c; ws.isHost = true; return send(ws, { t: "created", code: c });
    }
    if (m.t === "join") {
      const r = rooms[String(m.room || "").toUpperCase()];
      if (!r) return send(ws, { t: "error", msg: "No existe esa sala. Revisa el código." });
      let name = String(m.name || "").trim().slice(0, 16) || "Jugador";
      const old = r.players.get(name);
      if (old && old.ws.readyState !== 1) { old.ws = ws; ws.room = m.room.toUpperCase(); ws.pname = name; pushHost(r); return send(ws, { t: "joined", name, resumed: true }); }
      if (r.started) return send(ws, { t: "error", msg: "La partida ya empezó." });
      if (r.players.size >= 100) return send(ws, { t: "error", msg: "Sala llena." });
      let base = name, k = 2; while (r.players.has(name)) name = base + " " + k++;
      r.players.set(name, { name, ws, answered: 0, score: 0, lives: 3, hits: 0, done: false });
      ws.room = m.room.toUpperCase(); ws.pname = name; send(ws, { t: "joined", name }); return pushHost(r);
    }
    const r = rooms[ws.room]; if (!r) return;
    if (ws.isHost && m.t === "start") { r.started = true; r.players.forEach(p => send(p.ws, { t: "start" })); pushHost(r); }
    else if (ws.isHost && m.t === "end") { r.players.forEach(p => send(p.ws, { t: "end" })); setTimeout(() => sendFinal(r), 900); }
    else if (ws.isHost && m.t === "kick") { const p = r.players.get(m.name); if (p) { send(p.ws, { t: "error", msg: "Fuiste expulsado." }); p.ws.close(); r.players.delete(m.name); pushHost(r); } }
    else if (m.t === "progress" && ws.pname) {
      const p = r.players.get(ws.pname); if (!p) return;
      Object.assign(p, { answered: num(m.answered, 20), score: num(m.score, 100000), lives: num(m.lives, 3), hits: num(m.hits, 20), done: !!m.done }); pushHost(r);
      if (r.started && r.players.size && [...r.players.values()].every(q => q.done)) { clearTimeout(r.ft); r.ft = setTimeout(() => sendFinal(r), 600); }
    }
  });
  ws.on("close", () => { const r = rooms[ws.room]; if (r && ws.pname) pushHost(r); });
});

setInterval(() => { for (const c in rooms) if (Date.now() - rooms[c].ts > 6 * 3600e3) delete rooms[c]; }, 600e3);
server.listen(PORT, () => {
  console.log(`\nJuego listo. Abre http://localhost:${PORT}`);
  Object.values(os.networkInterfaces()).flat().filter(n => n.family === "IPv4" && !n.internal)
    .forEach(n => console.log(`Compañeros en la misma WiFi: http://${n.address}:${PORT}`));
});
