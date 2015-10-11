var server = require('http').createServer();
var express = require('express');
var bodyParser = require('body-parser');
var cookieSession = require('cookie-session');
var port = 8080;

//I know these globals are bad practice, but there will be few and I may refactor later
['RTSGBL','RTSGame','RTSNode'].forEach(function(name) {
  require('./shared/'+name+'.js');
});

var app = express();
app.set('view engine', 'jade');

app.use(bodyParser.urlencoded({
  extended: true
})); 

app.use(cookieSession({
  name: 'session',
  secret: 'test'
}));

require('./routes.js')(app);

server.on('request', app);

var rtsServer = new (require('./RTSServer.js'))(server);

rtsServer.addRoom('foo');

server.listen(port, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('listening at http://%s:%s', host, port);
});