# Game behavior and presentation parity

Status: resolved

## Requirements

- Connect Four and Tic Tac Toe: restore solo bot opponents/AI, randomized first player, original game controls and win/draw presentation.
- Connect Four: restore Forfeit and original turn-timeout/auto-move behavior.
- Hangman: restore random dictionary words, seven incorrect-letter allowance, whole-word guesses with original loss semantics, Stop/Cancel Guess, gallows/final embeds and timeout behavior.
- Implement interaction transport with HTTP components/modals and persistent sessions. Do not restore message listeners or Gateway.
- Verify participant authorization, completed/expired-session behavior and restart persistence alongside restored gameplay.

## Acceptance

Compare public Discord command inputs, successful payloads and interaction behavior against the original source and the confirmed [parity spec](../spec.md). Preserve explicitly agreed v7 exceptions. Record any unavoidable upstream limitation.

## Implementation result

Restored bot AI opponents, randomized first players, first-piece symbols, Forfeit, random-word Hangman with seven wrong letters/whole-word loss/Stop, gallows and final embeds. Modal Cancel supplies Cancel Guess. Persistent deadlines drive automatic Connect Four moves and other game timeouts across restart; signed HTTP/PostgreSQL tests pass.

Validation: 96 server tests, workspace build/typecheck, isolated Docker build/boot and diff whitespace checks passed.
