# AGENTS.md

This repository contains the GottaGo project.

GottaGo is a map-based service for people who urgently need a toilet nearby.

The product should begin with trusted public toilet locations and then expand into a community platform where:

- users can register new toilet locations
- users can report whether a toilet is open or closed
- trusted hosts can open their own toilet to others
- hosts can optionally receive donations

## Product Direction

The core product question is:

"Where is the nearest toilet I can actually use right now?"

This means all implementation decisions should optimize for:

1. Fast loading
2. Clear map-first UX
3. Accurate location data
4. Reliable "open now" status
5. Low-friction reporting and contribution

## Product Phases

### Phase 1: Public Toilet MVP

Build the fastest possible useful version first.

Scope:

- show nearby public toilets on a map
- support current-location search
- show toilet details
- support open-now filtering when data exists
- support navigation handoff

Phase 1 should prefer verified public data over user-generated data.

### Phase 2: Community Data Expansion

After the public toilet map is stable, expand coverage with user contributions.

Scope:

- user sign-in
- add toilet location
- upload photos
- report wrong locations
- report open / closed status
- moderation or verification queue

### Phase 3: Host-Opened Toilets + Donations

Only after trust, moderation, and safety controls exist:

- allow users to open their own toilet for others
- allow hosts to define available hours
- allow temporary open / closed toggles
- allow optional donations
- add reviews, trust indicators, and abuse reporting

Do not treat this phase as the initial MVP.

## Development Priorities

When making product or engineering decisions, prioritize in this order:

1. Nearby search speed
2. Map usability under urgency
3. Data correctness
4. Operational simplicity
5. Expansion paths for community submissions and host sharing

## Tech Stack

Frontend:

- React Native
- Expo
- Mapbox SDK

Backend:

- Node.js
- TypeScript
- Express or NestJS

Database:

- PostgreSQL
- PostGIS

Infrastructure:

- Docker
- AWS or GCP

## Data Model Guidance

At minimum, toilet records should eventually support:

- id
- name
- latitude
- longitude
- address
- source
- toilet_type
- opening_hours
- open_now_status
- accessible
- gender_type
- free_or_paid
- verification_status
- last_verified_at

Possible toilet types:

- public
- community
- host_opened

## Agent Guidance

If building this project from scratch, start with:

1. mobile app shell
2. map screen
3. backend API for nearby toilets
4. PostGIS-based geospatial queries
5. initial seed data import for public toilets

Avoid prematurely building:

- social features
- chat
- complex booking flows
- advanced recommendation systems
- donation flows before trust and moderation exist

## Development Commands

Commands and setup should be added here once the app and backend scaffolding exist.
