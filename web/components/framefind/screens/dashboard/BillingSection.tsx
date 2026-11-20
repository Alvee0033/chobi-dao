"use client";

import { useEffect, useState } from "react";
import { getBillingPayments, getBillingUsage, startBillingCheckout, type BillingPayment, type BillingProvider, type BillingUsage } from "@/lib/api";
import type { DashboardAuthState, ShowToast } from "../../types";
import { Icons } from "../../icons";
import "./billing-section.css";
import "./billing-providers.css";

const formatBytes = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(bytes >= 10 * 1024 ** 3 ? 0 : 1)} GB`;
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function BillingSection({ auth, showToast }: { auth: DashboardAuthState | null; showToast: ShowToast }) {
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    if (!auth?.accessToken) return;
    try {
      setError("");
      const [nextUsage, nextPayments] = await Promise.all([getBillingUsage(auth.accessToken), getBillingPayments(auth.accessToken)]);
      setUsage(nextUsage);
      setPayments(nextPayments.payments);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Billing could not be loaded.";
      setError(message);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [auth?.accessToken]);
  useEffect(() => {
    const state = new URLSearchParams(window.location.search).get("billing");
    if (state === "success") { showToast("Pro is active. Thank you for your payment."); void load(); }
    if (state === "failed") showToast("Payment could not be verified. You have not been charged by Chobi Dao.");
    if (state === "cancelled") showToast("Checkout was cancelled.");
    if (state) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const checkout = async (provider: BillingProvider) => {
    if (!auth?.accessToken) return;
    setCheckoutBusy(true);
    try {
      const result = await startBillingCheckout(auth.accessToken, provider);
      window.location.assign(result.checkoutUrl);
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : "Could not start checkout.");
      setCheckoutBusy(false);
    }
  };

  if (loading) return <div className="cd-billing-loading" role="status">Loading your plan and payments…</div>;
  if (error && !usage) return <section className="cd-billing-error" role="alert"><p>{error}</p><button onClick={() => { setLoading(true); void load(); }}>Try again</button></section>;
  const proActive = usage?.plan === "pro";
  const storagePercent = usage ? Math.min(100, usage.storageUsedBytes / usage.storageLimitBytes * 100) : 0;

  return <section className="cd-billing" aria-labelledby="billing-title">
    <header className="cd-billing-heading"><div><p>YOUR ACCOUNT</p><h1 id="billing-title">Plan &amp; billing</h1><span>More room for every celebration you deliver.</span></div><span className={`cd-plan-status ${proActive ? "is-pro" : ""}`}>{usage?.trialDaysRemaining ? `PRO TRIAL · ${usage.trialDaysRemaining} DAYS` : `${proActive ? "PRO" : "FREE"} PLAN`}</span></header>

    {usage?.trialDaysRemaining ? <div className="cd-trial-note"><span className="cd-trial-spark"><Icons.Sparkles size={18} /></span><div><strong>Your Pro trial is underway.</strong><p>{usage.trialDaysRemaining} days remaining. No automatic charge; upgrade whenever you’re ready.</p></div></div> : null}

    <div className="cd-plan-grid">
      <article className={`cd-plan-option ${!proActive ? "selected" : ""}`}>
        <div className="cd-plan-top"><div><span className="cd-plan-index">01 / START</span><h2>Free</h2><p>For trying out Chobi Dao with smaller galleries.</p></div><span className="cd-plan-price">৳0 <small>forever</small></span></div>
        <ul><li><Icons.Check size={16} /> 1 GB photo storage</li><li><Icons.Check size={16} /> Up to 200 photos</li><li><Icons.Check size={16} /> 100 matches each month</li><li><Icons.Check size={16} /> QR gallery sharing</li></ul>
        {!proActive && <span className="cd-current-plan"><Icons.Check size={14} /> Current plan</span>}
      </article>
      <article className={`cd-plan-option cd-plan-pro ${proActive && !usage?.trialDaysRemaining ? "selected" : ""}`}>
        <div className="cd-plan-top"><div><span className="cd-plan-index">02 / GROW</span><h2>Pro</h2><p>For busy studios and full season galleries.</p></div><span className="cd-plan-price">৳399 <small>/ month</small></span></div>
        <ul><li><Icons.Check size={16} /> 20 GB photo storage</li><li><Icons.Check size={16} /> Unlimited face matching</li><li><Icons.Check size={16} /> Unlimited photo uploads*</li><li><Icons.Check size={16} /> Full resolution downloads</li></ul>
        {proActive && !usage?.trialDaysRemaining ? <span className="cd-current-plan"><Icons.Check size={14} /> Active · renews manually</span> : <div id="pro-checkout" className="cd-checkout-options">
          <button type="button" className="cd-upgrade-button" onClick={() => checkout("uddoktapay")} disabled={checkoutBusy || !(usage?.checkoutProviders?.includes("uddoktapay") ?? false)}>
            <span><strong>{checkoutBusy ? "Opening secure checkout…" : "Upgrade to Pro"}</strong><small>৳399 · 30 days · one-time payment</small></span><b aria-hidden="true">{checkoutBusy ? "…" : "→"}</b>
          </button>
          <p className="cd-checkout-note">{usage?.checkoutProviders?.includes("uddoktapay") ? "Continue to UddoktaPay’s secure checkout. Pro starts after payment verification." : "Secure checkout is temporarily unavailable. Please try again shortly."}</p>
        </div>}
      </article>
    </div>
    <p className="cd-billing-disclaimer">*Uploads are subject to the 20 GB storage limit. One payment covers 30 days. Renewal is manual; Chobi Dao never charges automatically.</p>

    <div className="cd-billing-details"><div className="cd-usage-panel"><div className="cd-usage-title"><div><p>STORAGE</p><h2>Your gallery library</h2></div><span>{formatBytes(usage?.storageUsedBytes ?? 0)} <i>/ {formatBytes(usage?.storageLimitBytes ?? 0)}</i></span></div><div className="cd-usage-track"><span style={{ width: `${storagePercent}%` }} /></div><div className="cd-usage-meta"><span>{usage?.photosUsed ?? 0} photos uploaded</span><span>{usage?.matchesLimit == null ? "Unlimited matching" : `${usage.matchesUsed} / ${usage.matchesLimit} monthly matches`}</span></div></div>

    <div className="cd-payments"><div className="cd-usage-title"><div><p>PAYMENT HISTORY</p><h2>Receipts &amp; renewals</h2></div><span className="cd-secure-label"><Icons.Lock size={12} /> PRIVATE</span></div>
      {payments.length ? <div className="cd-payments-list">{payments.map((payment) => <div className="cd-payment-row" key={payment.id}><span className={`cd-payment-state ${payment.status}`}>{payment.status}</span><strong>৳{payment.amount ?? "399.00"}</strong><span className="cd-payment-provider">{payment.provider === "uddoktapay" ? "UddoktaPay" : "bKash"}</span><span>{dateLabel(payment.createdAt)}</span><span>{payment.transactionId ? `Txn ${payment.transactionId}` : payment.currentPeriodEnd ? `Until ${dateLabel(payment.currentPeriodEnd)}` : "—"}</span></div>)}</div> : <p className="cd-no-payments">No payments yet. Your receipts will appear here after checkout.</p>}
    </div></div>
    <p className="cd-billing-support">Payments are verified securely before your plan changes. No automatic renewals.</p>
  </section>;
}
