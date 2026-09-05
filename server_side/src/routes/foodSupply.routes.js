const router = require("express").Router(); const authenticate = require("../middleware/auth.middleware"); const authorize = require("../middleware/authorize.middleware"); const c = require("../controllers/foodSupply.controller");
router.post("/", authenticate, authorize("FOOD_SUPPLIER"), c.create);
router.get("/", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "FOOD_SUPPLIER"), c.list);
router.get("/report.csv", authenticate, authorize("OWNER", "MANAGER", "ACCOUNTANT", "FOOD_SUPPLIER"), c.report);
router.put("/:id/approve", authenticate, authorize("MANAGER", "OWNER"), c.approve);
router.put("/:id/request-changes", authenticate, authorize("MANAGER", "OWNER"), c.changes);
router.post("/:id/pay", authenticate, authorize("OWNER"), c.pay);
router.post("/pay-all", authenticate, authorize("OWNER"), c.payAll);
module.exports = router;
