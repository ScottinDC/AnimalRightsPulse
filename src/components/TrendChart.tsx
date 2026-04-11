import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface ChartPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  title: string;
  points: ChartPoint[];
  color?: string;
}

export function TrendChart({ title, points, color = "#234338" }: TrendChartProps) {
  return (
    <div className="rounded-[1.5rem] border border-[#99ADC6]/45 bg-white p-5">
      <h3 className="font-display text-xl text-[#4A678F]">{title}</h3>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#E6EDF5" />
            <XAxis axisLine={false} tickLine={false} dataKey="label" tick={{ fill: "#99ADC6", fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: "#99ADC6", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                borderRadius: "14px",
                border: "1px solid rgba(153,173,198,0.55)",
                boxShadow: "0 10px 30px rgba(74,103,143,0.08)"
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }} />
            <Line name={title} type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: color }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
