# Reuse comicgeeks for League of Comic Geeks retrieval

Status: resolved.

## Scope

Use comicgeeks 1.2.0 for `/locg`, `/pull`, `/pull-user`, and manual/scheduled Release Lists. Retain Robotman formatting, date handling, permissions and delivery. Remove duplicate scraping code.

## Verification

97 server tests passed, including the actual package parser at the mocked Impit transport boundary, signed command payloads and PostgreSQL-backed release delivery. Workspace build/typecheck and whitespace checks passed. The production Alpine Docker build/boot test also passed, verifying that comicgeeks and the native Impit transport load successfully.
