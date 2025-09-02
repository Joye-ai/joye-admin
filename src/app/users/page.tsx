"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Layout } from "@/components/layout";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { ROUTES } from "@/constants";
import { useAppSelector } from "@/store";

export default function UsersPage() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
  }, [router, isAuthenticated]);

  const users = [
    {
      id: 1,
      name: "Jane Cooper",
      email: "jane.cooper@example.com",
      role: "Admin",
      status: "Active",
      joinedAt: "2024-01-12",
    },
    {
      id: 2,
      name: "Cody Fisher",
      email: "cody.fisher@example.com",
      role: "Editor",
      status: "Active",
      joinedAt: "2024-02-03",
    },
    {
      id: 3,
      name: "Bessie Cooper",
      email: "bessie.cooper@example.com",
      role: "Viewer",
      status: "Suspended",
      joinedAt: "2023-12-22",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Suspended":
        return "bg-red-100 text-red-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Layout
      title="Users"
      subtitle="Manage application users"
      actions={<Button variant="primary">Invite User</Button>}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {users.filter((u) => u.status === "Active").length}
                </p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {users.filter((u) => u.status === "Suspended").length}
                </p>
                <p className="text-sm text-gray-600">Suspended</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.role}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.joinedAt}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">Edit</button>
                          <button className="text-red-600 hover:text-red-900">Disable</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
