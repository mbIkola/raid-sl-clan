import React from "react";

const launchChecks = [
  "Public homepage served from the Cloudflare-first web app",
  "Telegram bot entrypoint wired for webhook delivery",
  "MVP shell prepared for the next API-backed clan features"
];

export default function HomePage() {
  return (
    <main className="site-shell">
      <section className="hero-panel">
        <p className="eyebrow">Cloudflare-first MVP foundation</p>
        <h1>Raid SL Clan</h1>
        <p className="lede">
          A minimal public shell for the website and bot, built to expose the
          project name, the deployment intent, and the first Telegram touchpoint
          without pretending the rest of the product already exists.
        </p>

        <div className="status-grid" aria-label="MVP readiness">
          {launchChecks.map((item) => (
            <p key={item} className="status-card">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="info-panel">
        <div>
          <h2>Telegram webhook hint</h2>
          <p>
            Configure Telegram to post updates into the public bot endpoint once
            the deployment URL is live.
          </p>
        </div>

        <code className="webhook-hint">
          POST /api/telegram/webhook
        </code>

        <p className="footnote">
          Telegram remains the first integration surface for the MVP. The rest
          of the site can grow behind this shell when real clan data arrives.
        </p>
      </section>
    </main>
  );
}
