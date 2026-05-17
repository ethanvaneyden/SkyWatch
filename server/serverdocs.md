✈️SkyWatch WebSocket Flight Tracking System
Integration & User Guide

1. System Overview
The SkyWatch WebSocket Server is a real-time flight simulation and communication layer built in Node.js that integrates with the SkyWatch PHP API.

It enables:
- Real-time flight movement simulation
- Passenger boarding workflows
- ATC flight dispatching
- Live aircraft position broadcasting
- Flight tracking subscriptions
- Boarding confirmation handling
- Estimated landing time calculations
- Real-time event notifications
- CLI-based server administration

The WebSocket server acts as a bridge between:
Component	Purpose
- PHP API	Persistent data & authentication
- Node WebSocket Server	Real-time simulation & messaging
- Passengers	Receive flight updates
- ATC Users	Dispatch and monitor flights

2. Starting the Server
Step 1 — Navigate to the server directory
cd server

Step 2 — Start the WebSocket server
node server.js <port>

Example:
node server.js 8080

Expected output:
Loaded 2173 airports
WebSocket server running on port 8080

3. Testing the WebSocket Server
Recommended WebSocket tester:
PieHost WebSocket Tester :  https://piehost.com/websocket-tester

Connection URL
ws://localhost:8080
Or:
ws://<server-ip>:<port>

Example:
ws://192.168.0.10:8080

4. System Architecture
 Core Components
        File:	                      Responsibility:
- server.js	                  WebSocket server & CLI
- messageHandler.js	          Handles all incoming messages
- flightTracker.js	          Flight simulation engine
- flightMovement.js	          Position interpolation calculations
- apiService.js	              PHP API communication
- clientManager.js	          Connected client storage
- subscriptionManager.js      Flight subscriber management
- boardingManager.js	        Boarding window tracking
- airportCache.js	            Airport coordinate cache
- socketUtils.js	            Safe WebSocket sending

5. Authentication System
The WebSocket server does NOT authenticate users directly.
Instead, it forwards authentication requests to the PHP API.

After successful login:
user email is stored
role is stored
API key is stored
socket is registered

6. Default Test Accounts
FOR TEAM-MEMBERS

7. WebSocket Message Format
ALL messages MUST contain a type field.

General Format
{
  "type": "MESSAGE_TYPE"
}

All message types are case-insensitive internally.
But it is recommended that they are in uppercase for consistency
Recommended convention: UPPERCASE

8. Connection Lifecycle
Step 1 — Connect
const ws = new WebSocket("ws://localhost:8080");

Step 2 — Login
Send LOGIN request.

Step 3 — Perform Actions

Examples:
TRACK
DISPATCH
BOARD

Step 4 — Receive Real-Time Events

Examples:
POSITION
LANDED
BOARDING_CALL
PASSENGER_BOARDED

9. LOGIN Message
Authenticates a user via the PHP API.
Request
{
  "type": "LOGIN",
  "email": "john@example.com",
  "password": "StrongPass1!"
}
Success Response
{
  "type": "LOGIN_SUCCESS",
  "role": "ATC",
  "message": "Logged in successfully"
}

OR

{
  "type": "LOGIN_SUCCESS",
  "role": "Passenger",
  "message": "Logged in successfully"
}

Internal Behaviour
The Node server calls:
{
  "type": "Login",
  "email": "john@example.com",
  "password": "StrongPass1!"
}

Then stores:
ws.username
ws.role
ws.apikey

Possible Errors
{
  "type": "ERROR",
  "message": "Email and password required"
}
{
  "type": "ERROR",
  "message": "User already connected"
}

10. REGISTER Message
Creates a new account through the PHP API.

Request
{
  "type": "REGISTER",
  "name": "John",
  "surname": "Doe",
  "email": "john@example.com",
  "password": "StrongPass1!",
  "user_type": "Passenger"
}

Success Response
{
  "type": "REGISTRATION_SUCCESS",
  "apikey": "generated-api-key",
  "message": "Registered successfully, logging you in..."
}

11. TRACK Flight
Subscribes a user to real-time updates for a flight.

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

Internal Behaviour
The server:
validates login
validates flight access
adds socket to subscriber list
Passenger Restrictions

Passengers may ONLY track flights they are booked on.
ATC users may track ALL flights.

Possible Errors
{
  "type": "ERROR",
  "message": "Missing flight_id"
}
{
  "type": "ERROR",
  "message": "Invalid flight_id"
}
{
  "type": "ERROR",
  "message": "Not allowed to track this flight"
}
{
  "type": "ERROR",
  "message": "already subscribed"
}

12. DISPATCH Flight (ATC ONLY)
Starts the flight simulation engine.

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

13. Dispatch Workflow
When DISPATCH is received:

Step 1
PHP API called:
{
  "type": "DispatchFlight",
  "apikey": "<ATC_API_KEY>",
  "flight_id": 3
}

Updates flight status to:
Boarding

Step 2
Flight details fetched:
{
  "type": "GetFlight",
  "flight_id": 3
}

Step 3
Airport coordinates loaded from cache:

origin.latitude
origin.longitude

destination.latitude
destination.longitude

Step 4
Flight movement simulation starts:
startFlightTracking(flight)

Step 5
Passengers receive boarding notifications.

Step 6
Subscribers receive live flight updates.

14. Boarding System
When a flight is dispatched:
a boarding window opens
passengers receive BOARDING_CALL
passengers must confirm boarding before timeout
BOARDING_CALL Message

Sent automatically to booked passengers.
{
  "type": "BOARDING_CALL",
  "flight_id": 3,
  "expires_in": 60,
  "message": "Your flight is boarding"
}

15. BOARD Flight
Passengers confirm boarding.

Request
{
  "type": "BOARD",
  "flight_id": 3
}

Success Response
{
  "type": "BOARDING_CONFIRMED",
  "flight_id": 3
}

Internal Behaviour
The server:
validates boarding window
updates PHP API
notifies ATC users

ATC Notification
{
  "type": "PASSENGER_BOARDED",
  "passenger": "user@example.com",
  "flight_id": 3
}

Boarding Errors
{
  "type": "ERROR",
  "message": "Boarding window expired"
}
{
  "type": "ERROR",
  "message": "Only passengers can board"
}

16. Real-Time Flight Updates
POSITION Update

Broadcast repeatedly during flight simulation.
{
  "type": "POSITION",
  "flight_id": 3,
  "latitude": -26.123,
  "longitude": 28.456,
  "progress": 0.42
}
Progress Meaning
Value	Meaning
0	Just departed
0.5	Halfway
1	Arrived

17. Flight Landing Event
When destination reached:
{
  "type": "LANDED",
  "flight_id": 3
}

18. Estimated Landing Time
The simulation uses:
N flight hours = N simulation seconds

Examples:
Real Flight Duration	- Simulation Duration
2 hours	              - 2 seconds
14 hours	            - 14 seconds

The server calculates remaining time using:
remaining = durationMs - elapsed

Displayed in:
FLIGHT_STATUS

19. Flight Simulation Engine
Flight movement is calculated using interpolation between:
origin airport coordinates
destination airport coordinates

Updates occur every: 100ms

Each update:
recalculates latitude
recalculates longitude
updates flight progress
syncs PHP API
broadcasts to subscribers

20. Airport Cache System
At startup:
loadAirports()
loads ALL airports from the PHP API into memory.

Purpose:
reduce repeated API calls
improve dispatch speed
provide coordinate lookup

Example output:
Loaded 2173 airports

21. Subscription System
Tracks which clients are subscribed to flights.

Internal structure:
Map<
  flightId,
  Set<WebSocket>
>

Example:
3 => { ws1, ws2, ws5 }

22. Safe Socket Handling
The system prevents crashes caused by dead sockets.

Before sending:
if(ws.readyState === 1)

Safe sending handled by:
safeSend()

23. Automatic Cleanup
On disconnect:
The server automatically:
- removes client
- unsubscribes client
- clears socket metadata
- cleans flight subscriptions

24. Internal API Communication
Node communicates with PHP API using:

apiRequest({
  type: "...",
  apikey: "...",
  internal_key: "..."
})

25. Internal UpdateFlightPosition Request
Used internally by the flight tracker.

{
  "type": "UpdateFlightPosition",
  "internal_key": "<SECRET>",
  "flight_id": 3,
  "latitude": -26.1,
  "longitude": 28.3,
  "status": "In Flight"
}

26. CLI Commands
The server includes a command-line administrative interface.

FLIGHT_STATUS
1. Displays current flight information.
Command
FLIGHT_STATUS 3

Example Output:

Flight: SA123
Status: In Flight
Coordinates: (-26.1, 28.3)
Passengers boarded: 4/6
Estimated time remaining: 5.2 seconds
KILL

2. Forcefully disconnect a user.
Command
KILL john@example.com

Client Receives
{
  "type": "KILLED",
  "message": "You were disconnected by the server"
}

QUIT
3. Gracefully shuts down the WebSocket server.

Connected Clients Receive
{
  "type": "SHUTDOWN",
  "message": "Server shutting down"
}

27. Client Rules
Rule	                    Description
Login required	        - Must LOGIN before actions
One session only	      - Duplicate logins rejected
ATC restricted actions	- Only ATC can DISPATCH
Passenger restrictions	- Passenger can only TRACK booked flights
Boarding required	      - Must BOARD during boarding window

28. Error Format
ALL errors follow:

{
  "type": "ERROR",
  "message": "Description"
}

29. Full System Flow
Passenger Flow
Connect
LOGIN
TRACK flight
Receive BOARDING_CALL
Send BOARD
Receive POSITION updates
Receive LANDED event
ATC Flow
Connect
LOGIN
DISPATCH flight
Receive PASSENGER_BOARDED notifications
Monitor flight progress

30. Where Everything Happens
Feature	                  File
WebSocket Server	        - server.js
Message Processing	      - messageHandler.js
Flight Simulation	        - flightTracker.js
Position Calculations	    - flightMovement.js
API Communication	        - apiService.js
Boarding Windows	        - boardingManager.js
Airport Lookup	          - airportCache.js
Socket Safety	            - socketUtils.js
Subscription Tracking	    - subscriptionManager.js
Client Storage	          - clientManager.js

31. Important Notes for Testers
Must LOGIN first
Flight must exist
Flight must be scheduled before dispatch
ATC only may DISPATCH
Boarding expires automatically
Position updates occur every 100ms
Flight duration is accelerated
WebSocket server stores runtime state only
Restarting server clears active 

32. Example Full Passenger Session
LOGIN
{
  "type": "LOGIN",
  "email": "passenger@test.com",
  "password": "Password123!"
}
TRACK
{
  "type": "TRACK",
  "flight_id": 3
}
BOARD
{
  "type": "BOARD",
  "flight_id": 3
}

33. Example Full ATC Session
LOGIN
{
  "type": "LOGIN",
  "email": "atc@test.com",
  "password": "Password123!"
}
DISPATCH
{
  "type": "DISPATCH",
  "flight_id": 3
}