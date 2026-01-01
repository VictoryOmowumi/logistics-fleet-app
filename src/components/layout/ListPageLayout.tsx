import React from "react";
import { PageHeader } from "./PageHeader";

interface ListPageLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  children: React.ReactNode;
}

export function ListPageLayout({
  title,
  description,
  actions,
  stats,
  children,
}: ListPageLayoutProps) {
  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm">
        <PageHeader title={title} description={description} actions={actions} />
        {stats ? <div className="mt-4">{stats}</div> : null}
      </div>
      {children}
    </section>
  );
}
