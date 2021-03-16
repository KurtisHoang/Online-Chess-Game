const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const passport = require('passport')
const flash = require('connect-flash');
const session = require("express-session");

const app = express();
const server = http.Server(app);
const io = socketIO(server);

// Passport config
require('./config/passport')(passport);

// Handling anything socket-related
require('./socket')(io);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Handlebars
app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs'
}));
app.set('view engine', 'hbs');

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Cookie parser
//app.use(cookieParser());

// Express session
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
    res.locals.success = req.flash('success');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// Routes
app.use('/', require('./routes/index.js'));
app.use('/users', require('./routes/users.js'));
app.use('/game', require('./routes/game.js'));
app.use('/profile', require('./routes/profile.js'));

// Set port number
app.set('port', 8081);

/* Start server */
server.listen(app.get('port'), function () {
    console.log('Starting server on port ' + app.get('port'));
});

module.exports = app;
module.exports = {}
