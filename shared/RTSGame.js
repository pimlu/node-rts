var PQ;
//has game state, no rendering
function RTSGame() {
  this.nodes = null;
  this.queue = new PriorityQueue({
    comparator: function(a, b) {
      return a - b;
    }
  });
}

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
  var nodes = this.nodes
  for(var i=0; i<this.nodes.length; i++) {
    //TODO better integration
    var node = nodes[i];
    node.step(dt, nodes);
  }
};

//loads a state
RTSGame.prototype.loadState = function(state) {
  
};

RTSGame.prototype.doEvent = function(source, msg) {
  
};