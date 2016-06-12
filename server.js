/**
 * Handle all the requires and configure all the modules.
 */

var express 			= require("express");
var session 			= require('express-session');
var app 				= express();
var server 				= require("http").createServer(app);
var io 					= require("socket.io")(server);
var passportSocketIo 	= require("passport.socketio");
var cookieParser 		= require('cookie-parser');
var bodyParser 			= require('body-parser')
var passport 			= require('passport');
var Strategy 			= require('passport-local').Strategy;
var redis 				= require("redis").createClient(process.env.REDIS_URL);
var RedisStore 			= require('connect-redis')(session);
var socketioRedis 		= require("passport-socketio-redis");
var mongo				= require("mongoose");
var bcrypt				= require("bcrypt-nodejs");
var csurf               = require("csurf");
var csrfProtection      = csurf({ cookie: true });
var xssFilters 			= require('xss-filters');

var mongoUrl = process.env.MONGODB_URI || "mongodb://localhost/secureChat";

// Connect to the database called 'secureChat' on the local machine.
mongo.connect(mongoUrl);

// Define a mongoose schema representing a user account.
var userSchema = mongo.Schema({
    username: {
		type: String,
		unique: true
	},
    password: String
});

// Access the collection table called Users
var Users = mongo.model("Users", userSchema);

// Allow our app to use bodyParser for POST requests.
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());

// Allow our app to use csruf protection
app.use(csrfProtection);

// Error handling for invalid csrf tokens
app.use(function (err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err)

  // handle CSRF token errors here
  res.status(403);
  res.send('form tampered with');
});

// Set templating parsing engine to parse Pug files (.pug).
app.set('view engine', 'pug');

// Configure our app to use 'public' as the static files directory.
app.use(express.static('public'));
app.use('/bower_components',  express.static(__dirname + '/bower_components'));

// Redis Store for storing user sessions.
var redisStore = new RedisStore({host: 'localhost', port: 6379, client: redis});

// Set Redis to log any errors to the console.
redis.on("error", function (err) {
	console.log("redis error: " + err);
});

// Configure our app's session storage.
// Using Redis to store the user sessions;
// Sessions last 24 hours and set sessions to be destroy after logout.
app.use(session({
	resave: false,
	saveUninitialized: false,
	secret: "secret key", 		// Keep your secret key
	key: "express.sid",
	store: redisStore,
	cookie: {maxAge: 4.32e7},	// 12 hours (maxAge is in milliseconds)
	unset: "destroy"
}));

// Configure our app to use passportJS middleware for authentication.
app.use(passport.initialize());
app.use(passport.session());

// Configure our sockets to use the same settings as above.
io.use(socketioRedis.authorize({
	passport: passport,
	cookieParser: cookieParser,
	key: 'express.sid',
	secret: 'secret key',
	store: redisStore,
	unset: "destroy",
	success: authorizeSuccess,  		// Call authorizeSucess() on success.
	fail: authorizeFail    				// Call authorizeFail() on failure.
}));

function authorizeSuccess(data, accept) {
	console.log('Authorized Success');
	accept();
}

function authorizeFail(data, message, error, accept) {
	if (error) return accept(new Error(message));
	console.log("Unauthorized user connected");
	return accept();
}

// Configure passport to use local (username-password) strategy for authentication.
// More info about the passportJS authentication:
// http://toon.io/understanding-passportjs-authentication-flow/
passport.use(new Strategy(
	function (username, password, done) {

		Users.findOne({ username: xssFilters.inHTMLData(username) }, function(err, result) {
			if (err) {
				res.send("login error");
				return done(null, false);
			}
			else if (result) {

				// Compare the password with the salted password hash.
				// True if they match. Else return authentication failure.
				if (bcrypt.compareSync(password, result.password)) {
					return done(null, result);
				}
				else {
					return done(null, false);
				}
			}
			else {
				return done(null, false);
			}
		});
}));

// Called by req.login().
passport.serializeUser(function (user, callback) {
	callback(null, user);
});

passport.deserializeUser(function (id, callback) {

	Users.findById(id, function(err, result) {
		if (err) {
			return callback(null, false);
		}
		else {
			return callback(null, result);
		}
	});
});


/**
 * Handle all the routing of the application.
 */

// Redirect all traffic to https.
app.get('*', function (req, res, next) {
	if (req.headers["x-forwarded-proto"] != "https") 
		res.redirect("https://" + req.hostname + req.url);
	else
		next();
});

// When the client requests the root directory,
// send back the rendered index.pug template.
app.get("/", function (req, res) {
	console.log("req.user: " + req.user);
	res.render("index", {user: req.user});	// Expose req.user to the template.
});

// Logout the user and destroy the session.
app.get("/logout", function (req, res) {
	req.logout();
	req.session.destroy();
	res.redirect("/");
});

// This is the login page.
app.get("/login", csrfProtection, function (req, res) {

	var message;
	if (req.isAuthenticated()) { message = "Welcome " + req.user.username + "!"; }
	else { message = "Please login."; }
	res.render("login", {message: message, csrfToken: req.csrfToken()});
});

// This is the reregistration page.
app.get("/register", csrfProtection, function (req, res) {
	if (req.isAuthenticated()) { res.redirect("/"); }
	else { res.render("register", {csrfToken: req.csrfToken() }); }
});

// Handle the user submitting the login form.
app.post("/login", csrfProtection,
	passport.authenticate("local", {failureRedirect: "/fail"}),
	function (req, res) {
		res.redirect("/");
		console.log("User logged in: " + req.user.username);
		console.log("Cookie will expire in " + req.session.cookie.maxAge + " seconds");
	}
);

// Handle user registration.
app.post("/register", csrfProtection, function (req, res) {

	// bodyParser middleware allows us to access the body of the request object.
	console.log("Username: " + req.body['username']);
	console.log("Password: " + req.body['password']);

	// Create user account object based on mongodb User schema.
	var userAcc = new Users({
		username: xssFilters.inHTMLData(req.body['username']),
		password: bcrypt.hashSync(req.body['password'], bcrypt.genSaltSync(8), null)
	});

	// Create new user account in the database.
	// Make sure the usernames are unique.
	userAcc.save(function (error, result) {
		if (error){
			if (error.code === 11000){
				res.send("Error 11000 username taken");
			}
		}
		else {
			req.login(userAcc, function (err) {
				if (err) console.log("Error logging in after registration " + err);
			});
			res.redirect("/");
		}
	});
});

/**
 * Handle the socket.io events.
 */

// Respond to the "connection" event. Fires upon client connecting to the server.
io.on("connection", function (client) {
	var id = client.id;
	var username = client.request.user.username;

	console.log("A user with id = " + id + " has connected. ");

	//console.log("all: " + Object.getOwnPropertyNames(client));
	//console.log("cliennt:" + Object.getOwnPropertyNames(client.request));
	//console.log("headers: " + Object.getOwnPropertyNames(client.handshake.headers));

	console.log("Cookie: " + client.handshake.headers.cookie + "\n\n");

	// When the client sends a chat message, emit the message to everyone on the server socket.
	client.on("sendChatMessage", function (data) {
		io.emit("newChatMessage", data);
		console.log("Received new chat message: " + data.message);
	});

	// Respond to the client when they disconnect their connection.
	client.on("disconnect", function () {
		console.log(id + " has disconnected.");
	});
});


/**
 * Set server to listen on 8888 or if we're running on
 * Heroku, let them pick a port number.
 */

var listener = server.listen(process.env.PORT || 8888, function (){
	console.log("server listening on port " + listener.address().port);
});
