import { Suspense } from "react";
import VerifyPageClient from "./VerifyPageClient";

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerifyPageClient />
    </Suspense>
  );
}
