// Load stratagem data
let stratagems = JSON.parse(data).list;
let gpPollInterval;
const gpPollRate = 1000;
const gpButtonToKeyMap = {
    12: "KeyW", // Up
    13: "KeyS", // Down
    14: "KeyA", // Left
    15: "KeyD"  // Right
};

// Install keypress listener
addEventListener("keydown", (event) => {
    if (event.isComposing || event.code === 229) {
        return;
    }
    keypress(event.code);
});

// Poll for gamepad connection
gpPollInterval = setInterval(pollGamepads, gpPollRate);

function pollGamepads() {
    const gamepads = navigator.getGamepads();

    // If any gamepad is connected, start the gamepad loop
    if (gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3]) {
        gamepadLoop();
        clearInterval(gpPollInterval);
    }
}


// Gamepad input handling
let prevButtons = new Array(16).fill(false);

function gamepadLoop() {
    const gamepads = navigator.getGamepads();
    // Get the first non-null gamepad
    const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];

    if (!gp) {
        return;
    }

    for (let i in gpButtonToKeyMap) {
        if (gp.buttons[i].pressed && !prevButtons[i]) {
            keypress(gpButtonToKeyMap[i]);
        }
    }

    // Update previous buttons state
    for (let i = 0; i < gp.buttons.length; i++) {
        prevButtons[i] = gp.buttons[i].pressed;
    }

    requestAnimationFrame(gamepadLoop);
}

// Load SFX
var sfxDown = new Audio("./Images/Sounds/1_D.mp3");
var sfxLeft = new Audio("./Images/Sounds/2_L.mp3");
var sfxRight = new Audio("./Images/Sounds/3_R.mp3");
var sfxUp = new Audio("./Images/Sounds/4_U.mp3");
var sfxGameOver = [new Audio("./Images/Sounds/GameOver1.mp3"), new Audio("./Images/Sounds/GameOver2.mp3")]

// Create global tracking variables
var gameState = "initial" //initial, running, hitlag, over
var currentSequenceIndex = 0;
var currentRefreshIndex = 0;
var currentArrowSequenceTags = undefined;
var refreshArrowSequenceTags;
const TOTAL_TIME = 10000;
const COUNTDOWN_STEP = 10;
const NEW_STRATEGEM_TIMEOUT = 200;
const CORRECT_TIME_BONUS = 1000;
const FAILURE_SHAKE_TIME = 200;
var timeRemaining = TOTAL_TIME;
var completedStrategemsList = [];
var completedStrategemsValuesList = [];
var tempCompStratValueslist = [];
const CURRENT_STRATAGEM_LIST_LENGTH = 4; //dependent on the html, don't change without modifying html too
var currentStratagemsList = [];
var lastCheckedTime = undefined;
var keyPressScore = 0;
var timeAtSequenceStart = 0;
var completionTimeMulti = 0;
var completionLengthMulti = 0;
var keyPressScoreToAdd = 0;
var timeleftf = 0;
var timelefti = 0;



// Show directional buttons if user is on mobile
if(userIsMobile())
    showMobileButtons();

// Load first stratagems
for(let i = 0; i < CURRENT_STRATAGEM_LIST_LENGTH; i++){
    currentStratagemsList.push(pickRandomStratagem());
}

// Show stratagems
refreshStratagemDisplay();

// Bootstrap countdown timer
countDown();

//~~~//

function keypress(keyCode){
    // Ignore invalid keypresses
    let sfx;
    switch(keyCode){
        case "KeyW":
        case "ArrowUp":
            sfx = sfxUp;
            keyCode = "KeyW";
            break;
        case "KeyS":
        case "ArrowDown":
            sfx = sfxDown;
            keyCode = "KeyS";
            break;
        case "KeyA":
        case "ArrowLeft":
            sfx = sfxLeft;
            keyCode = "KeyA";
            break;
        case "KeyD":
        case "ArrowRight":
            sfx = sfxRight;
            keyCode = "KeyD";
            break;
        default: 
            return;
    }

    //b

    //Route keypress to proper handling function
    switch(gameState){
        case "initial":
            gameState = "running";
            // Exclusion of `break;` here is intentional. The first keypress of the game should apply to the sequence
        case "running":
            checkGameKeypress(keyCode, sfx);
            break;
        case "over":
            checkRefreshKeypress(keyCode, sfx);
            break;
        case "hitlag":
            break;
    }
}

function checkGameKeypress(keyCode, sfx){
    // Check the keypress against the current sequence
    if(keyCode == currentArrowSequenceTags[currentSequenceIndex].code){
        //Success, apply the success
        currentSequenceIndex++;
        
        //Check if that success completes the entire sequence. 
        if(currentSequenceIndex == currentArrowSequenceTags.length){
           

            // apply a score multiplier based on time per button press. (more button presses in a sequence yeilds a higher multi) [Broken]
            completionTimeMulti = Math.floor(20000 / ((timelefti - timeRemaining) / currentStratagemsList[0].sequence.length));
            completionLengthMulti = Math.ceil(currentStratagemsList[0].sequence.length ** 1.2);
            keyPressScoreToAdd = 2 * completionLengthMulti  * completionTimeMulti;
            keyPressScore += keyPressScoreToAdd

             //Add time bonus and pause the countdown for the delay time
             timeRemaining += CORRECT_TIME_BONUS;
             gameState = "hitlag";
 

            //Add completed stratagem to completed list and remove from active list
            
            completedStrategemsList.push([currentStratagemsList.shift(), `Time Multi: ${completionTimeMulti}x - Length Multi: ${completionLengthMulti}x - Score Added: +${keyPressScoreToAdd}`]);
            
        

            //Add a new stratagem to the active list
            currentStratagemsList.push(pickRandomStratagem());

            //Set a delay for when the timer should unpause and the next stratagem should be loaded
            setTimeout(() => {
                currentSequenceIndex = 0;
                refreshStratagemDisplay();
                gameState = "running";
            }, NEW_STRATEGEM_TIMEOUT);
        }
    }
    else if (keyCode == currentArrowSequenceTags[0].code){
        //Edge case; if they're wrong but their input is the same as the first code, reset to first.
        currentSequenceIndex = 1;

        //Play failure animation
        shakeArrows(FAILURE_SHAKE_TIME);
    }
    else{
        //Failure, reset progress
        currentSequenceIndex = 0;

        //Play failure animation
        shakeArrows(FAILURE_SHAKE_TIME);
    }   

    updateArrowFilters(currentArrowSequenceTags, currentSequenceIndex);

    // Play/replay sound
    sfx.paused ? sfx.play() : sfx.currentTime = 0;
}

function checkRefreshKeypress(keyCode, sfx){
    // Check the keypress against the current sequence
    if(keyCode == refreshArrowSequenceTags[currentRefreshIndex].code){
        //Success, apply the success
        currentRefreshIndex++;
        
        //If that completes the entire sequence, reload the window after a short delay
        if(currentRefreshIndex == refreshArrowSequenceTags.length){
            setTimeout(() => {
                window.location.reload()
            }, 300);
        }
    }
    updateArrowFilters(refreshArrowSequenceTags, currentRefreshIndex);

    // Play/replay sound
    sfx.paused ? sfx.play() : sfx.currentTime = 0;
}

function updateArrowFilters(arrowTags, index){
    for(i = 0; i < arrowTags.length; i++){
        arrowTags[i].setAttribute("class", i < index ? "arrow-complete-filter" : "arrow-incomplete-filter")
    }
}

function shakeArrows(time){
    document.getElementById("arrows-container").setAttribute("style", `animation: shake ${time/1000}s;`);

    setTimeout(() => {
        document.getElementById("arrows-container").removeAttribute("style");
    }, 200);
}

function refreshStratagemDisplay(){
    for(let i in currentStratagemsList){
        // Show the stratagem's picture in the correct slot
        document.getElementById(`stratagem-icon-${i}`).src = `./Images/Stratagem\ Icons/${currentStratagemsList[i].image}`;
    }

    // Show arrow icons for the current active stratagem
    currentArrowSequenceTags = showArrowSequence(currentStratagemsList[0].sequence);

    // Show active stratagem name
    document.getElementById("stratagem-name").innerHTML = currentStratagemsList[0].name;

    // Get the current time remaining for score multiplier [Broken?]
    timelefti =  timeRemaining
}

function pickRandomStratagem(){
    return stratagems[Math.floor(Math.random() * stratagems.length)];
}

function showArrowSequence(arrowSequence, arrowsContainer){
    if(arrowsContainer == undefined)
        arrowsContainer = document.getElementById("arrows-container");

    // Remove all table elements of old arrows
    arrowsContainer.innerHTML = '';

    //Create new arrow elements
    let arrowTags = [];
    for(arrow of arrowSequence){
        let td = document.createElement("td");
        let img = document.createElement("img");
        td.appendChild(img);
        img.setAttribute("src", `./Images/Arrows/${arrow}`);
        img.setAttribute("class", `arrow-incomplete-filter`);

        // Map filename to keycode
        switch(arrow){
            case "Arrow_4_U.png":
                img.code = "KeyW";
            break;
            case "Arrow_1_D.png":
                img.code = "KeyS";
            break;
            case "Arrow_2_L.png":
                img.code = "KeyA";
            break;
            case "Arrow_3_R.png":
                img.code = "KeyD";
            break;
        }
        arrowsContainer.appendChild(td);
        arrowTags.push(img);
    }
    return arrowTags;
}

function gameOver(){
    //Stop the game
    gameState = "over";

    // Retrieve highscore from localStorage if available
    var highscore = localStorage.getItem('highscore');

    // Compare current score with highscore and update if necessary
if (keyPressScore > highscore) {
    highscore = keyPressScore;
    // Update highscore in localStorage
    localStorage.setItem('highscore', highscore);
}

    let formattedScore = keyPressScore.toLocaleString();
    let formattedHighScore = highscore.toLocaleString();

    // Write score to readout
    let scoreReadout = document.getElementById("score-readout");
    scoreReadout.innerHTML = `SCORE: ${formattedScore} <br> Highscore: ${formattedHighScore}`;

    // Write completed strategems to readout
    let stratagemReadout = document.getElementById("completed-strategems-readout");
    stratagemReadout.innerHTML = stratagemListToString(true);

    // Show refresh arrow sequence
    let sequence = ["Arrow_4_U.png", "Arrow_1_D.png", "Arrow_3_R.png", "Arrow_2_L.png", "Arrow_4_U.png"];
    let container = document.getElementById("refresh-arrows-container");
    refreshArrowSequenceTags = showArrowSequence(sequence, container);

    // Hide the game
    let game = document.getElementById("interactable-center-container");
    game.setAttribute("hidden", "hidden");
    game.style.visibility = "invisible";

    // Show the popup
    let popup = document.getElementById("game-over-popup");
    popup.removeAttribute("hidden");
    popup.style.visibility = "visible";

    // Play game over sfx
    sfxGameOver[Math.floor(Math.random() * sfxGameOver.length)].play();
}

function stratagemListToString(html, spamless) {
    // Set direction characters
    let up = "🡅", down = "🡇", left = "🡄", right = "🡆";
    if (spamless) {
        up = "U", down = "D", left = "L", right = "R";
    }

    let maxLength = 0;
    let lines = [];

    // Find the maximum length
    for (let sublist of completedStrategemsList) {
        if (sublist.length > 0) { // Check if sublist is not empty
            let firstStratagem = sublist[0]; // Access the first entry of the sublist
            let line = `${firstStratagem.name}: `;

            // Put arrows
            for (let arrow of firstStratagem.sequence) {
                switch (arrow) {
                    case "Arrow_4_U.png":
                        line += up;
                        break;
                    case "Arrow_1_D.png":
                        line += down;
                        break;
                    case "Arrow_2_L.png":
                        line += left;
                        break;
                    case "Arrow_3_R.png":
                        line += right;
                        break;
                }
            }

            

            // Calculate padding length
            let paddingLength = maxLength - line.length;
            if (paddingLength > 0) {
                line += "-".repeat(paddingLength);
            }
            if (line.length > maxLength) {
                maxLength = line.length;
            }

            // Check if there's a second entry in the sublist
            let secondEntry = "";
            if (sublist.length > 1) {
                secondEntry = ` ${sublist[1]}`;
            }
            // Concatenate the second entry to the line
            line += secondEntry;

            // Store line itself
            lines.push(line);

           
        }
    }

    let re = "";
    for (let line of lines) {
        re += line;
        re += html ? "<br>" : "\n";
    }
    return re;
}

function copyShare(spamless){
    // Gather text and write to clipboard
    let output = `## My Stratagem Hero Online Score: ${keyPressScore}\n`
    output += stratagemListToString(false, spamless);
    output += "Do your part! Play Stratagem Hero Online: https://combustibletoast.github.io/"
    navigator.clipboard.writeText(output);

    //Change button's text
    let buttonElement = document.getElementById(`share-button${spamless ? "-spamless" : ""}`);
    let buttonOriginalText = buttonElement.innerHTML;
    buttonElement.innerHTML = "Copied!";

    //Set timeout to change it back
    //Doesn't work, unable to pass in original text
    setTimeout(() => {
        buttonElement.innerHTML = buttonOriginalText;
    }, 3000);
}

async function countDown(){
    if(gameState == "over")
        return;

    if(timeRemaining <= 0){
        gameOver();
        return;
    }

    //Calculate the true delta time since last check
    //This should fix #2 
    if(lastCheckedTime == undefined)
        lastCheckedTime = Date.now();
    let now = Date.now();
    let trueDeltaT = now-lastCheckedTime;
    lastCheckedTime = now;

    // Immediately Set timeout for next countdown step
    setTimeout(() => {
        countDown();
        // console.log(timeRemaining)
    }, COUNTDOWN_STEP);

    // Apply countdown if it's not paused
    if(gameState != "hitlag" && gameState != "initial")
        timeRemaining -= trueDeltaT;
    updateTimeBar();
}

function updateTimeBar(){
    let bar = document.getElementById("time-remaining-bar");  
    let width = (timeRemaining/TOTAL_TIME) * 100;
    // console.log(width);
    bar.style.width = `${width}%`;   
}

async function sleep(ms){
    await new Promise(r => setTimeout(r, ms));
}

function userIsMobile() {
    return navigator.userAgent.match(/Android/i)
    || navigator.userAgent.match(/webOS/i)
    || navigator.userAgent.match(/iPhone/i)
    || navigator.userAgent.match(/iPad/i)
    || navigator.userAgent.match(/iPod/i)
    || navigator.userAgent.match(/BlackBerry/i)
    || navigator.userAgent.match(/Windows Phone/i);
}

function showMobileButtons() {
    container = document.getElementById("mobile-button-container");
    
    container.removeAttribute("hidden");
    container.style.visibility = "visible";
}