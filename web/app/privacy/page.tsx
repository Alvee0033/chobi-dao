import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-charcoal px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm font-bold text-orange-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-black mb-4">Privacy Policy</h1>
        <p className="text-sm text-muted mb-8">Last updated: May 25, 2026</p>

        <div className="space-y-6 text-sm leading-7">
          <section>
            <h2 className="text-xl font-black mb-2">Information We Collect</h2>
            <p>We collect account details, event metadata, uploaded photos, and technical logs required to operate the service.</p>
          </section>
          <section>
            <h2 className="text-xl font-black mb-2">How We Use Information</h2>
            <p>Data is used to provide photo delivery, face matching, analytics, customer support, and security monitoring.</p>
          </section>
          <section>
            <h2 className="text-xl font-black mb-2">Storage and Security</h2>
            <p>Photos are stored in connected cloud storage and processed by backend services with access controls and audit logging.</p>
          </section>
          <section>
            <h2 className="text-xl font-black mb-2">Contact</h2>
            <p>
              For privacy requests, contact{" "}
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
