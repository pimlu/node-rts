var CONNECTING=0,
OPEN=1,
CLOSING=2,
CLOSED=3;

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

var RTSSocket = {
  TIME: 0,
  STATUS: 1,
  UPDATE: 2,
  send: function send(ws, data) {
    if(ws.readyState !== OPEN) return; //TODO warn?
    ws.send(encode(data));
  },
  recv: function recv(ws, cb) {
    ws.onmessage = function(msg) {
      cb(decode(msg.data), msg);
    };
  }
};
module.exports = RTSSocket;