/**
 * API shapes used by the website, written by hand for now. They mirror the backend's responses
 * and will be replaced by types generated from backend/openapi.json (plan §2.3).
 */

export type Role = 'GUEST' | 'HOST' | 'ADMIN' | 'SUPPORT';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  emailVerified: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  portal?: 'app' | 'admin';
}

export interface UserResponse {
  user: SessionUser;
}

export interface SessionResponse {
  user: SessionUser | null;
}

export interface AdminOverview {
  metrics: {
    totalUsers: number;
    activeHosts: number;
    staffMembers: number;
    suspendedUsers: number;
    activeVehicles: number | null;
    upcomingBookings: number | null;
    bookingRevenueCents: number | null;
    pendingVerifications: number | null;
  };
  generatedAt: string;
}
