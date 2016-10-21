//var path = require('path');

var express = require('express');
var browserify = require('browserify-middleware');
var resolve = require('bower-path');

module.exports = function(app) {
  app.use(express.static('public'));
  
  app.use('/js/rts.js', browserify('./rts/main.js', {
    ignoreMissing: true
  }));
  
  app.get('/', function(req, res) {
    res.render('rts', {
      easeljs: resolve('easeljs').replace('public','')
    });
  });
};