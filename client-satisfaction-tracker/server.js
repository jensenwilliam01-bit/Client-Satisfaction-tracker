const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Load or initialise data store
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return { clients: {} };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { clients: {} }; }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Returns the most recent Friday (start of day, UTC)
function lastFridayUTC() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 5=Fri … 6=Sat
  const daysBack = day === 5 ? 0 : (day + 2) % 7; // days since last Friday
  const friday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack));
  return friday;
}

function getStatus(client) {
  if (!client.scoredAt) return "yellow";
  const scored = new Date(client.scoredAt);
  const friday = lastFridayUTC();
  // Scored on or after last Friday = has a score this week
  if (scored >= friday) {
    return client.score >= 8 ? "green" : "red";
  }
  return "yellow"; // no score since last Friday
}

// ── Webhook endpoint (called by Zapier) ───────────────────────────────────────
// Expected body: { "client_name": "Jane Smith", "score": 9 }
// Optional alias fields: "name", "client", "Score", "rating"
app.post("/webhook", (req, res) => {
  const body = req.body || {};

  const name = (body.client_name || body.name || body.client || "").toString().trim();
  const rawScore = body.score ?? body.Score ?? body.rating;
  const score = parseFloat(rawScore);

  if (!name) return res.status(400).json({ error: "Missing client_name" });
  if (isNaN(score) || score < 0 || score > 10)
    return res.status(400).json({ error: "score must be a number 0–10" });

  const data = loadData();
  data.clients[name] = {
    name,
    score: Math.round(score * 10) / 10,
    scoredAt: new Date().toISOString(),
  };
  saveData(data);

  console.log(`[webhook] ${name} → ${score}`);
  res.json({ ok: true, name, score, status: getStatus(data.clients[name]) });
});

// ── API: list all clients with computed status ────────────────────────────────
app.get("/api/clients", (req, res) => {
  const data = loadData();
  const clients = Object.values(data.clients).map((c) => ({
    ...c,
    status: getStatus(c),
  }));
  res.json({ clients, lastFriday: lastFridayUTC().toISOString() });
});

// ── API: add/update client manually ──────────────────────────────────────────
app.post("/api/clients", (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: "Missing name" });
  const data = loadData();
  if (!data.clients[name]) {
    data.clients[name] = { name, score: null, scoredAt: null };
    saveData(data);
  }
  res.json({ ok: true });
});

// ── API: remove client ────────────────────────────────────────────────────────
app.delete("/api/clients/:name", (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const data = loadData();
  delete data.clients[name];
  saveData(data);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
