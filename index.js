// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.
app.use(express.static('public'));

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/src/views/layouts',
  partialsDir: __dirname + '/src/views/partials',
});

app.set('views', path.join(__dirname, 'src', 'views'));
app.use(express.static(path.join(__dirname, 'resources'))); // Updated path to serve static files

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************


// TODO - Include your API routes here
app.get('/', (req, res) => {
  res.redirect('/login'); // Redirect to the /login route
});

app.get('/login', (req, res) => {
  res.render('pages/login');
})

app.get('/register', (req, res) => {
  res.render('pages/register');
})

// Register
app.post('/register', async (req, res) => {
  try {
    // Hash the password using bcrypt library
    const hash = await bcrypt.hash(req.body.password, 10);

    // Insert username and hashed password into the 'users' table
    await db.none('INSERT INTO users(username, password) VALUES($1, $2)', [req.body.username, hash]);

    // Redirect to GET /login route after successful registration
    res.redirect('/login');
  } catch (error) {
    console.error('Registration error:', error.message || error);
    // Redirect back to the registration page if there's an error
    res.redirect('/register');
  }
});

app.post('/login', async (req, res) => {
  try {
    // Find the user in the users table
    const user = await db.oneOrNone('SELECT * FROM users WHERE username = $1', [req.body.username]);

    // Check if the user exists
    if (!user) {
      // User not found, render login page with error message
      const message = "Username not found. Please register.";
      return res.render('pages/login', { message, error: true });
    }

    // Compare the entered password with the hashed password in the database
    const match = await bcrypt.compare(req.body.password, user.password);

    if (!match) {
      // Password incorrect, render login page with error message
      const message = "Incorrect username or password.";
      return res.render('login', { message, error: true });
    }

    // If the password is correct, save user details in session
    req.session.user = user;
    req.session.save();

    // Redirect to /discover route after successful login
    res.redirect('/discover');
  } catch (error) {
    console.error('Login error:', error.message || error);
    // Render the login page with a generic error message
    const message = "An error occurred during login. Please try again.";
    res.render('pages/login', { message, error: true });
  }
});



// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/login');
  }
  next();
};

// Authentication Required
app.use(auth);
app.use('/discover', auth);

// Discover page
app.get('/discover', async (req, res) => {
  res.render('pages/discover');
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      // If there's an error during logout, you can log it and respond accordingly
      console.error('Session destruction error:', err);
      return res.status(500).send('Could not log out.');
    }
    // Render the logout page with a success message
    res.render('pages/logout', {
      message: 'Logged out Successfully',
      error: false
    });
  });
});

/*creating profile page route*/
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('Not authenticated');
  }
  try {
    res.render('pages/profile', { username: req.session.user.username });
    //  res.should.be.html; // Expecting a HTML response
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).send('Internal Server Error');
  }
});



// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');