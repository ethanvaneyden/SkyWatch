# Lumina Flight Tracking API – Integration Guide for Node.js WebSocket Server

**Base URL:** `https://wheatley.cs.up.ac.za/u25260244/api.php`  
**Method:** All requests are **HTTP POST** with `Content-Type: application/json`.  
**Date:** 2026-05-12

---

## 1. Authentication Overview

| Endpoint Type | Authentication | How |
|---------------|----------------|-----|
| **User‑scoped** (`GetAllFlights`, `GetFlight`, `DispatchFlight`, `BoardFlight`, `GetAirports`) | User API key | Include `"apikey": "<key>"` in the JSON body. The key is obtained during client login and stored per socket. |
| **Server‑to‑server** (`UpdateFlightPosition`) | Internal shared secret | Include `"internal_key": "YOUR_SECRET"` in the JSON body. No user key needed. |

**Note:** The API enforces role permissions (e.g., only ATC can dispatch). Your Node.js server should cache the user’s type after login so it can pre‑validate requests before calling the API, but the API will also return a `403` if the role is wrong.

---

## 2. API Response Envelope

Every response has the same structure:

```json
{
  "status": "success" | "error",
  "timestamp": 1712345678000,
  "data": { ... }
}
timestamp is Unix time in milliseconds.

data can be an array of objects, a single object, or a string message.

Always check status first. If "error", read data for the error message.

3. Endpoints
3.1 GetAirports
Returns all airports. Your server should call this once on startup and cache the result.

Request Body

json
{
  "type": "GetAirports",
  "apikey": "<any valid API key>"
}
Success Response (200)

json
{
  "status": "success",
  "timestamp": ...,
  "data": [
    {
      "id": 1,
      "iata_code": "JNB",
      "name": "O. R. Tambo International",
      "city": "Johannesburg",
      "country": "South Africa",
      "latitude": -26.1392,
      "longitude": 28.2460
    },
    ...
  ]
}
Errors: 401 – invalid API key.

3.2 GetAllFlights
Fetch flights based on the authenticated user’s role.

ATC → Gets all flights with their current status and GPS position.

Passenger → Gets only flights they are booked on.

Request Body

json
{
  "type": "GetAllFlights",
  "apikey": "<user's API key>"
}
Success Response (200) – Example flight object

json
{
  "id": 3,
  "flight_number": "SA203",
  "origin": "O. R. Tambo International",
  "destination": "Cape Town International",
  "origin_airport_id": 1,
  "destination_airport_id": 2,
  "departure_time": "2026-05-12 14:00:00",
  "flight_duration_hours": 2.0,
  "status": "Scheduled",
  "current_latitude": -26.1392,
  "current_longitude": 28.2460,
  "dispatched_at": null
}
Errors: 401 – invalid key.

3.3 GetFlight
Returns detailed information for one flight.

For ATC, the response also includes a list of passengers booked on the flight and their boarding status.

Request Body

json
{
  "type": "GetFlight",
  "apikey": "<user's API key>",
  "flight_id": 3
}
Success (200) – Example for ATC

json
{
  "status": "success",
  "timestamp": ...,
  "data": {
    "flight": { ...same flight object as above... },
    "passengers": [
      {
        "passenger_id": 5,
        "username": "john_doe",
        "seat_number": "12A",
        "boarding_confirmed": 0,
        "confirmed_at": null
      },
      ...
    ]
  }
}
Errors:

400 – missing flight_id

404 – flight not found

403 – if a Passenger tries to view a flight they are not booked on

3.4 DispatchFlight
Transition a flight from Scheduled to Boarding. ATC only.

Request Body

json
{
  "type": "DispatchFlight",
  "apikey": "<ATC's API key>",
  "flight_id": 3
}
Success Response (200)

json
{
  "status": "success",
  "timestamp": ...,
  "data": {
    "message": "Flight dispatched successfully",
    "flight_id": 3,
    "new_status": "Boarding"
  }
}
Errors:

400 – flight is not in Scheduled state

403 – user is not an ATC

3.5 BoardFlight
Record a passenger’s boarding confirmation. Passenger only.

After the Node.js server receives a BOARD WebSocket message, it must call this endpoint immediately. The API itself enforces the 60‑second window by checking dispatched_at.

Request Body

json
{
  "type": "BoardFlight",
  "apikey": "<passenger's API key>",
  "flight_id": 3
}
Success Response (200)

json
{
  "status": "success",
  "timestamp": ...,
  "data": {
    "message": "Boarding confirmed",
    "flight_id": 3
  }
}
Errors:

400 – boarding window expired (more than 60 seconds since dispatched_at)

403 – passenger is not booked on this flight

3.6 UpdateFlightPosition
Updates the aircraft’s current GPS coordinates and optionally its status.
This is a server‑to‑server endpoint – no user session required. Use your shared internal key.

Request Body

json
{
  "type": "UpdateFlightPosition",
  "internal_key": "YOUR_SHARED_SECRET",
  "flight_id": 3,
  "latitude": -25.0,
  "longitude": 28.5,
  "status": "In Flight"           // optional – only send when status changes
}
status can be "In Flight" or "Landed".
When the animation reaches the destination, your server must send "status": "Landed".

Success Response (200)

json
{
  "status": "success",
  "timestamp": ...,
  "data": {
    "message": "Position updated"
  }
}
Errors:

401 – missing or invalid internal_key

400 – missing required fields (flight_id, latitude, longitude)

4. Integration Flow Examples
A) ATC dispatches a flight
Node.js receives { "type": "DISPATCH", "flight_id": 3 } via WebSocket.

Call DispatchFlight with the ATC’s API key.

On success:

Start the flight animation loop.

Call GetFlight to obtain the passenger list.

Broadcast BOARDING_CALL to all booked passengers.

On error → send WebSocket error message back to the ATC.

B) Passenger confirms boarding
Node.js receives { "type": "BOARD", "flight_id": 3 } from a passenger socket.

Call BoardFlight with the passenger’s API key.

On success → notify the ATC (and possibly the passenger) that boarding is confirmed.

On failure (400 timeout) → notify the passenger of the failure and inform the ATC of the no‑show.

C) Animation position updates
On each animation tick, compute new interpolated latitude/longitude.

(Depending on strategy) Call UpdateFlightPosition with the internal key to persist to DB.

Broadcast { "type": "POSITION", "flight_id": 3, "latitude": ..., "longitude": ..., "progress": 0.25 } to all subscribed clients.

D) Flight completion
When progress reaches 1.0, call UpdateFlightPosition with "status": "Landed".

Broadcast final POSITION with progress = 1.0 and status "Landed".

Stop the animation loop and unsubscribe clients.

5. Error Handling Strategy
Network / timeout errors: Retry up to 2 times with a 1‑second delay. If still failing, log and optionally inform affected clients.

API errors (4xx): Do not retry. Log the error and send an appropriate WebSocket error message to the client that triggered the action.

For UpdateFlightPosition, you may treat failures as non‑critical – continue broadcasting position from memory. The database may lag behind temporarily but will catch up on the next successful call.

6. Security Notes
The internal key must be stored in an environment variable (e.g., INTERNAL_API_KEY) and never committed to version control.

Wheatley access credentials (username, password) should also be loaded from a .env file.

Validate user roles before making API calls that require ATC privileges – but still handle 403 errors from the API gracefully.

7. Caching Recommendations
Cache the airport list from GetAirports permanently (or until server restart). Airports rarely change.

Cache each user’s type (ATC/Passenger) after their login to avoid repeated DB lookups.