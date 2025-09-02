/**
 * User management related types
 */

import { BaseEntity, PaginationParams, PaginatedResponse } from "./common";

export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  profile?: UserProfile;
}

export interface UserProfile {
  bio?: string;
  phone?: string;
  address?: Address;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other";
  website?: string;
  socialLinks?: SocialLinks;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  github?: string;
  facebook?: string;
  instagram?: string;
}

export interface UserRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isDefault?: boolean;
}

export type UserStatus = "active" | "inactive" | "suspended" | "pending";

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleId: string;
  status?: UserStatus;
  profile?: Partial<UserProfile>;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  roleId?: string;
  status?: UserStatus;
  profile?: Partial<UserProfile>;
}

export interface UserFilters extends PaginationParams {
  status?: UserStatus;
  roleId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UserListResponse extends PaginatedResponse<User> {
  roles: UserRole[];
  stats: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    pending: number;
  };
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByRole: {
    role: string;
    count: number;
  }[];
  usersByStatus: {
    status: UserStatus;
    count: number;
  }[];
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface UserSession {
  id: string;
  userId: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  isActive: boolean;
  lastActivity: string;
  createdAt: string;
}
