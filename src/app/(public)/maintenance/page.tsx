import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants/app";

export const metadata: Metadata = {
  title: "Under maintenance",
  robots: { index: false, follow: false },
};

/**
 * Maintenance page (doc 22 §11). Served to non-admins when
 * `general.maintenance_mode` is true. Admins bypass via middleware.
 */
export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <span className="text-xs font-medium uppercase tracking-widest text-nile">
        {APP_NAME}
      </span>
      <h1 className="mt-6 text-3xl font-semibold sm:text-4xl">
        We&apos;ll be right back.
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Memorable Egypt is temporarily unavailable while we make things better.
        Your memories are safe. Thank you for your patience.
      </p>
    </main>
  );
}
