require("dotenv").config();

const app = require("./src/app");
const { startOwnerReportScheduler } = require('./src/services/ownerReportEmail.service');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    startOwnerReportScheduler();
});
