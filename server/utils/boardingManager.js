//Lesego Tebeile, u25143230
const boardingWindows = new Map();

function startBoardingWindow(flightId, durationSeconds = 60, onExpire = null){
    const expiresAt = Date.now() + (durationSeconds * 1000);
    const timeout = setTimeout(() => {
        boardingWindows.delete(flightId);

        if(onExpire){
            onExpire(flightId);
        }
    }, durationSeconds * 1000);

    boardingWindows.set(flightId, {
        expiresAt,
        timeout
    });
}

function isBoardingOpen(flightId){
    const boarding = boardingWindows.get(flightId);

    if(!boarding){
        return false;
    }

    return Date.now() < boarding.expiresAt;
}

function closeBoardingWindow(flightId){
    const boarding = boardingWindows.get(flightId);

    if(boarding){
        clearTimeout(boarding.timeout);
    }

    boardingWindows.delete(flightId);
}

module.exports = { startBoardingWindow, isBoardingOpen, closeBoardingWindow};