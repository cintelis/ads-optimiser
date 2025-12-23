const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Create a separate OAuth2 client for the Ads API flow
const adsApiClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    // This must be configured in your Google Cloud project
    `http://localhost:${process.env.PORT || 3000}/api/auth/google-ads/callback`
);

exports.googleSignIn = async (req, res) => {
    try {
        const { token, rememberMe } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        // Store user info in session
        req.session.user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
        };

        if (rememberMe) {
            // Set cookie to expire in 30 days (in milliseconds)
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        } else {
            // Browser session cookie (expires when browser closes)
            req.session.cookie.maxAge = null;
        }

        res.status(200).json({ message: 'Login successful' });
    } catch (error) {
        console.error('Error verifying Google token:', error);
        res.status(401).json({ message: 'Invalid token' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out.' });
        }
        res.status(200).json({ message: 'Logout successful' });
    });
};

exports.connectGoogleAds = (req, res) => {
    const authUrl = adsApiClient.generateAuthUrl({
        access_type: 'offline', // Required to get a refresh token
        scope: ['https://www.googleapis.com/auth/adwords'],
        prompt: 'consent', // Ensures the user is prompted for consent every time
    });
    res.redirect(authUrl);
};

exports.googleAdsCallback = async (req, res) => {
    try {
        const { code } = req.query;
        const { tokens } = await adsApiClient.getToken(code);

        // IMPORTANT: In a production app, you would encrypt and store this
        // refresh_token in a database associated with the user.
        // For this example, we'll store it in the session.
        req.session.ads_refresh_token = tokens.refresh_token;

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Error getting Google Ads token:', error);
        res.redirect('/dashboard?error=ads_auth_failed');
    }
};