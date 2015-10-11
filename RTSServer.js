var url = require('url');
var WebSocketServer = require('ws').Server;
var syncServer = require('./syncServer.js');

function RTSServer(server) {
  this.wss = new WebSocketServer({ server: server });
  
  this.wss.on('connection', function connection(ws) {
    var location = url.parse(ws.upgradeReq.url, true);
    
    ws.on('message', function incoming(message) {
      console.log('received: %s', message);
    });
    syncServer(ws);
  });
}
module.exports = RTSServer;
