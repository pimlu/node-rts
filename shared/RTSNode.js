
function RTSNode(id, x, y, size, owner) {
  this.id = id;
  this.x = x; this.y = y;
  this.size = size;
  this.maxPop = this.getMaxPop();
  this.pop = this.maxPop * (owner ? 1/4 : Math.random());
  this.owner = owner;
  this.attacks = [];
  this.incoming = [];
  this.wizDur = 0;
}
if(RTSGBL.isNode) global.RTSNode = RTSNode;

//enum for modes of attack
'ATTACKING,HITTING,RECEDING,WIZARD'.split(',').forEach(function(v,i) {
  RTSNode[v] = i;
});

RTSNode.prototype.attack = function(id) {
  //don't attack if you can't afford it
  if(this.pop < 5) return;
  //don't attack if you are already
  //FIXME: node gets conquered, still receding with what is now enemy units
  //should cut at 0 if not receding already
  var existing = _.find(this.attacks, _.matchesProperty('id', id));
  if(existing) {
    if(existing.mode === RTSNode.RECEDING) {
      existing.mode = RTSNode.ATTACKING;
    }
    return;
  }
  //add it to our set of attack state
  this.attacks.push({
    id: id,
    time: RTSGBL.now()+RTSGBL.delay,
    dist: 0,
    mode: RTSNode.ATTACKING
  });
};

RTSNode.prototype.step = function(dt, nodes) {
  this.pop = Math.min(this.maxPop, this.pop + dt*this.getGrowth());
  this.wizDur = Math.max(0, this.wizDur-dt);
  var attacks = this.attacks;
  for(var i=0; i<attacks.length; i++) {
    var attack = attacks[i];
    var target = nodes[attack.id];
    switch(attack.mode) {
      case RTSNode.ATTACKING:
        var ddist = dt*RTSGBL.speed;
        var origDist = attack.dist;
        //if we can't afford any more of this, recede
        if(this.pop - RTSGBL.attCost*ddist < RTSGBL.attPop) {
          attack.mode = RTSNode.RECEDING;
          break;
        }
        
        //in ATTACKING, move forward; if you've made it, start hitting
        attack.dist += ddist;
        var realDist = this.dist(target);
        
        //if we're about to collide with another beam head-on, react
        var tgtAttacks = target.attacks;
        var tgtAttack = _.find(tgtAttacks, _.matchesProperty('id', this.id));
        if(tgtAttack && attack.dist + tgtAttack.dist > realDist) {
          //if they're friendly, recede
          if(this.owner === target.owner) {
            attack.mode = tgtAttack.mode = RTSNode.RECEDING;
          } else { //if they're not friendly, enter WIZARD MODE!
            attack.mode = tgtAttack.mode = RTSNode.WIZARD;
          }
          break;
        }
        
        if(attack.dist > realDist) {
          attack.dist = realDist;
          attack.mode = RTSNode.HITTING;
        }
        //now pay the population price
        this.pop -= RTSGBL.attCost*(attack.dist - origDist);
        break;
      case RTSNode.HITTING:
        //if we can't afford any more of this, recede
        if(this.pop < RTSGBL.hitPop) {
          attack.mode = RTSNode.RECEDING;
          break;
        }
        var dpop = RTSGBL.attSpeed*dt;
        //supply troops, or attack, based on ownership
        if(target.owner === this.owner) {
          //recede if full (don't waste)
          if(target.pop >= target.maxPop) {
            attack.mode = RTSNode.RECEDING;
            break;
          }
          target.pop += dpop;
        } else {
          target.popDrain(RTSGBL.attRatio*dpop, this.owner);
        }
        this.popDrain(dpop);
        break;
      case RTSNode.RECEDING:
        var ddist = -dt*RTSGBL.speed;
        var origDist = attack.dist;
        //in RECEDING, move backward; if you've made it, remove self
        attack.dist += ddist;
        if(attack.dist <= 0) attack.dist = 0;
        
        this.pop -= RTSGBL.attCost*(attack.dist - origDist);
        
        if(attack.dist === 0) {
          //remove self from attacks, continue
          attacks.splice(i--, 1);
          continue;
        }
        break;
      case RTSNode.WIZARD:
        var dist = attack.dist;
        var tgtAttacks = target.attacks;
        var tgtAttack = _.find(tgtAttacks, _.matchesProperty('id', this.id));
        //push forward if the enemy chickens out
        if(tgtAttack.mode !== RTSNode.WIZARD) {
          attack.mode = RTSNode.ATTACKING;
          break;
        }
        var tgtDist = tgtAttack.dist;
        if(tgtDist > dist) break; //let the one with the larger dist be responsible for both
        var realDist = this.dist(target);
        //gradually brings it towards the center
        var speed = RTSGBL.speed*(1-2*dist/realDist);
        attack.dist += dt*speed;
        tgtAttack.dist -= dt*speed;
        
        
        //add to how long they've been in wizard mode
        this.wizDur += dt*2;
        target.wizDur += dt*2;
        //give up if they can't afford wizardry
        var wizCost = dt*(RTSGBL.speed*RTSGBL.attCost + this.wizDur*RTSGBL.wizCoef);
        [[this, attack], [target, tgtAttack]].forEach(function(arr) {
          if(arr[0].popDrain(wizCost) < RTSGBL.attPop) {
              arr[1].mode = RTSNode.RECEDING;
          }
        });
    }
  }
};

RTSNode.prototype.dist = function(node) {
  var dx = this.x-node.x;
  var dy = this.y-node.y;
  return Math.sqrt(dx*dx+dy*dy)-this.size-node.size;
};

RTSNode.prototype.popDrain = function(amt, source) {
  this.pop -= amt;
  if(this.pop < 0) {
    if(this.owner === source) this.pop = 0;
    else this.pop = -this.pop;
    this.owner = source;
  }
  return this.pop;
};

RTSNode.prototype.getGrowth = function() {
  return this.size/10+this.pop/15;
};

RTSNode.prototype.getMaxPop = function() {
  return 50+Math.ceil(Math.pow(this.size, 1.2));
};