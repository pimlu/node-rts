var express = require('express');
var bodyParser = require('body-parser');
var cookieSession = require('cookie-session');

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

var server = app.listen(8080, function() {
  var host = server.address().address;
  var port = server.address().port;

  console.log('listening at http://%s:%s', host, port);
});