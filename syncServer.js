var MAX = 20;
module.exports = function(ws) {
  
  function date() {
    var time = '' + (+new Date());
    ws.send(time);
  }
  var iter=0;
  ws.on('message', function incoming(msg) {
    console.log('received: %s', msg);
    iter++;
    if(iter<MAX) {
      date();
    } else {
      ws.send('done');
    }
  });
  console.log('bleh');
};

