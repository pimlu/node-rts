var url = require('url');
var WebSocketServer = require('ws').Server;
var _ = require('lodash');

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

function RTSServer(server) {
  var self = this;
  this.roomNum = 0;
  this.rooms = {};
  
  this.wss = new WebSocketServer({ server: server });
  
  var TIME = 0, STATUS = 1, UPDATE = 2;
  this.wss.on('connection', function connection(ws) {
    var location = url.parse(ws.upgradeReq.url, true);
    
    var roomNum;
    
    function getRoom() {
      return self.rooms[roomNum];
    }
    function getPnum() {
      return getRoom().players.indexOf(ws)+1;
    }
    
    function send(data) {
      ws.send(encode(data));
    }
    
    ws.on('message', function incoming(msg) {
      var data = decode(msg);
      //time sync
      if(data.type === TIME) {
        send({type: TIME, t:+new Date()});
        return;
      } else if(data.type === STATUS) {
        roomNum = 0; //TODO placeholder
        var room = getRoom();
        var players = room.players;
        if(players.indexOf(ws) === -1) {
          players.push(ws);
        }
        if(players.length === room.needed && !room.start) {
          room.start = +new Date() + 3000;
          setTimeout(startRoom.bind(self), 3000);
        }
        send({
          type: STATUS,
          pnum: getPnum(),
          players: players.length,
          needed: room.needed,
          start: room.start
        });
      }
      
      
      console.log('received: %s', msg);
    });
    
    ws.on('close', function close(e) {
      console.log('close', e);
      if(roomNum === void 0) return;
      var room = getRoom();
      var players = getRoom().players;
      //if it hasn't started, let others fill in
      if(!room.playing) {
        _.remove(players, _.matches(ws));
      }
    });
    
    function startRoom(roomNum) {
      console.log('startRoom %s', roomNum);
    }
    
  });
}

RTSServer.prototype.addRoom = function(name) {
  this.rooms[this.roomNum++] = {
    name: name,
    players: [],
    needed: 2,
    playing: false,
    start: null,
    game: new RTSGame()
  };
};

module.exports = RTSServer;
