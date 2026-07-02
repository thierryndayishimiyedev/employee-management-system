import { useState } from "react";
import { X, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/api";

export default function RegisterCompanyModal({
  isOpen,
  onClose,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    mining_license_number: "",
    tin_number: "",
    phone: "",
    email: "",
    province: "",
    district: "",
    sector: "",
    village: "",
    address: "",
    registration_date: new Date().toISOString().split("T")[0],
  });

  const provinces = [
    "Kigali City",
    "Northern Province",
    "Southern Province",
    "Eastern Province",
    "Western Province",
  ];

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setFormData({
      company_name: "",
      mining_license_number: "",
      tin_number: "",
      phone: "",
      email: "",
      province: "",
      district: "",
      sector: "",
      village: "",
      address: "",
      registration_date: new Date().toISOString().split("T")[0],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await api.post("/companies", formData);

      if (response.data.success) {
        toast.success("Company registered successfully");

        const createdCompany = response.data.data || response.data.company || null;

        resetForm();

        onSuccess(createdCompany);

        onClose();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to register company"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* Header */}

        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6">

          <div className="flex items-center gap-4">

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">

              <Building2
                size={28}
                className="text-amber-600"
              />

            </div>

            <div>

              <h2 className="text-2xl font-bold text-slate-800">
                Register Mining Company
              </h2>

              <p className="text-sm text-slate-500">
                Create a new mining company and prepare it for owner registration.
              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 transition hover:bg-slate-100"
          >
            <X size={22} />
          </button>

        </div>

        <form
          onSubmit={handleSubmit}
          className="max-h-[75vh] overflow-y-auto p-8"
        >

          <div className="grid gap-6 md:grid-cols-2">

            {/* Company Name */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Company Name
              </label>

              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="ABC Mining Ltd"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />

            </div>

            {/* License */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Mining License
              </label>

              <input
                type="text"
                name="mining_license_number"
                value={formData.mining_license_number}
                onChange={handleChange}
                placeholder="License Number"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />

            </div>

            {/* TIN */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                TIN Number
              </label>

              <input
                type="text"
                name="tin_number"
                value={formData.tin_number}
                onChange={handleChange}
                placeholder="TIN Number"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />

            </div>

            {/* Email */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Company Email
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="company@example.com"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />

            </div>

            {/* Phone */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Phone Number
              </label>

              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+2507..."
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />

            </div>

            {/* Registration Date */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Registration Date
              </label>

              <input
                type="date"
                name="registration_date"
                value={formData.registration_date}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />

            </div>
                        {/* Province */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Province
              </label>

              <select
                name="province"
                value={formData.province}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              >
                <option value="">Select Province</option>

                {provinces.map((province) => (
                  <option
                    key={province}
                    value={province}
                  >
                    {province}
                  </option>
                ))}

              </select>

            </div>

            {/* District */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                District
              </label>

              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                placeholder="District"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />

            </div>

            {/* Sector */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Sector
              </label>

              <input
                type="text"
                name="sector"
                value={formData.sector}
                onChange={handleChange}
                placeholder="Sector"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />

            </div>

            {/* Village */}

            <div>

              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Village
              </label>

              <input
                type="text"
                name="village"
                value={formData.village}
                onChange={handleChange}
                placeholder="Village"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              />

            </div>

          </div>

          {/* Address */}

          <div className="mt-6">

            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Physical Address
            </label>

            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={4}
              required
              placeholder="Enter full company address..."
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />

          </div>

          {/* Footer */}

          <div className="mt-8 flex items-center justify-end gap-4 border-t border-slate-200 pt-6">

            <button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-amber-500 px-6 py-3 font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register Company"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}