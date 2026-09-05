const router=require("express").Router(); const authenticate=require("../middleware/auth.middleware"); const authorize=require("../middleware/authorize.middleware"); const c=require("../controllers/workerConsumption.controller");
router.post("/",authenticate,authorize("ACCOUNTANT"),c.create);
router.get("/",authenticate,authorize("OWNER","MANAGER","ACCOUNTANT"),c.list);
router.put("/:id/approve",authenticate,authorize("MANAGER","OWNER"),c.approve);
router.put("/:id/request-changes",authenticate,authorize("MANAGER","OWNER"),c.changes);
router.post("/:id/pay",authenticate,authorize("OWNER"),c.pay);
router.post("/pay-all",authenticate,authorize("OWNER"),c.payAll);
module.exports=router;
