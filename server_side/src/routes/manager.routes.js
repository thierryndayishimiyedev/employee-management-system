const express=require("express");

const router=express.Router();

const authenticate=require("../middleware/auth.middleware");

const {registerManager}=require("../controllers/manager.controller");

router.post("/",authenticate,registerManager);

module.exports=router;