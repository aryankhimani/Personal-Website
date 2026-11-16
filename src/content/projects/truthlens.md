---
# Sources: resume (Nov 2026, both versions).
# TODO(aryan): add a screenshot for the cover, and a repo or demo link if either is public.
title: TruthLens
folder: code
start: '2025-09'
end: present
role: Developer on a 5-person Western AI team
summary: A Chrome extension and web app that flags misinformation and explains its verdict.
result: The team raised backtest accuracy from 40% to 90%.
tags: [React, TypeScript, FastAPI, PyTorch, MongoDB]
featured: 1
---

## What it is

TruthLens checks claims for misinformation and tells you why it reached its verdict. It runs as a Chrome extension and a web app, on a FastAPI backend and a fine-tuned RoBERTa model. I build it with a five-person team at Western AI.

## What I did

- Built the first Chrome extension (Manifest V3), sending live audio and image captures to the backend.
- Built the FastAPI backend, with classification and health endpoints and a response cache, and helped write its test scripts.
- Wrote the first training and evaluation pipeline for the RoBERTa classifier, fine-tuned with LoRA adapters (Hugging Face).
- Rebuilt the web app in React and TypeScript (Vite) and added MongoDB storage, so people can look back at past checks.

## What came of it

- The team extended my pipeline into models that reach 0.74 validation macro-F1.
- Retrieval with MMR cut pipeline latency by 30%.
- Testing variations of each claim, written by an LLM, raised backtest accuracy from 40% to 90%.
