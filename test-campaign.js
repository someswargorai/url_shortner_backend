const mongoose = require("mongoose");
const JWT = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const userSchema = require("./model/user.schema");

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const user = await userSchema.findOne();
    if (!user) {
        console.log("No user found");
        process.exit(1);
    }
    const token = JWT.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "10d" }
    );
    
    const response = await fetch("http://localhost:3001/campaign", {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Data:", data);
    process.exit(0);
}).catch(console.error);
