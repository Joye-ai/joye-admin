"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Layout } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { ROUTES } from "@/constants";
import { useAppSelector } from "@/store";

export default function Home() {
  const router = useRouter();

  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN);
    }
  }, [router, isAuthenticated]);

  const stats = [
    {
      title: "Total Users",
      value: "1,234",
      change: "+12%",
      changeType: "increase" as const,
    },
    {
      title: "Active Prompts",
      value: "89",
      change: "+5%",
      changeType: "increase" as const,
    },
    {
      title: "Total Requests",
      value: "45,678",
      change: "+23%",
      changeType: "increase" as const,
    },
    {
      title: "Success Rate",
      value: "98.5%",
      change: "+2%",
      changeType: "increase" as const,
    },
  ];

  return (
    <Layout title="Dashboard" subtitle="Welcome to Joye Admin Dashboard">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className="flex items-center">
                    <span
                      className={`text-sm font-medium ${
                        stat.changeType === "increase" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {stat.change}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: "New user registered", time: "2 minutes ago", type: "user" },
                  { action: "Prompt created", time: "5 minutes ago", type: "prompt" },
                  { action: "System updated", time: "1 hour ago", type: "system" },
                  { action: "User logged in", time: "2 hours ago", type: "user" },
                ].map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.type === "user"
                          ? "bg-blue-500"
                          : activity.type === "prompt"
                            ? "bg-green-500"
                            : "bg-gray-500"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Create New Prompt</div>
                  <div className="text-sm text-gray-500">Add a new AI prompt to the system</div>
                </button>
                <button className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">View Analytics</div>
                  <div className="text-sm text-gray-500">Check system performance metrics</div>
                </button>
                <button className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Manage Users</div>
                  <div className="text-sm text-gray-500">View and manage user accounts</div>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
