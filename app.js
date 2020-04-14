var loadtest = require('loadtest');
var fs = require("fs");
var keepAliveAgent = require("agentkeepalive");
var Sounds = require("./testData/Final_Data");
var NO_OF_REQUESTS = 20; 
var CONCURRENCY = 10;
var arr = Array(NO_OF_REQUESTS).fill(NO_OF_REQUESTS);
var CALL_COUNTER = 0;

global.RUN_DATA = [];
global.RUN_DATA_TIMING = [];
global.PREV_CALLS = [];
global.ERRORS = [];

var PTSoundRequests = Sounds.sounds;

function downloadTestLogs(fileName, data) {
  var averageTimeTaken = getAverageTimeOfEachRequest(global.RUN_DATA_TIMING);
  fs.writeFile(fileName, JSON.stringify(data), 'utf8', function(err) {
    if(!err) {
      console.log('Test Data Written in: '+fileName);
      console.log(`\nTotal Requests Made: ${CALL_COUNTER}\nAverage time taken by each requests is: ${averageTimeTaken}s\n`);
      console.timeEnd('Script ran in');
      global.RUN_DATA = [];
      global.RUN_DATA_TIMING = [];
      global.PREV_CALLS = [];
      return;
    } else {
      console.log('Error while writting to: '+fileName);
    }
  })
}

function getAverageTimeOfEachRequest(data) {
  var initialValue = 0
  var sum = data.reduce((accumulator, currentValue) => accumulator + currentValue["Time Taken"], initialValue);
  var avgTime = sum/CALL_COUNTER;

  return avgTime;
}

const test = options => {
  return new Promise((resolve, reject) => {
    // console.log("===> OPTIONS: %s ===>",options);
    var operation = loadtest.loadTest(options, function(error) {
      if (error) {
        console.error('Got an error: %s', error);
        reject('Got an error: %s', error);
      } else if (operation.running == false) {
        resolve(`*** ${CALL_COUNTER+1} Requests Completed ! ***\n`);
      }
    });
  });
}

const startTest = (options, i) => {
  return test(options).then(v => console.log(v));
}

function statusCallback(error, result, latency) {
  if(!error) {
    CALL_COUNTER++;
    // console.dir(result);
  } else {
    CALL_COUNTER++;
    console.dir(error);
    global.ERRORS.push(result);
  }
  if(result) {
    var requestElapsedTimeInSeconds = Math.round(result.requestElapsed / 1000);
    // console.log('Current Latency: %j,\nResult: %j,\nError: %j\n', latency, result, error);
    console.log('\nRequest #: '+(CALL_COUNTER)+', Time Taken: '+requestElapsedTimeInSeconds+'s, Req Status: '+result.statusCode+', Req Path: '+result.path);
    global.RUN_DATA.push({
      'Request #:' : CALL_COUNTER,
      'Time Taken:' : requestElapsedTimeInSeconds+'s',
      'Req Status:' : result.statusCode,
      'Req Path:' : result.path
    });
    global.RUN_DATA_TIMING.push({
      "Request #": CALL_COUNTER,
      "Time Taken": requestElapsedTimeInSeconds
    });
    if(result.requestIndex+1 == NO_OF_REQUESTS) {
      console.log(`\n Total Time Taken to Complete Last ${NO_OF_REQUESTS} requests is: ${Math.round(latency.totalTimeSeconds)}s`);
    }
  } else {
    console.log('Current Latency: %j,\nResult: %j,\nError: %j\n', latency, result, error);
  }
  
  console.log('-----------------------------------------------------------');
}

const initiateLoadTest = async _ => {
  console.time('Script ran in');
  for(let i=0; i<arr.length; i++) {
      var options = prepareRequest();
      await startTest(options, i);
  }

  downloadTestLogs(`T-${NO_OF_REQUESTS}-C-${CONCURRENCY}.json`, global.RUN_DATA);
  if(global.ERRORS.length > 0) {
    console.log('Error Count from Status Callbacks: %j',global.ERRORS.length);
    downloadErrorLogs(`Error-${NO_OF_REQUESTS}-C-${CONCURRENCY}.json`, global.ERRORS);
    global.ERRORS = [];
  }
}

function prepareRequest() {
  var soundRequestString = getRamdomIndex();
  // var url = 'http://localhost:7777/omni-content/concat-sound?'+soundRequestString;
  var url = 'https://staging-node.splashmath.com/omni-content/concat-sound?'+soundRequestString;

  var options = {
    "url": url,
    "maxRequests": 1,
    "timeout": 20000,
    "concurrency": CONCURRENCY,
    "method": 'GET',
    "statusCallback": statusCallback,
    "agentKeepAlive": keepAliveAgent
  };

  return options;
}

function getRamdomIndex() {
  var i = Math.floor(Math.random() * PTSoundRequests.length);
  if(global.PREV_CALLS.indexOf(i) == -1) {
    global.PREV_CALLS.push(i);
    return PTSoundRequests[i];
  } else {
    return getRamdomIndex();
  }
}

function downloadErrorLogs(fileName, data) {
  fs.writeFile(fileName, JSON.stringify(data), 'utf8', function(err) {
    if(!err) {
      console.log('Error Data is Written in: '+fileName);
      return;
    } else {
      console.log('Error while writting to: '+fileName);
    }
  })
}

initiateLoadTest();
