# PRD.md — Dugout AI WebApp

## Overview

Dugout AI is a real-time AI-powered cricket workflow web application built for IPL fans.

The platform visualizes how multiple AI agents react to live IPL match events using a Trello/Jira-style Kanban workflow board.

Using live cricket match data, the system automatically detects important gameplay events and triggers specialized AI agents that generate Hinglish cricket content in real-time.

The application focuses on:

* AI orchestration
* real-time workflows
* live IPL engagement
* event-driven AI automation

---

# Problem Statement

## AI Agent Workflow Board

Build a Trello/Jira-style Kanban dashboard that visualizes and manages the automated workflow of four specialized AI agents reacting to live IPL match events.

---

# Core Concept

The web app acts like:

> an AI-powered IPL social media war room.

Instead of manually asking AI for outputs, the system automatically reacts to live match events and visualizes AI task execution in real-time.

---

# Objective

Create a web application where:

* live IPL events trigger AI workflows
* multiple AI agents generate unique reactions
* tasks dynamically move across workflow states:

  * TODO
  * PROCESSING
  * POSTED

---

# AI Agents

## 1. Meme Agent

Generates:

* cricket memes
* banter
* savage reactions

Tone:

* funny
* chaotic
* Hinglish
* Twitter meme energy

Example:

> "MI ka middle order toh loading screen pe hi reh gaya 💀"

---

## 2. Prediction Agent

Generates:

* live match predictions
* momentum analysis
* pressure insights

Tone:

* confident
* analyst-style
* dramatic

Example:

> "Agar next over mein wicket nahi gira toh KKR game pull kar lega."

---

## 3. Stats Agent

Generates:

* player milestones
* match analytics
* contextual stats

Tone:

* informative
* smart but casual

Example:

> "Russell ka death overs strike rate iss season 220+ hai."

---

## 4. Hype Agent

Generates:

* fan celebrations
* emotional reactions
* stadium-style hype

Tone:

* energetic
* emotional
* fan-first

Example:

> "EDEN GARDENS PURE CHAOS MODE MEIN 🔥"

---

# Workflow System

Each AI task dynamically moves through:

## TODO

Task created after a detected match event.

## PROCESSING

Gemini is generating AI output.

## POSTED

AI response successfully generated and displayed.

---

# Live Match Integration

The system fetches live IPL data using:

* [CricketData.org](https://cricketdata.org/?utm_source=chatgpt.com)
  or equivalent cricket APIs.

Polling frequency:

* every 20 seconds

Reason:

* safe free-tier API usage
* quota optimization
* enough responsiveness for MVP

---

# Event Detection Engine

The backend compares:

* previous match state
* current match state

to detect meaningful events.

Supported MVP events:

* wicket
* boundary
* six
* over completed
* innings completed
* momentum shift

Example:

```txt id="i2mw2j"
Previous:
145/4

Current:
151/4

=> SIX DETECTED
```

---

# AI Generation Strategy

## Important Optimization

The system should NOT make:

* 4 separate Gemini calls

Instead:

* one Gemini request generates outputs for all 4 agents together

This minimizes:

* token usage
* API costs
* latency
* free-tier quota consumption

---

# Gemini Usage

## Primary Model

`gemini-3.1-flash-lite-preview`

Used for:

* memes
* hype
* predictions
* stats summaries

Reason:

* fast
* lightweight
* free-tier friendly

---

## Secondary Model

`gemini-2.5-flash`

Reserved only for:

* future image/vision features
* replay analysis
* DRS analysis

Not required for MVP.

---

# Hinglish Requirement

All AI outputs should:

* feel Indian
* sound natural to IPL audiences
* use Hinglish by default

The content should resemble:

* cricket Instagram pages
* IPL Twitter banter
* fan reactions

Avoid:

* robotic AI language
* overly formal English

---

# Platform

## Type

Responsive Web Application

Supports:

* desktop
* mobile browsers

---

# Tech Stack

## Frontend

* Flutter Web
* Dart

Reason:

* fast UI iteration
* responsive web app support
* smooth animations
* single codebase architecture

---

## Backend

* Firebase Functions
* Node.js

Responsibilities:

* cricket API polling
* event detection
* Gemini API orchestration
* workflow management

---

# Google Technologies Used

## Gemini API

Core AI engine powering all agents.

---

## Firebase Hosting

Web app deployment.

---

## Firebase Functions

Serverless backend APIs.

---

## Firestore

Stores:

* workflow state
* generated posts
* match events

---

## Firebase Realtime Updates

Used for live workflow synchronization across UI.

---

## Vertex AI SDK (optional future scope)

Future Gemini orchestration scalability.

---

# Application Flow

```txt id="lntv4f"
Cricket API
      ↓
Event Detection Engine
      ↓
Task Creation
      ↓
TODO Column
      ↓
Gemini API Processing
      ↓
PROCESSING Column
      ↓
Generated Output
      ↓
POSTED Column
```

---

# MVP Scope

## Included

* live IPL match tracking
* event detection
* 4 AI agents
* workflow board
* real-time task movement
* Hinglish AI outputs
* Firebase deployment

---

# Out of Scope

Do NOT build:

* authentication
* fantasy cricket
* betting features
* multiplayer
* meme image generation
* voice commentary
* multi-match support
* advanced analytics
* chat system

---

# API Constraints

## Cricket API Limitations

* delayed live updates
* limited free-tier requests
* limited ball-by-ball details

Solution:

* polling every 20 sec
* local event inference
* lightweight architecture

---

# Success Criteria

The MVP succeeds if:

* live IPL data updates correctly
* events are detected accurately
* AI agents generate meaningful outputs
* tasks move through workflow states in real-time
* the app feels alive during a live match

---

# Future Scope

Potential upgrades:

* AI-generated meme images
* multilingual commentary
* voice commentary
* social sharing
* fan sentiment tracking
* DRS replay analysis
* multi-match support
* push notifications

---

# Final Vision

Dugout AI aims to become:

> “A live AI operating system for cricket fan engagement.”
