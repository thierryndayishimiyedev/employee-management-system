const express=require("express");

const router=express.Router();

const authenticate=require("../middleware/auth.middleware");

const { payAll } = require("../controllers/payment.controller");

router.post("/pay-all",authenticate,payAll);

module.exports=router;