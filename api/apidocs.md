SkyWatch API – Integration Guide
Base URL: https://wheatley.cs.up.ac.za/u25260244/api.php
Method: All requests are HTTP POST with Content-Type: application/json.
Response envelope: Every response follows this format:

json
{
  "status": "success" | "error",
  "timestamp": 1712345678000,
  "data": { ... }
}
timestamp is Unix time in milliseconds.
data can be an array of objects, a single object, or a string.

1. Authentication
Endpoint type	Authentication method	How
Register / Login	None	No key needed.
All other endpoints (except UpdateFlightPosition)	User API key	Include "apikey": "<key>" in the JSON body. The key is returned by Register or Login and stored per WebSocket connection.
UpdateFlightPosition	Internal shared secret	Include "internal_key": "<shared-secret>". No user key required.
2. Endpoints
2.1 Register
Create a new user account. Returns an API key.

Request Body

json
{
  "type": "Register",
  "name": "John",
  "surname": "Doe",
  "email": "john@example.com",
  "password": "StrongPass1!",
  "user_type": "Passenger"
}
user_type must be "Passenger" or "ATC".

Success Response (200)

json
{
  "status": "success",
  "timestamp": 1715500000000,
  "data": {
    "apikey": "a1b2c3d4e5f6..."
  }
}
Errors

400 – missing required fields or invalid email/password/user_type.

409 – email already exists.

500 – database error.

2.2 Login
Authenticate an existing user and retrieve their API key.

Request Body

json
{
  "type": "Login",
  "email": "john@example.com",
  "password": "StrongPass1!"
}
Success Response (200)

json
{
  "status": "success",
  "timestamp": 1715500000000,
  "data": {
    "apikey": "a1b2c3d4e5f6..."
  }
}
Errors

400 – missing email or password.

401 – invalid credentials.

2.3 GetAirports
Retrieve all airports (used to plot markers on the map). Call once and cache on the server.

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
      "name": "O. R. Tambo International",
      "code": "JNB",
      "city": "Johannesburg",
      "country": "South Africa",
      "latitude": -26.1392,
      "longitude": 28.2460
    },
    ...
  ]
}

Errors

401 – invalid API key.

500 – failed to retrieve airports.

2.4 GetAllFlights
Returns flights based on the authenticated user’s role.

ATC → All flights with current status, position, and schedule.

Passenger → Only flights they are booked on, including their booking details.

Request Body

json
{
  "type": "GetAllFlights",
  "apikey": "<user's API key>"
}
Success Response (200) – Passenger

json
{
  "status": "success",
  "timestamp": 1715500000000,
  "data": [
    {
      "booking_id": 102,
      "flight_id": 3,
      "flight_number": "SA203",
      "origin_airport_id": 1,
      "destination_airport_id": 2,
      "departure_time": "2026-05-12 14:00:00",
      "flight_duration_hours": 2.0,
      "status": "Scheduled",
      "current_latitude": -26.1392,
      "current_longitude": 28.2460,
      "dispatched_at": null,
      "seat_number": "12A",
      "boarding_confirmed": 0
    }
  ]
}
Success Response (200) – ATC

json
{
  "status": "success",
  "timestamp": 1715500000000,
  "data": [
    {
      "flight_id": 3,
      "flight_number": "SA203",
      "origin_airport_id": 1,
      "destination_airport_id": 2,
      "departure_time": "2026-05-12 14:00:00",
      "flight_duration_hours": 2.0,
      "status": "Scheduled",
      "current_latitude": -26.1392,
      "current_longitude": 28.2460,
      "dispatched_at": null
    }
  ]
}
Errors

401 – invalid API key.

500 – failed to retrieve flights.

2.5 GetFlight
Detailed information for a single flight. For ATCs, also returns the passenger manifest.

Request Body

json
{
  "type": "GetFlight",
  "apikey": "<user's API key>",
  "flight_id": 3
}
Success Response (200) – Passenger

json
{
  "status": "success",
  "timestamp": ...,
  "data": {
    "flight": {
      "flight_id": 3,
      "flight_number": "SA203",
      "origin_airport_id": 1,
      "destination_airport_id": 2,
      "departure_time": "2026-05-12 14:00:00",
      "flight_duration_hours": 2.0,
      "status": "Scheduled",
      "current_latitude": -26.1392,
      "current_longitude": 28.2460,
      "dispatched_at": null
    }
  }
}
Success Response (200) – ATC

json
{
  "status": "success",
  "timestamp": ...,
  "data": {
    "flight": { ... same flight object as above ... },
    "passengers": [
      {
        "passenger_id": 5,
        "name": "John",
        "surname": "Doe",
        "seat_number": "12A",
        "boarding_confirmed": 0,
        "confirmed_at": null
      }
    ]
  }
}
Errors

400 – missing flight_id.

403 – passenger not booked on this flight.

404 – flight not found.

401 – invalid API key.

500 – failed to retrieve flight details.

2.6 DispatchFlight
Move a flight from Scheduled to Boarding. ATC only.

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
    "flight_id": 3,
    "new_status": "Boarding",
    "dispatched_at": "2026-05-13 10:15:30"
  }
}
Errors

400 – missing flight_id or flight not in Scheduled state.

403 – user is not an ATC.

404 – flight not found.

401 – invalid API key.

500 – unable to dispatch.

2.7 BoardFlight
Record a passenger’s boarding confirmation. Passenger only.
The 60‑second window is enforced: the flight must be in Boarding state and dispatched_at must be within the last 60 seconds.

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
Errors

400 – missing flight_id, flight not in Boarding state, or boarding window expired.

403 – user is not a passenger or not booked on this flight.

404 – flight not found.

401 – invalid API key.

500 – unable to confirm boarding.

2.8 UpdateFlightPosition
Update the aircraft’s current GPS coordinates and optionally its status.
Server‑to‑server – use the internal shared key (field "internal_key").

Request Body

json
{
  "type": "UpdateFlightPosition",
  "internal_key": "<shared-secret>",
  "flight_id": 3,
  "latitude": -26.0,
  "longitude": 28.3,
  "status": "In Flight"
}
status is optional. Send it only when the aircraft status changes (e.g., to "In Flight" or "Landed"). Allowed values: "In Flight", "Landed".

Success Response (200)

json
{
  "status": "success",
  "timestamp": ...,
  "data": {
    "message": "Position updated"
  }
}
Errors

400 – missing flight_id, latitude, or longitude; invalid status.

401 – missing or invalid internal_key.

404 – flight not found (if no row was affected).

500 – failed to update position.

3. Integration Flow Summary
Login/Register → obtain API key.

GetAirports → cache airport list.

GetAllFlights → display flight list for the user.

DispatchFlight (ATC) → flight enters Boarding, dispatched_at set. Node server starts 60‑second timer and notifies passengers.

BoardFlight (Passenger) → must be called within 60 seconds. Updates boarding_confirmed.

UpdateFlightPosition → called repeatedly during animation (every tick or at an interval). Final call sets status: "Landed".

4. Caching & Security Notes
Cache the airport list indefinitely (call once per server session).

Store the internal key in an environment variable (INTERNAL_API_KEY) – never commit it.

The Node.js server must keep each client’s API key associated with its WebSocket and use it for every API call.

All endpoints except UpdateFlightPosition require a valid user API key.

For questions about the PHP API itself, see the full code documentation.