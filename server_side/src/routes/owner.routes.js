const express=require("express");

const router=express.Router();

const authenticate=require("../middleware/auth.middleware");
const authorize=require("../middleware/authorize.middleware");

const {
    registerOwner,
    fetchOwners,
    fetchOwner,
    editOwner,
    removeOwner
}=require("../controllers/owner.controller");

router.use(authenticate, authorize("SUPER_ADMIN"));

router.post("/",registerOwner);

router.get("/",fetchOwners);

router.get("/:id",fetchOwner);

router.put("/:id",editOwner);

router.delete("/:id",removeOwner);

module.exports=router;
