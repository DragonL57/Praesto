import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { getAllUsers } from '../actions';
import { DeleteUserButton } from './delete-user-button';
import { ChangePasswordForm } from './change-password-form';

export default async function UsersPage() {
  const users = await getAllUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Link href="/admin">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {users.map((user) => (
          <UserCard key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}

function UserCard({ user }: { user: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.email}</CardTitle>
        <CardDescription>User ID: {user.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChangePasswordForm userId={user.id} />
      </CardContent>
      <CardFooter>
        <DeleteUserButton userId={user.id} email={user.email} />
      </CardFooter>
    </Card>
  );
}