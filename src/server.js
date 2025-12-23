// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const routes = require('./index.js');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // To parse JSON bodies
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecret-dev-key', // Use an environment variable in production
    resave: false,
    saveUninitialized: false, // Don't create session until something stored
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // In production, set to true and use HTTPS
        httpOnly: true // Prevents client-side JS from reading the cookie
    }
}));

// Mount the router
app.use('/', routes);

// Global error handler - must be the last middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Exception:', err.stack || err);

    // Avoid leaking stack trace in production
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred on the server.' 
        : err.message;
    res.status(statusCode).json({ message });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('Make sure GOOGLE_CLIENT_ID and SESSION_SECRET are set in the .env file.');
});