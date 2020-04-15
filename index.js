//Load express module with `require` directive
var express = require('express');
var app = express();
var request = require('request');
var now = require("performance-now");
var fs = require("fs");
var Sounds = require("./testData/Final_Data");
var PTSoundRequests = Sounds.sounds;

var NO_OF_REQUESTS = 1000; 
var arr = Array(NO_OF_REQUESTS).fill(NO_OF_REQUESTS);
var CALL_COUNTER = 0;

global.RUN_DATA = [];
global.RUN_DATA_TIMING = [];
global.PREV_CALLS = [];
global.ERRORS = [];

//Define request response in root URL (/)
app.get('/ping', function (req, res) {
  res.send('Hello World')
})

app.get('/send-request', function (req, res) {
  /* To DO */
})

//Launch listening server on port 8080
app.listen(8080, function () {
  console.log('App listening on port 8080!')
})

function getRamdomIndex() {
  var i = Math.floor(Math.random() * PTSoundRequests.length);
  if(global.PREV_CALLS.indexOf(i) == -1) {
    global.PREV_CALLS.push(i);
    return PTSoundRequests[i];
  } else {
    return getRamdomIndex();
  }
}

function prepareRequest() {
  var soundRequestString = getRamdomIndex();
  // var url = 'http://localhost:7777/omni-content/concat-sound?'+soundRequestString;
  var url = 'https://staging-node.splashmath.com/omni-content/concat-sound?'+soundRequestString;

  var options = {
    url: url,
    method: 'GET'
  };

  return options;
}

const initiateLoadTest = async _ => {
  try {
    for(let i=0; i<arr.length; i++) {
      var options = prepareRequest();
      await startTest(options);
    }

    downloadTestLogs(`T-${NO_OF_REQUESTS}.json`, global.RUN_DATA);
    if(global.ERRORS.length > 0) {
      console.log('Error Count from Status Callbacks: %j',global.ERRORS.length);
      downloadErrorLogs(`Error-${NO_OF_REQUESTS}.json`, global.ERRORS);
      global.ERRORS = [];
    }
  } catch(e) {
    console.dir(e);
  }
}

const startTest = (options, i) => {
  return test(options).then(v => console.log(v));
}

const test = options => {
  return new Promise((resolve, reject) => {
    var startTime = now();
    request(options, function (err, data) {
      if (!err && data.statusCode == 200) {
        console.dir(data.body);
        global.RUN_DATA.push({
          'Request #:' : CALL_COUNTER,
          'Req Status:' : data.body,
        });
        var endTime = now();
        var result = (endTime-startTime).toFixed(3);
        console.log('Success!, time: '+Math.round(result / 1000)+'s');
        resolve(`*** ${CALL_COUNTER+1} Requests Completed ! ***\n`);
        CALL_COUNTER++;
      } else {
        var endTime = now();
        var result = (endTime-startTime).toFixed(3);
        console.log('Request# '+(CALL_COUNTER+1)+' Failure!, time: '+Math.round(result / 1000)+'s');
        console.dir(err);
        global.ERRORS.push({'Call #: ':CALL_COUNTER, 'Error: ':err});
        reject(`*** ${CALL_COUNTER+1} Got an error: ${err}`);
        CALL_COUNTER++;
      }
    });
  });
}

function downloadTestLogs(fileName, data) {
  // var averageTimeTaken = getAverageTimeOfEachRequest(global.RUN_DATA_TIMING);
  fs.writeFile(fileName, JSON.stringify(data), 'utf8', function(err) {
    if(!err) {
      console.log('Test Data Written in: '+fileName);
      console.log(`\nTotal Requests Made: ${CALL_COUNTER}`);//\nAverage time taken by each requests is: ${averageTimeTaken}s\n`);
      global.RUN_DATA = [];
      global.RUN_DATA_TIMING = [];
      global.PREV_CALLS = [];
      return;
    } else {
      console.log('Error while writting to: '+fileName);
    }
  })
}

async function run() {
  try {
    await initiateLoadTest();
  } catch (e) {
    console.error("Caught exception ==> "+e);
  } finally {
    console.log('We do cleanup here');
  }
}

run();