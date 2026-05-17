//Lesego Tebeile
function safeSend(ws, payload){
    try{
        if(ws.readyState === 1){
            ws.send(JSON.stringify(payload));
        }
    }
    catch(error){
        console.error('Socket send error:', error.message);
        try{
            ws.terminate(); //incase there is an error, to prevent unexpected system behaviours
        }
        catch{}
    }
}

module.exports = { safeSend };