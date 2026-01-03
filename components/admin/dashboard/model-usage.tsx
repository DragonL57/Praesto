'use client';

import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

// We'll create a mock implementation since the database doesn't have model tracking yet
// In a real implementation, this would come from a database table tracking model usage

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--muted))',
];

export function ModelUsage() {
  const [loading, setLoading] = useState(true);

  // This would normally be fetched from an API endpoint
  const modelData = [
    { name: 'GPT-4o', value: 4300000 },
    { name: 'Claude 3', value: 3200000 },
    { name: 'Llama 3', value: 1600000 },
  ];

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[300px] w-full">
        <div className="text-muted-foreground">Loading model usage data...</div>
      </div>
    );
  }

  // Calculate total tokens
  const totalTokens = modelData.reduce((sum, model) => sum + model.value, 0);

  return (
    <div>
      <div className="mb-4 text-center">
        <p className="text-muted-foreground">Total tokens used</p>
        <h3 className="text-2xl font-bold">
          {(totalTokens / 1000000).toFixed(1)}M
        </h3>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={modelData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
          >
            {modelData.map((entry) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={COLORS[modelData.indexOf(entry) % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              `${(value / 1000000).toFixed(2)}M tokens`
            }
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              boxShadow:
                '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4">
        <p className="text-xs text-muted-foreground text-center">
          Note: Currently using estimated data. Integrate with your token
          tracking system for accurate metrics.
        </p>
      </div>
    </div>
  );
}
