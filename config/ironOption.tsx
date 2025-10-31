const ironOption = {
    cookieName: 'weam', // Must match WEAM iron-session cookie
    password: process.env.NEXT_PUBLIC_COOKIE_PASSWORD || 'eNfUm7mmU2tIrG7fl0zTmswH7ibarfLo',
    cookieOptions: {
        httpOnly: true,
        secure: false,
    },
};

export default ironOption;
