'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersTable } from "@/components/admin/users/users-table";
import { UserStatsCards } from "@/components/admin/users/user-stats-cards";
import { UserFilters } from "@/components/admin/users/user-filters";
import { Search, Plus, DownloadCloud, Upload } from "lucide-react";

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <DownloadCloud className="mr-2 size-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 size-4" />
            Import
          </Button>
          <Button size="sm">
            <Plus className="mr-2 size-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* User Statistics */}
      <UserStatsCards />
      
      {/* User Management Tabs */}
      <Tabs defaultValue="all-users" className="w-full">
        <TabsList>
          <TabsTrigger value="all-users">All Users</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
        </TabsList>
        <TabsContent value="all-users">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Users</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-8 w-[250px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <CardDescription>
                Manage users and their permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserFilters />
              <UsersTable searchQuery={searchQuery} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="active">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Active Users</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search active users..."
                    className="pl-8 w-[250px]"
                  />
                </div>
              </div>
              <CardDescription>
                Manage active users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserFilters />
              <UsersTable searchQuery={searchQuery} statusFilter="active" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="inactive">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Inactive Users</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search inactive users..."
                    className="pl-8 w-[250px]"
                  />
                </div>
              </div>
              <CardDescription>
                Manage inactive users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserFilters />
              <UsersTable searchQuery={searchQuery} statusFilter="inactive" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="new">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>New Users</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search new users..."
                    className="pl-8 w-[250px]"
                  />
                </div>
              </div>
              <CardDescription>
                Manage recently registered users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserFilters />
              <UsersTable searchQuery={searchQuery} statusFilter="new" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}