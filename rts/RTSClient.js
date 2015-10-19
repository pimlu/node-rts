var $ = require('jquery');
var _ = require('lodash');
var log = require('loglevel');

var Stats = require('stats-js');

var RTSGBL = require('./RTSGBL.js');
var RTSGame = require('./RTSGame.js');
var RTSNode = require('./RTSNode.js');
var RTSSocket = require('./RTSSocket.js');
var syncClient = require('./syncClient.js');
var intersection = require('./intersection.js');

function drawCircle(shape, color, rad) {
  shape.graphics.beginFill(color).drawCircle(0, 0, rad);
}
var shiftDown = false, zDown = false, xDown = false;
$(document).on('keyup keydown', function(e){
  shiftDown = e.shiftKey;
  var key = String.fromCharCode(e.keyCode);
  if(key === 'Z') {
    zDown = e.type === 'keydown';
  }
  if(key === 'X') {
    xDown = e.type === 'keydown';
  }
});

function RTSClient(div, url, gameId) {
  var stats = this.stats = new Stats();
  stats.setMode( 0 ); // 0: fps, 1: ms, 2: mb

  // align top-left
  stats.domElement.style.position = 'fixed';
  stats.domElement.style.right = '0px';
  stats.domElement.style.top = '0px';

  this.width = 800;
  this.height = 600;
  
  //put a canvas in
  this.p = $('<p>test</p>');
  this.c = $('<canvas width="'+this.width+'" height="'+this.height+'"></canvas>')[0];
  $(div).empty().append(this.p).append(this.c).append(stats.domElement);
  
  this.game = new RTSGame();
  
  this.stage = new createjs.Stage(this.c);
  
  this.stage.addEventListener('stagemousedown', this.stageDown.bind(this));
  this.stage.addEventListener('stagemousemove', this.stageMove.bind(this));
  this.stage.addEventListener('stagemouseup', this.stageUp.bind(this));
  this.dragState = null;
  
  //actual playing field, gets transformed
  this.field = new createjs.Container();
  this.field.x = this.width/2;
  this.field.y = this.height/2;
  this.stage.addChild(this.field);
  //holds each node in our game
  var nodeConts = this.nodeConts = new createjs.Container();
  this.field.addChild(nodeConts);
  
  //dashed line for cutting attacks
  this.cutLine = new createjs.Shape();
  this.cutLine.mouseEnabled = false;
  this.stage.addChild(this.cutLine);
  
  this.selected = [];
  
  

  
  //networking code
  //if url is falsy, we do "single player" (lol)
  if(this.url = url) {
    this.roomNum = window.location.hash;
    if(!this.roomNum) {
      this.roomNum = '#' + (Math.random() * 1e9 | 0);
      history.pushState(null, null, this.roomNum);
    }
    this.roomNum = +this.roomNum.substr(1);
    
    this.ws = new WebSocket(url);
    this.netState = RTSClient.CONNECTING;
    this.ws.onopen = this.onOpen.bind(this);
  } else {
    this.netState = RTSClient.PLAYING;
  }
  
  //RAF on our tick function
  createjs.Ticker.timingMode = createjs.Ticker.RAF;
	createjs.Ticker.addEventListener("tick", this.tick.bind(this));
  
}

module.exports = RTSClient;

'CONNECTING,SYNCING,WAITING,PLAYING'.split(',').forEach(function(v,i) {
  RTSClient[v] = i;
});

RTSClient.prototype.onOpen = function() {
  this.netState = RTSClient.SYNCING;
  syncClient(this.ws, this, this.onSync.bind(this));
};
RTSClient.prototype.onSync = function(delta, latency) {
  this.netState = RTSClient.WAITING;
  log.debug(delta, latency);
  this.ws.onerror = this.onError.bind(this);
  RTSSocket.recv(this.ws, this.onMessage.bind(this));
  //TODO necessary?
  setTimeout(this.getStatus.bind(this), 1000);
};
RTSClient.prototype.getStatus = function() {
  RTSSocket.send(this.ws, {
    type: RTSSocket.STATUS,
    roomNum: this.roomNum
  });
};
RTSClient.prototype.onError = function(error) {
  log.error('WebSocket Error ' + error);
};
RTSClient.prototype.onMessage = function(data) {
  var self = this;
  
  //log.debug('Server: ' + e.data);
  if(this.netState === RTSClient.WAITING && data.type === RTSSocket.STATUS) {
    this.game.team = data.pnum;
    var summary = data.players+'/'+data.needed+' players. you are '+
      RTSGBL.pColors[this.game.team]+'. '+
      (data.players<data.needed?'give someone else this URL!':'')+' <span></span>'; 
    this.p.html(summary);
    
    var timeoutId;
    function to(fn, time) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(fn, time);
    }
    
    to(function() {
      RTSSocket.send(self.ws, {
        type: RTSSocket.STATUS,
        roomNum: self.roomNum
      });
    }, 500);
    
    var step = 0.03;
    if(data.start) {
      to(function timeout() {
        var now = self.game.now();
        if(data.start - now < step*1000) {
          to(finish, data.start-now);
        } else {
          self.p.find('span').html((data.start-now)+' ms left to start');
          to(timeout, step*1000);
        }
      }, step);
    }
    function finish() {
      self.p.html('go! you are '+RTSGBL.pColors[self.game.team]+'!');
      self.netState = RTSClient.PLAYING;
    }
  } else if(data.type === RTSSocket.UPDATE) {
    this.game.importState(data.state);
    var lagAmt = +new Date() - this.game.trueTime(data.t);
    log.trace(lagAmt);
    //catch up based on server lag
    while(this.netState === RTSClient.PLAYING && lagAmt>0) {
      var dt = Math.min(lagAmt/1000, 1/60);
      lagAmt -= dt*1000;
      this.game.step(dt);
    }
    
  }
};


RTSClient.prototype.stageDown = function(event) {
  if(event.relatedTarget) return;
  if(!shiftDown) this.selected = [];
  var coords = [event.stageX, event.stageY];
  this.dragState = {start: coords, end: coords.slice()};
};
RTSClient.prototype.stageMove = function(event) {
  if(!this.dragState) return;
  this.dragState.end = [event.stageX, event.stageY];
};
RTSClient.prototype.stageUp = function(event) {
  
  if(this.dragState) {
    this.dragState.end = [event.stageX, event.stageY];
    //var start = this.field.globalToLocal.apply(this.field, this.dragState.start);
    //var end = this.field.globalToLocal.apply(this.field, this.dragState.end);
    var nodes = this.game.nodes;
    var nodeConts = this.nodeConts;
    var src = [], dst = [], us = [];
    for(var i=0; i<nodes.length; i++) {
      var node = nodes[i];
      //only cut our team's nodes
      if(node.owner !== this.game.team) continue;
      var attacks = node.attacks;
      var data = nodeConts.children[i].children[2]._data;
      for(var j=0; j<attacks.length;j++) {
        var attack = attacks[j];
        if(attack.mode === RTSNode.RECEDING) continue;
        //test for intersection
        var p = {x: this.dragState.start[0], y: this.dragState.start[1]};
        var p2 = {x: event.stageX, y: event.stageY};
        var q = data[j].q;
        var q2 = data[j].q2;
        var intersect = intersection(p, p2, q, q2);
        //if they intersect, push to our lists of sources and destinations
        if(intersect) {
          src.push(i);
          dst.push(attack.id);
          us.push(intersect.u);
        }
      }
    }
    if(src.length) {
      this.sendEvent('CUT', {
        src: src,
        dst: dst,
        us: us
      });
    }
  }
  this.dragState = null;
};
RTSClient.prototype.sendEvent = function(name, data) {
  this.game.queueEvent(name, this.game.team, data);
  if(this.ws) {
    RTSSocket.send(this.ws, {
      type: RTSSocket.UPDATE,
      name: name,
      data: data
    });
  }
}
RTSClient.prototype.tick = function(event) {
  this.stats.begin();
  if(this.netState === RTSClient.PLAYING) this.game.step(Math.min(event.delta / 1000, 1/30));
  this.update(event);
  
  this.stats.end();
};
RTSClient.prototype.update = function(event) {
  
  var nodes = this.game.nodes;
  
  //make a new set of circles if our # of nodes in easel and the game state don't match
  if(this.nodeConts.numChildren !== nodes.length) {
    this.selected = [];
    this.nodeConts.removeAllChildren();
    for(var i=0; i<nodes.length; i++) {
      //create a container for the whole node
      var cont = new createjs.Container();
      this.nodeConts.addChild(cont);
      //add the shapes of the container
      cont.addChild(new createjs.Shape()); //size
      cont.addChild(new createjs.Shape()); //pop
      //add the attacks
      cont.addChild(new createjs.Container());
      
      //listen for clicks
      cont.addEventListener('click', this.clickCircle.bind(this, i));
    }
  }
  //update the existing nodes
  for(var i=0; i<nodes.length; i++) {
    var node = nodes[i];
    var nodeCont = this.nodeConts.children[i];
    nodeCont.x = node.x;
    nodeCont.y = node.y;
    var size = nodeCont.children[0];
    var pop = nodeCont.children[1];
    var attackCont = nodeCont.children[2];
    var playerColor = RTSGBL.pColors[node.owner];
    
    size.graphics.clear();
    if(this.selected[i]) size.graphics.setStrokeStyle(2).beginStroke('black')
    drawCircle(size, 'grey', node.size);
    pop.graphics.clear();
    var popRatio = node.pop/node.maxPop;
    drawCircle(pop, playerColor, node.size*popRatio);
    
    //draw each attack line
    attackCont.removeAllChildren();
    var lines = new createjs.Shape();
    attackCont.addChild(lines);
    
    attackCont._data = [];
    //for each attack, draw a line starting at the edge of the attacker circle
    //moving out dist pixels directly towards the target
    for(var j=0; j<node.attacks.length; j++) {
      var attack = node.attacks[j];
      
      var target = nodes[attack.id];
      
      var dx = target.x - node.x;
      var dy = target.y - node.y;
      var fullDist = Math.sqrt(dx*dx + dy*dy);
      
      var nodeRatio = node.size/fullDist;
      var tgtRatio = attack.dist/fullDist;
      
      var mtDx = dx*nodeRatio, mtDy = dy*nodeRatio;
      var ltDx = mtDx + dx*tgtRatio, ltDy = mtDy + dy*tgtRatio;
      lines.graphics.setStrokeStyle(3).beginStroke(RTSGBL.pColors[attack.owner]);
      lines.graphics.moveTo(mtDx, mtDy)
        .lineTo(ltDx, ltDy);
      attackCont._data.push({
        q:  lines.localToGlobal(mtDx, mtDy),
        q2: lines.localToGlobal(ltDx, ltDy)
      });
    }
  }
  //update the cut
  var cutLine = this.cutLine;
  cutLine.graphics.clear();
  if(this.dragState) {
    var start = this.dragState.start;
    var end = this.dragState.end;
    cutLine.graphics.setStrokeStyle(3).beginStroke('darkgrey')
      .append({
        exec: function(ctx, shape) {
          ctx.setLineDash([10, 10]);
        }
      }).moveTo(start[0], start[1]).lineTo(end[0], end[1]);
  }
  
  this.stage.update(event);
  
};

RTSClient.prototype.clickCircle = function(index) {
  log.debug('CLICK %s %s', index, shiftDown);
  var nodes = this.game.nodes;
  var oldSelected = this.selected;
  if(!shiftDown) {
    this.selected = new Array(this.game.nodes.length);
  }
  //selects nodes to command (shift selects multiple)
  //when debugging, the x key overrides
  if((RTSGBL.debug && xDown) || !zDown && nodes[index].owner === this.game.team) {
    this.selected[index] = !oldSelected[index];
  } else {
    //maps oldSelected to a list of the truthy values in it
    var selectedList = _.filter(oldSelected.map(function(v,i) {
        return {v:v,i:i};
      }), _.matchesProperty('v', true))
      .map(_.property('i'));
    //just the nodes with the ability to attack
    var attackers = selectedList.filter(function(v) {
      return nodes[v].canAttack(index);
    });
    if(attackers.length) { //comands nodes to attack
      this.sendEvent('ATTACK', {
        src: attackers,
        dst: index
      });
    }
  }
};