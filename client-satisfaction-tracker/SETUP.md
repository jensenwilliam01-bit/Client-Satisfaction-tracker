# Client Satisfaction Tracker — Setup Guide

## Files

```
server.js          ← Node.js backend + webhook receiver
package.json       ← Dependencies
public/index.html  ← Dashboard UI
data.json          ← Auto-created when first score arrives
```

---

## 1. Deploy to Railway (recommended — free tier available)

1. Push these files to a GitHub repo (public or private).
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Select your repo. Railway auto-detects Node.js and runs `npm start`.
4. Click **Settings → Networking → Generate Domain** to get your public URL.
   Example: `https://your-app.up.railway.app`

> **Alternative:** [Render.com](https://render.com) — New Web Service → same steps.

---

## 2. Configure Zapier

### Trigger
- App: **1fit** (or whichever app sends the weekly survey results)
- Trigger event: e.g. "New Survey Response" / "New Form Submission"
- Filter: only run on Fridays (add a Zapier Filter step checking `{{zap_meta_human_now_day_of_week}}` = `Friday`)

### Action
- App: **Webhooks by Zapier**
- Action: **POST**
- URL: `https://your-app.up.railway.app/webhook`
- Payload Type: `JSON`
- Data:
  | Key | Value |
  |---|---|
  | `client_name` | `{{Full Name}}` (map from 1fit) |
  | `score` | `{{Score}}` (map from 1fit — must be 0–10) |

That's it. Every time a survey result comes in, Zapier posts to `/webhook` and the dashboard updates automatically.

---

## 3. Scoring logic

| Score | Tier |
|---|---|
| 8 – 10 | 🟢 Green |
| 0 – 7  | 🔴 Red |
| No score since last Friday | 🟡 Yellow |

Tiers reset every Friday — clients drop back to Yellow if no new score arrives.

---

## 4. Managing clients

- Open the dashboard URL in any browser.
- Click **+ Add Client** to pre-load a client (they'll sit in Yellow until scored).
- Click the **×** on any card to remove a client.
- The dashboard auto-refreshes every 30 seconds.

---

## 5. Test the webhook manually

```bash
curl -X POST https://your-app.up.railway.app/webhook \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Jane Smith", "score": 9}'
```

Expected response: `{"ok":true,"name":"Jane Smith","score":9,"status":"green"}`
