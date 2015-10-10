
function RTSNode(id, x, y, size, owner) {
  this.id = id;
  this.x = x; this.y = y;
  this.size = size;
  this.pop = this.maxPop() * (owner ? 1/4 : Math.random());
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


RTSNode.prototype.getGrow = function() {
  return this.size/5+this.pop/10;
};

RTSNode.prototype.maxPop = function() {
  return 50+Math.ceil(Math.pow(this.size, 1.2));
};