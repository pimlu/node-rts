
var RTSGBL = {
  isNode: typeof window === 'undefined',
  //player colors for each team
  pColors: ['lightgrey', 'red', 'blue'],
  //pixels per second for attacks
  speed: 100,
  //cost in pop per px of attack distance
  attCost: 0.3,
  //ratio of defender to attacker's losses when attacker directly hits node
  attRatio: 2,
  //same thing, but for receding slack
  slackRatio: 1.5,
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
