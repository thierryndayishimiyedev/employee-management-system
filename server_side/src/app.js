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
const attendanceRoutes=require("./routes/attendance.routes");
const productionRoutes = require("./routes/production.routes");
const payrollRoutes = require("./routes/payroll.routes");
const advanceRoutes=require("./routes/advance.routes");
const advanceApprovalRoutes = require("./routes/advanceApproval.routes");
const payrollApprovalRoutes = require("./routes/payrollApproval.routes");
const paymentRoutes=require("./routes/payment.routes");
const departmentRoutes = require("./routes/department.routes");
const positionRoutes = require("./routes/position.routes");
const roleRoutes = require("./routes/role.routes");
const reportRoutes = require("./routes/report.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const superAdminDashboardRoutes = require("./routes/superAdminDashboard.routes");
const employeeRoutes = require("./routes/employee.routes");

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
app.use("/api/attendance",attendanceRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/advances",advanceRoutes);
app.use("/api/advance-approvals", advanceApprovalRoutes);
app.use("/api/payroll-approvals", payrollApprovalRoutes);
app.use("/api/payments",paymentRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/super-admin/dashboard", superAdminDashboardRoutes);
app.use("/api/employees", employeeRoutes);





module.exports = app;
