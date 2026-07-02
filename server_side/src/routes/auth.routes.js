// const express = require("express");

// const router = express.Router();

// const {
//     loginAdmin
// } = require("../controllers/auth.controller");

// router.post("/login", loginAdmin);

// module.exports = router;


const express = require("express");

const router = express.Router();

const {
    loginUser
} = require("../controllers/auth.controller");

router.post("/login", loginUser);

module.exports = router;