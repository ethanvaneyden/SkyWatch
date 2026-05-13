//Lesego Tebeile, u25143230
require('dotenv').config();

const WebSocket = require('ws');
const readline = require('readline');
const PORT = process.argv[2];

if(!PORT || PORT < 1024 || PORT > 49151){ //port validation
    console.log('Invalid port. Use ports in range 1024 - 49151');
    process.exit(1);
}

const wss = new WebSocket.Server({port: PORT}); //WebSocket server creation
console.log(`WebSocket server running on port ${PORT}`);

const clients = new Map(); //Storing connected clients
wss.on('connection', (ws) => {
    //Handling the connections
    console.log('Client connected');
    ws.on('message', (message) => {
        console.log('Received', message.toString());
    })
    ws.on('close', () => {
        console.log('client disconnected');
    });
});

const rl = readline.createInterface({
    //CLI interface
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (line) => {
    if(input === 'QUIT'){
        console.log('Shutting down server...');
        wss.clients.forEach((client) => {
            client.send(JSON.stringify({
                type: 'SHUTDOWN',
                message: 'Server shutting down'
            }));

            client.close();
        });

        process.exit(0);
    }
});