//Lesego Tebeile, u25143230
//server.js

require('dotenv').config();
const {handleMessage} = require('./handlers/messageHandler');
const {removeClient, getAllClients} = require('./utils/clientManager');
const {unsubscribe} = require('./utils/subscriptionManager');
const WebSocket = require('ws');
const readline = require('readline');
//const { type } = require('os');
const PORT = process.argv[2];

if(!PORT || PORT < 1024 || PORT > 49151){ //port validation
    console.log('Invalid port. Use ports in range 1024 - 49151');
    process.exit(1);
}

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
        if(ws.username){
            removeClient(ws.username);
        }
        unsubscribe(ws);        
        console.log('client disconnected');
    });
});

const rl = readline.createInterface({
    //CLI interface
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (line) => {
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

        setTimeout(() => {
            //end processes after some time to allow sockets for finish sending
            //their shutdown message
            process.exit(0)
        }, 1000);
    }
});
