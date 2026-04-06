<img width="2906" height="618" alt="Shot Dia175026" src="https://github.com/user-attachments/assets/5d9e114c-061b-45b2-a259-2b4a32135616" />




# OWN Audio

Audio-to-knowledge pipeline. Record or import audio, extract structured summaries, generate mind maps, and query content through a context-aware AI tutor. Recordings stored locally on-device.

(https://github.com/user-attachments/assets/51cada1b-fd8c-4dde-bda9-475f0fcf7a10)

---

## Features

- **Audio capture & import** — Record directly or import existing audio files
- **Transcription & summarization** — Gemini-powered transcription with structured summary generation
- **Mind map generation** — Visual knowledge graphs derived from audio content
- **Contextual Q&A** — AI tutor grounded in source audio — no hallucinated answers
- **Local-first storage** — All recordings persist in local device storage

---

## Architecture

```
Audio Input (record / import)
        ↓
  Local Storage (on-device)
        ↓
  Gemini API (transcription + processing)
        ↓
  Structured Summary ──→ Mind Map Generator
        ↓
  Context-Aware Q&A
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Client | React Native, TypeScript |
| Audio Processing | Gemini API |
| AI/NLP | Gemini API — transcription, summarization, entity extraction |
| Storage | Local device filesystem |

---

## Motivation

Students spend hours scrubbing through lecture recordings to locate specific information. OWN Audio makes audio content searchable and structured while keeping recordings stored on the user's device.

---


## Status

In production. Active user base at Millat Umidi School, Tashkent.

---

[Komron Keldiyorov](https://github.com/own-k)
