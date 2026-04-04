'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, MoreHorizontal, Eye, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { DeleteUserButton } from '@/app/admin/users/delete-user-button';

interface UsersTableProps {
  searchQuery?: string;
  statusFilter?: 'active' | 'inactive' | 'new';
}

interface User {
  id: string;
  email: string;
  lastActive: string | null;
  chatCount: number;
  messageCount: number | null;
}

export function UsersTable({
  searchQuery = '',
  statusFilter,
}: UsersTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        // Adding status would require backend support for this filter
        params.append('limit', String(pageSize));
        params.append('offset', String(page * pageSize));

        const response = await fetch(`/api/admin/users?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch users');

        const data = await response.json();
        setUsers(data.users);
        setTotalUsers(data.totalCount);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [searchQuery, statusFilter, page]);

  // Function to determine user status based on lastActive
  const getUserStatus = (
    lastActive: string | null,
  ): 'active' | 'inactive' | 'new' => {
    if (!lastActive) return 'new';

    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffInDays =
      (now.getTime() - lastActiveDate.getTime()) / (1000 * 3600 * 24);

    if (diffInDays < 7) return 'active';
    return 'inactive';
  };

  // Filter users based on statusFilter if provided
  const filteredUsers = statusFilter
    ? users.filter((user) => getUserStatus(user.lastActive) === statusFilter)
    : users;

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const formatLastActive = (lastActive: string | null): string => {
    if (!lastActive) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastActive), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  // Get initials from email
  const getInitials = (email: string): string => {
    return email.charAt(0).toUpperCase();
  };

  // Calculate the number of pages
  const pageCount = Math.ceil(totalUsers / pageSize);

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    filteredUsers.length > 0 &&
                    selectedUsers.length === filteredUsers.length
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all users"
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">
                Conversations
              </TableHead>
              <TableHead className="hidden md:table-cell">
                Last Active
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const status = getUserStatus(user.lastActive);

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleSelectUser(user.id)}
                        aria-label={`Select user ${user.email}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarImage src="" alt={user.email} />
                          <AvatarFallback>
                            {getInitials(user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.email}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {user.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          status === 'active'
                            ? 'default'
                            : status === 'new'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {user.chatCount}
                    </TableCell>
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
                        <DropdownMenuContent
                          align="end"
                          onCloseAutoFocus={(e) => {
                            // Prevent auto focus which can cause unwanted close
                            e.preventDefault();
                          }}
                        >
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="flex items-center w-full"
                            >
                              <Eye className="mr-2 size-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 size-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              // Prevent the dropdown from closing when clicking the delete item
                              e.preventDefault();
                            }}
                          >
                            <DeleteUserButton
                              userId={user.id}
                              email={user.email}
                              variant="menuItem"
                            />
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

      {/* Pagination controls */}
      {pageCount > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            Page {page + 1} of {pageCount}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page === pageCount - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
