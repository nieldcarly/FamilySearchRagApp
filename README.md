# Family Search RAG App
This repository contains two small parts that work together to provide a genealogy RAG (Retrieval-Augmented Generation) demo:

- `my-node-api` — an Express-based backend that accepts GEDCOM uploads, parses them, and uses OpenAI to answer questions about the family data.
- `my-js-front-end` — a tiny static front-end (single HTML file) that uploads a GEDCOM and asks questions via the backend.

## Project layout

```
my-node-api
├── src
│   ├── index.js        # App entry (serves frontend + mounts routes)
│   └── routes
│       └── api.js      # API endpoints: /hello, /upload, /ask
```

This README documents how to run each part locally and how they interact.

## Repo layout

```
my-node-api/          # Express backend (node)
my-js-front-end/      # Static front-end (index.html)
.gitignore
README.md
```

## Prerequisites

- Node.js (14+ recommended) and npm
- An OpenAI API key (for backend features that call OpenAI)

## my-node-api (backend)

This is the API that parses GEDCOM files, holds the parsed structure in memory, and calls OpenAI to answer user questions based on that parsed data.

Quick setup

```bash
cd my-node-api
npm install
```

Create a `.env` in `my-node-api/` with your OpenAI API key:

```
OPENAI_API_KEY=sk-...
```

Start the server:

```bash
npm start
```

By default it listens on `http://localhost:3000` (port is currently hard-coded in `src/index.js`).

Important files

- `src/index.js` — boots the Express app and serves static files from `../my-js-front-end`.
- `src/routes/api.js` — API routes: `/hello`, `/upload`, `/ask`.
- `package.json` — scripts and dependencies.

API endpoints (summary)

- `GET /hello` — quick test endpoint. Returns "Hello from the API!".
- `POST /upload` — accepts a multipart/form-data upload with form field `gedcom` (file). On success the GEDCOM is parsed and kept in memory.
- `POST /ask` — accepts JSON `{ "question": "..." }`. Requires a GEDCOM to have been uploaded during the running session.

Example curl flows

Upload a GEDCOM:

```bash
curl -X POST http://localhost:3000/upload \
  -F "gedcom=@/path/to/your/tree.ged"
```

Ask a question (after upload):

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"List the children of John Doe."}'
```

Notes

- GEDCOM parsing result is kept in memory (`parsedGedcomData`) — restarting the backend clears it.
- Multer writes uploads to `my-node-api/uploads/` by default; the file is read synchronously and parsed. The `uploads/` folder is in `.gitignore` to avoid committing user data.
- The code uses the OpenAI client and currently requests model `gpt-4o`; make sure your API key has access or change the model in `src/routes/api.js`.

## my-js-front-end (front-end)

The front-end is a single static HTML file at `my-js-front-end/index.html`. It provides a simple UI to:

- Upload a GEDCOM file (form field name `gedcom`).
- Ask a question using the `/ask` endpoint.

## Typical workflow

1. Start the backend: `cd my-node-api && npm start`.
2. Open `http://localhost:3000` in your browser (backend serves the front-end). 
3. Upload a GEDCOM using the UI. Wait for confirmation that it was parsed.
4. Ask a question in the UI and read the answer returned from `/ask`.

## Development notes & tips

- To make the backend port configurable, change `src/index.js` to read `process.env.PORT || 3000` and start with `PORT=4000 npm start`.
- If you want to persist parsed GEDCOM data, add a small DB or save the parsed JSON to disk after parsing.
- Watch out for committing secrets: ensure `.env` files or API keys are ignored (see the repo root `.gitignore`).

## Troubleshooting

- "No GEDCOM file uploaded" — ensure the upload form uses the field name `gedcom` and the request is multipart/form-data.
- OpenAI errors — confirm `OPENAI_API_KEY` is present in `my-node-api/.env` and monitor backend logs for full error details.
- Static front-end not loading assets — ensure the backend's `express.static` path matches the `my-js-front-end` directory location.

## Useful commands

From the repo root (example):

```bash
# Start backend
cd my-node-api && npm install && npm start

# Serve front-end separately (optional)
cd my-js-front-end && python3 -m http.server 8000
```