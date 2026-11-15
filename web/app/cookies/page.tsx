import Link from "next/link";

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] text-charcoal px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-sm font-bold text-orange-600 hover:underline">
            ← Back to Home
          </Link>
        </div>
        <h1 className="text-4xl font-black mb-4">Cookie Policy</h1>
        <p className="text-sm text-muted mb-8">Last updated: May 25, 2026</p>

        <div className="space-y-6 text-sm leading-7">
          <section>
            <h2 className="text-xl font-black mb-2">What We Use Cookies For</h2>
            <p>Cookies and local storage help keep sessions active, remember preferences, and improve performance.</p>
          </section>
          <section>
            <h2 className="text-xl font-black mb-2">Types of Cookies</h2>
            <p>We use essential cookies for authentication and optional analytics data for product quality and usage insights.</p>
          </section>
          <section>
            <h2 className="text-xl font-black mb-2">Managing Cookies</h2>
            <p>You can clear or block cookies in your browser settings, but some features may not work as expected.</p>
          </section>
          <section>
            <h2 className="text-xl font-black mb-2">Contact</h2>
            <p>
              For cookie policy questions, visit{" "}
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
