"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useOrganization } from "@/hooks/use-organization";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Building2, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export function SetupOrganization() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, authenticate, isLoading: authLoading, organization } = useAuth();
  const { createOrganization } = useOrganization();

  const [orgName, setOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<"auth" | "org" | "success">(
    isAuthenticated ? "org" : "auth"
  );

  // Watch for organization and transition to success
  useEffect(() => {
    if (organization && step === "org") {
      setStep("success");
      setTimeout(() => {
        router.refresh();
      }, 1500);
    }
  }, [organization, step, router]);

  // If already has org, redirect
  useEffect(() => {
    if (isAuthenticated && organization) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, organization, router]);

  // Update step if auth state changes
  useEffect(() => {
    if (isAuthenticated && step === "auth") {
      setStep("org");
    }
  }, [isAuthenticated, step]);

  const handleAuth = async () => {
    const success = await authenticate();
    if (success) {
      setStep("org");
    }
  };

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;

    setIsCreating(true);
    try {
      await createOrganization(orgName.trim());
      toast({
        title: "Organization created",
        description: `Welcome to ${orgName}!`,
      });
      setStep("success");
    } catch (error) {
      toast({
        title: "Failed to create organization",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-in">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
            step === "success" ? "bg-teal-500/10" : "bg-amber-500/10"
          }`}>
            {step === "auth" ? (
              <Shield className="w-7 h-7 text-amber-500" />
            ) : step === "success" ? (
              <CheckCircle2 className="w-7 h-7 text-teal-500" />
            ) : (
              <Building2 className="w-7 h-7 text-amber-500" />
            )}
          </div>
          <CardTitle className="font-display text-xl">
            {step === "auth"
              ? "Sign In to Continue"
              : step === "success"
                ? `Welcome to ${organization?.name}!`
                : "Create Your Organization"}
          </CardTitle>
          <CardDescription>
            {step === "auth"
              ? "Sign a message to verify your wallet ownership"
              : step === "success"
                ? "Your organization is ready"
                : "Set up your organization to start managing payroll"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {step === "auth" ? (
            <Button
              onClick={handleAuth}
              disabled={authLoading}
              className="w-full"
              size="lg"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  Sign Message
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          ) : step === "success" ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-4" />
              <p className="font-medium text-lg">Organization Created!</p>
              <p className="text-muted-foreground text-sm mt-1">
                Redirecting to your dashboard...
              </p>
              <Loader2 className="w-5 h-5 animate-spin mx-auto mt-4 text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="e.g., Acme DAO, My Company"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={isCreating}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateOrg()}
                />
                <p className="text-xs text-muted-foreground">
                  This will be visible only to you and your team.
                </p>
              </div>

              <Button
                onClick={handleCreateOrg}
                disabled={!orgName.trim() || isCreating}
                className="w-full"
                size="lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Organization
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}

          {step !== "success" && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                🔒 All your data is encrypted with AES-256-GCM.
                <br />
                Only you can access your organization&apos;s information.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
