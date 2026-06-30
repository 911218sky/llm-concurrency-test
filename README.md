# LLM Concurrency Test

The fastest load and concurrency tester for LLM chat-completion APIs
(inference) that lives in your browser. Fires N parallel requests from
your browser at an OpenAI-compatible or Anthropic endpoint and measures
whether the API actually processes them concurrently. Includes streaming
TTFT, live timeline, JSON/CSV export.

If the API blocks browser-origin (CORS) requests, a small companion
Chrome extension relays the requests through a background service worker
so the same-origin policy no longer applies.

- **Extension:** under `extension/` — a 4-file MV3 add-on that adds a CORS
  bypass.
- **No backend.** Your API key never leaves your browser.

## Quick start

👉 **https://0xaungkon.github.io/llm-concurrency-test/**

That's it — open the URL, paste your API key + endpoint + model, hit
**RUN TEST**.

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

## Configuring the page

The page is a single `index.html`. You can run it three ways:

- **Use the hosted copy** at the URL above — no setup required.
- **Open the file directly** in your browser (loads over `file://`).
- **Serve it locally:**
  ```bash
  python3 -m http.server 8000
  # then visit http://localhost:8000/
  ```

Once it's open, fill in:

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
`/chat/completions` or `/v1/messages` for you. Toggling between
OpenAI and Anthropic provider buttons no longer rewrites an already-resolved
endpoint, so your URL is preserved.

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

## Repo layout

```
.
├── README.md            ← this file
├── CLAUDE.md            ← project notes for AI assistants (and humans)
├── LICENSE              ← MIT license (free for commercial + personal use)
├── index.html           ← the entire web app (HTML + inline CSS + JS)
├── extension/
│   ├── manifest.json    ← MV3 manifest
│   ├── content.js       ← injects bridge flag, relays page requests
│   ├── background.js    ← service worker; CORS-bypassed fetch relay
│   └── README.md        ← install, privacy, wire protocol
└── .gitignore
```

## License

[MIT](LICENSE). Free for commercial and personal use. See
[`LICENSE`](LICENSE) for the full text.