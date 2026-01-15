"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useOrganization } from "@/hooks/use-organization";
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
import { Building2, ArrowRight, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateOrgPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin, organization, refetchUser } = useAuth();
  const { createOrganization } = useOrganization();

  const [orgName, setOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  // If already has org, show message
  if (isAdmin && organization) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-in">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-teal-500" />
            </div>
            <CardTitle className="font-display text-xl">
              You Already Have an Organization
            </CardTitle>
            <CardDescription>
              You&apos;re the admin of <strong>{organization.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full" size="lg">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateOrg = async () => {
    if (!orgName.trim()) return;

    setIsCreating(true);
    try {
      await createOrganization(orgName.trim());
      await refetchUser();

      toast({
        title: "Organization created!",
        description: `Welcome to ${orgName}!`,
      });

      setSuccess(true);

      // Redirect after short delay
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
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

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center animate-in">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-teal-500" />
            </div>
            <CardTitle className="font-display text-xl">
              Organization Created!
            </CardTitle>
            <CardDescription>
              Redirecting to your dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center animate-in">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-amber-500" />
          </div>
          <CardTitle className="font-display text-xl">
            Create Your Organization
          </CardTitle>
          <CardDescription>
            Set up your organization to send invoices or manage payroll
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              placeholder="e.g., Acme DAO, My Company, Freelance LLC"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={isCreating}
              onKeyDown={(e) => e.key === "Enter" && handleCreateOrg()}
            />
            <p className="text-xs text-muted-foreground">
              This will be visible on invoices you send to clients.
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
