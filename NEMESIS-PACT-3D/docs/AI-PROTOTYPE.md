# Intelligence prototype contract — v0.4.0

## Product boundary

An enemy should appear to negotiate, but the outcome must be an inspectable rule rather than an unverifiable promise. The player types a request, sees a short response plus authoritative benefit/price labels, and explicitly approves. The response may select **only a currently offered contract ID**. Combat continues locally; neither provider is consulted per frame.

The local provider matches English keywords and authored templates. It can be exercised with no credentials. The server mock uses that same deterministic provider. These modes are always labeled as mocks. They demonstrate interaction, validation and mechanical consequences, not model quality.

## Protocol

`POST /api/intelligence`, JSON body (4,096 bytes maximum):

```json
{
  "task": "negotiate",
  "prompt": "Let me return your attacks.",
  "seed": "ASCENT-01",
  "stage": 0,
  "allowed": ["mercy", "mirror", "glass"],
  "telemetry": {"kills": 12, "parries": 8, "grazes": 20, "damageTaken": 1, "seconds": 60, "score": 3000}
}
```

Only tasks `negotiate`, `director`, `debrief` exist. Input length, known fields, finite numeric counters, sector index and allowed IDs are checked. Data transfer consists of the text, seed, sector, catalog IDs and those six counters. No image, microphone, camera, email or account profile is read. The UI requires an additional consent checkbox before server mode.

The decision has exactly five fields: `task`, `contractId`, `directorId`, `line`, `rationale`. Contract and director IDs are enums. Text is length-limited and rendered with `textContent`, never interpreted as code or HTML. The server uses Responses API `text.format` with `type: json_schema`, `strict: true`, required fields and `additionalProperties: false` [1]. The browser validates the result again before offering acceptance.

A schema does not prove that prose is truthful or that a model resisted every prompt injection. Accordingly, model-written prose is not the source of mechanical numbers. Local catalog labels and modifiers remain authoritative. Semantic reliability of live responses has not yet been evaluated.

## Implemented mechanical effects

Negotiation selects one of the existing seven signed pacts. It cannot invent a new damage multiplier or an uncapped benefit. Canceling, requesting another answer, changing the world/sector or leaving the screen does not sign the pact. Acceptance invokes the local simulation's actual sign operation.

Director selects `balanced`, `pursuit` or `crossfire`. The local template generator, not model-written code, chooses enemies/arrival spacing. Ordinary waves are capped at 36 planned spawns and at least 1.05 seconds between arrivals. Harriers have readable hold windows so automatic aim can catch them. The current director does not modify boss attack controllers or create new maps.

Debrief is descriptive. It never changes rewards, score, upgrades, achievements or the run result.

## Server modes

`AI_MODE=mock` is the default even when no environment variables exist. No paid provider is called.

`AI_MODE=live` requires all five live environment values. Requests must come from the exact `ALLOWED_ORIGIN` and carry a matching private bearer token of at least 24 bytes. The UI accepts the **private pilot access token**, never the OpenAI API key; it keeps the token only in memory and clears it on leaving/applying the decision. Do not put the OpenAI key into the game or its source.

The live handler makes one request to the fixed OpenAI Responses endpoint. There is no arbitrary URL/model supplied by the client, no retry loop, a 500-output-token cap, and an eight-second upstream timeout. `store:false` is sent; this is not a claim of zero provider retention. The client timeout is ten seconds. Provider errors, refusals, incomplete replies or invalid output yield a clearly labeled local fallback. Missing live configuration/authentication is rejected before any provider request.

The included 12-requests/minute limit is **per warm server instance** and shared by the private pilot. Scaling/restarts reset or multiply it. It must be replaced/augmented with durable user quotas and a global spend circuit breaker before public live access. Origin checking and a shared pilot token are not general user authentication.

## Verification and next gate

The transport tests inject a fake fetch implementation. They cover valid structured output, invalid output fallback, missing credentials, wrong origin/token, rejected methods/content types, unknown fields, size limits, and the per-instance brake. This is not a live OpenAI evaluation.

Before enabling a paid pilot, exercise benign, ambiguous and adversarial prompts against the configured model; inspect whether prose agrees with the catalog, record latency and cost, verify cancel/fallback behavior, and define a maximum session budget. Public operation additionally needs durable auth/quota, consent/retention review and production observability that redacts prompts and secrets.

## Primary references checked for implementation

[1] OpenAI, Structured model outputs: https://developers.openai.com/api/docs/guides/structured-outputs

[2] OpenAI, GPT-4.1 mini model reference (example configured model; no live benchmark performed): https://developers.openai.com/api/docs/models/gpt-4.1-mini

Retrieved 2026-09-12. The model is server-configurable; the demo does not assume an account has access to it.
