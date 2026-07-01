const { requestAdvance } = require("../services/advance.service");

const createAdvance = async (req,res)=>{

    try{

        const advance = await requestAdvance(req.body);

        res.status(201).json({
            success:true,
            message:"Advance requested successfully.",
            data:advance
        });

    }catch(err){

        res.status(400).json({
            success:false,
            message:err.message
        });

    }

};

module.exports={createAdvance};