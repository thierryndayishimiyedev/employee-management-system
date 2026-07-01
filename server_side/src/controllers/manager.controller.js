const {createManager}=require("../services/manager.service");

const registerManager=async(req,res)=>{

try{

const manager=await createManager(req.body);

res.status(201).json({
success:true,
message:"Manager created successfully.",
data:manager
});

}catch(err){

res.status(400).json({
success:false,
message:err.message
});

}

};

module.exports={registerManager};