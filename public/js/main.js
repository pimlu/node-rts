var client;
$(function() {
  client = new RTSClient('#frame', 'ws://localhost:8080/', 'abcd');
  //normally happens on the server
  //client.game.init(10, 600);
  //client.team = 1;
});