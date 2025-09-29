// Session data types for Iron Session
const IronSessionData = {
    user: {
        _id: String,
        email: String,
        name: String,
        companyId: String,
        access_token: String,
        refresh_token: String,
        isProfileUpdated: Boolean,
        roleCode: String
    },
    companyId: String
};

module.exports = { IronSessionData };
