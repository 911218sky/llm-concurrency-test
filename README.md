# LLM Concurrency Test

The fastest load and concurrency tester for LLM chat-completion APIs
(inference) that lives in your browser. Fires N parallel requests from
your browser at an OpenAI-compatible or Anthropic endpoint and measures
whether the API actually processes them concurrently. Includes streaming
TTFT, live timeline, JSON/CSV export.

If the API blocks browser-origin (CORS) requests, a small companion
Chrome extension relays the requests through a background service worker
so the same-origin policy no longer applies.

- **Web page:** a single `index.html` — open it directly, host it on
  GitHub Pages at `https://0xaungkon.github.io/llm-concurrency-test/`, or
  run a local server.
- **Extension:** under `extension/` — a 4-file MV3 add-on that adds a CORS
  bypass.
- **No backend.** Your API key never leaves your browser.

## Features

- **Streaming + time-to-first-token.** Both providers are queried with
  `stream: true`; the timeline chart and per-request detail populate as each
  request's first chunk arrives.
- **Live timeline.** The chart updates in real time during a run — wait →
  first chunk → completion segments per request, no waiting for `Promise.all`.
- **Overlap-ratio verdict.** `sum-of-durations / wall-time` is compared to
  the requested concurrency and labeled **concurrent**, **partial**, or
  **sequential**.
- **Model picker.** Click "Fetch models" next to the MODEL label and the
  page will call `/v1/models` on the configured endpoint, then populate a
  dropdown next to the input. The text input stays editable — you can
  still type custom model names.
- **Export.** One-click JSON or CSV download of the entire run, plus a
  "Copy summary" button that puts the same JSON on the clipboard.
- **Light/heavy presets.** One-click config for a 3-request smoke test or a
  15-request stress test.
- **Dark mode.** Persisted per browser.
- **No persistence of test history** beyond your API key and config in
  `localStorage`. Each run lives only in the current DOM.

## Quick start (web page)

Open `index.html` in a browser:

- **Double-click** the file (loads over `file://`).
- **Or** serve it locally:
  ```bash
  python3 -m http.server 8000
  # then visit http://localhost:8000/
  ```
- **Or** enable GitHub Pages on `main` (root) and visit the published URL.

Then fill in:

| Field         | Example                                    |
| ------------- | ------------------------------------------ |
| API key       | `sk-...` or your provider's key            |
| Endpoint URL  | `https://api.openai.com/v1`                |
| Model         | `gpt-4o-mini`, `claude-haiku-4-5`, etc.    |
| Concurrency   | 5 (start small)                            |
| Max tokens    | 200                                        |
| Timeout       | 60 seconds                                 |

Click **RUN TEST**.

The auto-resolved endpoint on blur means you can paste a base URL
(`https://api.openai.com/v1`) and the page will fill in the right
`/chat/completions` or `/v1/messages` for you.

## CORS bypass (Chrome extension)

If your API provider doesn't allow browser-origin requests, every test will
fail with a generic network error. Install the bundled extension to relay
requests through a background service worker:

1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select the `extension/` folder from this repo.
4. Reload the page. The yellow "Requests blocked by CORS?" banner will
   disappear; from then on, `llmctFetch` routes requests through the
   extension.

The extension only acts on pages matching its `content_scripts.matches`
pattern in `manifest.json` — by default, `*.github.io`, `localhost`, and
`127.0.0.1`. Edit the pattern if you serve the page elsewhere.

**Privacy.** The extension requests `host_permissions: ["<all_urls>"]` so the
background service worker can call any API regardless of CORS. It does not
log, store, or transmit request contents. All traffic stays between your
browser, the page, and the endpoint you configured.

See [`extension/README.md`](extension/README.md) for the wire protocol,
permissions rationale, and limitations.

## Export format

### JSON

`Download JSON` produces a pretty-printed file:

```json
{
  "version": 1,
  "exported_at": "2026-06-30T...",
  "test_start_iso": "...",
  "test_end_iso": "...",
  "wall_time_s": 2.218,
  "concurrency_requested": 5,
  "success_count": 5,
  "total_tokens": 718,
  "aggregate_tokens_per_sec": 80.16,
  "overlap_ratio": 3.2,
  "verdict": "Concurrent — requests processed in parallel",
  "verdict_kind": "success",
  "results": [
    {
      "index": 1,
      "status": "success",
      "http_status": 200,
      "start_iso": "...",
      "end_iso": "...",
      "start_offset_s": 0.001,
      "end_offset_s": 2.218,
      "duration_s": 2.217,
      "first_chunk_offset_s": 0.404,
      "ttft_s": 0.403,
      "completion_tokens": 144,
      "tokens_per_sec": 64.97,
      "stream_status": "ok",
      "error": null
    }
  ]
}
```

### CSV

`Download CSV` produces one row per request with the columns:

```
index,status,http_status,start_iso,end_iso,start_offset_s,end_offset_s,
duration_s,first_chunk_offset_s,ttft_s,completion_tokens,tokens_per_sec,error
```

Fields containing `,`, `"`, or newline are double-quoted; inner `"` is
doubled.

## Configuration persistence

API key, endpoint, model, and provider selection are persisted in
`localStorage` under `llmct_*` keys. The theme preference uses
`llmct_theme`. Nothing else is stored — runs and exports are session-only.

## Repo layout

```
.
├── README.md            ← this file
├── CLAUDE.md            ← project notes for AI assistants (and humans)
├── index.html           ← the entire web app (HTML + inline CSS + JS)
├── extension/
│   ├── manifest.json    ← MV3 manifest
│   ├── content.js       ← injects bridge flag, relays page requests
│   ├── background.js    ← service worker; CORS-bypassed fetch relay
│   └── README.md        ← install, privacy, wire protocol
└── .gitignore
```

## Limitations

- **CORS.** Without the extension, the API must allow browser-origin
  requests. There is no client-side workaround for that — install the
  extension or proxy the request through a server you control.
- **Streaming bodies only.** The page assumes SSE-style responses. Providers
  that ignore `stream: true` or emit non-standard shapes may produce
  incomplete results; in that case the per-request `stream_status` will
  read `empty`.
- **No automated tests.** Verification is manual against real endpoints.
  The Chrome extension's streaming relay in particular should be checked
  end-to-end with a real API key after install.
- **No history.** Test runs aren't saved between page loads. Export them
  before navigating away.

## License

No license file yet. Until one is added, all rights are reserved by the
repo owner — please ask before redistributing.