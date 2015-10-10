
function RTSNode(id, x, y, size, pop, owner) {
  this.id = id;
  this.x = x; this.y = y;
  this.size = size;
  this.pop = pop;
  this.owner = owner;
  this.attacks = [];
  this.incoming = [];
}
if(RTSGBL.isNode) global.RTSNode = RTSNode;

RTSNode.prototype.attack = function(id) {
  //TODO already attacking
  //TODO messaging?
  this.attacks.push({
    id: id,
    time: RTSGBL.now()+RTSGBL.delay,
    dist: 0,
    receding: false
  })
};