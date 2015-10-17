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
    ws.send(encode(data));
  },
  recv: function recv(ws, cb) {
    ws.onmessage = function(msg) {
      cb(decode(msg.data), msg);
    };
  }
};
module.exports = RTSSocket;