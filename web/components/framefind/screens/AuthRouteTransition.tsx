import Image from "next/image";
import "./auth-route-transition.css";

export function AuthRouteTransition({ message = "Checking your studio" }: { message?: string }) {
  return (
    <main className="auth-route-transition" role="status" aria-live="polite">
      <div className="auth-route-transition-content">
        <div className="auth-route-transition-brand">
          <Image src="/logo-mark.webp" width={40} height={40} alt="" priority />
          <span>Chobi Dao</span>
        </div>
        <div className="auth-route-transition-progress" aria-hidden="true"><span /></div>
        <p>{message}<span className="auth-route-transition-dots" aria-hidden="true">...</span></p>
      </div>
    </main>
  );
}
