# Family Search RAG App
A small Express-based Node API used by the FamilySearchRagApp project. It accepts GEDCOM uploads, parses them, and provides a simple question endpoint that uses the OpenAI API to answer genealogy questions based on the uploaded GEDCOM data.

## Project layout

```
my-node-api
├── src
│   ├── index.js        # App entry (serves frontend + mounts routes)
│   └── routes
│       └── api.js      # API endpoints: /hello, /upload, /ask
├── package.json        # scripts & dependencies
└── README.md           # this file
```

## Requirements

- Node.js (14+ recommended)
- npm
- An OpenAI API key (set in `.env` as `OPENAI_API_KEY`)

## Quick start

1. Install dependencies:

```bash
cd my-node-api
npm install
```

2. Create a `.env` file in `my-node-api/` containing your OpenAI key:

```
OPENAI_API_KEY=sk-...
```

3. Start the server:

```bash
npm start
```

The server listens on http://localhost:3000 by default.

## Environment / configuration

- OPENAI_API_KEY (required) — API key used by the OpenAI client in `src/routes/api.js`.
- Port is currently fixed to `3000` in `src/index.js`. If you need a configurable port, update `src/index.js` to read from `process.env.PORT`.

NOTE: Uploaded GEDCOM files are parsed and stored in memory (variable `parsedGedcomData`) — they are not persisted to a database. The uploaded files are saved to `uploads/` by multer and then read/parsed. The `uploads/` folder is included in `.gitignore` to avoid committing user data.

## API endpoints

1. Health / quick test

```
GET /hello

Response: 200 OK
Body: "Hello from the API!"
```

2. Upload a GEDCOM file

```
POST /upload
Content-Type: multipart/form-data
Form field: gedcom (file)

Success: { message: "GEDCOM uploaded and parsed." }
Errors: 400 (no file), 500 (parse failure)
```

Example using curl:

```bash
curl -X POST http://localhost:3000/upload \
  -F "gedcom=@/path/to/your/tree.ged"
```

After a successful upload the GEDCOM is parsed and kept in memory for subsequent /ask requests.

3. Ask a question about the uploaded GEDCOM

```
POST /ask
Content-Type: application/json
Body: { "question": "Who was John Doe's wife?" }

Success: { "answer": "..." }
Errors: 400 (no GEDCOM uploaded / no question), 500 (OpenAI or server error)
```

Example using curl (assumes you've uploaded a GEDCOM during the same server session):

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"List the children of John Doe."}'
```

Important: the server uses the OpenAI Chat Completions API via the `openai` package and will attempt to summarize up to a subset of people from the parsed GEDCOM as context. The answer content and cost depend on the model and tokens used.

## Notes & gotchas

- GEDCOM parsing happens in-memory. Restarting the server clears the parsed data.
- Uploaded files are written to `my-node-api/uploads/` by multer; the code reads the file synchronously to parse it.
- The OpenAI model used in the code is `gpt-4o` and the call uses `openai.chat.completions.create(...)`. Make sure your key and account have access to the model you intend to use or change the model string to one you have access to.
- If you want to persist parsed data, integrate a database or serialize the parsed result to disk and load it on boot.

## Dependencies (high-level)

- express — server
- multer — multipart/form-data file uploads
- gedcom / parse-gedcom — GEDCOM parsing utilities
- dotenv — environment variable loading
- openai — OpenAI client

See `package.json` for exact versions.

## Development / serving the front-end

`src/index.js` serves static files from `../my-js-front-end` (relative to the `src` folder). If you run a separate front-end dev server, you can disable or change that behavior.

## Troubleshooting

- "No GEDCOM file uploaded" — ensure the form field name is `gedcom` when uploading.
- OpenAI errors — check `OPENAI_API_KEY` in `.env` and monitor console logs for the full error.
- Permission errors writing to `uploads/` — ensure the process user has write permission in the project directory, or change multer's `dest` to a writable path.