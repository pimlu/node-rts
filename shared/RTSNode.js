
function RTSNode(id, x, y, size, owner) {
  this.id = id;
  this.x = x; this.y = y;
  this.size = size;
  this.maxPop = this.getMaxPop();
  this.pop = this.maxPop * (owner ? 1/4 : Math.random());
  this.owner = owner;
  this.attacks = [];
  this.incoming = [];
}
if(RTSGBL.isNode) global.RTSNode = RTSNode;

//enum for modes of attack
'ATTACKING,HITTING,RECEDING'.split(',').forEach(function(v,i) {
  RTSNode[v] = i;
});

RTSNode.prototype.attack = function(id) {
  //don't attack if you are already
  if(_.find(this.attacks, _.matchesProperty('id', id))) return;
  //TODO messaging? this should get called after the queue finishes
  this.attacks.push({
    id: id,
    time: RTSGBL.now()+RTSGBL.delay,
    dist: 0,
    mode: RTSNode.ATTACKING
  });
};

RTSNode.prototype.step = function(dt, nodes) {
  this.pop = Math.min(this.maxPop, this.pop + dt*this.getGrowth());
  var attacks = this.attacks;
  for(var i=0; i<attacks.length; i++) {
    var attack = attacks[i];
    switch(attack.mode) {
      case RTSNode.ATTACKING:
        var ddist = dt*RTSGBL.speed;
        var origDist = attack.dist;
        //if we can't afford any more of this, recede
        if(this.pop - RTSGBL.attCost*ddist < 5) {//TODO placeholder
          attack.mode = RECEDING;
          i--; continue; //do this one over again, except receding
        }
        
        //in ATTACKING, move forward; if you've made it, start hitting
        attack.dist += ddist;
        var realDist = this.dist(node);
        if(attack.dist > realDist) {
          attack.dist = realDist;
          attack.mode = RTSNode.HITTING;
        }
        //now pay the population price
        this.pop -= RTSGBL.attCost*(attack.dist - origDist);
        break;
    }
  }
};

RTSNode.prototype.dist = function(node) {
  var dx = this.x-node.x;
  var dy = this.y-node.y;
  return Math.sqrt(dx*dx+dy*dy)-this.size-node.size;
};

RTSNode.prototype.getGrowth = function() {
  return this.size/7+this.pop/6;
};

RTSNode.prototype.getMaxPop = function() {
  return 50+Math.ceil(Math.pow(this.size, 1.2));
};