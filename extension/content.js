// LLM Concurrency Test - Relay content script.
// Runs at document_start on the configured match patterns.
//
// Responsibilities:
//   1. Set window.__llmctExtensionBridge = true so the page can detect the relay.
//   2. Forward fetch() requests from the page (via window.postMessage) to the
//      background service worker (via chrome.runtime.connect).
//   3. Stream the response (status, headers, body chunks) back to the page.
//
// The page-side shim in index.html builds a ReadableStream from the chunks we
// forward, so callOnce's existing SSE parsing logic works unchanged.

(() => {
  if (window.__llmctExtensionBridge) return; // idempotent

  try {
    Object.defineProperty(window, '__llmctExtensionBridge', {
      value: true,
      writable: false,
      configurable: false,
    });
  } catch (e) {
    // Fallback for environments that don't allow redefinition.
    window.__llmctExtensionBridge = true;
  }

  const PAGE_ORIGIN = window.location.origin;

  window.addEventListener('message', (e) => {
    // Reject messages from any source other than this page.
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.type !== 'llmct:fetch') return;

    const { id, url, method, headers, body } = d;

    let port;
    try {
      port = chrome.runtime.connect({ name: 'llmct-fetch' });
    } catch (err) {
      window.postMessage({
        type: 'llmct:fetch:error',
        id,
        error: 'Failed to open relay port: ' + (err && err.message ? err.message : String(err)),
      }, PAGE_ORIGIN);
      return;
    }

    port.onMessage.addListener((msg) => {
      if (msg.type === 'meta') {
        window.postMessage({
          type: 'llmct:fetch:meta',
          id,
          status: msg.status,
          statusText: msg.statusText,
          headers: msg.headers,
        }, PAGE_ORIGIN);
      } else if (msg.type === 'chunk') {
        // msg.data is an ArrayBuffer (transferred from the SW).
        const u8 = new Uint8Array(msg.data);
        window.postMessage({
          type: 'llmct:fetch:chunk',
          id,
          chunk: u8,
        }, PAGE_ORIGIN, [u8.buffer]);
      } else if (msg.type === 'end') {
        window.postMessage({ type: 'llmct:fetch:end', id }, PAGE_ORIGIN);
        try { port.disconnect(); } catch (e) {}
      } else if (msg.type === 'error') {
        window.postMessage({ type: 'llmct:fetch:error', id, error: msg.error }, PAGE_ORIGIN);
        try { port.disconnect(); } catch (e) {}
      }
    });

    port.onDisconnect.addListener(() => {
      const err = chrome.runtime.lastError;
      window.postMessage({
        type: 'llmct:fetch:error',
        id,
        error: (err && err.message) ? err.message : 'Relay disconnected',
      }, PAGE_ORIGIN);
    });

    // Body arrives as a string or null. The page only sends strings for now
    // (it short-circuits to plain fetch() for Blob/FormData payloads).
    port.postMessage({ type: 'request', url, method, headers, body });
  });
})();