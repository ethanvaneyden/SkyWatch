//Lesego Tebeile, u25143230
//flightMovement.js
class FlightMovement{
    constructor(flight, onUpdate, onComplete){
        this.flight = flight;
        this.onUpdate = onUpdate;
        this.onComplete = onComplete;
        this.progress = 0;
        this.interval = null;
    }

    start(){
        const durationMs = this.flight.flight_duration_hours * 1000;
        const stepTime = 100;

        this.interval = setInterval(() => {
            this.progress += stepTime / durationMs;
            if(this.progress >= 1){
                this.progress = 1;
                this.update();
                this.stop();
                this.onComplete(this.flight);
                return;
            }

            this.update();
        }, stepTime);
    }

    update(){
        const {lat1, lon1, lat2, lon2} = this.flight;
        const lat = lat1 + (lat2 - lat1) * this.progress;
        const lon = lon1 + (lon2 - lon1) * this.progress;

        this.onUpdate({
            flight_id: this.flight.flight_id,
            latitude: lat,
            longitude: lon,
            progress: this.progress
        });
    }

    stop(){
        clearInterval(this.interval);
    }
}

module.exports = FlightMovement;