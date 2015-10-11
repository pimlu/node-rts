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
  this.team = -1;
  
  //RAF on our tick function
  createjs.Ticker.timingMode = createjs.Ticker.RAF;
	createjs.Ticker.addEventListener("tick", this.tick.bind(this));
  
}


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
      if(node.owner !== this.team) continue;
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
        var intersect = doLineSegmentsIntersect(p, p2, q, q2);
        //if they intersect, push to our lists of sources and destinations
        if(intersect) {
          src.push(i);
          dst.push(attack.id);
          us.push(intersect.u);
        }
      }
    }
    if(src.length) {
      this.game.queueEvent('CUT', this.team, {
        src: src,
        dst: dst,
        us: us
      });
    }
  }
  this.dragState = null;
};

RTSClient.prototype.tick = function(event) {
  
  this.stats.begin();
  
  this.game.step(Math.min(event.delta / 1000, 1/30));
  
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
    var playerColor = ['lightgrey', 'red', 'blue'][node.owner];
    
    size.graphics.clear();
    if(this.selected[i]) size.graphics.setStrokeStyle(2).beginStroke('black')
    drawCircle(size, 'grey', node.size);
    pop.graphics.clear();
    var popRatio = node.pop/node.maxPop;
    drawCircle(pop, playerColor, node.size*popRatio);
    
    //draw each attack line
    attackCont.removeAllChildren();
    var lines = new createjs.Shape();
    lines.graphics.setStrokeStyle(3).beginStroke(playerColor);
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
  
  this.stats.end();
};

RTSClient.prototype.clickCircle = function(index) {
  log.debug('CLICK %s %s', index, shiftDown);
  var nodes = this.game.nodes;
  var oldSelected = this.selected;
  if(!shiftDown) {
    this.selected = new Array(this.game.nodes.length);
  }
  //selects nodes to command (shift selects multiple)
  if(!zDown && nodes[index].owner === this.team) {
    this.selected[index] = !oldSelected[index];
  } else {
    //maps oldSelected to a list of the truthy values in it
    var selectedList = _.filter(oldSelected.map(function(v,i) {
        return {v:v,i:i};
      }), _.matchesProperty('v', true))
      .map(_.property('i'));
    //just the nodes with the energy to attack
    var canAttack = selectedList.filter(function(v) {
      return nodes[v].pop >= RTSGBL.attPop;
    });
    if(canAttack.length) { //comands nodes to attack
      this.game.queueEvent('ATTACK', this.team, {
        src: canAttack,
        dst: index
      });
    }
  }
};