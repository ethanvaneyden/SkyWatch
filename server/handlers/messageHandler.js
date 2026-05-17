//Lesego Tebeile, u25143230
//messageHandler.js
const {addClient, getClient, getAllClients} = require('../utils/clientManager');
const {subscribe, getSubscribers} = require('../utils/subscriptionManager');
const { apiRequest } = require('../services/apiService');
const { startFlightTracking } = require('../services/flightTracker');
const { getAirport, getAllAirports } = require('../services/airportCache');
const { startBoardingWindow, isBoardingOpen } = require('../utils/boardingManager');
const {safeSend} = require('../utils/socketUtils');

async function handleMessage(ws, message){
    try{
        const data = JSON.parse(message.toString());

        if(!data.type){
            safeSend(ws, {
                type: 'ERROR',
                message: 'Missing request type'
            });

            return;
        }

        switch(data.type.toUpperCase()){
            case 'REGISTER':
                if(!data.name || !data.surname || !data.email || !data.password || !data.user_type){                    
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Missing required data'
                    });

                    break;
                }

                const registerResponse = await apiRequest({
                    type: 'Register',
                    name: data.name,
                    surname: data.surname,
                    email: data.email.toLowerCase(),
                    password: data.password,
                    user_type: data.user_type
                });

                if(registerResponse.status !== 'success'){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: registerResponse.data
                    });

                    break;
                }

                safeSend(ws, {
                    type: 'REGISTRATION_SUCCESS',
                    apikey: registerResponse.data.apikey,
                    message: 'Registered successfully, logging you in...'
                });

                console.log(`${data.email.toLowerCase()} registered as ${data.user_type}`);

                const ms = {
                    "type": "LOGIN",
                    "email": data.email.toLowerCase(),
                    "password": data.password
                };
                setTimeout(() => { handleMessage(ws, JSON.stringify(ms));}, 500); //auto Login after registration
            
                break;

            case 'LOGIN':
                if(!data.email || !data.password){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Email and password required'
                    });
                    break;
                }

                const loginResponse = await apiRequest({
                    type: 'Login',
                    email: data.email.toLowerCase(),
                    password: data.password
                });

                if(loginResponse.status !== 'success'){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: loginResponse.data
                    });
                    break;
                }

                const user = loginResponse.data;

                if(getClient(user.email.toLowerCase())){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'User already connected'
                    });

                    break;
                }

                ws.username = user.email.toLowerCase();
                ws.role = user.type;
                ws.apikey = user.apikey;

                addClient(user.email.toLowerCase(), ws, user.type, user.apikey);

                safeSend(ws, {
                    type: 'LOGIN_SUCCESS',
                    role: user.type,
                    apikey: user.apikey,
                    email: user.email,
                    name: user.name,
                    surname: user.surname,
                    message: 'Logged in successfully'
                });

                break;

            case 'TRACK':    
                if(data.flight_id === undefined || data.flight_id == null){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Missing flight_id'
                    });

                    break;
                }

                if(!ws.username){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Please login first'
                    });

                    break;
                }

                const flightId = Number(data.flight_id);
                if(!Number.isInteger(flightId)){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Invalid flight_id'
                    });
                    break;
                }

                if(ws.role !== 'ATC'){
                    const flightCheck = await apiRequest({
                        type: 'GetFlight',
                        apikey: ws.apikey,
                        flight_id: flightId
                    })

                    if(flightCheck.status !== 'success'){
                        safeSend(ws, {
                            type: 'ERROR',
                            message: 'Not allowed to track this flight'
                        });

                        break;
                    }
                }

                const clients = getSubscribers(flightId);
                    
                if(clients.has(ws)){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: `${ws.username} already subscribed to flight ${flightId}`
                    });

                    break;
                }
    
                subscribe(flightId, ws);

                safeSend(ws, {
                    type: 'TRACKING',
                    message: `${ws.username} subscribed to flight ${flightId}`
                });

                break;

            case 'DISPATCH':
                if(ws.role !== 'ATC'){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Only ATC can dispatch flights'
                    });

                    break;
                }

                const dispatchFlightId = Number(data.flight_id);
                if(!Number.isInteger(dispatchFlightId)){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Invalid flight_id'
                    });
                    break;
                }

                const dispatchResponse = await apiRequest({
                    type: 'DispatchFlight',
                    apikey: ws.apikey,
                    flight_id: dispatchFlightId
                });

                if(dispatchResponse.status !== 'success'){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: dispatchResponse.data
                    });
                    break;
                }

                const flightResponse = await apiRequest({
                    type: 'GetFlight',
                    apikey: ws.apikey,
                    flight_id: dispatchFlightId
                });

                if(flightResponse.status !== 'success'){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Unable to retrieve flight'
                    });

                    break;
                }

                const flightData = flightResponse.data.flight;

                const origin = getAirport(flightData.origin_airport_id);
                const destination = getAirport(flightData.destination_airport_id);

                if(!origin || !destination){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Airport data unavailable'
                    });

                    return;
                }

                const trackingFlight = {
                    flight_id: flightData.flight_id,
                    flight_number: flightData.flight_number,

                    lat1: origin.latitude,
                    lon1: origin.longitude,

                    lat2: destination.latitude,
                    lon2: destination.longitude,

                    latitude: origin.latitude,
                    longitude: origin.longitude,

                    flight_duration_hours: flightData.flight_duration_hours
                };

                const started = startFlightTracking(trackingFlight);
                if(!started){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Flight already active'
                    });
                    return;
                }

                const passengers = flightResponse.data.passengers || [];
                passengers.forEach((passenger) => {
                    const passengerClient = getClient(passenger.email.toLowerCase());

                    if(passengerClient){
                        passengerClient.socket.send(JSON.stringify({
                            type: 'BOARDING_CALL',
                            flight_id: dispatchFlightId,
                            expires_in: 60,
                            message: 'Your flight is boarding'
                        }));
                    }
                });

                safeSend(ws, {
                    type: 'DISPATCHED',
                    message: dispatchFlightId
                });

                startBoardingWindow(dispatchFlightId, 60,
                    async(flightId) => {
                        const refreshed = await apiRequest({
                            type: 'GetFlight',
                            apikey: ws.apikey,
                            flight_id: flightId
                        });

                        if(refreshed.status !== 'success'){
                            return;
                        }

                        const refreshPassengers = refreshed.data.passengers || [];
                        const noShows = refreshPassengers.filter(p => p.boarding_confirmed != 1);
                        const clients = getAllClients();

                        clients.forEach((client) => {
                            if(client.role === 'ATC'){
                                safeSend(client.socket, {
                                    type: 'NO_SHOWS',
                                    flight_id: flightId,
                                    passengers: noShows.map(p => ({
                                        email: p.email,
                                        seat: p.seat_number
                                    }))
                                });
                            }
                        });
                    }
                );

                break;

            case 'BOARD':
                if(ws.role !== 'Passenger'){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Only passengers can board'
                    });
                    break;
                }

                const boardFlightId = Number(data.flight_id);
                if(!Number.isInteger(boardFlightId)){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Invalid flight_id'
                    });
                    break;
                }

                if(!isBoardingOpen(boardFlightId)){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: 'Boarding window expired'
                    });

                    return;
                }

                const boardResponse = await apiRequest({
                    type: 'BoardFlight',
                    apikey: ws.apikey,
                    flight_id: boardFlightId
                });

                if(boardResponse.status !== 'success'){
                    safeSend(ws, {
                        type: 'ERROR',
                        message: boardResponse.data
                    });
                    break;
                }

                safeSend(ws, {
                    type: 'BOARDING_CONFIRMED',
                    flight_id: data.flight_id
                });

                //Notify the ATC that passenger has confirmed boarding
                const bClients = getAllClients();

                bClients.forEach((client) => {
                    if(client.role === 'ATC'){
                        client.socket.send(JSON.stringify({
                            type: 'PASSENGER_BOARDED',
                            passenger: ws.username,
                            flight_id: data.flight_id
                        }));
                    }
                });

                break;

            case 'GET_ALL_FLIGHTS':
                if (ws.role !== 'ATC') {
                    safeSend(ws, { type: 'ERROR', message: 'Unauthorized' });
                    break;
                }
                const allFlightsResponse = await apiRequest({
                    type: 'GetAllFlights',
                    apikey: ws.apikey
                });
                safeSend(ws, {
                    type: 'FLIGHT_LIST',
                    flights: allFlightsResponse.status === 'success' ? allFlightsResponse.data : []
                });
                break;

            case 'GET_MY_FLIGHTS':
                const myFlightsResponse = await apiRequest({
                    type: 'GetAllFlights',
                    apikey: ws.apikey
                });
                safeSend(ws, {
                    type: 'FLIGHT_LIST',
                    flights: myFlightsResponse.status === 'success' ? myFlightsResponse.data : []
                });
                break;

            case 'GET_AIRPORTS':
                safeSend(ws, {
                    type: 'AIRPORT_LIST',
                    airports: getAllAirports()
                });
                break;

            default:
                safeSend(ws, {
                    type: 'ERROR',
                    message: 'Unknown message type' 
                });

        }
    }
    catch(error){
        console.error(error);
        safeSend(ws, {
            type: 'ERROR',
            message: error instanceof SyntaxError ? 'Invalid JSON' : 'Internal server error'
        });
    }
}

module.exports = {handleMessage};