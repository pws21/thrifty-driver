const units = {
    "fuel": "L",
    "distance": "km",
    "duration": "min",
    "fare": "€",
    "emission":"kgCO₂"
}

var CASES_PER_PERSON = null;
var MAX_IDLE_TIME = null;

const tollWord = "TOLL";
const freeWord = "FREE";

var gamepad = null;

var personCounter = 0;

var cur_pos_num = 0;
var leaveCounter = 0;

var last_idx = null;
var initialPosition = true;
var personId = null;
var gameEnabled = true;

var data = [];

function ajax_get(url, callback) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            console.log('responseText:' + xmlhttp.responseText);
            try {
                var data = JSON.parse(xmlhttp.responseText);
            } catch(err) {
                console.log(err.message + " in " + xmlhttp.responseText);
                return;
            }
            callback(data);
        }
    };

    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}

function post_result(data) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", "/new_result");
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.send(JSON.stringify(data));
}


function formatMinutes(minutes) {
    var m = minutes % 60;
    var h = (minutes-m) / 60;

    var ret = "";
    if (h > 0) {
        ret = ret + h.toString() + " h ";
    }
    if (m > 0) {
        ret = ret + (m < 10 ? "0" : "") + m.toString() + " m";
    }
    
    return ret;
}



function formatNum(amount, scale) {
    return amount.toFixed(scale);
}


function applyItemData(item, kind, otherKind) {
    console.log("applyItemData "+kind);
    for (var key in item[kind]) {
        var el = document.getElementById(kind + "-" + key);
        //console.log(el);
        if (el !== null) {
            var val = item[kind][key];
            switch (key) {
                case "fuel":
                    val = formatNum(val,1) + units[key] + " / " + formatNum(2.1 * val, 0) + units["emission"] ;
                    break;
                case "fare":
                    if (item[kind]["discount"] < item[kind][key]) {
                        val = "<strike style=\"color: #a50b0b; padding-right: 0.1hv;\">" + formatNum(val,2) + "</strike> " + formatNum(item[kind]["discount"],2) + " " + units[key];
                    } else {
                        val = formatNum(val,2) + " " + units[key];
                    }
                    break;
                case "duration":
                    val = formatMinutes(val);
                    break;
                default:
                    val = val + " " + units[key];
            }
            el.innerHTML = val;

            // which is better?
            var valueStyle = "better";
            if (item[kind][key] > item[otherKind][key]) {
                var valueStyle = "";
            }
            el.className = valueStyle;

        } else {
            //console.log('No element ' + kind + "-" + key);
        }
    }
}

function applyItem(item) {
    applyItemData(item, "free", "toll");
    applyItemData(item, "toll", "free");
}

function stopBlinking() {
    var el = document.getElementById("free");
    el.classList.remove("blink_me");
    var el = document.getElementById("toll");
    el.classList.remove("blink_me");
}

function nextItemAfterDelay(next_idx) {
    applyItem(data[next_idx]);
    cur_pos_num += 1;
    if (cur_pos_num > CASES_PER_PERSON) {
        personCompleteAllCases();
        newPerson();
    } else {
        gameEnabled = true;
    }
    showStat(true);
    updateStat();
    stopBlinking();
}

function fadeIn(el, opacity) {
    if (opacity < 1) {
       opacity += .1;
       setTimeout(function(){fadeIn(el, opacity)},50);
    } else {
        gameEnabled = true;
    }
    el.style.opacity = opacity;
}
function fadeOut(el, opacity) {
    gameEnabled = false;
    if (opacity > 0) {
       opacity -= .1;
       setTimeout(function(){fadeOut(el, opacity)},50);
    }
    el.style.opacity = opacity;
 }

function showStat(show) {
    console.log("showStat "+ show);
    var els = document.getElementsByClassName("stat-grid");

    Array.prototype.forEach.call(els, function(el) {
        // Do stuff here
        var opacity = 0;
        if (show) {
            el.style.display = "block";
            fadeIn(el, 0);
        } else {
            fadeOut(el, 1);
            //el.style.display = "none";
        }
    });
}


function nextItem() {
    console.log("nextItem");
    var next_idx = 0;
    var i = 0
    // next random, but not previous
    do {
        next_idx = Math.floor(Math.random()*data.length);
        console.log("next_rand "+ next_idx);
    }
    while ((last_idx == next_idx && last_idx !== null ) && data.length > 1);
    last_idx = next_idx;
    
    showStat(false);

    setTimeout(nextItemAfterDelay, 1500, next_idx);
    
    leaveCounter = 0;
}

function updateStat(percent) {
    var stat = document.getElementById("stat");
    stat.innerHTML = Math.round(percent*100) + " %" + "<br/> " + personId; 
    
    var greet_stat = document.getElementById("greet-stat");
    if (cur_pos_num > 0) {
        greet_stat.innerHTML = cur_pos_num + " of " + CASES_PER_PERSON;
    } else {
        greet_stat.innerHTML = "";
    }
    
}

function personCompleteAllCases() {
    Swal.fire({
        position: 'center',
        icon: 'success',
        title: 'Thank you!',
        text: 'Take your prize :)',
        showConfirmButton: false,
        timer: 2500,
        target: '#main-container',
        heightAuto: false,
        didOpen: () => {
            gameEnabled = false;
        },
        willClose: () => {
            gameEnabled = true;
        }
      });
}

function newPerson() {
    cur_pos_num = 0;
    personCounter++;
    var x = new Date();
    personId = x.toISOString().replace(/[-TZ:\.]/g,"") + "-"+personCounter;
    
    console.log(personId)
    // next case
    nextItem();
}

function checkPersonLeave() {
    leaveCounter++;
    //console.log(leaveCounter);
    if (MAX_IDLE_TIME) {
        if (leaveCounter > MAX_IDLE_TIME && cur_pos_num > 1) {
            console.log("New person");
            newPerson();
        }
    }

}

function makeChoice(el) {
    if (!gameEnabled) {
        return;
    }
    el.classList.add("blink_me");

    // prepare data
    var post_data = data[last_idx];
    post_data["user_id"] = personId;
    post_data["n"] = cur_pos_num;
    post_data["choice"] = el.id;

    try {
        // send data to server
        post_result(post_data);
    }
    catch (e) {
        console.log(e);
    }

    // show next case
    nextItem();
}


function gameLoop() {
    if(navigator.webkitGetGamepads) {
      var gp = navigator.webkitGetGamepads()[0];
    } else {
      var gp = navigator.getGamepads()[0];
    }

    // print out statistics
    if (!gp) {
        console.log("gameloop stoppped");
        return;
    }

    if (Math.abs(gp.axes[1]) == 1 && gameEnabled) {
        // leafs under wheel
        newPerson();
    }
    
    var currentValue = gp.axes[0];
    var element1 = document.getElementById("toll");
    var element2 = document.getElementById("free");

    updateStat(currentValue);

    //console.log(currentValue);
    if (Math.abs(currentValue) < 0.05 ) {
        currentValue = 0;
        initialPosition = true;
    }
    // turn left (toll)
    if (currentValue <= 0) {
        var subst = "";
        for(var i = 0; i<tollWord.length; i++){
            if (Math.abs(currentValue+1) > (i+1)*0.2  || !gameEnabled) {
                subst += tollWord[i];
            } else {
                subst += '<span style="color: green;">'+tollWord[i]+'</span>';
            }
        }
        element1.innerHTML = subst;
    } 
    // turn right (free)
    if (currentValue >= 0) {
        var subst = "";
        for(var i = 0; i<freeWord.length; i++){
            if (Math.abs(currentValue) > (i+1)*0.2 && currentValue != 0 && gameEnabled) {
                subst += '<span style="color: green;">'+freeWord[i]+'</span>';
            } else {
                subst += freeWord[i];
            }
        }
        element2.innerHTML = subst;
    }
    if (Math.abs(currentValue) > 0.8 && initialPosition) {
        initialPosition = false;
        if (currentValue > 0) {
            makeChoice(element2);
        }
        else {
            makeChoice(element1);
        }
    }
  
    var start = requestAnimationFrame(gameLoop);
  };


function onPageLoad() {
    window.addEventListener("gamepadconnected", function(e) {
        console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
          e.gamepad.index, e.gamepad.id,
          e.gamepad.buttons.length, e.gamepad.axes.length);
        gamepad = e.gamepad;
        gameLoop();
      });
    
      window.addEventListener("gamepaddisconnected", function(e) {
        console.log("Gamepad disconnected from index %d: %s",
          e.gamepad.index, e.gamepad.id);
        //cancelRequestAnimationFrame(start);
      });

      showStat(false);

      // load all data from DB
      ajax_get('/cases', function(resp_data) {
        setInterval(checkPersonLeave, 1000);
        CASES_PER_PERSON = resp_data["cases_per_person"];
        MAX_IDLE_TIME = resp_data["max_idle_time"];
        data = resp_data["cases"];
        newPerson();
      });

      
}

  