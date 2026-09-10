import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function AttendanceChart({ data = [] }) {
    const chartData = Array.isArray(data) ? data : []
    if (!chartData.length) return <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50/40 text-sm text-slate-500">No attendance records are available for this week.</div>
    return <div className="attendance-live-chart h-72" role="img" aria-label="Live weekly attendance bar and line chart">
        <ResponsiveContainer width="100%" height="100%"><ComposedChart data={chartData} margin={{ top: 12, right: 10, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#dbeafe" strokeDasharray="3 3" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis yAxisId="people" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis yAxisId="hours" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #bfdbfe', boxShadow: '0 12px 28px rgba(30,64,175,.14)' }} />
            <Legend wrapperStyle={{ paddingTop: 14 }} />
            <Bar yAxisId="people" dataKey="present" name="Present" fill="#2563eb" radius={[7, 7, 0, 0]} maxBarSize={34} />
            <Bar yAxisId="people" dataKey="absent" name="Absent" fill="#ef4444" radius={[7, 7, 0, 0]} maxBarSize={34} />
            <Line yAxisId="hours" type="monotone" dataKey="hours" name="Hours worked" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} />
        </ComposedChart></ResponsiveContainer>
    </div>
}
