var _ = require('lodash');
var log = require('loglevel');

var RTSSocket = require('./RTSSocket.js');

//method modeled after http://www.mine-control.com/zack/timesync/timesync.html
var MAX = 20;
var TIME = 0;
var DELAY = 5000;
function syncClient(ws, obj, cb) {
  
  function poll(obj) {
    setTimeout(poll.bind(null, obj), DELAY);
  }
  
  
  var lats = [];
  var deltas = [];
  var iter = 0;
  RTSSocket.recv(ws, function(data) {
    if(iter === MAX) {
      lats = _.sortBy(lats);
      deltas = _.sortBy(deltas);
      var iters = lats.length;
      //1 std dev
      var included = iters*0.7; //must be an int
      var omitted = iters-included;
      var begin = omitted/2;
      var end = iters-omitted/2;
      cb(_.sum(lats.slice(begin, end))/included,
        _.sum(deltas.slice(begin, end))/included);
      
        
      //TODO are we going to keep checking?
      //setTimeout(poll.bind(null, obj), DELAY);
    } else {
      iter++;
      var time = +data.t;
      var now = +new Date();
      var latency = (now - last)/2;
      var delta = now-time-latency;
      log.trace(now - last, now-time, 0, latency, delta);
      lats.push(latency);
      deltas.push(delta);
      last = +new Date;
      RTSSocket.send(ws, {type: TIME});
    }
    
  });
  var last = +new Date;
  RTSSocket.send(ws, {type: TIME});
}
module.exports = syncClient;