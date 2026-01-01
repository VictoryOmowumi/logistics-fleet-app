"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import {
  MagnifyingGlassIcon,
  BellIcon,
  DotsNineIcon,
  UserCircleIcon,
  MoonStarsIcon,
  SunDimIcon,
} from "@phosphor-icons/react";

const NAV_LINKS = [
  { name: "Overview", href: "/" },
  { name: "Dispatch Console", href: "/dispatch" },
  { name: "Drivers", href: "/drivers" },
  { name: "Vehicles", href: "/vehicles" },
  { name: "Orders", href: "/orders" },
  { name: "Users", href: "/users" },
];

export const AppNavbar = () => {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session, status } = useSession();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAppsOpen, setIsAppsOpen] = useState(false);
 
  
  const isDark = resolvedTheme === "dark";
  const userName = session?.user?.name || "Team member";
  const userRole = session?.user?.role || "dispatcher";
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "T";

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="flex w-full items-center justify-between gap-6 px-6 py-4 lg:px-8">
      {/* LEFT: Logo + brand */}
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 transition-transform group-hover:scale-105">
          <span className="text-background font-black text-2xl italic tracking-tighter">
            T
          </span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-[16px] tracking-tight text-foreground">
            Truck&Co
          </span>
          <span className="text-[11px] text-muted-foreground">
            Ops control center
          </span>
        </div>
      </Link>

      {/* MIDDLE: Primary navigation tabs */}
      <div className="hidden xl:flex items-center gap-1 rounded-full border border-border/70 bg-muted/70 p-1 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
        {NAV_LINKS.filter((link) => link.href !== "/users" || userRole === "admin").map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`nav-link rounded-full px-5 py-2 text-[13px] transition ${
                isActive
                  ? "text-background font-semibold bg-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.href === "/" && isActive && (
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2" />
              )}
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* RIGHT: Actions & user area */}
      <div className="flex items-center gap-4">
        {/* Search icon + small quick search */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/70 text-foreground shadow-sm hover:bg-muted transition-colors"
            aria-label="Toggle search"
          >
            <MagnifyingGlassIcon size={18} weight="bold" />
          </button>
          {isSearchOpen && (
            <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-border bg-card p-3 shadow-xl">
              <input
                type="text"
                placeholder="Search shipments, trucks..."
                className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        </div>

        {/* Notification bell with badge + dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/70 text-foreground shadow-sm hover:bg-muted transition-colors"
            aria-label="Toggle notifications"
          >
            <BellIcon size={18} weight="bold" />
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary text-[9px] font-semibold text-background border border-border">
              3
            </span>
          </button>
          {isNotificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-border bg-card p-3 text-[12px] shadow-xl space-y-2">
              <div className="font-semibold text-foreground mb-1">Notifications</div>
              <p className="text-muted-foreground">No new alerts. All routes are running smoothly.</p>
            </div>
          )}
        </div>

        {/* App grid icon + quick menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsAppsOpen((prev) => !prev)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/70 text-foreground shadow-sm hover:bg-muted transition-colors"
            aria-label="Open apps menu"
          >
            <DotsNineIcon size={20} weight="fill" />
          </button>
          {isAppsOpen && (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-border bg-card p-3 text-[12px] shadow-xl space-y-1">
              <div className="font-semibold text-foreground mb-1">Quick links</div>
              <ul className="space-y-1 text-muted-foreground">
                <li>Dispatch board</li>
                <li>Rate cards</li>
                <li>Settings</li>
              </ul>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/70 text-foreground shadow-sm hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          {
            isDark ? <SunDimIcon size={18} weight="bold" /> : <MoonStarsIcon size={18} weight="bold" />
          }
        </button>

        {/* Divider */}
        <span className="hidden md:block w-px h-8 bg-border" />
        {/* Session-aware user pill */}
        <div className="hidden md:flex items-center gap-3 pl-4 pr-2 py-1.5 rounded-full bg-card/80 text-muted-foreground shadow border border-border">
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10px] uppercase tracking-[0.18em]">
              {status === "loading" ? "Loading" : userRole}
            </span>
            <span className="text-[12px] font-medium text-foreground">
              {status === "loading" ? "Fetching profile" : userName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted/60 overflow-hidden border border-border">
              {session ? (
                <span className="text-[12px] font-semibold text-foreground">{userInitials}</span>
              ) : (
                <UserCircleIcon size={20} weight="fill" className="text-foreground" />
              )}
            </span>
            {session && (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="text-[12px] font-semibold text-primary hover:underline px-2"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
    </nav>
  );
};
