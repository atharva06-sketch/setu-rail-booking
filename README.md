# Rail Bandhu — Train Ticket Booking (College Project)

A full train-ticket booking flow for Indian Railways, built with **React + TypeScript + Vite** and a
small **Node/Express backend**.

- **RailRadar API** → real trains, timetables, live running status, station boards, real coach
  composition and berth blueprints.
- **IRCTC API (irctc.dev)** → real fares and real PRS seat availability, proxied through the backend
  so the API key stays server-side.
- **SetuPay sandbox** → realistic UPI / card / net-banking / wallet checkout.
- **Real email delivery** → ticket + invoice sent through SMTP or EmailJS, with an Ethereal test inbox
  fallback when no credentials are configured.

![Screens](https://img.shields.io/badge/screens-Search%20→%20Trains%20→%20Seats%20→%20Payment%20→%20Ticket-0B3C6B)

## Features

- **All-India station search** — 8,670 active stations bundled locally, searchable by name or code.
- **Real train search** — real numbers, names, departure/arrival, duration, run days, distance and halts.
- **Real live running status** — current location, delay, next halt, platform, speed and route timeline.
- **Real live station board** — arrivals/departures for the next 2/4/6/8 hours.
- **Real coach composition** — every train's rake (S1–S6, M1, B1–B4, A1–A2, H1 …), berth counts and
  SL/3E/3A/2A/1A berth blueprints from RailRadar.
- **Real fares** — live IRCTC fare breakups (base, reservation, superfast, GST, catering) when
  `IRCTC_API_KEY` is set; realistic distance-based estimates otherwise.
- **Real seat availability** — live IRCTC `AVAILABLE-0042`, `RAC 12`, `GNWL271/WL140` status for the
  selected train, class, date and quota.
- **8 quotas** — General (GN), Tatkal (TQ), Premium Tatkal (PT), Ladies (LD), Senior Citizens (SS),
  Defence (DF), Divyangjan (DP) and Lower Berth (LB), with Ladies/Senior validation.
- **Seat selection** — coach-wise maps using real berth numbers/types; unavailable berths are greyed
  out using the live IRCTC count.
- **Sandbox payment gateway** — UPI, card, net banking and wallet, validation, OTP, processing,
  transaction ID and auth code. No real money moves.
- **E-ticket + invoice email** — PNR, passenger/seat table, fare breakup, payment details and a
  printable ticket; automatically emailed after payment.
- **Graceful fallbacks** — if IRCTC or email credentials are missing, the app clearly labels simulated
  data and still demonstrates the complete flow.

## Quick start

```bash
cd setu-rail-booking
npm install
```

Create `.env` in the project root:

```env
VITE_RAILRADAR_API_KEY=your_railradar_key
VITE_RAILRADAR_API_BASE=https://api.railradar.in/v1

# Optional: real IRCTC fares + seat availability (free key at https://irctc.dev/dashboard)
IRCTC_API_KEY=your_irctc_key
IRCTC_API_BASE=https://api.irctc.dev

# Optional: real email delivery (Gmail needs an App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your_16_char_app_password
MAIL_FROM=Rail Bandhu <you@gmail.com>

# Optional: EmailJS instead of SMTP
# EMAILJS_SERVICE_ID=service_xxx
# EMAILJS_TEMPLATE_ID=template_xxx
# EMAILJS_PUBLIC_KEY=your_public_key
# EMAILJS_PRIVATE_KEY=your_private_key
```

Run the web app and backend together:

```bash
npm run dev:all
```

Open `http://localhost:5173`. The backend runs on `http://127.0.0.1:8787`; Vite proxies `/api` to it.

For production:

```bash
npm run build
npm start          # serves dist/ + /api on port 8787
```

## Share a demo link

Build the app, run the production server, then expose it with a tunnel:

```bash
npm run build
npm start                    # app + API on http://127.0.0.1:8787
```

```bash
# no account needed (temporary link, changes every restart)
cloudflared tunnel --url http://127.0.0.1:8787

# or ngrok (free account + authtoken required)
ngrok config add-authtoken <YOUR_TOKEN>
ngrok http 8787
```

The printed `https://...` URL works for anyone. Quick tunnels are temporary: the link stops working
when the tunnel process or the server is closed.

## Troubleshooting

**Blank page after starting?** Open the exact URL printed in the terminal (usually
`http://localhost:5173`) and hard-refresh with `Ctrl + Shift + R`. Then:

1. Check the terminal running `npm run dev:all` for errors.
2. Make sure ports `5173` and `8787` are free (close old dev servers), then start again.
3. If it still fails, delete `node_modules` and run `npm install`, then `npm run dev:all`.
4. VPN or ad-blocker extensions (Browsec, Privacy Badger, etc.) can block scripts on
   `localhost`. Disable them for this site, or open the app in an Incognito window.

The app shows a readable error screen instead of a silent blank page when the frontend crashes or a
module fails to load. A first-load network hiccup is retried automatically once.

## Configuration and fallbacks

| Credential | Enables | Without it |
| --- | --- | --- |
| `VITE_RAILRADAR_API_KEY` | Real trains, live status, station board, coach composition | Demo trains + simulated coaches |
| `IRCTC_API_KEY` | Real IRCTC fares and seat availability | Realistic simulated fares/availability (clearly labelled) |
| SMTP (`SMTP_HOST/USER/PASS`) | Real email to any inbox | — |
| EmailJS keys | Real email without SMTP | — |
| none of the email options | — | Ethereal test inbox + preview URL |

The UI shows the active mode on the search screen, seat screen, ticket email card and footer.

> **RailRadar quota:** free plan is limited. Responses are cached (train search 6 h, live status 45 s,
> station board 90 s, coach composition 12 h). The footer shows the remaining monthly quota. If it runs
> out, use **“Load demo trains”**.

> **Security note:** `VITE_*` values are visible in the browser bundle. The IRCTC key is **not** a
> `VITE_*` value — it is read only by `server/index.mjs`. For production, put the RailRadar key behind
> the same backend proxy.

## What is real vs simulated

| Part | Source |
| --- | --- |
| Stations (8,670), train search, timings, run days, distance | **RailRadar API (real)** |
| Live running status, delay, platform, route timeline | **RailRadar API (real)** |
| Live station board | **RailRadar API (real)** |
| Coach composition, coach numbers, berth counts and berth types | **RailRadar API (real)** |
| Fares and fare breakup | **IRCTC API (real)** when configured, otherwise simulated |
| Seat availability (counts, RAC, waitlist) | **IRCTC API (real)** when configured, otherwise simulated |
| Exact seat-level occupancy | Simulated (IRCTC does not expose berth-level reservation data) |
| Payment gateway, OTP, transaction/auth codes | Simulated sandbox |
| PNR and QR code | Simulated |
| Ticket + invoice email delivery | **Real SMTP/EmailJS** when configured, Ethereal test inbox otherwise |

This is clearly labelled in the UI. The app is **not affiliated with Indian Railways or IRCTC**, and
the ticket is not valid for travel.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run dev:api` | Start the backend (IRCTC proxy + email + static build) |
| `npm run dev:all` | Start both together |
| `npm run build` | Production build |
| `npm start` | Serve `dist/` and `/api` from the backend |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript type-check |
| `npm run lint` | ESLint |
| `node scripts/fetch-stations.mjs` | Refresh the all-India station list |

## Project structure

```
server/
  index.mjs                  IRCTC proxy, email API, static hosting
  ticketEmail.mjs            ticket + invoice HTML/text email template
src/
  App.tsx                    booking flow + screens
  components/
    StationPicker.tsx        all-India searchable station combobox
    StationBoard.tsx         live arrivals/departures board
    LiveTrainTracker.tsx     live running status + route timeline
    PaymentGateway.tsx       sandbox UPI/card/netbanking/wallet checkout
  data/
    stations.ts              generated list of 8,670 active stations
  lib/
    railradar.ts             RailRadar client, coach composition, caching, quota
    irctc.ts                 IRCTC fare/availability client + parsers
    email.ts                 ticket email client + mailto fallback
    stations.ts              local station search/index
    booking.ts               classes, quotas, fares, seat maps, receipts
  theme.tsx                  design tokens + global styles
scripts/
  fetch-stations.mjs         regenerate the station dataset
```

## Demo flow (for evaluation)

1. Search **Raipur Jn (R) → New Delhi (NDLS)** for tomorrow.
2. Point out that train numbers, timings, run days, distances and coach layouts are real.
3. Pick a class (e.g. **SL** on 18237). The seat screen shows the live IRCTC status and the real
   `S1–S6 + SE1` coaches with 80-berth blueprints.
4. Select seats and fill passenger details. Try **Ladies** or **Senior Citizens** quota to see the
   validation rules.
5. Pay with the test card `4111 1111 1111 1111`, any future expiry, CVV `123`, OTP `123456` (or a UPI
   test ID).
6. On the confirmation screen, show the e-ticket and invoice. The **Ticket email** card shows whether
   SMTP/EmailJS delivered it or an Ethereal preview is available.
7. Switch to **Live rail radar → Track a train** and enter `18237` for real live tracking.

## Credits

- Train, station, live tracking and coach data: [RailRadar](https://railradar.in) (independent
  platform, not affiliated with Indian Railways).
- IRCTC fares/availability: [irctc.dev](https://irctc.dev).
- Icons: [Lucide](https://lucide.dev).
- Fonts: IBM Plex Sans / IBM Plex Mono.
