const { createAccountant } = require("../services/accountant.service");

const registerAccountant = async (req,res)=>{

    try{

        const accountant = await createAccountant(req.body);

        res.status(201).json({
            success:true,
            message:"Accountant created successfully.",
            data:accountant
        });

    }catch(err){

        res.status(400).json({
            success:false,
            message:err.message
        });

    }

};

module.exports={registerAccountant};