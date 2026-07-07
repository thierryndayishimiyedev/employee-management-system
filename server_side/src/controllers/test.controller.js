const supabase = require("../config/supabase");

const testDatabase = async (req, res) => {

    try {

        const { count, error } = await supabase
            .from("admins")
            .select("*", {
                count: "exact",
                head: true
            });

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        res.status(200).json({
            success: true,
            message: "Database connection is healthy.",
            data: {
                admins_count: count || 0
            }
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

};

module.exports = {
    testDatabase
};
