const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        console.log("Authorization Header:", authHeader);

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Access denied. No token provided."
            });
        }

        const token = authHeader.split(" ")[1];

        console.log("Token:", token);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Invalid token."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        console.log("Decoded:", decoded);

        req.user = decoded;

        next();

    } catch (error) {

        console.log(error);

        return res.status(401).json({
            success: false,
            message: "Unauthorized."
        });

    }

};

module.exports = authenticate;