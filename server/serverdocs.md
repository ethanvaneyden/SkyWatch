✈️ SkyWatch WebSocket System – Integration Guide (Node Client Server)
On your terminal run:
cd server
node server.js <port>

Example:
node server.js 8080

Expected output on your terminal:
WebSocket server running on port <port>

To test:
Open in browser: https://piehost.com/websocket-tester

Base WebSocket URL
ws://<server-ip>:<port>

Example:
ws://localhost:8080

1. Overview
The WebSocket server acts as a real-time flight simulation layer between clients and the SkyWatch PHP API.

It handles:
- User authentication (via PHP API)
- Flight dispatch events
- Live flight tracking
- Real-time broadcasting to subscribers

2. Connection Lifecycle
Step 1: Connect

Client opens a WebSocket connection:
const ws = new WebSocket("ws://localhost:8080");

3. Message Format (IMPORTANT)

All messages MUST follow:
{
  "type": "MESSAGE_TYPE",
  "...additional fields"
}

All type values are case-insensitive internally, but should be sent in uppercase for consistency.

4. Authentication
4.1 LOGIN

Authenticate a user via PHP API and register them in the WebSocket system.

Request
{
  "type": "LOGIN",
  "email": "john@example.com",
  "password": "StrongPass1!"
}
Response (Success)
{
  "type": "LOGIN_SUCCESS",
  "role": "ATC" | "PASSENGER",
  "message": "Logged in successfully"
}

Internal Behaviour
Calls PHP API:
type: Login
Stores:
- username (email)
- role
- apiKey
- Registers client in clientManager

Errors
{
  "type": "ERROR",
  "message": "Email and password required"
}
{
  "type": "ERROR",
  "message": "User already connected"
}

5. Flight Tracking System
5.1 TRACK FLIGHT

Subscribe to real-time updates for a flight.

Request
{
  "type": "TRACK",
  "flight_id": 3
}

Success Response
{
  "type": "TRACKING",
  "message": "user@example.com subscribed to flight 3"
}

Behaviour
- Adds WebSocket client to subscription list

Enables receiving:
- position updates
- progress updates
- completion event

Errors
{
  "type": "ERROR",
  "message": "Missing flight_id"
}
{
  "type": "ERROR",
  "message": "Not allowed to track this flight"
}
{
  "type": "ERROR",
  "message": "Already subscribed"
}

6. Flight Dispatch (ATC only)
6.1 DISPATCH FLIGHT

Triggers flight movement simulation.

Request
{
  "type": "DISPATCH",
  "flight_id": 3
}

Success Response
{
  "type": "DISPATCHED",
  "message": 3
}

Behaviour Flow
When dispatched:
PHP API is called:
{
  "type": "DispatchFlight",
  "apikey": "<ATC API KEY>",
  "flight_id": 3
}

Flight is fetched:
{
  "type": "GetFlight",
  "flight_id": 3
}

Node starts simulation:
startFlightTracking(flight)

Server begins:
- position updates every tick
- broadcasts to subscribers
- updates PHP API (UpdateFlightPosition)

Errors
{
  "type": "ERROR",
  "message": "Only ATC can dispatch flights"
}
{
  "type": "ERROR",
  "message": "Flight not scheduled"
}

7. Real-Time Flight Updates
7.1 FLIGHT_UPDATE (Broadcast)

Sent repeatedly during flight movement.

Message
{
  "type": "FLIGHT_UPDATE",
  "flight_id": 3,
  "latitude": -26.123,
  "longitude": 28.456,
  "progress": 0.42
}
7.2 FLIGHT_COMPLETE (Broadcast)

Sent when flight reaches destination.

Message
{
  "type": "FLIGHT_COMPLETE",
  "flight_id": 3
}

8. Internal API Communication
The Node server communicates with PHP API using:

apiRequest({
  type: "...",
  apikey: "...",
  internal_key: "..."
})

8.1 UpdateFlightPosition
Request (internal only)
{
  "type": "UpdateFlightPosition",
  "internal_key": "<SECRET>",
  "flight_id": 3,
  "latitude": -26.1,
  "longitude": 28.3,
  "status": "In Flight"
}

Used for:
- live movement updates
- final landing update

Allowed statuses: (still deciding...)
Scheduled
Boarding
In Flight / In Air
Arrived

9. Client Management Rules
Each WebSocket client stores:
ws.username   // email
ws.role       // ATC | PASSENGER
ws.apikey     // PHP API key

Client restrictions:
- PASSENGER → can only track flights they are booked on
- ATC → can dispatch and track all flights
- Only one connection per user allowed

10. Subscription System
TRACKING STORAGE
flightId => Set<WebSocket>

Example:
3 => { ws1, ws2, ws5 }

SUBSCRIBE
Adds client to flight stream

UNSUBSCRIBE
Auto-removes on disconnect

11. Flight Simulation Rules
Flight duration scaling:
REAL HOURS → SIMULATED SECONDS

Example:
14 hour flight → 14 seconds animation

Movement updates:
Every 100ms:
-position interpolated(calculated) between airports
-progress updated (0 → 1)

12. WebSocket Error Format
All errors follow:
{
  "type": "ERROR",
  "message": "Description of error"
}

13. Full System Flow
Passenger:
- LOGIN
- TRACK flight
- receive FLIGHT_UPDATE
- receive FLIGHT_COMPLETE

ATC:
- LOGIN
- DISPATCH flight
- server starts simulation
- passengers receive live updates

14. Important Notes (for testers)
- Must login before any action
- Must use valid PHP API key
- Flight must be in Scheduled state before dispatch
- Tracking must happen before or during dispatch
- WebSocket does NOT store persistent state

15. Flight Movement Engine (Core System)

When a flight is dispatched:
1. DISPATCH message received
2. PHP API updates flight → Boarding
3. GetFlight retrieves full flight data
4. startFlightTracking(flight) is called

Inside flightTracker:
- Creates FlightMovement instance
- Starts interval timer (100ms ticks)

Each tick:
- Calculates new lat/lon
- Calls UpdateFlightPosition API
- Broadcasts FLIGHT_UPDATE to all subscribers

When progress reaches 1:
- Calls UpdateFlightPosition with status: Arrived
- Broadcasts FLIGHT_COMPLETE
- Removes flight from activeFlights

16 WHERE EVERYTHING RUNS
DISPATCH → messageHandler.js
TRACK → subscriptionManager.js
MOVEMENT → flightTracker.js + FlightMovement.js
BROADCAST → WebSocket send loop inside flightTracker.js
API SYNC → apiService.js
NOTE: every <MESSAGE_TYPE> is sent to messageHandler.js where it will be handled accordingly