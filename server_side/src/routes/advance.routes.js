const express=require("express");

const router=express.Router();

const authenticate=require("../middleware/auth.middleware");

const { createAdvance } = require("../controllers/advance.controller");

router.post("/",authenticate,createAdvance);

module.exports=router;