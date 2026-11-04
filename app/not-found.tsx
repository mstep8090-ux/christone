import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center text-ink">
      <h1 className="font-heading text-4xl">Page Not Found</h1>
      <p className="mt-2 text-sm text-inkSoft">The page you are looking for does not exist.</p>
      <Link href="/" className="mt-6">
        <Button variant="primary">Return Home</Button>
      </Link>
    </div>
  );
}
