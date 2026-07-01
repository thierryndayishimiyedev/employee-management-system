const express=require("express");

const router=express.Router();

const authenticate=require("../middleware/auth.middleware");

const { registerAccountant } = require("../controllers/accountant.controller");

router.post("/",authenticate,registerAccountant);

module.exports=router;