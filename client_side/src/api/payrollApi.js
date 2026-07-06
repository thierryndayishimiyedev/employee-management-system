import api from "./api";

/*
|--------------------------------------------------------------------------
| Generate Payroll
|--------------------------------------------------------------------------
*/

export const createPayroll = async (payrollData) => {

    const response = await api.post(
        "/payroll/generate",
        payrollData
    );

    return response.data;

};

export const generatePayroll = createPayroll;

/*
|--------------------------------------------------------------------------
| Get All Payrolls
|--------------------------------------------------------------------------
*/

export const getPayrolls = async () => {

    const response = await api.get(
        "/payroll"
    );

    return response.data;

};

/*
|--------------------------------------------------------------------------
| Get Payroll By ID
|--------------------------------------------------------------------------
*/

export const getPayrollById = async (id) => {

    const response = await api.get(
        `/payroll/${id}`
    );

    return response.data;

};

/*
|--------------------------------------------------------------------------
| Delete Payroll
|--------------------------------------------------------------------------
*/

export const deletePayroll = async (id) => {

    const response = await api.delete(
        `/payroll/${id}`
    );

    return response.data;

};