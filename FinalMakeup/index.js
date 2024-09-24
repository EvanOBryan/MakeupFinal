const express = require('express');
const session = require('express-session');
const { MongoClient } = require('mongodb');
const { Pool } = require('pg');
const path = require('path');

const expressServer = express();
const port = process.env.PORT || 3000;

// MongoDB URI and configuration
const mongoUri = "mongodb+srv://eaobryan:Avon1999@cluster0.xt9w2.mongodb.net/";
const mongoClient = new MongoClient(mongoUri);
let db;

// PostgreSQL configuration
const pgPool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'SearchLog',
    password: 'Avon1999',
    port: 5432,
});

// Set up EJS view engine and middleware
expressServer.set('view engine', 'ejs');
expressServer.use(express.static('public'));
expressServer.use(express.urlencoded({ extended: true }));
expressServer.use(session({
    secret: 'keyin-college',
    resave: false,
    saveUninitialized: false
}));

// Connect to MongoDB
mongoClient.connect()
    .then(() => {
        console.log("Connected to MongoDB");
        db = mongoClient.db('MovieSearch');
    })
    .catch(err => console.error('Failed to connect to MongoDB', err));

// Start the server
expressServer.listen(port, (error) => {
    if (error) {
        console.log(error);
    }
    console.log(`App running on port ${port}.`);
});

// Route for the default homepage (redirect to login)
expressServer.get('/', (request, response) => {
    response.redirect('/login');
});

// Render the login page
expressServer.get('/login', (request, response) => {
    response.render('login', { title: "Login" });
});

// Handle login post request
expressServer.post('/login', (request, response) => {
    const { username, password } = request.body;
    if (username && password) {
        request.session.user = { id: 1, username: username };
        response.redirect('/search');
    } else {
        response.redirect('/login');
    }
});

// Render the search page
expressServer.get('/search', (request, response) => {
    if (!request.session.user) {
        return response.redirect('/login');
    }

    response.render('search', {
        title: "Search for a Movie",
        searchResults: [],
        username: request.session.user.username
    });
});

// Handle search post request to search for movies in MongoDB and log to PostgreSQL
expressServer.post('/search', async (request, response) => {
    const searchKeyword = request.body.keyword;
    const username = request.session.user.username;

    if (!db) {
        return response.status(500).send('Database not initialized');
    }

    try {
        // Log the search in PostgreSQL
        await pgPool.query(
            'INSERT INTO searchlogs (search_keyword, username) VALUES ($1, $2)',
            [searchKeyword, username]
        );

        // Search for movies in MongoDB
        const searchResults = await db.collection('Movie_Data').find({
            title: { $regex: searchKeyword, $options: 'i' }
        }).toArray();

        // Render the search page with results
        response.render('search', {
            title: "Search for a Movie",
            searchResults: searchResults,
            username: username
        });
    } catch (err) {
        console.error('Error during search or logging:', err);
        response.status(500).send('An error occurred');
    }
});

// Display previous searches (from PostgreSQL)
expressServer.get('/previous-searches', async (request, response) => {
    if (!request.session.user) {
        return response.redirect('/login');
    }

    try {
        const { rows: previousSearches } = await pgPool.query(
            'SELECT search_keyword, search_time, username FROM searchlogs ORDER BY search_time DESC'
        );

        response.render('previous-searches', {
            title: "Previous Searches",
            previousSearches: previousSearches,
            username: request.session.user.username
        });
    } catch (err) {
        console.error('Error fetching previous searches:', err);
        response.status(500).send('An error occurred while retrieving previous searches');
    }
});

// Handle static files (e.g., CSS)
expressServer.get('/styles.css', (request, response) => {
    response.sendFile(path.join(__dirname, 'views', 'styles.css'));
});

// Handle 404 (Page Not Found)
expressServer.use((request, response) => {
    response.status(404).render('404');
});