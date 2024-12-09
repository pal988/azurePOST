const express = require('express');
const bodyParser = require('body-parser');
const passport = require('./auth');
const session = require('express-session');
const client = require('./db');

const app = express();

// Session middleware
app.use(session({
    secret: 'your-secret-key', // Replace with a secure key for production
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Use `true` if HTTPS is enabled
}));

app.use(bodyParser.json());
app.use(passport.initialize());

// Public route
app.get('/', (req, res) => res.send('Welcome to the CRUD API'));

// Azure OAuth routes
app.get('/auth/azure', passport.authenticate('azuread-openidconnect'));

app.get('/auth/azure/callback', 
    passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }),
    async (req, res) => {
        try {
            const user = req.user;
            const { sub:id,email,password,roles } = user._json; // Accessing the _json object to get the user profile data

            // Log user data for debugging
            console.log('User data:', user);

            // Insert or update user data into the database
            const result = await client.query(
                'INSERT INTO users (id,email,password,role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET email = $2, role = $4 RETURNING *',
                [id,email, password,JSON.stringify(roles)] // Storing userId from Azure profile
            );

            // Log the user ID inserted into the database
            const insertedUser = result.rows[0]; // The inserted or updated row
            console.log('User ID inserted into the database:', insertedUser.sub); // Assuming user_id is the column for the user ID

            // Respond back to the user
            res.send('Login successful and user data inserted/updated into the database');
            
        } catch (err) {
            console.error('Error inserting/updating user data:', err);
            res.status(500).json({ error: err.message });
        }
    });
    const checkRole = (role) => (req, res, next) => {
        if (req.user.roles === role) {
            return next();
        }
        res.status(403).send('Forbidden');
    };
    

// CRUD routes for items
app.get('/items',checkRole('User'), async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM items');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/items', async (req, res) => {
    const { name, description, sub } = req.body;
    try {
        const result = await client.query(
            'INSERT INTO items (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
            [name, description, sub]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// More routes (PUT, DELETE)...

// Start server
const PORT = process.env.PORT || 1000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
