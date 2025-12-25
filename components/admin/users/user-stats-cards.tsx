'use client';

import { Card, CardContent } from "@/components/ui/card";
import { UsersRound, ActivitySquare, BellOff, UserPlus } from "lucide-react";

export function UserStatsCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 bg-primary-foreground rounded-full">
            <UsersRound className="size-6 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Users</p>
            <h3 className="text-2xl font-bold">2,853</h3>
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
            <h3 className="text-2xl font-bold">1,924</h3>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-full">
            <BellOff className="size-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Inactive Users</p>
            <h3 className="text-2xl font-bold">429</h3>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
            <UserPlus className="size-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">New This Month</p>
            <h3 className="text-2xl font-bold">72</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}