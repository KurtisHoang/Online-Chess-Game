const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

const leaderboardModel = require('../models').Leaderboard;

var top10 = [];
var rankings = [];

//get top 10
leaderboardModel.findAndCountAll({
  order: [
    ['winCount','DESC']
  ]
}).then(function(results,err) {
  if(err)
  {
      console.log('Error selecting messages from DB.');
  }
  else 
  {
    for(var i = 0; i < results.count; i++)
    {
      if(i < 10)
      {
        top10[i] = results.rows[i];
        rankings[i] = results.rows[i];
      }
      else
      {
        rankings[i] = results.rows[i];
      }
    }
  }
});

// Welcome page
router.get('/', forwardAuthenticated, function (req, res) {
  res.render('welcome', {
    title: "Welcome - Team 10 Chess",
    active: { Welcome: true }
  });
});

// Lobby page
router.get('/lobby', ensureAuthenticated, function (req, res) {
  res.render('lobby', {
    loggedUser: req.user.userName,
    title: "Lobby - Team 10 Chess",
    active: { Lobby: true },
    top10,
    rankings
  })
});

// Chess game page
router.get('/game', ensureAuthenticated, function (req, res) {
  res.render('chessBoard', {
    loggedUser: req.user.userName,
    title: "Game - Team 10 Chess",
    active: { Game: true }
  })
});

// Profile page
router.get('/profile', ensureAuthenticated, function (req, res) {
  res.render('profile', {
    loggedUser: req.user.userName,
    title: "Profile - Team 10 Chess",
    active: { Profile: true }
  })
});

// How to Play page
router.get('/howToPlay', function (req, res) {
  res.render('howToPlay', {
    loggedUser: req.user.userName,
    title: "How to Play - Team 10 Chess",
    active: { HowToPlay: true }
  })
});

// About page
router.get('/about', ensureAuthenticated, function (req, res) {
  res.render('about', {
    loggedUser: req.user.userName,
    title: "About - Team 10 Chess",
    active: { About: true }
  })
});

module.exports = router;