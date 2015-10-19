## Node RTS
###### A realtime strategy game using web technologies and Node.js

### About

This is an online multiplayer RTS originally developed for HackNC 2015.  It is similar to the old flash games Phage Wars and Tentacle Wars, but it plays online.

##### HackNC

At HackNC, I had a great time writing the original code for this game.  Towards the end time became scarce, so the end result was a very bare-bones, but functional multiplayer game. I immediately knew I wanted to continue working on it, and I felt like it could turn into something even better, so that's what I did.

### Installation/Usage

After cloning or downloading, run it like so: 
``` bash
bower install
npm install
npm start
```
By default it will run on port 8080.  To play, go to `localhost:8080` and it will generate a unique URL for you; this is your room.  Give it to a friend to play together.  In the future, I hope for a real system of names, room listings, and maps.

### How it works

The server is an authoritative source of information.  Each client is repeatedly sent copies of the game state via WebSockets to stay in sync.  Clients send the server attempted actions and, if they pass sanity checks, get added to a priority queue of player actions.

This priority queue (sorted by time) is part of the game state. Take, for example,  when a user attempts to attack – the (slightly delayed) attack is added to the priority queue which is sent to all players.  Everyone learns of the attack just before it actually happens, and by the time it does, everyone is in sync and even the attacker sees the same picture as all the other players.
 
If there is a lapse in the data connection, the client continues to "simulate" the game based on its most recent copy of the game state sent from the server.  This seems to work well, but I need to implement a little bit of interpolation on the client side, that way if the client is off by a few pixels it doesn't jump when it receives a new copy from the server.