const { payAllApprovedPayrolls } = require("../services/payment.service");

const payAll = async (req,res)=>{

    try{

        const result = await payAllApprovedPayrolls();

        res.json({
            success:true,
            message:"Payments completed.",
            data:result
        });

    }catch(err){

        res.status(400).json({
            success:false,
            message:err.message
        });

    }

};

module.exports={
    payAll
};