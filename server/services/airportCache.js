//Lesego Tebeile, u25143230
const { apiRequest } = require('./apiService');

let airports = [];

async function loadAirports(){
    const response = await apiRequest({
        type: 'GetAirports',
        apikey: process.env.ATC_API_KEY
    });

    if(response.status === 'success'){
        airports = response.data;
        console.log(`Loaded ${airports.length} airports`);
    }
}

function getAirport(id){
    return airports.find(a => a.id == id);
}

module.exports = { loadAirports, getAirport };