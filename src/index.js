const express = require('express');
const path = require('path');
const { isAuthenticated } = require('./auth.middleware.js');
const authController = require('./auth.controller.js');
const userController = require('./user.controller.js');
const adsService = require('./google-ads.service.js');

const router = express.Router();

// API Routes
router.post('/api/auth/google', authController.googleSignIn);
router.post('/api/auth/logout', authController.logout);
router.get('/api/user/me', isAuthenticated, userController.getMe);

// Google Ads API Routes
router.get('/api/auth/google-ads/connect', isAuthenticated, authController.connectGoogleAds);
router.get('/api/auth/google-ads/callback', isAuthenticated, authController.googleAdsCallback);

router.get('/api/ads/accounts', isAuthenticated, async (req, res, next) => {
    if (!req.session.ads_refresh_token) {
        return res.json({ accounts: [], needs_auth: true });
    }
    try {
        const accounts = await adsService.listAccessibleCustomers(req.session.ads_refresh_token);
        res.json({ accounts });
    } catch (error) {
        next(error);
    }
});

router.get('/api/ads/campaigns/:customerId', isAuthenticated, async (req, res, next) => {
    try {
        const campaigns = await adsService.getCampaigns(req.session.ads_refresh_token, req.params.customerId);
        res.json({ campaigns });
    } catch (error) {
        next(error);
    }
});

// Unsplash Proxy Route
router.get('/api/unsplash/random', async (req, res) => {
    try {
        const { query, orientation } = req.query;
        const accessKey = process.env.UNSPLASH_ACCESS_KEY;
        // Using Node.js native fetch (available in Node 18+)
        const response = await fetch(`https://api.unsplash.com/photos/random?query=${query}&orientation=${orientation}&client_id=${accessKey}`);
        
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Unsplash Proxy Error:', error);
        res.status(500).json({ message: 'Failed to fetch image' });
    }
});

// View Routes
router.get('/client-id.js', (req, res) => {
    res.type('application/javascript');
    res.send(`window.GOOGLE_CLIENT_ID = "${process.env.GOOGLE_CLIENT_ID}";`);
});

router.get('/', (req, res) => res.sendFile(path.join(__dirname, '../login.html')));

router.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

router.get('/dashboard.js', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.js'));
});

module.exports = router;