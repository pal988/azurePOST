const passport = require('passport');
const { OIDCStrategy } = require('passport-azure-ad');
const dotenv = require('dotenv')
dotenv.config();

passport.use(new OIDCStrategy({
    identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: process.env.AZURE_CLIENT_ID,
    responseType: 'code',
    responseMode: 'query',
    redirectUrl: process.env.AZURE_REDIRECT_URI,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    allowHttpForRedirectUrl: true,
    scope: ['profile', 'email'],
}, (profile, done) => {
    // Log the profile to the console
  //  console.log('User profile:', profile);
    // Process user profile
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

const checkRole = (role) => (req, res, next) => {
    if (req.user.role === role) {
        return next();
    }
    res.status(403).send('Forbidden');
};

module.exports = passport;
