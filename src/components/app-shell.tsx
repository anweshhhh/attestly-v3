"use client";

import Link from "next/link";
import clsx from "clsx";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";

type NavItem = {
  href: string;
  label: string;
};

export function AppShell(props: {
  workspaceName: string;
  workspaceSlug: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems: NavItem[] = [
    { href: `/w/${props.workspaceSlug}`, label: "Home" },
    { href: `/w/${props.workspaceSlug}/evidence`, label: "Evidence" },
    { href: `/w/${props.workspaceSlug}/questionnaires`, label: "Questionnaires" }
  ];

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">A</span>
          <div>
            <strong>Attestly</strong>
            <span>{props.workspaceName}</span>
          </div>
        </div>

        <nav className="app-nav" aria-label="Workspace">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className={clsx("nav-link", pathname === item.href && "nav-link-active")}
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>Grounded answering with citations, review state, and workspace isolation.</p>
        </div>
      </aside>

      <div className="app-main">
        <header className="app-header">
          <div>
            <span className="eyebrow">Questionnaire core</span>
          </div>
          <SignOutButton />
        </header>
        <main className="app-content">{props.children}</main>
      </div>
    </div>
  );
}
