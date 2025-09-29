const ironOption = {
    cookieName: process.env.WEAM_COOKIE_NAME || process.env.NEXT_PUBLIC_COOKIE_NAME || 'weam',
    password: process.env.WEAM_COOKIE_PASSWORD || process.env.NEXT_PUBLIC_COOKIE_PASSWORD || 'your-secure-password-here',
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // true in production
        sameSite: 'lax'
    },
};

module.exports = ironOption;
