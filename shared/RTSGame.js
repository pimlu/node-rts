var PQ;
//has game state, no rendering
function RTSGame() {
  this.nodes = null;
  this.queue = new PriorityQueue({
    comparator: function(a, b) {
      return a.time - b.time;
    }
  });
}

'ATTACK,CUT'.split(',').forEach(function(v,i) {
  RTSGame[v] = i;
});

if(RTSGBL.isNode) {
  global.RTSGame = RTSGame;
  PQ = require('js-priority-queue');
} else {
  PQ = PriorityQueue;
}

RTSGame.prototype.init = function(nodeCount, size) {
  this.nodes = [];
  
  for(var i=0; i<nodeCount; i++) {
    this.nodes.push(new RTSNode(i,
      (Math.random()-1/2)*size, (Math.random()-1/2)*size,
      20, //TODO placeholder
      i < 2 ? i+1 : 0 //2 players, rest unowned
    ));
  }
};

//receives an amount of time it steps by
RTSGame.prototype.step = function(dt) {
  var nodes = this.nodes;
  var now = RTSGBL.now();
  while(this.queue.length && this.queue.peek().time < now) {
    var nextEvt = this.queue.dequeue();
    this.doEvent(nextEvt);
  }
  for(var i=0; i<this.nodes.length; i++) {
    //TODO better integration
    var node = nodes[i];
    node.step(dt, nodes);
  }
};

//loads a state
RTSGame.prototype.loadState = function(state) {
  
};

RTSGame.prototype.queueEvent = function(type, source, e, manualTime) {
  e.type = RTSGame[type];
  e.source = source;
  if(!manualTime) e.time = RTSGBL.actionTime();
  this.queue.queue(e);
};

RTSGame.prototype.doEvent = function(event) {
  log.debug(event);
  var nodes = this.nodes;
  switch(event.type) {
    case RTSGame.ATTACK:
      event.src.forEach(function(index) {
        var node = nodes[index];
        if(!node || !RTSGBL.debug && event.source !== node.owner) return; //for security purposes
        if(!node.debug(event.dst)) return;
        nodes[index].attack(event.dst);
      });
      break;
    case RTSGame.CUT:
      event.src.forEach(function(index, i) {
        var node = nodes[index];
        if(!node || !RTSGBL.debug &&  event.source !== node.owner) return;
        var target = nodes[event.dst[i]];
        //find the matching attack
        var attack = node.attacks.find(
          _.matchesProperty('id', target.id)
        );
        if(!attack) return;
        if(attack.mode === RTSNode.HITTING) {
          var cutDist = event.us[i]*node.dist(target);
          var slack = attack.dist - cutDist;
          attack.dist = cutDist;
          target.slack(node, slack);
        }
        attack.mode = RTSNode.RECEDING;
      });
      break;
  }
};