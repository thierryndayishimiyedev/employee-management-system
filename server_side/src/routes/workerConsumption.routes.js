const router=require("express").Router(); const authenticate=require("../middleware/auth.middleware"); const authorize=require("../middleware/authorize.middleware"); const c=require("../controllers/workerConsumption.controller");
router.post("/",authenticate,authorize("ACCOUNTANT"),c.create);
router.get("/",authenticate,authorize("OWNER","MANAGER","ACCOUNTANT"),c.list);
module.exports=router;
