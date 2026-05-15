//Lesego Tebeile, u25143230
//flightTracker.js
const FlightMovement = require('../utils/flightMovement');
const { getSubscribers , unsubscribe } = require('../utils/subscriptionManager');
const { apiRequest } = require('./apiService');
const activeFlights = new Map();

function startFlightTracking(flight){
    if(activeFlights.has(flight.flight_id)){
        return false;
    }

    const movement = new FlightMovement(flight, 
        async(update) => {
            await apiRequest({
                //update api
                type: 'UpdateFlightPosition',
                internal_key: process.env.INTERNAL_API_KEY,
                flight_id: update.flight_id,
                latitude: update.latitude,
                longitude: update.longitude
            });

            //broadcast to subscribers
            const subscribers = getSubscribers(update.flight_id);
            subscribers.forEach((ws) => {
                if(ws.readyState === 1){
                    ws.send(JSON.stringify({
                        type: 'FLIGHT_UPDATE',
                        flight_id: update.flight_id,
                        latitude: update.latitude,
                        longitude: update.longitude,
                        progress: update.progress
                    }));
                }
            });
        },

        async(flight) => {
            await apiRequest({
                //update api
                type: 'UpdateFlightPosition',
                internal_key: process.env.INTERNAL_API_KEY,
                flight_id: flight.flight_id,
                latitude: flight.latitude,
                longitude: flight.longitude,
                status: 'Arrived'
            });

            //broadcast to subscribers
            const subscribers = getSubscribers(flight.flight_id);
            subscribers.forEach((ws) => {
                if(ws.readyState === 1){
                    unsubscribe(ws);
                    ws.send(JSON.stringify({
                        type: 'FLIGHT_COMPLETE',
                        flight_id: flight.flight_id
                    }));
                }                
            });

            activeFlights.delete(flight.flight_id); //not sure if i have to check for any exceptions/error
        }
    );

    movement.start();
    activeFlights.set(flight.flight_id, movement);

    return true;
}

module.exports = {startFlightTracking};