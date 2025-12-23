exports.isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    // If an API route is hit without authentication, return a 401 error.
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    // For page views, redirect to the login page.
    res.redirect('/');
};