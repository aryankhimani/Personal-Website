---
# Sources: resume (Nov 2026, both versions).
# TODO: add a screenshot for the cover, and the demo link once it's live.
title: TruthLens
folder: ai-ml
alsoIn: [software]
start: '2025-09'
end: present
role: "Developer on a 5-person Western AI team"
seoTitle: "TruthLens, AI misinformation detection"
summary: "I built the backend, training pipeline and Chrome extension for an AI that flags misinformation as you browse."
result: "Team models reached 0.74 macro-F1, and backtest accuracy went from 40% to 90%."
cover: ../../assets/blueprints/truthlens.svg
coverAlt: "Blueprint drawing of how TruthLens works: a browser extension sends a claim to a FastAPI backend and a fine-tuned RoBERTa model, which returns a verdict and its reasons"
tags: [Python, PyTorch, Hugging Face, LoRA, FastAPI, React, TypeScript, MongoDB]
featured: 1
links:
  - label: Code
    href: https://github.com/Western-Artificial-Intelligence/explainable-misinfo-ai
---

## What I built

- The FastAPI backend, from scratch: classification, document Q&A, history, audio and image endpoints, plus the MongoDB layer that stores every analysis. I also set up the pre-commit checks (Black, Ruff, isort).
- The training and evaluation pipeline for a RoBERTa classifier, with LoRA adapters and a domain-adversarial head (gradient reversal) so it holds up across news sources. Runs are config-driven, with checkpoints, resume, early stopping and calibration checks.
- The Chrome extension (Manifest V3, about 1,100 lines of JavaScript). Right-click any text to check it, or scan a whole page and tag each block REAL or FAKE, even on live feeds.
- The React + TypeScript web app with saved history, pair programming with teammates.

## What came of it

- Team models built on my pipeline reached 0.74 macro-F1.
- As a team, we cut pipeline latency by 30% and raised backtest accuracy from 40% to 90%.

## What it is

You point TruthLens at a claim and it tells you whether to trust it. It's an open-source project from a five-person team at Western AI, and we're still building it.
