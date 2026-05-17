# ✈️ SKYWATCH — Real-Time Flight Tracker
### COS 216 Homework Assignment | Angular 17 Web Client

> **Group Project** | University of Pretoria — Department of Computer Science

---

## 👥 Group Members

| Name | Surname | Student Number |
|------|---------|---------------|
|      |         |               |
|      |         |               |
|      |         |               |

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Getting Started](#getting-started)
6. [Running the Application](#running-the-application)
7. [Environment Configuration](#environment-configuration)
8. [WebSocket Message Protocol](#websocket-message-protocol)
9. [Role-Based Views](#role-based-views)
10. [Map Integration (Leaflet)](#map-integration-leaflet)
11. [System Flow](#system-flow)
12. [Known Issues & Limitations](#known-issues--limitations)

---

## Project Overview

**SKYWATCH** is the Angular 17 web client component of a three-tier real-time flight tracking system built for COS 216. It connects to a locally running NodeJS WebSocket server, which in turn communicates with a PHP API hosted on Wheatley.

The client supports two user roles:

- **Passenger** — Views booked flights, receives boarding notifications, confirms boarding, and tracks their flight live on the map.
- **ATC (Air Traffic Controller)** — Views all system flights, dispatches flights, monitors boarding confirmations, and tracks any active aircraft in real time.

All real-time communication (flight dispatch, position updates, boarding notifications) is handled exclusively via WebSocket messages. The Leaflet map renders live aircraft positions received from the server.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 17 |
| Language | TypeScript |
| Styling | CSS + Bootstrap |
| Map | Leaflet.js |
| Communication | WebSocket (native browser API) |
| Backend (Task 1) | PHP API on Wheatley + MySQL |
| Server (Task 2) | NodeJS WebSocket server (localhost) |

---

## Project Structure

```
skywatch-client/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── login/               # Login form component
│   │   │   ├── passenger-view/      # Passenger dashboard + flight list
│   │   │   ├── atc-view/            # ATC dashboard + all flights
│   │   │   ├── map/                 # Leaflet map component
│   │   │   └── boarding-notification/ # 60-second countdown + board button
│   │   ├── services/
│   │   │   ├── websocket.service.ts # WebSocket connection & message handling
│   │   │   └── auth.service.ts      # Login state + role management
│   │   ├── models/
│   │   │   ├── flight.model.ts      # Flight interface
│   │   │   ├── airport.model.ts     # Airport interface
│   │   │   └── user.model.ts        # User/role interface
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   └── app.module.ts
│   ├── environments/
│   │   ├── environment.ts           # Dev config (WS URL, etc.)
│   │   └── environment.prod.ts
│   └── styles.css                   # Global styles
├── package.json
├── angular.json
└── README.md                        # This file
```

---

## Prerequisites

Make sure the following are installed before running the client:

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Angular CLI](https://angular.io/cli) v17
- A running instance of the **NodeJS WebSocket server** (Task 2) on localhost

Install Angular CLI globally if you haven't already:

```bash
npm install -g @angular/cli@17
```

---

## Getting Started

### 1. Clone / unzip the project

```bash
cd skywatch-client
```

### 2. Install dependencies

```bash
npm install
```

### 3. Install Leaflet

```bash
npm install leaflet
npm install --save-dev @types/leaflet
```

---

## Running the Application

### Start the NodeJS WebSocket server first (Task 2)

```bash
node server.js          # or: node server.js 3000
```

Make sure the server is running and accepting connections on your chosen port (1024–49151).

### Start the Angular client

```bash
ng serve
```

The client will be available at:

```
http://localhost:4200
```

> The client runs entirely on localhost. Do **not** host it on Wheatley.

---

## Environment Configuration

Edit `src/environments/environment.ts` to match your NodeJS server's port:

```typescript
export const environment = {
  production: false,
  wsUrl: 'ws://localhost:3000'   // Change port to match your server
};
```

> **Security note:** Never commit credentials or passwords. The Wheatley credentials are managed server-side only — the Angular client communicates exclusively with the NodeJS WebSocket server, not directly with the PHP API.

---

## WebSocket Message Protocol

All client-server communication uses JSON messages over a WebSocket connection.

### Messages sent FROM the client TO the server

| Message Type | Sent By | Description |
|-------------|---------|-------------|
| `LOGIN` | All | Sends username + password for authentication |
| `DISPATCH` | ATC | Triggers flight dispatch for a selected scheduled flight |
| `BOARD` | Passenger | Confirms boarding after receiving a `BOARDING_CALL` |
| `TRACK` | ATC / Passenger | Subscribes the client to real-time `POSITION` updates for a flight |

**Example — DISPATCH:**
```json
{
  "type": "DISPATCH",
  "flight_id": 7
}
```

**Example — BOARD:**
```json
{
  "type": "BOARD",
  "flight_id": 7
}
```

**Example — TRACK:**
```json
{
  "type": "TRACK",
  "flight_id": 7
}
```

---

### Messages received FROM the server BY the client

| Message Type | Received By | Description |
|-------------|------------|-------------|
| `BOARDING_CALL` | Passengers on the flight | Notifies passenger their flight is boarding; starts 60-second window |
| `POSITION` | Subscribed clients (via TRACK) | Real-time lat/lng + progress percentage of the aircraft |
| `SHUTDOWN` | All clients | Server is shutting down; client must display a message and block interaction |
| Error messages | Relevant client | `403` (forbidden), `404` (not found), timeout, no-show notification |

**Example — BOARDING_CALL:**
```json
{
  "type": "BOARDING_CALL",
  "flight_id": 7,
  "flight_number": "SA203",
  "dispatched_at": "2026-05-18T07:30:00Z"
}
```

**Example — POSITION:**
```json
{
  "type": "POSITION",
  "flight_id": 7,
  "latitude": -25.731,
  "longitude": 28.218,
  "progress": 42.7,
  "status": "In Flight"
}
```

---

## Role-Based Views

### Passenger View

Displayed after logging in as a **Passenger**:

- List of personally booked flights with statuses
- Click a flight to open the tracking view on the Leaflet map
- **Boarding notification** banner appears when ATC dispatches the passenger's flight:
  - Countdown timer (60 seconds, visible)
  - "Confirm Boarding" button — sends a `BOARD` message to the server
  - If 60 seconds expire without confirmation, passenger is marked as a no-show
- While tracking, displays:
  - Live aircraft position on the map
  - Flight number, origin, destination
  - Current status: `Scheduled → Boarding → In Flight → Landed`
  - Flight progress percentage

### ATC View

Displayed after logging in as an **ATC**:

- Full list of all flights in the system with statuses
- Select a `Scheduled` flight and click **"Dispatch Flight"** → sends `DISPATCH` to server
- Track any active flight by clicking **"Track"** → sends `TRACK` to server
- While tracking, displays:
  - Full passenger list for the flight
  - Real-time boarding confirmation status per passenger
  - Live aircraft position on the map
  - Notification when a passenger fails to board within 60 seconds

---

## Map Integration (Leaflet)

The Leaflet map is the central component of SKYWATCH.

### Setup in `angular.json`

Add the Leaflet CSS to the `styles` array:

```json
"styles": [
  "node_modules/leaflet/dist/leaflet.css",
  "src/styles.css"
]
```

### Map Behaviour

- Loads with a default **world view** on startup
- All airports are plotted using data from the `GetAirports` PHP endpoint (fetched via the NodeJS server)
- **Airport markers** and **aircraft markers** use distinct icons (do not use the same marker for both)
- Aircraft are represented by a moving marker that animates smoothly between origin and destination
- Aircraft position updates are driven **exclusively** by `POSITION` WebSocket messages — the client does NOT poll the API directly
- Flight progress is displayed as a percentage, sourced from the `progress` field in `POSITION` messages
- Animation timing reflects the scaled duration rule: a flight of N hours completes in N seconds

---

## System Flow

The complete end-to-end flow the UI must support:

```
1. ATC logs in        → ATC dashboard loads with all flights
2. ATC dispatches     → Clicks "Dispatch" button → DISPATCH sent to server
3. Server broadcasts  → BOARDING_CALL pushed to all booked Passengers
4. Passenger notified → Boarding banner appears with 60-second countdown
5. Passenger confirms → Clicks "Confirm Boarding" → BOARD sent to server
6. Server animates    → Aircraft begins moving; POSITION messages broadcast
7. Clients track      → Both ATC and subscribed Passengers see live position
8. Flight lands       → Progress hits 100%; status transitions to "Landed"
9. UI reflects landing → Map marker stops; flight marked as Landed
```

### Status Transitions

```
Scheduled  ──[ATC Dispatches]──►  Boarding
Boarding   ──[60s window ends]──►  In Flight
In Flight  ──[Animation ends]───►  Landed
```

---

## Known Issues & Limitations

- The Leaflet map container div must have an explicit height set in CSS, otherwise the map will not render (common Angular gotcha).
- The WebSocket connection is to `localhost` only — the Angular client cannot connect to Wheatley directly.
- If the NodeJS server is not running when the client loads, a connection error message is shown and all interaction is blocked until reconnected.
- Angular's change detection may need `ChangeDetectorRef.detectChanges()` when updating map markers from WebSocket callbacks (running outside Angular zone).

---

## README — UpdateFlightPosition Strategy

*(Required by Task 2 specification)*

**Our chosen approach: Update on Interval**

Rather than calling `UpdateFlightPosition` on every single animation tick, we call it at a fixed interval (e.g. every 2–3 seconds), keeping the latest interpolated position in server memory between writes.

**Reasoning:** Calling the API on every tick would generate an enormous number of HTTP requests to Wheatley, especially for long-running flights. Since the database position is used for recovery (e.g. ATC reconnects and needs the last known position), near-real-time accuracy is sufficient — it does not need to be frame-perfect. Writing every few seconds strikes the right balance between database consistency and server/network performance. The in-memory position is always authoritative for POSITION broadcasts; the database write is just a checkpoint.

---

*SKYWATCH — Built for COS 216, University of Pretoria, 2026*
