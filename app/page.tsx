import Link from "next/link";
import { LoginForm } from "./login-form";
import "../styles/login.css";

export default function Home() {
  return (
    <main className="login-page">
      <section className="editorial-panel" aria-label="XL Perfumes">
        <Link className="wordmark wordmark-light" href="/" aria-label="XL Perfumes home">
          <span className="wordmark-mark" aria-hidden="true">XL</span>
          <span className="wordmark-name">PERFUMES</span>
        </Link>

        <div className="editorial-copy">
          <span className="eyebrow">THE ART OF PERSONAL SCENT</span>
          <h1>Leave a little<br />of yourself <em>behind.</em></h1>
          <p>Discover fragrances that feel like they were always yours.</p>
        </div>

        <div className="still-life" aria-hidden="true">
          <div className="halo" />
          <div className="bottle-shadow" />
          <div className="perfume-bottle">
            <div className="bottle-cap" />
            <div className="bottle-neck" />
            <div className="bottle-glass">
              <div className="bottle-liquid" />
              <div className="bottle-label"><span>XL</span><small>NO. 08<br />EAU DE PARFUM</small></div>
              <div className="bottle-glint" />
            </div>
          </div>
          <div className="botanical botanical-one" />
          <div className="botanical botanical-two" />
        </div>

        <div className="editorial-foot">
          <span>SCENT, WITH A POINT OF VIEW.</span>
          <span>01 — 03</span>
        </div>
      </section>

      <section className="form-panel" aria-labelledby="welcome-heading">
        <Link className="wordmark wordmark-dark" href="/" aria-label="XL Perfumes home">
          <span className="wordmark-mark" aria-hidden="true">XL</span>
          <span className="wordmark-name">PERFUMES</span>
        </Link>

        <div className="login-content">
          <span className="eyebrow form-eyebrow">YOUR PERSONAL COLLECTION</span>
          <h2 id="welcome-heading">Welcome back</h2>
          <p className="form-intro">Sign in to continue your scent journey.</p>
          <LoginForm />
        </div>

        <footer className="form-footer">
          <span>© 2026 XL PERFUMES</span>
        </footer>
      </section>
    </main>
  );
}
