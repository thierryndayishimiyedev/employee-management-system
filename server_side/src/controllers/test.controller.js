const supabase = require("../config/supabase");

const testDatabase = async (req, res) => {

    try {

        const { data, error } = await supabase
            .from("admins")
            .select("*");

        if (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }

        res.status(200).json({
            success: true,
            data
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