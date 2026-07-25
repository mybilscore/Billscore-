// src/app/(marketing)/documentation/page.tsx
import { Metadata } from "next";
// import { DocumentationClient } from "./page.client";
import { DocumentationClient } from "./page.client";

export const metadata: Metadata = {
  title: "Documentation | EMAP User Guide",
  description: "Complete user guide and documentation for EMAP - Enterprise Management for Agricultural Platforms",
  keywords: "EMAP, documentation, user guide, farm management, agricultural platform",
};

export default function DocumentationPage() {
  return <DocumentationClient />;
}