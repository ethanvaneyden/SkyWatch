//Lesego Tebeile, u25143230
//subscriptionManager.js
const subscriptions = new Map();
//flightId => Set of websocket clients
//eg. 1 => Set(ws1, ws3, ws4)
function subscribe(flightId, ws){
    if(!subscriptions.has(flightId)){
        subscriptions.set(flightId, new Set());
    }

    if (subscriptions.get(flightId)?.has(ws)){
        console.log(`${ws.username} is already subscribed to flight ${flightId}`);
        return;
    }
    
    subscriptions.get(flightId).add(ws);
    console.log(`${ws.username} subscribed to flight ${flightId}`);
}

function unsubscribe(ws){
    subscriptions.forEach((clients, flightId) => {
        if(clients.has(ws)){
            clients.delete(ws);
            console.log(`${ws.username} unsubscribed from flight ${flightId}`);
        }

        //removing empty subsciptions
        if(clients.size === 0){
            subscriptions.delete(flightId);
        }
    });
}

function getSubscribers(flightId){
    return subscriptions.get(flightId) || new Set();
}

module.exports = {subscribe, unsubscribe, getSubscribers};