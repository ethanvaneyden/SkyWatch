//Lesego Tebeile, u25143230
//messageHandler.js
const {addClient, getClient} = require('../utils/clientManager');
const {subscribe, getSubscribers} = require('../utils/subscriptionManager');
const { apiRequest } = require('../services/apiService');
const { startFlightTracking } = require('../services/flightTracker');
async function handleMessage(ws, message){
    try{
        const data = JSON.parse(message.toString());

        if(!data.type){
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'Missing request type'
            }));

            return;
        }

        switch(data.type.toUpperCase()){
            case 'LOGIN':
                if(!data.email || !data.password){
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Email and password required'
                    }));

                    break;
                }

                const response = await apiRequest({
                    type: 'Login',
                    email: data.email,
                    password: data.password
                });

                if(response.status !== 'success'){
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: response.data
                    }));

                    break;
                }

                const user = response.data;

                if(getClient(user.email)){
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'User already connected'
                    }));

                    break;
                }

                ws.username = user.email;
                ws.role = user.type;
                ws.apikey = user.apikey;

                addClient(user.email, ws, user.type, user.apikey);

                ws.send(JSON.stringify({
                    type: 'LOGIN_SUCCESS',
                    role: user.type,
                    message: 'Logged in successfully'
                }));
                
                break;

                case 'TRACK':                    
                    if(data.flight_id === undefined || data.flight_id == null /*|| typeof data.flight_id !== 'number'*/){
                        ws.send(JSON.stringify({
                            type: 'ERROR',
                            message: 'Missing flight_id'
                        }));

                        break;
                    }

                    if(!ws.username){
                        ws.send(JSON.stringify({
                            type: 'ERROR',
                            message: 'Please login first'
                        }));

                        break;
                    }

                    const flightIdNUM = Number(data.flight_id);
                    if(!Number.isInteger(flightIdNUM)){
                        ws.send(JSON.stringify({
                            type: 'ERROR',
                            message: 'Invalid flight_id'
                        }));

                        break;
                    }

                    if(ws.role !== 'ATC'){
                        const flightCheck = await apiRequest({
                            type: 'GetFlight',
                            apikey: ws.apikey,
                            flight_id: data.flight_id
                        })

                        if(flightCheck.status !== 'success'){
                            ws.send(JSON.stringify({
                                type: 'ERROR',
                                message: 'Not allowed to track this flight'
                            }));

                            break;
                        }
                    }

                    const clients = getSubscribers(data.flight_id);
                
                    if(clients.has(ws)){
                        ws.send(JSON.stringify({
                            type: 'ERROR',
                            message: `${ws.username} already subscribed to flight ${data.flight_id}`
                        }));

                        break;
                    }
                    
                    subscribe(data.flight_id, ws);
                    ws.send(JSON.stringify({
                        type: 'TRACKING',
                        message: `${ws.username} subscribed to flight ${data.flight_id}`
                    }));

                    break;

                case 'DISPATCH':
                    if(ws.role !== 'ATC'){
                        ws.send(JSON.stringify({
                            type: 'ERROR',
                            message: 'Only ATC can dispatch flights'
                        }));

                        break;
                    }

                    const response = await apiRequest({
                        type: 'DispatchFlight',
                        apikey: ws.apikey,
                        flight_id: data.flight_id
                    });

                    if(response.status !== 'success'){
                        ws.send(JSON.stringify({
                            type: 'ERROR',
                            message: response.data
                        }));

                        break;
                    }

                    const flightResponse = await apiRequest({
                        type: 'GetFlight',
                        apikey: ws.apikey,
                        flight_id: data.flight_id
                    });

                    if(flightResponse.status !== 'success'){
                        ws.send(JSON.stringify({
                            type: 'ERROR',
                            message: 'Unable to retrieve flight'
                        }));

                        break;
                    }

                    startFlightTracking(flightResponse.data.flight);

                    ws.send(JSON.stringify({
                        type: 'DISPATCHED',
                        message: data.flight_id
                    }));

                    break;

                default:
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Unknown message type' 
                    }));

        }
    }
    catch(error){
        console.error(error);
        ws.send(JSON.stringify({
            type: 'ERROR',
            message: error instanceof SyntaxError ? 'Invalid JSON' : 'Internal server error'
        }));
    }
}

module.exports = {handleMessage};