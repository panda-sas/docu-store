import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-sunken">
        <FileQuestion className="h-6 w-6 text-text-muted" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary">
        Page not found
      </h2>
      <p className="mt-2 max-w-md text-sm text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Go home
      </Link>
    </div>
  );
}
