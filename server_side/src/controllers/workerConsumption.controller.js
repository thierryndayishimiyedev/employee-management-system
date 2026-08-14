const service = require("../services/workerConsumption.service");
const create = async (req,res) => { try { res.status(201).json({success:true,data:await service.recordConsumption(req.body||{},req.user)}); } catch(err) { res.status(400).json({success:false,message:err.message}); } };
const list = async (req,res) => { try { res.json({success:true,data:await service.getConsumptions(req.user)}); } catch(err) { res.status(400).json({success:false,message:err.message}); } };
module.exports={create,list};
