# Paper — AI Test Generator (MERN)

Turn a chapter, a set of page photos, or a plain topic into a timed
competitive-exam mock test. Questions are generated from the material you supply,
validated before they are saved, scored on the server with negative marking, and
broken down afterwards by topic, difficulty and pacing.

---

## Features

- **Three sources of truth** — upload a text PDF, upload up to 10 page photos (read
  with OCR), or type/paste a topic and study material.
- **Grounded question generation** — when you supply source material, the model is
  instructed to use only that material and to quote the phrase each answer rests on.
- **Hard validation before saving** — valid JSON, required fields present, the correct
  answer present in the options exactly once, allowed difficulty and type, and no
  duplicates. Anything that fails is dropped with a stated reason, never silently saved.
- **Exam patterns, not hard-coded rules** — SSC CGL/CHSL, Railway, Banking and school
  presets ship with the app, and you can configure your own (questions, duration, marks,
  negative marking, options per question).
- **Real exam interface** — countdown, question palette with five states, previous/next,
  clear response, mark for review, auto-submit at zero.
- **Refresh-proof timer** — the deadline lives on the server, so reloading the page,
  closing the tab or switching devices never gains you time.
- **Server-side scoring** — a score sent by the browser is never trusted or read.
- **Result and analysis** — per-question review with explanations, topic and difficulty
  breakdowns, weak/strong topics, pacing, and progress across attempts.

---

## Tech stack

| Layer    | Choice |
| -------- | ------ |
| Frontend | React 18, Vite, React Router 6, Tailwind CSS, Axios, Recharts, Context API |
| Backend  | Node.js, Express 4, JWT, bcrypt, Multer, express-validator, Helmet, rate limiting |
| Database | MongoDB with Mongoose |
| AI       | Swappable provider layer — Gemini, OpenAI or Anthropic, chosen by env var |
| OCR      | Tesseract.js |
| PDF      | pdf-parse |

---

## Architecture

```
project/
├── client/                     React app (Vite)
│   └── src/
│       ├── components/         ui.jsx primitives, ProtectedRoute
│       ├── context/            AuthContext, ToastContext
│       ├── hooks/              useAsync
│       ├── layouts/            AppLayout (chrome), AuthLayout
│       ├── pages/              Dashboard, CreateTest, TakeTest, Result, Analytics…
│       ├── services/api.js     Axios client + endpoint modules
│       └── utils/format.js
│
├── server/
│   └── src/
│       ├── config/             env loading and validation, db connection
│       ├── controllers/        request handling only
│       ├── middleware/         auth, upload, validation, rate limits, errors
│       ├── models/             User, Document, Question, ExamPattern, Test, TestAttempt
│       ├── routes/             REST routing
│       ├── seed/               built-in exam patterns
│       ├── services/
│       │   ├── ai/             provider registry, prompts, JSON repair, validator
│       │   ├── document/       PDF text extraction
│       │   └── ocr/            image OCR
│       ├── utils/              scoring, text cleaning, tokens, errors
│       └── server.js
└── package.json                convenience scripts for both halves
```

**Request flow for a test:** upload → extract/clean text → store `Document` →
`generateQuestions` (prompt → provider → parse → validate → retry) → store `Question`s →
build `Test` with a frozen pattern snapshot → `start` creates a `TestAttempt` with a
server-side deadline → `submit` grades against the stored answer key.

Two deliberate design decisions:

- **Pattern snapshot.** The exam pattern is copied onto the test at creation. Editing a
  pattern later never changes the rules of a paper you have already sat.
- **Attempt-owned clock.** `startedAt` and `expiresAt` live on the attempt. The browser
  only renders the remaining seconds it computes from the server's deadline.

---

## Installation

Requirements: Node.js 18+, npm, and MongoDB (local or Atlas).

```bash
# from the project root
npm run install:all

# configure the server
cp server/.env.example server/.env
# then edit server/.env — see the table below

# optional: the client only needs this for a non-proxied production API
cp client/.env.example client/.env
```

---

## Environment variables

`server/.env`:

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `PORT` | no | Defaults to 5000. |
| `NODE_ENV` | no | `development` or `production`. |
| `CLIENT_URL` | no | Allowed CORS origin(s), comma separated. Defaults to `http://localhost:5173`. |
| `MONGODB_URI` | **yes** | The server refuses to start without it. |
| `JWT_SECRET` | **yes** | At least 16 characters. Generate with `openssl rand -hex 32`. |
| `JWT_EXPIRES_IN` | no | Defaults to `7d`. |
| `AI_PROVIDER` | no | `gemini` (default), `openai` or `anthropic`. |
| `AI_API_KEY` | for generation | Without it every other feature works and generation returns a clear error. |
| `AI_MODEL` | no | Overrides the provider default. |
| `AI_BASE_URL` | no | For proxies or self-hosted gateways. |
| `AI_MAX_RETRIES` | no | Extra generation attempts after a failed parse or validation. Default 2. |
| `AI_TIMEOUT_MS` | no | Default 90000. |
| `UPLOAD_DIR` | no | Default `uploads`. |
| `MAX_UPLOAD_MB` | no | Default 15. |
| `OCR_LANGUAGES` | no | Tesseract language codes, e.g. `eng+hin`. |

`client/.env`: `VITE_API_BASE_URL` — leave empty in development (Vite proxies `/api` to
port 5000); set it to your full API origin in production.

No secret is ever read by the client. The AI key, the Mongo URI and the JWT secret exist
only in the server process.

---

## MongoDB setup

**Local:**

```bash
# with MongoDB running locally
MONGODB_URI=mongodb://127.0.0.1:27017/ai-test-generator
```

**Atlas:** create a free cluster, add a database user, allow your IP, then use the
connection string with the database name appended:

```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ai-test-generator?retryWrites=true&w=majority
```

Exam patterns are seeded automatically on every boot (idempotent upserts). To run the
seed on its own: `npm run seed`.

---

## AI provider setup

Pick one and set two variables.

- **Gemini** — key from Google AI Studio. `AI_PROVIDER=gemini`, default model
  `gemini-1.5-flash`.
- **OpenAI** — key from the OpenAI dashboard. `AI_PROVIDER=openai`, default model
  `gpt-4o-mini`.
- **Anthropic** — key from the Anthropic console. `AI_PROVIDER=anthropic`, default model
  `claude-sonnet-4-5`.

To add another provider, drop a file in `server/src/services/ai/providers/` exporting
`{ name, complete({ system, prompt, signal }) }` and register it in
`services/ai/index.js`. Nothing else changes.

---

## Running

```bash
# terminal 1
npm run dev:server     # http://localhost:5000

# terminal 2
npm run dev:client     # http://localhost:5173
```

Check the backend on its own: `curl http://localhost:5000/api/health` — the response
includes `aiConfigured`, which tells you whether a key is loaded.

---

## API documentation

All routes are prefixed with `/api`. Every route except `/health`, `/auth/register` and
`/auth/login` needs `Authorization: Bearer <token>`. Responses are
`{ success, data }` or `{ success: false, message, details? }`.

| Method | Route | Purpose |
| ------ | ----- | ------- |
| GET | `/health` | Status, and whether an AI key is configured |
| POST | `/auth/register` | Create an account, returns user + token |
| POST | `/auth/login` | Sign in |
| GET | `/auth/me` | Current user (used to restore the session) |
| PATCH | `/auth/profile` | Update name or password |
| POST | `/documents/upload` | Multipart `files[]` — PDF or images, returns extracted text |
| POST | `/documents/process` | Topic and/or pasted study material |
| GET | `/documents` | Your document library |
| GET | `/documents/:id` | One document with its full text |
| POST | `/questions/generate` | Generate and validate questions |
| GET | `/questions?documentId=` | Your questions |
| GET | `/questions/:id` | One question |
| DELETE | `/questions/:id` | Remove a question |
| GET | `/exam-patterns` | Presets plus your own |
| POST | `/exam-patterns` | Create a custom pattern |
| DELETE | `/exam-patterns/:id` | Delete your pattern |
| POST | `/tests` | Build a test from selected questions |
| GET | `/tests` | Test history with status |
| GET | `/tests/:id` | Test metadata |
| DELETE | `/tests/:id` | Delete a test and its attempts |
| POST | `/tests/:id/start` | Start or resume an attempt (`{ restart: true }` to retake) |
| PATCH | `/tests/:id/attempts/:attemptId` | Autosave progress |
| POST | `/tests/:id/submit` | Grade and store the attempt |
| GET | `/results` | Submitted attempts |
| GET | `/results/:id` | Full result with per-question review |
| GET | `/analytics` | Dashboard and analysis data |

Example — generate questions:

```bash
curl -X POST http://localhost:5000/api/questions/generate \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"documentId":"<id>","count":10,"difficulty":"mixed","questionType":"mcq","optionsPerQuestion":4}'
```

---

## Security

- Passwords hashed with bcrypt (cost 12) and never selected by default.
- JWT in the `Authorization` header; expiry produces a specific, actionable error.
- Every data route filters by `userId` — ownership is checked server-side, not inferred
  from the request.
- Upload allow-list by MIME type (PDF, PNG, JPEG, WebP), size cap, and a maximum of 10
  files; rejected uploads are deleted from disk.
- Helmet, configured CORS, body size limits, `express-validator` on every write.
- Rate limits: 20 auth attempts / 15 min, 30 generations / hour / user, 600 requests /
  15 min overall.
- Scores are computed only in `utils/scoring.js` on the server.

---

## Production deployment

1. **Database** — MongoDB Atlas. Restrict network access to your server's IP.
2. **Backend** (Render, Railway, Fly.io, or a VM):
   - `npm install --omit=dev --prefix server && npm start --prefix server`
   - Set every required variable in the host's secret store, never in the repo.
   - Set `CLIENT_URL` to your deployed frontend origin.
   - Uploaded files are written to local disk and deleted after extraction. On a host
     with an ephemeral filesystem this is fine; if you want to keep originals, swap
     `middleware/upload.js` for an S3-backed Multer storage engine.
3. **Frontend** (Vercel, Netlify, or any static host):
   - `npm run build --prefix client`, deploy `client/dist`.
   - Set `VITE_API_BASE_URL=https://your-api-host/api` at build time.
   - Add a rewrite of all paths to `index.html` so client-side routes work on refresh.
4. **After deploy** — hit `/api/health` and confirm `aiConfigured: true`.

---

## A note on exam patterns

The shipped patterns are practice presets chosen for useful revision sessions. They are
not a claim that any one of them reproduces the current official structure of SSC CGL,
CHSL, RRB or a banking exam. Check the conducting body's latest notification and set up
a custom pattern if you need exact numbers.

---

## Future improvements

- Section-wise papers (quantitative, reasoning, English) within one test.
- Solution bookmarking and a spaced-repetition queue for wrong answers.
- Passage-based and assertion-reason question types.
- S3 upload storage and background jobs for large PDFs.
- Admin role for shared question banks across a coaching batch.
- Hindi OCR and bilingual papers (`OCR_LANGUAGES=eng+hin` already works for extraction).
