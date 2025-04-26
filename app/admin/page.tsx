'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// @ts-expect-error - Dashboard components exist but TypeScript can't find them
import { Overview } from "@/components/admin/dashboard/overview";
import { RecentUsers } from "@/components/admin/dashboard/recent-users";
import { StatusCards } from "@/components/admin/dashboard/status-cards";
import { ModelUsage } from "@/components/admin/dashboard/model-usage";

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      
      {/* Status Cards */}
      <StatusCards />
      
      {/* Usage Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              Chat sessions and user activity for the past 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Model Usage</CardTitle>
            <CardDescription>
              Distribution of token usage by model
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModelUsage />
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>
            Latest user activity and registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecentUsers />
        </CardContent>
      </Card>
    </div>
  );
}