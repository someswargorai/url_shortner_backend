const JWT = require("jsonwebtoken");
require("dotenv").config();

const userAuth = async (req, res, next) => {
    try {
        const token = req.headers?.authorization?.split(" ")[1];
        if (!token) {
            return res.status(400).send({ message: "Token is required" });
        }
        const decodedToken = JWT.verify(token, process.env.JWT_SECRET);
        req.user = decodedToken;
        next();
    } catch (err) {
        return res.status(500).send({ message: "We’re experiencing technical difficulties. Please retry after some time." });
    }
}

module.exports = {
    userAuth,
}