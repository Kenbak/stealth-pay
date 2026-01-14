"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import bs58 from "bs58";

interface Organization {
  id: string;
  name: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  organization: Organization | null;
}

export function useAuth() {
  const { publicKey, signMessage, connected } = useWallet();
  const { toast } = useToast();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: false,
    token: null,
    organization: null,
  });

  // Check if already authenticated AND wallet matches
  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    const orgData = localStorage.getItem("organization");
    const storedWallet = localStorage.getItem("auth-wallet");
    const currentWallet = publicKey?.toBase58();

    // If wallet changed or disconnected, clear auth
    if (storedWallet && storedWallet !== currentWallet) {
      console.log("[AUTH] Wallet changed, clearing auth");
      localStorage.removeItem("auth-token");
      localStorage.removeItem("organization");
      localStorage.removeItem("auth-wallet");
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        token: null,
        organization: null,
      });
      return;
    }

    // If disconnected, clear auth state
    if (!connected || !publicKey) {
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: false,
        token: null,
        organization: null,
      }));
      return;
    }

    // If token exists and wallet matches, restore auth
    if (token && storedWallet === currentWallet) {
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        token,
        organization: orgData ? JSON.parse(orgData) : null,
      });
    } else {
      setAuthState((prev) => ({
        ...prev,
        isAuthenticated: false,
        token: null,
      }));
    }
  }, [connected, publicKey]);

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return false;
    }

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

      const { token, organization } = await verifyRes.json();

      // Store in localStorage (including wallet to detect changes)
      localStorage.setItem("auth-token", token);
      localStorage.setItem("auth-wallet", wallet);
      if (organization) {
        localStorage.setItem("organization", JSON.stringify(organization));
      }

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        token,
        organization,
      });

      toast({
        title: "Authenticated",
        description: organization
          ? `Welcome back, ${organization.name}!`
          : "Wallet connected successfully",
        variant: "success" as "default",
      });

      return true;
    } catch (error) {
      console.error("Auth error:", error);

      toast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        token: null,
        organization: null,
      });

      return false;
    }
  }, [publicKey, signMessage, toast]);

  const logout = useCallback(() => {
    localStorage.removeItem("auth-token");
    localStorage.removeItem("organization");
    localStorage.removeItem("auth-wallet");
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      token: null,
      organization: null,
    });
  }, []);

  const getAuthHeaders = useCallback(() => {
    // Always read from localStorage to get the latest token
    const token = typeof window !== "undefined"
      ? localStorage.getItem("auth-token")
      : authState.token;

    return {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    };
  }, [authState.token]);

  return {
    ...authState,
    authenticate,
    logout,
    getAuthHeaders,
    wallet: publicKey?.toBase58() || null,
  };
}
