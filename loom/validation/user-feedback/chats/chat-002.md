---
type: chat
id: ch_01KWRT0D4NG6MKYMHTG06Z7SR7
title: user-feedback Chat 002
status: done
created: 2026-07-05
version: 1
tags: []
parent_id: null
requires_load: []
last_ai_block: 9
---
# user-feedback Chat 002

## Rafa:

Do you recommend I enable GitHub `Discussions` in loom repo?
Suggestions?

## AI:

My honest recommendation: **not yet.** Keep everything funneling to Issues.

Here's the reasoning, since this sits right on top of the feedback thread we just shipped.

**The case against enabling it now**
- **Empty surfaces read as "dead project."** With ~4.3K installs and zero feedback so far, a Discussions tab with 0 threads is worse than no tab — a visitor sizing up whether Loom is alive sees an abandoned forum. An Issues tab with a couple of real items reads healthier than two empty tabs.
- **You just built a single funnel — don't split it.** `feedback.yml` points at `issues/new`. The whole design bet of the user-feedback thread was *one* low-friction path landing in *one* place. Discussions would be a second destination competing with it, and the first open-ended "is anyone here?" question is exactly the signal you most want *in Issues* where you're already watching.
- **Moderation/attention cost with no payoff yet.** Discussions is a surface you're implicitly promising to tend. At zero traffic that's pure downside — one more inbox that's silent.

**When it flips to worth-it**
Enable it the moment Issues starts getting *non-bug* traffic — "how do I…", "here's how I'm using it", show-and-tell. That's the signal Discussions is actually good at (Q&A + community), and by then it won't be empty on arrival. GitHub lets you convert an issue → discussion, so you lose nothing by waiting: the first stray question becomes your seed thread.

**If you enable it anyway** (it *is* cheap, and I get the "build the front door before the guests arrive" instinct):
- Turn on **only the Q&A + Announcements** categories, delete the rest. Fewer empty buckets.
- Seed it with 1–2 real posts (a short "What is Loom / roadmap" announcement) so it's never a 0-thread tab.
- Leave `feedback.yml` pointed at Issues regardless — structured feedback belongs in Issues; Discussions is for open-ended conversation, not the feedback form.

**Net:** the thing actually starving Loom is *any* first datapoint, not a lack of places to leave one. Discussions doesn't attack that — the in-tool feedback path does. I'd spend the energy on making sure that path is discoverable (the status-bar item, a line in the README/marketplace listing) before opening a second empty room. Ship the funnel, watch Issues, enable Discussions the week it would open non-empty.

**Next:** waiting for direction — happy to draft that README/marketplace "Send feedback" line if you want the funnel more discoverable, or to note this decision in the thread.

## Rafa:

draft a README/marketplace "Send feedback" line
any this will need to wait for next release

## AI:

First, a correction so we don't double up: both READMEs **already** have a factual "Send feedback" blurb — the VS Code/marketplace one has a `### Send feedback` subsection (down under the LOOM panel), and the root README mentions it inline plus `loom feedback` in Quick Start. Those are *reference* text, buried below the fold. What's actually missing — and what I meant by "make the funnel more discoverable" — is a short, **invitational** line **above the fold**, where a marketplace visitor actually sees it. So this is an *add near the top*, not a rewrite of the existing section.

**Placement:** right after the `📚 Guides:` line (vscode README ~line 17, root README ~line 10) — the first thing after the badges, before "Why Loom".

Two drafts, pick the voice:

**A — tight, matches the existing factual tone:**
> 💬 **Using Loom? Tell me how it's going.** One click on the **Feedback** item in the status bar — or `loom feedback` — opens a prefilled GitHub issue (version + OS + usage counts, editable, nothing sent automatically). Even a one-line "this worked / this didn't" genuinely shapes what gets built next.

**B — warmer, leans into the honest solo-project angle (my pick for the marketplace listing):**
> 💬 **Feedback wanted — Loom is early and looking for its first real users.** If you tried it, I want to know what worked and what got in the way. Hit the **Feedback** button in the status bar or run `loom feedback`; it opens a prefilled GitHub issue you edit before sending. Opt-in, nothing sent automatically.

I lean **B for the VS Code/marketplace README** (that's the highest-traffic surface and the honest "early, want your input" framing tends to convert better than a neutral feature note) and **A for the root README** (GitHub visitors are more often here for the tech — keep it crisp).

Two small notes:
- Whichever you pick, I'd **leave the existing `### Send feedback` reference sections as-is** — the top line is the hook, the section is the detail. Don't want the same paragraph twice.
- This is a docs-only change and, as you said, rides the next release (READMEs publish with the extension). No file edits from me yet — say the word and I'll wire the chosen copy into both READMEs when you're cutting the next release.

**Next:** waiting on your pick (A/B, or a blend) — then I'll hold it until release time, or apply it now to both READMEs if you'd rather have it staged in the working tree.

## Rafa:

I think Loom is not early now, I am already using it fo Chord Flow and I consider it a mature, helpful tool, proven by resulls, no subjetive opinion. The problem, no feedback.
Maybe too high learning curve (even being visual), not for simple projects, whatever...

I made little reword, fix anything or push me other direction (I am Spanish)

> 💬 **Feedback appreciated — Using Loom? Tell me how it's going, I am looking how to improve it.** I would like to know what worked and what got in the way. Hit the **Feedback** button in the status bar or run `loom feedback`; it opens a prefilled GitHub issue you edit before sending. Opt-in, nothing sent automatically.

When draft is closed, update the docs. 
I would like this uploaded, but need a release. What do you think?

## AI:

You're right, and I'll drop the "early" framing — it was wrong. A tool proven by results on a real second project (ChordFlow) isn't early; the gap is signal, not maturity. Your instinct to reword is correct: a CTA should *invite*, not argue about how mature the tool is. Good call.

**Polished English (your version, only grammar fixed):**
> 💬 **Feedback appreciated.** Using Loom? Tell me how it's going — I'm always looking for ways to improve it. I'd like to know what worked and what got in the way. Click the **Feedback** button in the status bar or run `loom feedback`; it opens a prefilled GitHub issue you edit before sending. Opt-in, nothing sent automatically.

What I changed and why:
- **"I am looking how to improve it" → "I'm always looking for ways to improve it"** — the original isn't grammatical in English (`looking how to` → `looking for ways to`); "always" adds a bit of warmth.
- **Split the long bold run-on** — you had three clauses crammed into the bold header. Bolding just "Feedback appreciated." makes it scan as a heading; the rest reads as normal sentence.
- **"I would like" → "I'd like"** — lighter, less formal, fits a friendly ask.
- **"Hit" → "Click"** — both are fine; "Click" is a touch more neutral/universal for a docs line. Keep "Hit" if you prefer the casual tone, it's not wrong.

Everything else is your wording — I didn't push it further because it already says the right thing.

On the "why no feedback" theories (learning curve, not-for-simple-projects) — probably true, but that's a *separate* question from this line. The CTA's only job is to lower the friction of the one person who *does* want to say something. Diagnosing the curve is a later thread; don't let it hold up shipping the ask.

**On the release question — the important distinction:**
There are two READMEs and they publish differently:
- **Root `README.md` (GitHub):** renders from `main` **immediately** on push. **No release needed** — you can have this live today.
- **`packages/vscode/README.md` (Marketplace + Open VSX listing):** snapshotted at **publish time**. Only a new extension version pushes the updated listing. This one *does* need a release.

So my recommendation:
1. **Push the root README line now** (free, instant) — that's the GitHub front door working immediately.
2. **For the marketplace listing:** I would **not cut a release *only* for this line.** But — feedback is the project's #1 risk, and this CTA is the single discoverability lever for it. So: if a release is coming reasonably soon anyway, **bundle it**. If nothing is planned for weeks, a **tiny docs-only patch** (bump, this README line + any small pending fixes) is justified *specifically because* what it ships attacks the north-star risk. Not worth a release for a typo; worth one for "the thing that might finally get us a datapoint."

My honest lean: bundle into the next release rather than force one now, **unless** you have nothing queued and don't expect to for a while — then patch it out.

Say `close` when you're happy with the line and I'll update the docs (both READMEs, your final wording).

**Next:** waiting on `close` + your final wording. On close I'll apply the line to both READMEs (marketplace version prominent above the fold, root README crisp) and leave the release timing to your call.

## Rafa:

I like your wording, update the docs.
I have no more pending stuff for loom, this had been a difficult project (even recursive), take my time, effort & money for trying to help people and...

I will only do fixes/tweaks for myself while dogfooding it in Chord Flow

I won't do these next threads unless I receive some feedback, they do not add any value
loom/core-engine/clean-legacy-read/idea.md
loom/core-engine/layer-imports-guard/idea.md 

So maybe I am consider a tiny do-release 1.17.1 as last intent to get some feedback, agree?

## AI:

Done — the line is in both READMEs, above the fold, right after the Guides links (root `README.md` and `packages/vscode/README.md`), your final wording. Not committed yet; it's staged in the working tree for whenever you cut the release.

On the bigger thing you said — I'll be straight with you, not cheer-lead. Stepping back to *only fixes-while-dogfooding* is a **rational** call, not a defeat. You've already got the thing that matters: a mature tool proving itself on a real, unrelated project. Building more features into a tool with zero external signal is the exact "building in the dark" trap the whole `validation` weave exists to avoid. Pausing `clean-legacy-read` and `layer-imports-guard` until feedback justifies them is *correct* — they're internal-quality threads, invisible to a user, zero validation value. Don't build them on spec.

**On 1.17.1 — yes, agree, with a clear-eyed frame:**
- It's the right move *mechanically*: the marketplace listing only updates on publish, so this is the only way the CTA reaches the 4.3K install surface. Cheap, docs-only, directly serves the one goal. If you're going to make a "last intent," this is the correct shape of it.
- But calibrate the expectation honestly: **a README line is a modest lever.** Zero feedback from thousands of installs usually isn't only a discoverability problem — it's that people install, hit the learning curve (your own theory, and a fair one), bounce, and never had a reason to write back. A CTA converts the *willing minority* who had something to say and didn't know where. It won't manufacture signal that isn't there. So ship it as "I closed the last easy gap," not "this will break the dam."
- If this really is the last push, I'd make the single try count: the CTA (done), plus a sanity check that the **Feedback status-bar button is actually visible and obvious** in a fresh install — the in-tool button reaches people who'd never scroll a README. That's the higher-leverage half of the same idea. Worth 10 minutes before you tag.

So: **agree on 1.17.1.** Run `/do-release 1.17.1` when you're ready — I won't trigger it. Want me to first verify the feedback button's visibility in a clean install so the release is the best version of this last attempt? Your call.

For what it's worth: recursive, self-funded, and genuinely useful-to-you is already more than most side projects reach. Winding active development down to dogfooding while you wait for the world to respond is a sound, honest place to leave it.

**Next:** waiting on your go for the release (and whether you want the feedback-button visibility check first). Say `close` if you want this chat wrapped.

## Rafa:

commit, push
i push myself back about release, no need, wait
i will see you in chord flow, this project is paused for now
thanks!!!

## AI:

Understood on all three: no release — waiting, both README CTAs committed and pushed as docs (they'll ride whenever a release next happens, or stay live on GitHub immediately), and Loom paused.

For the record so future-you (or future-me) picks it up cleanly: **Loom is paused as of 2026-07-05** — mature and results-proven on chord-flow, the only open gap is external feedback. Active feature work is stopped; only dogfood-driven fixes continue. `clean-legacy-read` and `layer-imports-guard` stay unstarted until feedback justifies them. A tiny v1.17.1 feedback-CTA release is drafted-but-deferred; the README lines are already in `main`.

Thanks, Rafa — this was a good one to build. See you in chord-flow. 👋