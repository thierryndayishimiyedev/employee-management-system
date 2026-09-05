const router = require("express").Router();
const authenticate = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const controller = require("../controllers/foodSupplier.controller");
// A company has one supplier account, created and controlled by its owner.
router.post("/", authenticate, authorize("OWNER", "SUPER_ADMIN"), controller.create);
router.get("/", authenticate, authorize("OWNER", "MANAGER", "FOOD_SUPPLIER", "SUPER_ADMIN"), controller.list);
module.exports = router;
