# Utility command parity

Status: resolved

## Requirements

- Color: restore the original slash option `color`, named colors, RGB triples, decimal and explicit hexadecimal input; accept zero/black. Expand #abc; bare numeric input is decimal. Return the original Hex/RGB/Integer embed and attached 300x300 color.png swatch. Investigate the reported failure rather than assuming one cause; account for stale Discord registration.
- Math: restore original evaluator functionality, unrounded result formatting, code blocks, and result.txt fallback above the original 1015-character threshold. No natural-language/Unicode normalization from the old message handler.
- Coin and Eight Ball: restore bundled image attachments and the original answer set.
- Stats: restore Statistics embed, thumbnail and applicable runtime fields with accurate current version/dependency/usage values.
- Ping: preserve embed presentation using honest HTTP/API latency; no Gateway heartbeat.
- Dad Joke: preserve original successful text output and retain useful provider-failure explanations.
- Compare shared original Embed defaults as well as command-local formatting. Invalid inputs may use clearer messages; preserve appropriate ephemeral error behavior.

## Acceptance

Compare public Discord command inputs, successful payloads and interaction behavior against the original source and the confirmed [parity spec](../spec.md). Preserve explicitly agreed v7 exceptions. Record any unavoidable upstream limitation.

## Implementation result

Restored Color parsing/embed/PNG; original Math evaluator with code-block/file results and bounded workers; original Coin/Eight Ball image files; runtime Statistics and HTTP Ping embeds. Signed HTTP tests observed failures before implementation and now pass. Runtime dependencies and assets are packaged in the Docker image.

Validation: 96 server tests, workspace build/typecheck, isolated Docker build/boot and diff whitespace checks passed.
