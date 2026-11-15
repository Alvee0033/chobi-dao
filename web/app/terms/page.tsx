import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-charcoal px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm font-bold text-orange-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-black mb-4">Terms of Service</h1>
        <p className="text-sm text-muted mb-8">Last updated: May 25, 2026</p>

        <div className="space-y-6 text-sm leading-7">
          <section>
            <h2 className="text-xl font-black mb-2">Use of Service</h2>
            <p>You agree to use the platform lawfully and only for events and media you have rights to manage and distribute.</p>
          </section>
          <section>
            <h2 className="text-xl font-black mb-2">Account Responsibility</h2>
            <p>You are responsible for account credentials, connected storage permissions, and all activity under your account.</p>
          </section>
          <section>
            <h2 className="text-xl font-black mb-2">Content and Availability</h2>
            <p>Service features may evolve over time. We may update, improve, or remove features to maintain reliability and security.</p>
          </section>
          <section>
            <h2 className="text-xl font-black mb-2">Contact</h2>
            <p>
              For legal or support inquiries, visit{" "}
              <a className="text-orange-600 hover:underline" href="https://jantrasoft.online" target="_blank" rel="noopener noreferrer">
                jantrasoft.online
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
