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
    <div className="rounded-[1.75rem] border border-moss/10 bg-white p-5">
      <h3 className="font-display text-xl text-ink">{title}</h3>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d8ded3" />
            <XAxis dataKey="label" tick={{ fill: "#4f5f58", fontSize: 12 }} />
            <YAxis tick={{ fill: "#4f5f58", fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line name={title} type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
