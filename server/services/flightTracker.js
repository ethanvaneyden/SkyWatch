//Lesego Tebeile, u25143230
//flightTracker.js
const FlightMovement = require('../utils/flightMovement');
const { getSubscribers , unsubscribe } = require('../utils/subscriptionManager');
const { apiRequest } = require('./apiService');
const {safeSend} = require('../utils/socketUtils');
const activeFlights = new Map();

function startFlightTracking(flight){
    if(activeFlights.has(flight.flight_id)){
        return false;
    }

    const internalKey = process.env.INTERNAL_API_KEY;
    if(!internalKey){
        console.error('INTERNAL_API_KEY is not configured. Cannot start flight tracking.');
        return false;
    }

    if(!flight.flight_duration_hours || Number(flight.flight_duration_hours) <= 0){
        console.warn('Invalid or missing flight_duration_hours. Defaulting to 1 hour.');
        flight.flight_duration_hours = 1;
    }

    let started = false;

    const movement = new FlightMovement(flight, 
        async(update) => {
            try{
                await apiRequest({
                    //update api
                    type: 'UpdateFlightPosition',
                    internal_key: process.env.INTERNAL_API_KEY,
                    flight_id: update.flight_id,
                    latitude: update.latitude,
                    longitude: update.longitude,
                    status: started ? null : 'In Flight'
                });
            }
            catch(error){
                console.error('Flight update failed:', error.message);
            }

            started = true;

            //broadcast to subscribers
            const subscribers = getSubscribers(update.flight_id);
            subscribers.forEach((ws) => {
                if(ws.readyState === 1){
                    safeSend(ws, {
                        type: 'POSITION',
                        flight_id: update.flight_id,
                        latitude: update.latitude,
                        longitude: update.longitude,
                        progress: update.progress
                    });
                }
            });
        },

        async(flight) => {
            try{
                await apiRequest({
                    //update api
                    type: 'UpdateFlightPosition',
                    internal_key: process.env.INTERNAL_API_KEY,
                    flight_id: flight.flight_id,
                    latitude: flight.latitude,
                    longitude: flight.longitude,
                    status: 'Landed'
                });
            }
            catch(error){
                console.error('Landing update failed:', error.message);
            }

            //broadcast to subscribers
            const subscribers = getSubscribers(flight.flight_id);
            subscribers.forEach((ws) => {
                if(ws.readyState === 1){
                    unsubscribe(ws, flight.flight_id);;
                    safeSend(ws, {
                        type: 'LANDED',
                        flight_id: flight.flight_id
                    });
                }                
            });

            activeFlights.delete(flight.flight_id); //not sure if i have to check for any exceptions/error
        }
    );

    movement.start();
    activeFlights.set(flight.flight_id, {
        movement,
        startedAt: Date.now(),
        durationMs: flight.flight_duration_hours * 1000
    });

    return true;
}

function stopFlightTracking(flightId){
    const tracking = activeFlights.get(flightId);

    if(!tracking){
        return;
    }

    tracking.movement.stop();
    activeFlights.delete(flightId);
}

function stopAllFlights(){
    activeFlights.forEach((tracking, id) => {
        tracking.movement.stop();
    });

    activeFlights.clear();
}

function getFlightTrackingData(flightId){
    return activeFlights.get(flightId);
}

module.exports = { startFlightTracking, stopAllFlights, stopFlightTracking, getFlightTrackingData };