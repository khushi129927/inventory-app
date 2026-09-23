"use client";

import Link from "next/link";
import Icon from "@/components/Icon";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/offerings"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Icon name="ArrowLeft" className="h-4 w-4" />
        Back to Offerings
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
        Terms and Conditions
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: January 2025
      </p>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Acceptance of Terms
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            By accessing or using this service, you agree to be bound by these terms.
            If you do not agree with any part of the terms, you should not use the service.
            These terms apply to all visitors, users, and others who access or use the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Use of Service
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            You agree to use the service only for lawful purposes and in a way that does not
            infringe the rights of others or restrict their use and enjoyment of the service.
            Prohibited behavior includes harassing or causing distress to other users,
            transmitting obscene or offensive content, or disrupting the normal flow of dialogue.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Limitations
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We will not be liable for any damages arising from the use or inability to use the
            service. This includes direct, indirect, incidental, or consequential damages.
            All information on the service is provided on an &quot;as is&quot; basis without warranty
            of any kind, either express or implied.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Changes to Terms
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We reserve the right to modify or replace these terms at any time.
            Changes will be effective immediately upon posting to this page.
            Your continued use of the service after any changes indicates your acceptance
            of the revised terms.
          </p>
        </section>
      </div>
    </div>
  );
}
