const router = require("express").Router();
const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const controller = require("../controllers/foodSupplier.controller");
router.post("/", authenticate, authorize("MANAGER"), controller.create);
router.get("/", authenticate, authorize("OWNER", "MANAGER", "FOOD_SUPPLIER"), controller.list);
module.exports = router;
