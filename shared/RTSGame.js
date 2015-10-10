//has game state, no rendering
function RTSGame(server) {
  this.nodes = null;
}
if(RTSGBL.isNode) global.RTSGame = RTSGame;

RTSGame.prototype.init = function(nodes) {
  
};

//receives an amount of time it steps by
RTSGame.prototype.step = function(dt) {
  
};

//loads a state
RTSGame.prototype.readState = function(state) {
  
};

RTSGame.prototype.readMessage = function(source, msg) {
  
};