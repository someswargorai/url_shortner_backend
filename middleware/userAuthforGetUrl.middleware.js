const JWT = require("jsonwebtoken");
require("dotenv").config();

const userAuthforGetUrl = async (req, res, next) => {
    try {
        const token = req.headers?.authorization?.split(" ")[1];
        if (token) {
            const decodedToken = JWT.verify(token, process.env.JWT_SECRET);
            req.user = decodedToken;
        }
        next();
    } catch (err) {
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
}

module.exports = {
    userAuthforGetUrl
}