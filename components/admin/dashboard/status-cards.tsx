'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { UsersRound, ActivitySquare, MessageSquare, Database } from "lucide-react";

interface StatsData {
  userStats: {
    total: number;
    recent: number;
    active: number;
  };
  chatStats: {
    total: number;
    recent: number;
  };
  messageStats: {
    total: number;
    recent: number;
  };
}

export function StatusCards() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 bg-primary-foreground rounded-full">
            <UsersRound className="size-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Users</p>
            <h3 className="text-2xl font-bold">
              {loading ? '...' : stats?.userStats.total.toLocaleString()}
            </h3>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
            <ActivitySquare className="size-6 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active Users</p>
            <h3 className="text-2xl font-bold">
              {loading ? '...' : stats?.userStats.active.toLocaleString()}
            </h3>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
            <MessageSquare className="size-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Conversations</p>
            <h3 className="text-2xl font-bold">
              {loading ? '...' : stats?.chatStats.total.toLocaleString()}
            </h3>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
            <Database className="size-6 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Messages</p>
            <h3 className="text-2xl font-bold">
              {loading ? '...' : stats?.messageStats.total.toLocaleString()}
            </h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}