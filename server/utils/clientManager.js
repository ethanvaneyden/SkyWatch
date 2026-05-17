//Lesego Tebeile, u25143230
//clientManager.js
const client = new Map() //Storing connected clients

function addClient(username, socket, role, apiKey){
    client.set(username.toLowerCase(), {socket, role, apiKey});
    console.log(`${username.toLowerCase()} connected as ${role}`);
}

function removeClient(username){
    client.delete(username.toLowerCase());
    console.log(`${username.toLowerCase()} disconnected`);
}

function getClient(username){
    return client.get(username.toLowerCase());
}

function getAllClients(){
    return client;
}

module.exports = {addClient, removeClient, getClient, getAllClients};