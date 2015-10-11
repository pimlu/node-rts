//method modeled after http://www.mine-control.com/zack/timesync/timesync.html
var syncClient = (function() {
  function syncClient(ws, cb) {
    var lats = [];
    var deltas = [];
    ws.onmessage = function(msg) {
      if(msg.data === 'done') {
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
      } else {
        var time = +msg.data;
        var now = +new Date();
        var latency = (now - last)/2;
        var delta = now-time-latency;
        log.trace(latency, delta);
        lats.push(latency);
        deltas.push(delta);
        last = +new Date;
        ws.send('t');
      }
      
    };
    var last = +new Date;
    ws.send('t');
  }
  return syncClient;
})();