# LLM Concurrency Test

Measure whether an OpenAI-compatible or Anthropic-compatible chat API really
processes concurrent requests. The browser sends N parallel requests and
shows streaming time to first token (TTFT), a live request timeline, an
overlap-ratio verdict, and JSON/CSV exports.

**Hosted app:** <https://0xaungkon.github.io/llm-concurrency-test/>

There is no application backend. Your API key stays in the browser unless you
choose the local Docker relay for an endpoint that blocks browser CORS.

## Choose a way to run it

### Hosted app

Open the hosted app, enter the API key, endpoint, model, and concurrency, then
select **RUN TEST**. No installation is required.

### Docker Compose: pull the published image

Docker Compose is the recommended local relay setup. This repository includes
`compose.yaml`, which points at the public GHCR image and sets
`pull_policy: always`, so `docker compose up` checks for the latest image by
default:

```bash
docker compose up -d
```

Open <http://127.0.0.1:8777/> after the container starts. Stop it with:

```bash
docker compose down
```

To see startup and relay logs:

```bash
docker compose logs -f
```

The published image is:
`ghcr.io/911218sky/llm-concurrency-test:latest`.

### Docker: run the published image directly

```bash
docker run --rm -p 127.0.0.1:8777:8777 \
  ghcr.io/911218sky/llm-concurrency-test:latest
```

### Build locally

Use this when developing the relay or when you do not want to use GHCR:

```bash
docker build -t llm-concurrency-test .
docker run --rm -p 127.0.0.1:8777:8777 llm-concurrency-test
```

### Run without Docker

The page itself is a single `index.html`. Open it directly, or serve the
repository with Python:

```bash
python3 -m http.server 8000
```

Then visit <http://127.0.0.1:8000/>. This mode does not enable the local relay.

## Configure a test

Enter the following values in the page:

| Field | Example |
| --- | --- |
| API key | `sk-...` or your provider's key |
| Endpoint URL | `https://api.openai.com/v1` |
| Model | `gpt-4o-mini` or `claude-haiku-4-5` |
| Concurrency | `5` to start |
| Max tokens | `200` |
| Timeout | `60` seconds |

The endpoint is resolved when the field loses focus. Paste either a provider
base URL or a complete chat endpoint. Use **Fetch models** to load
`/v1/models`; the model field remains editable for custom model names.

Start with the light preset to verify connectivity, then use the heavy preset
for a larger run. The result includes per-request timing, TTFT, a live
timeline, and an overlap-ratio label:

- **Concurrent:** requests substantially overlap.
- **Partial:** some overlap is present, but less than requested.
- **Sequential:** requests mostly wait for one another.

Export a run as JSON or CSV, or copy its JSON summary. Test history is not
stored; only the current API key and configuration may be kept in browser
`localStorage`.

## When the API blocks CORS

Browser-origin requests can fail even when the API works from `curl`. Use the
Docker Compose setup above, then open the page from
<http://127.0.0.1:8777/>. The local server serves the page and relays requests
through `/_llmct/proxy`, so the API endpoint sees a local server request rather
than a browser-origin request.

The bundled Chrome MV3 extension is an alternative when you want to keep using
the hosted page:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this repository's `extension/` folder.
4. Reload the hosted page.

The extension does not log, store, or transmit request contents. It requires
`<all_urls>` host permission so it can relay to any endpoint you configure.
See [`extension/README.md`](extension/README.md) for the protocol and the full
permissions rationale.

## Repository layout

```text
.
├── index.html             # Browser application
├── server.py              # Local static server and API relay
├── Dockerfile             # Local relay image
├── requirements.txt       # Runtime dependency for UA generation
├── compose.yaml           # GHCR Compose deployment
├── extension/             # Optional Chrome CORS relay
├── CLAUDE.md              # Project notes
└── LICENSE                # MIT license
```

Every push to `main` builds and publishes the Docker image through GitHub
Actions. The image is intended for local use and binds to loopback by default
in the provided Compose and `docker run` examples.

## License

[MIT](LICENSE). Free for commercial and personal use.
