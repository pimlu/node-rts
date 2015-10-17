var url = require('url');
var WebSocketServer = require('ws').Server;
var NanoTimer = require('nanotimer');
var _ = require('lodash');

var RTSGame = require('./rts/RTSGame.js');
var RTSSocket = require('./rts/RTSSocket.js');

//https://gist.github.com/manast/1185904
function interval(duration, fn){
  this.baseline = undefined
  
  this.run = function(){
    if(this.baseline === undefined){
      this.baseline = new Date().getTime()
    }
    fn()
    var end = new Date().getTime()
    this.baseline += duration
 
    var nextTick = duration - (end - this.baseline)
    if(nextTick<0){
      nextTick = 0
    }
    (function(i){
        i.timer = setTimeout(function(){
        i.run(end)
      }, nextTick)
    }(this))
  }

  this.stop = function(){
    clearTimeout(this.timer)
  }
}


function RTSServer(server) {
  var self = this;
  this.roomNum = 0;
  this.rooms = {};
  
  this.wss = new WebSocketServer({ server: server });
  
  this.wss.on('connection', function connection(ws) {
    var location = url.parse(ws.upgradeReq.url, true);
    
    var roomNum;
    
    function getRoom() {
      return self.rooms[roomNum];
    }
    function getPnum() {
      return getRoom().players.indexOf(ws)+1;
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
        RTSSocket.send(ws, computed);
      });
    }
    var last = [0,0];
    
    function timeDiff() {
      var diff = process.hrtime(last);
      last = process.hrtime();
      return diff[0]+diff[1]/1e9;
    };
    
    RTSSocket.recv(ws, function incoming(data) {
      //time sync
      if(data.type === RTSSocket.TIME) {
        RTSSocket.send(ws, {type: RTSSocket.TIME, t:+new Date()});
        return;
      } else if(data.type === RTSSocket.STATUS) {
        //create a room if it doesn't exist
        roomNum = data.roomNum;
        var room = getRoom();
        if(!room) room = self.addRoom(roomNum);
        var players = room.players;
        if(players.indexOf(ws) === -1) {
          players.push(ws);
          room.pcount++;
        }
        //start the countdown
        if(players.length === room.needed && !room.start) {
          room.start = +new Date() + 3000;
          setTimeout(startRoom.bind(self), 3000);
        }
        RTSSocket.send(ws, {
          type: RTSSocket.STATUS,
          pnum: getPnum(),
          players: players.length,
          needed: room.needed,
          start: room.start
        });
        broadcast({
          type: RTSSocket.UPDATE,
          t: +new Date(),
          state: getRoom().game.exportState()
        });
      } else if(data.type === RTSSocket.UPDATE) {
        var source = getPnum();
        getRoom().game.queueEvent(data.name, source, data.data);
      }
      
      //console.log('received: %s', msg);
    });
    
    function startRoom() {
      console.log('startRoom %s', roomNum);
      var room = getRoom();
      timeDiff();
      if(!room) return;
      room.timer && room.timer.stop();
      room.timer = new interval(1000/60, update);
      room.timer.run();
    }
    
    function update() {
      var d;
      var room = getRoom();
      if(!room) {
        console.log('no room');
        return;
      }
      room.game.step(d=timeDiff());
      broadcast(function() {
        return {
          type: RTSSocket.UPDATE,
          t: +new Date(),
          state: room.game.exportState()
        };
      });
    }
    
    ws.on('close', function close(e) {
      console.log('close %s', e);
      if(roomNum === void 0) return;
      var room = getRoom();
      var players = getRoom().players;
      room.pcount--;
      //if it hasn't started, let others fill in
      if(!room.playing) {
        _.remove(players, _.matches(ws));
      }
      if(!room.pcount) {
        console.log('removeRoom %s', roomNum);
        room.timer && room.timer.stop();
        delete self.rooms[roomNum];
      }
      
    });
    
    
  });
}

RTSServer.prototype.addRoom = function(id) {
  console.log('addRoom %s', id);
  var room = this.rooms[id] = {
    players: [],
    pcount: 0,
    needed: 2,
    playing: false,
    start: null,
    game: new RTSGame()
  };
  room.game.init(10, 600);
  return room;
};

module.exports = RTSServer;
