function RTSClient(div) {
  this.c = $('<canvas width="800" height="600"></canvas>')[0];
  $(div).empty().append(this.c);
  var stage = new createjs.Stage(this.c);
  var circle = new createjs.Shape();
  circle.graphics.beginFill('DeepSkyBlue').drawCircle(0, 0, 50);
  circle.x = 100;
  circle.y = 100;
  stage.addChild(circle);
  stage.update();
}