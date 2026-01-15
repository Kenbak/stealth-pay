"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/components/ui/use-toast";
import bs58 from "bs58";

// ============================================================================
// TYPES - Single source of truth for user data
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  adminWallet: string;
  createdAt: string;
  activeEmployeeCount: number;
  completedPayrollCount: number;
}

export interface Payment {
  id: string;
  amount: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

export interface Employment {
  id: string;
  organizationId: string;
  organizationName: string;
  name: string;
  salary: number;
  stealthPayWallet: string | null;
  status: string;
  registeredAt: string | null;
  recentPayments: Payment[];
}

interface UserData {
  wallet: string;
  isAdmin: boolean;
  isEmployee: boolean;
  organization: Organization | null;
  employments: Employment[];
}

interface AuthState {
  // Auth status
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  initialized: boolean;

  // User data (from /api/me)
  wallet: string | null;
  isAdmin: boolean;
  isEmployee: boolean;
  organization: Organization | null;
  employments: Employment[];
}

interface AuthContextType extends AuthState {
  // Actions
  authenticate: () => Promise<boolean>;
  logout: () => void;
  refetchUser: () => Promise<void>;
  setOrganization: (org: Organization) => void;

  // Helpers
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected } = useWallet();
  const { toast } = useToast();
  const authenticatingRef = useRef(false);

  const [authState, setAuthState] = useState<AuthState>(() => {
    // SSR-safe initialization
    if (typeof window === "undefined") {
      return {
        isAuthenticated: false,
        isLoading: false,
        token: null,
        initialized: false,
        wallet: null,
        isAdmin: false,
        isEmployee: false,
        organization: null,
        employments: [],
      };
    }

    // Try to restore from localStorage
    const token = localStorage.getItem("auth-token");
    const storedWallet = localStorage.getItem("auth-wallet");
    const userData = localStorage.getItem("user-data");

    if (token && storedWallet) {
      const parsed = userData ? JSON.parse(userData) : null;
      return {
        isAuthenticated: true,
        isLoading: false,
        token,
        initialized: true,
        wallet: storedWallet,
        isAdmin: parsed?.isAdmin || false,
        isEmployee: parsed?.isEmployee || false,
        organization: parsed?.organization || null,
        employments: parsed?.employments || [],
      };
    }

    return {
      isAuthenticated: false,
      isLoading: false,
      token: null,
      initialized: true,
      wallet: null,
      isAdmin: false,
      isEmployee: false,
      organization: null,
      employments: [],
    };
  });

  // -------------------------------------------------------------------------
  // Fetch user data from /api/me
  // -------------------------------------------------------------------------
  const fetchUserData = useCallback(async (token: string): Promise<UserData | null> => {
    try {
      const res = await fetch("/api/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.error("[Auth] Failed to fetch user data:", res.status);
        return null;
      }

      const data: UserData = await res.json();

      // Cache in localStorage
      localStorage.setItem("user-data", JSON.stringify(data));

      return data;
    } catch (error) {
      console.error("[Auth] Error fetching user data:", error);
      return null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Handle wallet changes
  // -------------------------------------------------------------------------
  useEffect(() => {
    const storedWallet = localStorage.getItem("auth-wallet");
    const currentWallet = publicKey?.toBase58();

    if (authenticatingRef.current) return;

    // Wallet changed to a different wallet → clear auth
    if (storedWallet && currentWallet && storedWallet !== currentWallet) {
      localStorage.removeItem("auth-token");
      localStorage.removeItem("auth-wallet");
      localStorage.removeItem("user-data");
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        token: null,
        initialized: true,
        wallet: null,
        isAdmin: false,
        isEmployee: false,
        organization: null,
        employments: [],
      });
      return;
    }

    // Wallet disconnected → clear auth state (keep localStorage for reconnect)
    if (!connected && authState.isAuthenticated) {
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: false,
        token: null,
      }));
      return;
    }

    // Wallet reconnected with same wallet → restore auth
    if (connected && currentWallet && storedWallet === currentWallet && !authState.isAuthenticated) {
      const token = localStorage.getItem("auth-token");
      const userData = localStorage.getItem("user-data");

      if (token) {
        const parsed = userData ? JSON.parse(userData) : null;
        setAuthState({
          isAuthenticated: true,
          isLoading: false,
          token,
          initialized: true,
          wallet: currentWallet,
          isAdmin: parsed?.isAdmin || false,
          isEmployee: parsed?.isEmployee || false,
          organization: parsed?.organization || null,
          employments: parsed?.employments || [],
        });
      }
    }
  }, [connected, publicKey, authState.isAuthenticated]);

  // -------------------------------------------------------------------------
  // Authenticate (challenge → sign → verify → fetch user data)
  // -------------------------------------------------------------------------
  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return false;
    }

    authenticatingRef.current = true;
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    try {
      const wallet = publicKey.toBase58();

      // Step 1: Get challenge
      const challengeRes = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });

      if (!challengeRes.ok) {
        const error = await challengeRes.json();
        throw new Error(error.error || "Failed to get challenge");
      }

      const { challenge, nonce } = await challengeRes.json();

      // Step 2: Sign the message
      const messageBytes = new TextEncoder().encode(challenge);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      // Step 3: Verify signature
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet,
          signature,
          message: challenge,
          nonce,
        }),
      });

      if (!verifyRes.ok) {
        const error = await verifyRes.json();
        throw new Error(error.error || "Authentication failed");
      }

      const { token } = await verifyRes.json();

      // Store token
      localStorage.setItem("auth-token", token);
      localStorage.setItem("auth-wallet", wallet);

      // Step 4: Fetch full user data
      const userData = await fetchUserData(token);

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        token,
        initialized: true,
        wallet,
        isAdmin: userData?.isAdmin || false,
        isEmployee: userData?.isEmployee || false,
        organization: userData?.organization || null,
        employments: userData?.employments || [],
      });

      authenticatingRef.current = false;

      toast({
        title: "Authenticated",
        description: userData?.organization
          ? `Welcome back, ${userData.organization.name}!`
          : "Wallet connected successfully",
      });

      return true;
    } catch (error) {
      console.error("[Auth] Authentication error:", error);
      authenticatingRef.current = false;

      toast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        token: null,
        initialized: true,
        wallet: null,
        isAdmin: false,
        isEmployee: false,
        organization: null,
        employments: [],
      });

      return false;
    }
  }, [publicKey, signMessage, toast, fetchUserData]);

  // -------------------------------------------------------------------------
  // Refetch user data (after org creation, etc.)
  // -------------------------------------------------------------------------
  const refetchUser = useCallback(async () => {
    if (!authState.token) return;

    const userData = await fetchUserData(authState.token);
    if (userData) {
      setAuthState((prev) => ({
        ...prev,
        isAdmin: userData.isAdmin,
        isEmployee: userData.isEmployee,
        organization: userData.organization,
        employments: userData.employments,
      }));
    }
  }, [authState.token, fetchUserData]);

  // -------------------------------------------------------------------------
  // Set organization (called after org creation for immediate update)
  // -------------------------------------------------------------------------
  const setOrganization = useCallback((org: Organization) => {
    setAuthState((prev) => ({
      ...prev,
      isAdmin: true,
      organization: org,
    }));

    // Also update localStorage
    const userData = localStorage.getItem("user-data");
    const parsed = userData ? JSON.parse(userData) : {};
    localStorage.setItem("user-data", JSON.stringify({
      ...parsed,
      isAdmin: true,
      organization: org,
    }));
  }, []);

  // -------------------------------------------------------------------------
  // Logout
  // -------------------------------------------------------------------------
  const logout = useCallback(() => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("auth-wallet");
    localStorage.removeItem("user-data");
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      token: null,
      initialized: true,
      wallet: null,
      isAdmin: false,
      isEmployee: false,
      organization: null,
      employments: [],
    });
  }, []);

  // -------------------------------------------------------------------------
  // Get auth headers for API calls
  // -------------------------------------------------------------------------
  const getAuthHeaders = useCallback(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : authState.token;

    return {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    };
  }, [authState.token]);

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------
  const value: AuthContextType = {
    ...authState,
    authenticate,
    logout,
    refetchUser,
    setOrganization,
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
