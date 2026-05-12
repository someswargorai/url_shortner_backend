const JWT = require("jsonwebtoken");
const userSchema = require("../model/user.schema");

require("dotenv").config();

const authController = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Email is required",
      });
    }

    let user = await userSchema.findOne({ email });

    let authMessage = "";

    if (user === null) {
      user = await userSchema.create({
        name,
        email,
      });

      authMessage = "Account created successfully";
    }

    else {
      authMessage = "Login successful";
    }

    const token = JWT.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "10d",
      }
    );
    return res.status(200).send({
      success: true,
      message: authMessage,
      user: {
        access_token: token,
        id: user._id,
        name: user.name,
        email: user.email
      },
    });
  } catch (err) {
    console.log(err);

    return res.status(500).send({
      success: false,
      message:
        "We’re experiencing technical difficulties. Please retry after some time.",
    });
  }
};

module.exports = {
  authController,
};