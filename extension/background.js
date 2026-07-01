// LLM Concurrency Test - Relay background service worker (MV3).
//
// host_permissions in manifest.json is "<all_urls>", which lets this SW call
// fetch() against any origin regardless of CORS. We act purely as a relay:
// we do not log, store, or modify the request/response bodies beyond what's
// required to forward them.

const PORTS = new Set(); // active chrome.runtime.Port instances

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'llmct-fetch') return;
  PORTS.add(port);

  let controller = null; // AbortController for the active fetch, if any

  port.onMessage.addListener(async (msg) => {
    if (!msg || msg.type !== 'request') return;
    const { url, method, headers, body } = msg;

    // Hardening: only allow http(s). block file://, data:, blob:, etc.
    try {
      const u = new URL(url);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        port.postMessage({ type: 'error', error: 'Disallowed protocol: ' + u.protocol });
        return;
      }
    } catch (e) {
      port.postMessage({ type: 'error', error: 'Invalid URL: ' + (e && e.message) });
      return;
    }

    controller = new AbortController();
    const fetchInit = {
      method: method || 'GET',
      headers: headers || {},
      body: body || undefined,
      signal: controller.signal,
    };

    try {
      const res = await fetch(url, fetchInit);

      // Forward status + headers.
      const headersObj = {};
      res.headers.forEach((v, k) => { headersObj[k] = v; });
      port.postMessage({
        type: 'meta',
        status: res.status,
        statusText: res.statusText,
        headers: headersObj,
      });

      // Stream the body. We send ArrayBuffer chunks; the content script
      // forwards them as transferable Uint8Arrays to the page.
      if (!res.body) {
        port.postMessage({ type: 'end' });
        return;
      }
      const reader = res.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Copy into a fresh ArrayBuffer because the reader's buffer is reused.
          const copy = new ArrayBuffer(value.byteLength);
          new Uint8Array(copy).set(value);
          // The receiver (content script) will move this buffer to the page
          // via postMessage transferable.
          port.postMessage({ type: 'chunk', data: copy }, [copy]);
        }
        port.postMessage({ type: 'end' });
      } catch (streamErr) {
        port.postMessage({ type: 'error', error: 'Stream read failed: ' + (streamErr && streamErr.message ? streamErr.message : String(streamErr)) });
      }
    } catch (err) {
      port.postMessage({
        type: 'error',
        error: (err && err.message) ? err.message : String(err),
      });
    }
  });

  port.onDisconnect.addListener(() => {
    PORTS.delete(port);
    if (controller) {
      try { controller.abort(); } catch (e) {}
    }
  });
});

// Keep the SW alive long enough to finish in-flight streams. Without this,
// Chrome may unload the SW after ~30s of inactivity, mid-stream. MV3 SWs are
// event-driven and cannot use setInterval to keep themselves alive forever,
// but a one-shot setTimeout is acceptable and will be cancelled if the SW
// unloads.
self.addEventListener('install', () => {
  // No-op; service_worker "type": "module" allows top-level await if we ever need it.
});