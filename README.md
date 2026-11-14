# Kult Dex

The Kult Dex web game: a glowing 3D AI trading desk. Your AI Arena agent is
the CEO, analysts read crypto, tokenized US stocks, gold and T-bill yields,
and every call is committed on 0G before the price that grades it. Paper money
only: real prices settle the record. It runs on AI Arena's `/v1/dex` API
(`dex-desk-service` in potassiumdichromate/0g-aiarena, plan in
`docs/dex/KULT_DEX_PLAN.md` there) and shares its office look with Kult Create
and Kult Sports, recoloured cyan and gold for the trading floor.

No framework: plain HTML, CSS and ES modules in `public/`, served by a small
Node server (`server.mjs`, no dependencies). The only build step is the Privy
login bundle.

## Run it

```bash
npm install --include=dev
npm run build          # Privy login bundle -> public/privy/
npm start              # http://localhost:4600
```

- **Demo, no account:** <http://localhost:4600/?demo=1> (an in-memory copy of
  the API with sample prices and a sample desk, labelled DEMO on screen) or
  `?demo=fresh` (starts at "Open your trading desk").
- **Real account:** open `/?jwt=<AI Arena token>` like Kult World does, or
  paste a token in the developer field on the entrance (shown on localhost and
  with `?dev=1`). Set `DEX_API_URL=http://localhost:8070` to talk to a local
  `dex-desk-service`.

## How it fits together

| Path | What |
|---|---|
| `/` | The game (`public/`) |
| `/config.json` | Public settings for the page: Privy app id, links |
| `/api/v1/dex/*` | Forwarded to AI Arena's `/v1/dex` (the gateway, `AI_ARENA_API_URL`, or `DEX_API_URL`). The gateway only accepts browser calls from its own site, so this runs server to server |
| `/arena/auth/privy` | Forwards a Privy access token to AI Arena's `POST /v1/auth/privy` and returns its AI Arena token |
| `/health` | Health check |

**Sign-in:**
1. **Kult World:** the Dex Trading building opens the game with
   `?jwt=<AI Arena token>`. The page removes it from the address bar at once.
2. **Privy (opened directly):** the same login as Kult Create and Kult Sports.

Either way the AI Arena token is traded once at `POST /v1/dex/session` for a
12-hour Dex session (signed with its own secret, valid only for `/v1/dex`),
kept in `sessionStorage`. On a `401` the game renews it through Privy if it
can; otherwise it asks the player to sign in again.

## Playing

- **Floor:** analysts at their desks, a live ticker along the walls, the KULT
  DEX neon sign, a gold bull, and the CEO on a chart rug in front of the big
  screen. Scan the whole mandate or one asset: the analysts present their
  reads one by one and the CEO drafts a call (long, short, a rotation into
  T-bills, or no trade).
- **Signal room:** every read with its score and inputs hash, the CEO's note,
  an editor (direction, horizon, risk, target, stop) and **Lock & commit**.
  After lock: the call's life (committed, batched, entry, open, settled) and
  a chart with the entry, target and stop.
- **Markets:** live prices, 24h and 7d moves, sparklines, candle charts, the
  tokenized T-bill yield against stablecoin lending, and the US market session.
- **Talent, Leaders, Verify, Desk:** hire analysts with credits; weekly,
  all-time and RWA boards; check any call's leaf, Merkle proof, 0G anchor and
  hash chain; set the mandate, turn on the auto-desk, change the CEO, read
  the ledger.

## Deploy

`render.yaml` defines the `kult-dex` web service. After the first deploy:

1. Set `PRIVY_APP_ID` (the shared KULT Privy app) and add the site's URL as an
   allowed origin in the Privy dashboard.
2. Make sure `aiarena-dex` is deployed and the gateway's `DEX_SERVICE_URL` set.
3. In Kult World set `KULT_DEX_URL` to this site.

## Configuration

| Variable | Default | |
|---|---|---|
| `AI_ARENA_API_URL` | `https://aiarena-gateway.kult.games` | The gateway: `/v1/dex` and the Privy exchange |
| `DEX_API_URL` | `AI_ARENA_API_URL` | Where `/api/v1/dex/*` goes (a local `dex-desk-service` in development) |
| `PUBLIC_API_URL` | unset | Let browsers call an API directly (it must allow this origin) |
| `PRIVY_APP_ID`, `PRIVY_CLIENT_ID` | unset: Privy login hidden | |
| `AI_ARENA_APP_URL` | `https://app.kult.games` | "Create an agent" link |
| `DEMO_MODE` | unset | `1` (or `fresh`) sends every visitor to the demo |
| `FRAME_ANCESTORS` | unset | CSP `frame-ancestors`; Render sets `'self' https://world.kult.games` |
| `PORT` | `4600` | |

## Files

| File | |
|---|---|
| `public/js/app.js` | Sign-in, the floor, flows (the scan show, lock, hiring, mandate) |
| `public/js/views.js` | Screens: console, signals, signal room, markets, talent, leaders, verify, desk, analyst card |
| `public/js/world.js` | The 3D trading floor (role props on each desk, the ticker wall, the bull, the chart rug, the big screen) |
| `public/js/office3d.js` | The three.js office scene, a copy of Kult Create's and Kult Sports'; keep them in sync |
| `public/js/chart.js` | Candle charts with entry/target/stop levels, and sparklines |
| `public/js/api.js` | API client |
| `public/js/demo.js` | The offline demo API (sample prices) |
| `public/js/tour.js` | Nova's tutorial (the same engine as Kult World's) |
| `public/models/` | The CEO models, one per AI Arena archetype |
| `privy-login/` | The Privy login bundle source |

Signals are produced by AI agents and are not investment advice. Kult Dex is
paper trading: no real money moves.
