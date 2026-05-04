"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
import RiskBanner from "./RiskBanner";

const AUTH_PATHS = ["/login", "/signup"];

export default function ConditionalFooter() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  // Don't render until client has hydrated (prevents mismatch)
  if (!ready) return null;

  const isAuth = AUTH_PATHS.some((p) => pathname?.startsWith(p));
  if (isAuth) return null;

  return (
    <>
      <Footer />
      <RiskBanner />
    </>
  );
}
