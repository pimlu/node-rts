
var RTSGBL = {
  isNode: typeof window === 'undefined',
  //pixels per second for attacks
  speed: 50,
  //cost in pop per px of attack distance
  attCost: 0.2,
  //ratio of defender to attacker's losses when attacker directly hits node
  attRatio: 2,
  //cost in pop/s to maintain attack
  attSpeed: 8,
  //network sync delay in seconds
  delay: 0.2,
  //interpolation time on client
  interp: 0.1,
  //min pop to attack
  attPop: 5,
  //min pop to hit
  hitPop: 2,
  //how quickly the wizard mode cost increases
  wizCoef: 0.5,
  now: function() {
    //TODO time sync?
    return +new Date();
  },
  actionTime: function() {
    return RTSGBL.now()+RTSGBL.delay*1000;
  }
};
if(RTSGBL.isNode) global.RTSGBL = RTSGBL;
