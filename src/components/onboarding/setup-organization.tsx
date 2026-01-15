"use client";

import { useState } from "react";
import { useOrganization } from "@/hooks/use-organization";
import { useAuth } from "@/hooks/use-auth";
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
import { Shield, Building2, ArrowRight, Loader2 } from "lucide-react";

export function SetupOrganization() {
  const { isAuthenticated, authenticate, isLoading: authLoading } = useAuth();
  const { createOrganization, isCreating } = useOrganization();
  const [orgName, setOrgName] = useState("");
  const [step, setStep] = useState<"auth" | "org">(
    isAuthenticated ? "org" : "auth"
  );

  const handleAuth = async () => {
    const success = await authenticate();
    if (success) {
      setStep("org");
    }
  };

  const handleCreateOrg = () => {
    if (orgName.trim()) {
      createOrganization(orgName.trim());
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-in">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4">
            {step === "auth" ? (
              <Shield className="w-7 h-7 text-amber-500" />
            ) : (
              <Building2 className="w-7 h-7 text-amber-500" />
            )}
          </div>
          <CardTitle className="font-display text-xl">
            {step === "auth" ? "Sign In to Continue" : "Create Your Organization"}
          </CardTitle>
          <CardDescription>
            {step === "auth"
              ? "Sign a message to verify your wallet ownership"
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

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              🔒 All your data is encrypted with AES-256-GCM.
              <br />
              Only you can access your organization&apos;s information.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
