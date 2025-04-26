'use client';

import { useState, useEffect } from 'react';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

interface DailyActivity {
  date: string;
  chats: number;
  messages: number;
}

interface AnalyticsData {
  dailyActivity: DailyActivity[];
  averageMessagesPerChat: number;
}

export function Overview() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/admin/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const data = await response.json();
        setAnalyticsData(data);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[350px] w-full">
        <div className="text-muted-foreground">Loading analytics data...</div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex justify-center items-center h-[350px] w-full">
        <div className="text-muted-foreground">Failed to load analytics data</div>
      </div>
    );
  }

  // Filter to just the last 14 days for better visibility
  const visibleData = analyticsData.dailyActivity.slice(-14);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={visibleData}>
        <XAxis
          dataKey="date"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'var(--background)', 
            border: '1px solid var(--border)',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }} 
        />
        <Legend />
        <Bar
          dataKey="chats"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
          name="Conversations"
        />
        <Bar
          dataKey="messages"
          fill="hsl(var(--accent))"
          radius={[4, 4, 0, 0]}
          name="Messages"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}