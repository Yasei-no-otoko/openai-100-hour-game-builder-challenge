# Vercel deployment preparation — v0.4.0

**Status: configuration and handler implemented; local HTTP/mock integration tested; no Vercel build, deployment URL, paid API request or production load test was performed.**

## Two intentionally different artifacts

`npm run build` creates `dist/NEMESIS-PACT.html` for offline distribution and `public/index.html` for a hosted site. The former has `connect-src 'none'`; the latter has `connect-src 'self'` and `window.NEMESIS_HOSTED=true`. The hosted flag permits an explicit, consented request to `/api/intelligence`. It does not enable live OpenAI mode by itself. No secret is embedded in either HTML.

Vercel is configured with no framework preset, build command `npm run build`, static output `public`, and the Node function in `api/intelligence.mjs` with a 15-second maximum duration. `package.json` requests Node 22.x. Vercel's documented framework-free Node function method exports and `.mjs` support are used [1,2]. Build/output settings follow the documented `vercel.json` properties [3].

## Local preview

```sh
npm run build
npm start
```

Open the loopback URL printed by the server. To use a phone on a trusted network, run `npm run start:lan`; the printed phone URL is a local-network address, not a public deployment. The helper exposes only `public`, rejects source/dot-file paths, and forwards `/api/intelligence` to the same handler used in the Vercel entry point.

For a mock server test, use Director lab or Negotiate terms, select **Server pilot (opt-in)**, check the data-transfer box and submit. A default server returns `provider: mock`. A local mock works without checking that box because it transmits nothing.

## Vercel mock preview

Import this project root in Vercel, use the supplied `vercel.json`, and initially leave `AI_MODE` unset or set it to `mock`. No API key or pilot token is needed for mock replies. Confirm the deployment's Node setting and build/output directory. After deployment, verify all assets load from the same origin and POST to `/api/intelligence` returns a mock.

The provided configuration is deployable in design, but real platform execution has not been verified here. Do not present a guessed `.vercel.app` URL as an existing site. This build was not pushed to a remote repository during this task.

## Private live pilot

Only after creating a controlled preview and explicitly choosing to make paid API calls, configure server-side environment values:

| Variable | Meaning |
| --- | --- |
| `AI_MODE` | `live` enables the private provider path |
| `OPENAI_API_KEY` | Secret server-side project key; never public/client-prefixed |
| `OPENAI_MODEL` | Model supporting the used Responses/Structured Outputs interface |
| `ALLOWED_ORIGIN` | Exact preview/production HTTPS origin, without trailing slash |
| `PILOT_ACCESS_TOKEN` | Cryptographically random private token, at least 24 bytes |

`.env.example` contains blanks, not credentials. For a local environment file, use `node --env-file=.env.local tools/serve.js` on Node 22 and set `ALLOWED_ORIGIN` to the exact local origin. That local live test would make real provider requests; it has not been run for this delivery. Do not commit `.env.local`, and do not serve the project root with a generic server.

The browser supplies only the pilot token, not the provider key. The handler validates origin/token, request size, catalog IDs and the returned decision. Invalid live replies use the local fallback. Complete schema validation does not establish model prose quality.

## Before public live release

A shared pilot token and in-memory rate limit are insufficient for public paid traffic. Add real user authentication, durable per-user quotas, a durable global spend limit, production access control, telemetry redaction, incident alerts, and load/concurrency tests. Scope credentials to the minimum necessary project. Establish a retention/consent policy for the prompt and counters before collecting them at scale.

Gameplay is client-authoritative and scores are local. There is no competitive anti-cheat, verified leaderboard, cloud save, billing service or multiplayer protocol in this build.

## WebGPU and devices

The runtime tries WebGPU in a supported secure context and falls back to WebGL2, then the existing Canvas path. A plain LAN HTTP preview is useful for the game but is not a representative WebGPU secure-origin test. Native WebGPU, Safari and physical iPhone/Android testing remain release gates. Compute implementation in the source does not prove driver compatibility or a frame-rate target.

## Primary references

[1] Vercel Node.js runtime: https://vercel.com/docs/functions/runtimes/node-js

[2] Vercel runtime configuration / framework-free `.mjs`: https://vercel.com/docs/functions/configuring-functions/runtime

[3] Vercel static project configuration: https://vercel.com/docs/project-configuration/vercel-json

[4] OpenAI Structured Outputs: https://developers.openai.com/api/docs/guides/structured-outputs

Checked 2026-09-12. Runtime/interface choices follow these primary references; platform deployment itself is unverified.
