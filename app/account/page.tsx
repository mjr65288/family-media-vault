import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuthenticatedShell } from "@/components/AuthenticatedShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangeNameForm } from "./ChangeNameForm";
import { ChangePasswordForm } from "./ChangePasswordForm";

/**
 * Account settings page. Server component fetches the current user record
 * so the name form starts pre-filled, then renders two client forms for
 * updating name and password independently.
 */
export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <AuthenticatedShell>
      <main className="px-6 py-8">
        <div className="mx-auto w-full max-w-2xl">
          <header className="border-b border-border pb-6">
            <h1 className="text-3xl font-semibold">Account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Signed in as {user.email}
            </p>
          </header>

          <section className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Name</CardTitle>
              </CardHeader>
              <CardContent>
                <ChangeNameForm currentName={user.name} />
              </CardContent>
            </Card>
          </section>

          <section className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
              </CardHeader>
              <CardContent>
                <ChangePasswordForm />
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </AuthenticatedShell>
  );
}
