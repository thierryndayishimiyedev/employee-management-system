const express = require("express");
const cors = require("cors");

const testRoutes = require("./routes/test.routes");
const adminRoutes = require("./routes/admin.routes");
const authRoutes = require("./routes/auth.routes");
const companyRoutes = require("./routes/company.routes");
const ownerRoutes = require("./routes/owner.routes");
const ownerAuthRoutes = require("./routes/ownerAuth.routes");
const managerRoutes=require("./routes/manager.routes");
const managerAuthRoutes = require("./routes/managerAuth.routes");
const accountantRoutes=require("./routes/accountant.routes");
const accountantAuthRoutes = require("./routes/accountantAuth.routes");
const workerRoutes = require("./routes/worker.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Mining Management System API is running 🚀"
    });
});

app.use("/api/database", testRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/owner-auth", ownerAuthRoutes);
app.use("/api/managers",managerRoutes);
app.use("/api/manager-auth", managerAuthRoutes);
app.use("/api/accountants",accountantRoutes);
app.use("/api/accountant-auth", accountantAuthRoutes);
app.use("/api/workers", workerRoutes);




module.exports = app;