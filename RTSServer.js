var url = require('url');
var WebSocketServer = require('ws').Server;
var NanoTimer = require('nanotimer');
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
    
    function send(ws, data) {
      ws.send(encode(data));
    }
    //if data is a function, we evaluate it and send it only if at least one player has an empty buffer
    function broadcast(data) {
      var computed;
      if(typeof data !== 'function') computed = data;
      getRoom().players.forEach(function(ws) {
        if(computed === void 0) {
          if(ws.bufferedAmount > 128) return;
          computed = data();
        }
        send(ws, computed);
      });
    }
    var timer = new NanoTimer();
    var last = [0,0];
    
    function timeDiff() {
      var diff = process.hrtime(last);
      last = process.hrtime();
      return diff[0]+diff[1]/1e9;
    };
    
    ws.on('message', function incoming(msg) {
      var data = decode(msg);
      //time sync
      if(data.type === TIME) {
        send(ws, {type: TIME, t:+new Date()});
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
        send(ws, {
          type: STATUS,
          pnum: getPnum(),
          players: players.length,
          needed: room.needed,
          start: room.start
        });
        broadcast({
          type: UPDATE,
          t: +new Date(),
          state: getRoom().game.exportState()
        });
      } else if(data.type === UPDATE) {
        var source = getPnum();
        getRoom().game.queueEvent(data.name, source, data.data);
      }
      
      //console.log('received: %s', msg);
    });
    
    function startRoom() {
      console.log('startRoom %s', roomNum);
      timeDiff();
      timer.setInterval(update, '', 1/60+'s');
    }
    
    function update() {
      var d;
      getRoom().game.step(d=timeDiff());
      broadcast(function() {
        return {
          type: UPDATE,
          t: +new Date(),
          state: getRoom().game.exportState()
        };
      });
    }
    
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
    
    
  });
}

RTSServer.prototype.addRoom = function(name) {
  var room = this.rooms[this.roomNum++] = {
    name: name,
    players: [],
    needed: 2,
    playing: false,
    start: null,
    game: new RTSGame()
  };
  room.game.init(10, 600);
};

module.exports = RTSServer;
