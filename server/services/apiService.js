//Lesego Tebeile, u25143230
//apiService.js
require('dotenv').config();
const axios = require('axios');
const API_URL = process.env.API_URL;

async function apiRequest(body){
    try{
        const response = await axios.post(API_URL, body, {
            header: {
                'Content-Type': 'application/json'
            },
            timeout: 5000 //to avoid hanging forever if API dies
        });

        return response.data;
    }
    catch(error){
        console.error('API Request Error:', error);
        return {
            status: 'error',
            data: 'Failed to connect to API'
        };
    }
}

module.exports = { apiRequest };