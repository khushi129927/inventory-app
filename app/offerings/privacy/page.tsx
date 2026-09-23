"use client";

import Link from "next/link";
import Icon from "@/components/Icon";

export default function PrivacyPage() {
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
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: January 2025
      </p>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Data Collection
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We collect information you provide directly when using our service,
            such as your name and email address when submitting an order request.
            We also collect technical data including your IP address, browser type,
            and access times to maintain service security and performance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Use of Data
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The information we collect is used to process your requests,
            communicate with you about your orders, and improve our service.
            We do not sell or share your personal data with third parties
            except as required to operate the service or comply with legal obligations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Cookies
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We use cookies to store session information and remember your preferences.
            You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            If you do not accept cookies, some features of the service may not function properly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground">
            Contact Information
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If you have any questions about this privacy policy or how we handle your data,
            please contact us through the support channels provided on our main offerings page.
            We aim to respond to all inquiries within five business days.
          </p>
        </section>
      </div>
    </div>
  );
}
