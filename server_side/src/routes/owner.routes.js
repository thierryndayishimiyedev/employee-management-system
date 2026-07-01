const express=require("express");

const router=express.Router();

const authenticate=require("../middleware/auth.middleware");

const {
    registerOwner,
    fetchOwners,
    fetchOwner,
    editOwner,
    removeOwner
}=require("../controllers/owner.controller");

router.post("/",authenticate,registerOwner);

router.get("/",authenticate,fetchOwners);

router.get("/:id",authenticate,fetchOwner);

router.put("/:id",authenticate,editOwner);

router.delete("/:id",authenticate,removeOwner);

module.exports=router;