
var RTSGBL = {
  isNode: typeof window === 'undefined',
  //pixels per second for attacks
  speed: 50,
  //network sync delay in seconds
  delay: 0.2,
  //interpolation time on client
  interp: 0.1,
  now: function() {
    //TODO time sync?
    return +new Date();
  }
};
if(RTSGBL.isNode) global.RTSGBL = RTSGBL;
