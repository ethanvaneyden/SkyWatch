//Lesego Tebeile, u25143230
//server.js

require('dotenv').config();
const WebSocket = require('ws');
const readline = require('readline');

const {handleMessage} = require('./handlers/messageHandler');
const {removeClient, getAllClients} = require('./utils/clientManager');
const {unsubscribe} = require('./utils/subscriptionManager');
const { apiRequest } = require('./services/apiService');
//const { type } = require('os');
const { loadAirports } = require('./services/airportCache');
const { getFlightTrackingData } = require('./services/flightTracker');
const { stopAllFlights } = require('./services/flightTracker');
//const { type } = require('os');
const PORT = process.argv[2];

if(!PORT || PORT < 1024 || PORT > 49151){ //port validation
    console.log('Invalid port. Use ports in range 1024 - 49151');
    process.exit(1);
}

(async () => {
    await loadAirports();
})();

const wss = new WebSocket.Server({port: PORT}); //WebSocket server creation
console.log(`WebSocket server running on port ${PORT}`);

//const clients = new Map(); //Storing connected clients
wss.on('connection', (ws) => {
    //Handling the connections
    console.log('Client connected');
    ws.on('message', async (message) => {
        await handleMessage(ws, message);
    })
    ws.on('close', () => {
        if(ws.role === 'ATC'){
            wss.clients.forEach((client) => {                
                client.send(JSON.stringify({
                    type: 'ATC_DISCONNECTED',
                    message: `ATC ${ws.username} has disconneted`
                }));
            });
        }
        if(ws.username){
            removeClient(ws.username);
        }
        unsubscribe(ws);
        ws.username = null;
        ws.role = null;
        ws.apikey = null;
        console.log('client disconnected');
    });
    ws.on('error', () => {
        ws.terminate();
    });
});

const rl = readline.createInterface({
    //CLI interface
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (line) => {
    if(line.startsWith('FLIGHT_STATUS')){
        const id = line.split(' ')[1];

        apiRequest({
            type: 'GetFlight',
            apikey: process.env.ATC_API_KEY,
            flight_id: id
        })
        .then((response) => {
            if(response.status !== 'success'){
                console.log("Flight not found");
                return;
            }

            const flight = response.data.flight;
            const passengers = response.data.passengers || [];
            const confirmed = passengers.filter(p => p.boarding_confirmed == 1).length;
            const tracking = getFlightTrackingData(id);

            let remaining = 'N/A';

            if(tracking){
                const elapsed = Date.now() - tracking.startedAt;
                const remainMs = Math.max(0, tracking.durationMs - elapsed);

                remaining = `${(remainMs / 1000).toFixed(1)} seconds`;
            }

            console.log(`Flight: ${flight.flight_number} \nStatus: ${flight.status} \nCoordinates: (${flight.current_latitude}, ${flight.current_longitude}) \nPassengers boarded: ${confirmed}/${passengers.length} \nEstimated time remaining: ${remaining}`);
        });
    }

    if(line.startsWith('KILL ')){
        const username = line.split(' ')[1].toLowerCase();
        const client = getAllClients().get(username);

        if(!client){
            console.log('User not found');
            return;
        }

        client.socket.send(JSON.stringify({
            type: 'KILLED',
            message: 'You were disconnected by the server'
        }));

        setTimeout(() => { 
            //used terminate() as it forcefully kills
            //rather than close() as it waits for hanshake
            client.socket.terminate(); 
        } ,100);        
        
        console.log(`${username} was disconnected`);
    }

    if(line === 'QUIT'){        
        console.log('Shutting down server...');
        wss.clients.forEach((client) => {
            client.send(JSON.stringify({
                type: 'SHUTDOWN',
                message: 'Server shutting down'
            }));

            client.close();
        });

        stopAllFlights();        
        setTimeout(() => {
            //end processes after some time to allow sockets for finish sending
            //their shutdown message
            process.exit(0)
        }, 1000);
    }
});