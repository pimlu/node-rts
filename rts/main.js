var $ = require('jquery');
var RTSClient = require('./RTSClient.js');

var client;
$(function() {
  var SP = false;
  client = new RTSClient('#frame', !SP && 'ws://localhost:8080/', !SP && 'abcd');
  //normally happens on the server
  if(SP) {
    client.game.init(10, 600);
    client.team = 1;
  }
});