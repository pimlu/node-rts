function encode(data) {
  return JSON.stringify(data);
}
function decode(data) {
  try {
    return JSON.parse(data);
  } catch(e) {
    console.log('parse fail %s', data);
    console.error(e);
    return {};
  }
}

function send(ws, data) {
  ws.send(encode(data));
}

var TIME = 0, STATUS = 1, UPDATE = 2;

//method modeled after http://www.mine-control.com/zack/timesync/timesync.html
var syncClient = (function() {
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
    ws.onmessage = function(msg) {
      var data = decode(msg.data);
      if(iter === MAX) {
        lats.sort();
        deltas.sort();
        var iters = lats.length;
        //1 std dev
        var included = iters*0.7; //must be an int
        var omitted = iters-included;
        var begin = omitted/2;
        var end = iters-omitted/2;
        cb(_.sum(lats.slice(begin, end))/included,
          _.sum(deltas.slice(begin, end))/included);
        
        setTimeout(poll.bind(null, obj), DELAY);
      } else {
        iter++;
        var time = +msg.data;
        var now = +new Date();
        var latency = (now - last)/2;
        var delta = now-time-latency;
        log.trace(now - last, now-time, 0, latency, delta);
        lats.push(latency);
        deltas.push(delta);
        last = +new Date;
        send(ws, {type: TIME});
      }
      
    };
    var last = +new Date;
    send(ws, {type: TIME});
  }
  return syncClient;
})();