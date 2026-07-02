import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/api";

const initialFormState = {
  company_id: "",
  first_name: "",
  last_name: "",
  gender: "",
  date_of_birth: "",
  national_id: "",
  phone: "",
  email: "",
  address: "",
  hire_date: "",
  monthly_salary: "",
  profile_photo: "",
  username: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterOwnerModal({ isOpen, onClose, company, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...initialFormState,
        company_id: company?.company_id || "",
      });
    }
  }, [isOpen, company]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setFormData({
      ...initialFormState,
      company_id: company?.company_id || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!company?.company_id) {
      toast.error("Owner registration requires a selected company.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (!formData.monthly_salary || Number(formData.monthly_salary) <= 0) {
      toast.error("Monthly salary must be a positive number.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        company_id: formData.company_id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        national_id: formData.national_id.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        hire_date: formData.hire_date,
        monthly_salary: Number(formData.monthly_salary),
        profile_photo: formData.profile_photo.trim() || null,
        username: formData.username.trim(),
        password: formData.password,
      };

      const response = await api.post("/owners", payload);

      toast.success("Owner registered successfully.");

      resetForm();

      onSuccess(response.data.data || response.data.owner || null);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to register owner."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Register Company Owner</h2>
            <p className="text-sm text-slate-500">Create the first owner for the selected company.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 transition hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-8 space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Company</label>
              <input
                type="text"
                value={company?.company_name || ""}
                disabled
                className="w-full rounded-3xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
              />
            </div>
          </div>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Owner Details</h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">National ID</label>
                <input
                  type="text"
                  name="national_id"
                  value={formData.national_id}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Employment</h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  required
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Hire Date</label>
                <input
                  type="date"
                  name="hire_date"
                  value={formData.hire_date}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Monthly Salary</label>
                <input
                  type="number"
                  name="monthly_salary"
                  value={formData.monthly_salary}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Profile Photo (optional)</label>
                <input
                  type="text"
                  name="profile_photo"
                  value={formData.profile_photo}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Login Credentials</h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="w-full rounded-3xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl bg-amber-500 px-5 py-3 text-white font-semibold transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Registering owner..." : "Register Owner"}
          </button>
        </form>
      </div>
    </div>
  );
}
