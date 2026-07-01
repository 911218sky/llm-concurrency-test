# LLM Concurrency Test - Relay

A small Chrome extension that lets the [LLM Concurrency Test](../index.html)
web page reach LLM APIs that don't allow browser-origin (CORS) requests.

The extension is **inert on any page that does not opt in**. It only acts when
the page sends a `window.postMessage({ type: 'llmct:fetch', ... })` — which
only `index.html` does.

## What it does

When installed and active on a matching page, the extension's content script
sets `window.__llmctExtensionBridge = true`. The page detects this and, instead
of calling `fetch()` directly, relays every API request through the
extension's background service worker. Because the background has
`host_permissions: ["<all_urls>"]`, it can call `fetch()` against any origin
without CORS blocking the response.

Streaming (SSE) is preserved end-to-end, so the page's live timeline and
time-to-first-token measurement continue to work.

## Install (load unpacked)

1. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`, etc.).
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this `extension/` folder.
4. The extension's ID appears under its card. You don't need to copy it.

The extension's content script matches `*://*.github.io/*`,
`localhost`, and `127.0.0.1` by default. If you deploy the page somewhere
else, edit `matches` in `manifest.json` and reload the extension.

## Permissions, briefly

- **`scripting`** — required to inject the content script.
- **`host_permissions: <all_urls>`** — the background service worker makes the
  actual `fetch()` calls. Without this, the browser would still apply CORS
  to those calls and the extension would be useless.
- **No `tabs`, `storage`, `webRequest`, `cookies`, `history`, etc.** The
  extension does not read or store anything.

The extension does **not** log request URLs, headers, or bodies, and does
**not** phone home. All traffic stays between your browser, the page, and
the API endpoint you configured.

## Wire protocol (for the curious)

```
page → content (postMessage)
  { type: 'llmct:fetch', id, url, method, headers, body }

content → background (chrome.runtime.connect, name: 'llmct-fetch')
  { type: 'request', url, method, headers, body }

background → content → page
  { type: 'meta',  status, statusText, headers }
  { type: 'chunk', data: ArrayBuffer }   (zero or more, transferable)
  { type: 'end' }
  { type: 'error', error: string }       (on any failure)
```

The page builds a `ReadableStream` from the chunks and returns a `Response`
to `callOnce`, which streams it via `getReader()` exactly as it would a
normal `fetch()` body.

## Files

- `manifest.json` — MV3 manifest. Edit `content_scripts[0].matches` if you
  serve the page from a domain other than github.io.
- `content.js` — runs at `document_start` on matching pages, sets the bridge
  flag, forwards page requests to the background.
- `background.js` — service worker. Calls `fetch()`, streams the response
  back through the port.

## Limitations

- The relay only forwards `string` request bodies. If you ever need to send a
  `Blob` or `FormData`, the page will fall back to plain `fetch()` (and CORS
  will apply).
- The extension does not retry or cache. Errors from the API are surfaced to
  the page unchanged.
- Background service workers can be unloaded by Chrome between requests. The
  first request after a long idle period may take a few extra hundred ms to
  wake the worker. This is normal.