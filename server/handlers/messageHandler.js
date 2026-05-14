//Lesego Tebeile, u25143230
//messageHandler.js
const {addClient, getClient} = require('../utils/clientManager');
const {subscribe, getSubscribers} = require('../utils/subscriptionManager');
const { apiRequest } = require('../services/apiService');

async function handleMessage(ws, message){
    try{
        const data = JSON.parse(message.toString());
        switch(data.type){
            case 'LOGIN':
                /*if(!data.username || !data.role){
                        ws.send(JSON.stringify({
                            type: 'ERROR',
                            message: 'Missing username or role'
                        }));

                        break;
                }

                const username = data.username.toLowerCase();
                const role = data.role.toUpperCase();
                const validRoles = ['ATC', 'PASSENGER'];

                if(!validRoles.includes(role)){
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'Invalid role'
                    }))

                    break;
                }
                
                const existingClient = getClient(username);
                
                if(existingClient){
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: `${username} is already connected`
                    }));

                    break;
                }
                if(ws.username){
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: `${ws.username} is already logged in on this connection`
                    }));

                    break;
                }

                addClient(username, ws, role);
                ws.username = username;
                ws.role = role;
                ws.send(JSON.stringify({
                    type: 'LOGIN_SUCCESS',
                    message: 'Logged in successfully'
                }));*/

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

                const user = response.data.user;

                if(getClient(user.email)){
                    ws.send(JSON.stringify({
                        type: 'ERROR',
                        message: 'User already connected'
                    }));

                    break;
                }

                ws.username = user.email;
                ws.role = user.type;
                ws.apikey = response.data.apikey;

                addClient(user.email, ws, user.type);

                ws.send(JSON.stringify({
                    type: 'LOGIN_SUCCESS',
                    role: user.type,
                    message: 'Logged in successfully'
                }));
                
                break;

                case 'TRACK':                    
                    if(data.flight_id === undefined || data.flight_id == null || typeof data.flight_id !== 'number'){
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
            message: 'Invalid JSON'
        }))
    }
}

module.exports = {handleMessage};