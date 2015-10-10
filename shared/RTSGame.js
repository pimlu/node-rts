var PQ;
//has game state, no rendering
function RTSGame(server) {
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

RTSGame.prototype.init = function(nodes, w, h) {
  this.nodes = [];
  for(var i=0; i<nodes; i++) {
    this.nodes.push(new Node(i,
      Math.random()*w, Math.random()*h,
      30, //TODO placeholder
      i < 2 ? i+1 : 0 //2 players, rest unowned
    ));
  }
};

//receives an amount of time it steps by
RTSGame.prototype.step = function(dt) {
  
};

//loads a state
RTSGame.prototype.loadState = function(state) {
  
};

RTSGame.prototype.doEvent = function(source, msg) {
  
};