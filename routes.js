var express = require('express');

module.exports = function(app) {
  app.use(express.static('public'));
  app.use('/js/shared/', express.static('shared'));
  
  app.get('/', function(req, res) {
    res.render('rts', {});
  });
};