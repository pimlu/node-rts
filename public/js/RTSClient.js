function drawCircle(shape, color, rad) {
  shape.graphics.beginFill(color).drawCircle(0, 0, rad);
}

function RTSClient(div, gameId) {
  var stats = this.stats = new Stats();
  stats.setMode( 0 ); // 0: fps, 1: ms, 2: mb

  // align top-left
  stats.domElement.style.position = 'fixed';
  stats.domElement.style.right = '0px';
  stats.domElement.style.top = '0px';

  this.width = 800;
  this.height = 600;
  
  //put a canvas in
  this.c = $('<canvas width="'+this.width+'" height="'+this.height+'"></canvas>')[0];
  $(div).empty().append(this.c).append(stats.domElement);
  
  this.game = new RTSGame();
  //normally happens on the server
  this.game.init(10,600);
  
  var stage = this.stage = new createjs.Stage(this.c);
  //actual playing field, gets transformed
  this.field = new createjs.Container();
  this.field.x = this.width/2;
  this.field.y = this.height/2;
  stage.addChild(this.field);
  //holds each node in our game
  var nodeConts = this.nodeConts = new createjs.Container();
  this.field.addChild(nodeConts);
  
  //RAF on our tick function
  createjs.Ticker.timingMode = createjs.Ticker.RAF;
	createjs.Ticker.addEventListener("tick", this.tick.bind(this));
}

RTSClient.prototype.tick = function(event) {
  
  this.stats.begin();
  
  var nodes = this.game.nodes;
  
  //make a new set of circles if our # of nodes in easel and the game state don't match
  if(this.nodeConts.numChildren !== nodes.length) {
    this.nodeConts.removeAllChildren();
    for(var i=0; i<nodes.length; i++) {
      //create a container for the whole node
      var cont = new createjs.Container();
      this.nodeConts.addChild(cont);
      //add the shapes of the container
      var size = new createjs.Shape();
      drawCircle(size, 'grey', nodes[i].size);
      cont.addChild(size);
      var pop = new createjs.Shape();
      //pop changes each frame
      cont.addChild(pop);
    }
  }
  //update the existing nodes
  for(var i=0; i<nodes.length; i++) {
    var node = nodes[i];
    var nodeCont = this.nodeConts.children[i];
    nodeCont.x = node.x;
    nodeCont.y = node.y;
    var pop = nodeCont.children[1];
    var color = ['lightgrey', 'red', 'blue'][node.owner];
    pop.graphics.clear();
    drawCircle(pop, color, node.size*Math.sqrt(node.pop/node.maxPop));
  }
  this.stage.update(event);
  
  this.stats.end();
};