var PQ;
//has game state, no rendering
function RTSGame() {
  this.nodes = [];
  this.queue = new PQ({
    comparator: function(a, b) {
      return a.time - b.time;
    }
  });
  
  this.delta = 0;
  this.latency = 0;
}
//converts our time to server time
RTSGame.prototype.now = function() {
  return +new Date() - this.delta;
};
//converts a server timestamp to our time
RTSGame.prototype.trueTime = function(server_t) {
  return server_t + this.delta - this.latency
},
//action delayed now
RTSGame.prototype.actionTime = function() {
  return this.now()+this.delay*1000;
};

if(RTSGBL.isNode) {
  global.RTSGame = RTSGame;
  PQ = require('js-priority-queue');
} else {
  PQ = PriorityQueue;
}

'ATTACK,CUT'.split(',').forEach(function(v,i) {
  RTSGame[v] = i;
});


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
  var now = this.now();
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
RTSGame.prototype.exportState = function() {
  var output = {
    nodexs: [],
    nodeys: [],
    nodesizes: [],
    nodepops: [],
    nodeowners: [],
    nodewizdurs: [],
    attacks: [],
    msgs: []
  };
  var nodes = this.nodes;
  for(var i=0; i<nodes.length; i++) {
    var node = nodes[i];
    output.nodexs.push(node.x);
    output.nodeys.push(node.y);
    output.nodesizes.push(node.size);
    output.nodeowners.push(node.owner);
    output.nodewizdurs.push(node.wizDur);
    output.attacks.push(node.attacks.map(function(a) {
      return [a.id, a.owner, a.dist, a.mode];
    }));
  }
  //FIXME find a better way to read whole priority queue
  var msgs = [];
  while(this.queue.length) msgs.push(this.queue.dequeue());
  for(var i=0; i<msgs.length; i++) this.queue.queue(msgs[i]);
  output.msgs = msgs.map(function(m) {
    var msg = [m.type, m.source, m.time, m.src, m.dst];
    if(m.us) msg.push(m.us);
    return msg;
  });
  return output;
};

RTSGame.prototype.queueEvent = function(type, source, e, manualTime) {
  e.type = RTSGame[type];
  e.source = source;
  if(!manualTime) e.time = this.actionTime();
  this.queue.queue(e);
};

RTSGame.prototype.doEvent = function(event) {
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