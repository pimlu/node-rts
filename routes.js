//var path = require('path');

var express = require('express');
var browserify = require('browserify-middleware');

module.exports = function(app) {
  app.use(express.static('public'));
  
  app.use('/js/rts.js', browserify('./rts/main.js', {
    ignoreMissing: true
  }));
  
  app.get('/', function(req, res) {
    res.render('rts', {});
  });
};