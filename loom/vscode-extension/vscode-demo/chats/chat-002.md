---
type: chat
id: ch_01KT8HW9P4CZ4H4D3E2BXCJJHF
title: vscode-demo Chat
status: active
created: 2026-06-04
version: 1
tags: []
parent_id: null
requires_load: []
---
# vscode-demo Chat

## Rafa:

To create D2 GIF there are some steps missing:
After step 2:
- Create a weave, give it a proper name
- Create a thread under the weave, give it a proper name

Step 7:
- Implement all steps, to keep GIF short enough
After step 7:
- Show final web page results


Update `loom/refs/demo-script-reference.md`

## AI:

Updated `loom/refs/demo-script-reference.md` — D2 Workflow GIF caption script. Changes:

- **Inserted scenes 3–4** after the empty tree: *New Weave → name `landing-page`* and *New Thread → name `pricing-section`*. A chat must live inside a thread, so this fixes a gap where the old script jumped from an empty tree straight to "New Chat". Added a note to use real-looking names since they stay visible in the tree for the rest of the GIF.
- **Scene 9 (was 7) — implement all steps:** changed "Do Step → code, step ✅" to "AI implements all plan steps, each marked ✅", with a note that we trigger the whole plan in one take (not one recording per step) to keep the GIF short. The steps still land one-by-one in the table, so the "step by step / you stay in control" message still holds.
- **Added scene 11 — final result:** cut to the rendered page in a browser so the GIF closes on a real working web page, not just docs.
- Renamed the heading `8-scene` → `11-scene`.

One judgment call to confirm: I kept the scene 9 caption as **"AI implements the plan, step by step — you stay in control"** rather than something like "AI implements the whole plan in one go". Rationale: even when all steps run in one take, they visibly land one-at-a-time in the plan table, and "you stay in control" is a core selling point worth keeping. Say the word if you'd rather the caption emphasize the one-click-whole-plan angle instead.