var express = require('express');

module.exports = function(app) {
  app.use(express.static('public'));
  
  app.get('/', function(req, res) {
    res.render('rts', {});
  });
};