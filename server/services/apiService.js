//Lesego Tebeile, u25143230
//apiService.js
require('dotenv').config();
const axios = require('axios');
const API_URL = process.env.API_URL;

async function apiRequest(body){
    if(!API_URL){
        return {
            status: 'error',
            data: 'API_URL is not configured',
            responseCode: 500
        };
    }

    try{
        const response = await axios.post(API_URL, body, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 5000 //to avoid hanging forever if API dies
        });

        return response.data;
    }
    catch(error){
        if(error.response){
            // If API responded with error (like 401, 400, etc)
            return {
                status: "error",
                data: error.response.data,
                responseCode: error.response.status
            }
        }

        //OR Network or timeout error
        return {
            status: 'error',
            data: 'Network error contacting API',
            responseCode: 500
        };
    }
}

module.exports = { apiRequest };