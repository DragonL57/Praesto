'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { formatDistanceToNow } from 'date-fns';

interface User {
  id: string;
  email: string;
  lastActive: string | null;
  chatCount: number;
  messageCount: number | null;
}

export function RecentUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users?limit=5'); // Get only 5 most recent users
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers(data.users);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Function to determine user status based on lastActive
  const getUserStatus = (lastActive: string | null): 'active' | 'inactive' | 'new' => {
    if (!lastActive) return 'new';
    
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffInDays = (now.getTime() - lastActiveDate.getTime()) / (1000 * 3600 * 24);
    
    if (diffInDays < 7) return 'active';
    return 'inactive';
  };

  // Format the last active time
  const formatLastActive = (lastActive: string | null): string => {
    if (!lastActive) return 'Never';
    return formatDistanceToNow(new Date(lastActive), { addSuffix: true });
  };

  // Get initials from email
  const getInitials = (email: string): string => {
    return email.charAt(0).toUpperCase();
  };

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Conversations</TableHead>
            <TableHead className="hidden md:table-cell">Last Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <div className="flex justify-center items-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const status = getUserStatus(user.lastActive);
              
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {getInitials(user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">{user.email}</p>
                        <p className="text-xs text-muted-foreground">User ID: {user.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        status === "active" 
                          ? "default" 
                          : status === "new" 
                          ? "secondary" 
                          : "outline"
                      }
                    >
                      {status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{user.chatCount || 0}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatLastActive(user.lastActive)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Link href={`/admin/users/${user.id}`} className="flex items-center w-full">
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Link href={`/admin/users/${user.id}/chats`} className="flex items-center w-full">
                            View Conversations
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}