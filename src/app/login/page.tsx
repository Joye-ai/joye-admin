"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { ROUTES } from "@/constants";
import { mockAuthApi } from "@/lib/auth";
import { useAppDispatch, useAppSelector } from "@/store";
import { setCredentials } from "@/store/slices/authSlice";

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  // If already authenticated, redirect to dashboard (avoid redirecting during render)
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(ROUTES.DASHBOARD);
    }
  }, [isAuthenticated, router]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { token } = await mockAuthApi.login({
        email: formData.email,
        password: formData.password,
      });
      dispatch(setCredentials({ token, email: formData.email }));
      // Set auth cookie for SSR middleware
      document.cookie = `joye_admin_auth_token=${token}; path=/; SameSite=Lax`;
      router.push(ROUTES.DASHBOARD);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error(err);
      }
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Sign in to Joye Admin</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access the dashboard
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              <Input
                label="Email address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
              />

              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
              />

              <Button type="submit" className="w-full" loading={loading} disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
