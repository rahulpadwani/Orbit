"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { motion } from "framer-motion";

export function AuthGateway() {
  return (
    <main className="auth-gateway">
      <motion.div
        className="auth-shell"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <section className="auth-copy" aria-labelledby="auth-title">
          <div className="auth-brand">
            <div className="brand-mark" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div>
              <strong>Orbit</strong>
              <span>Your living task board</span>
            </div>
          </div>

          <div className="auth-content">
            <div className="auth-eyebrow">
              <span aria-hidden="true">✦</span>
              A calmer way to get things done
            </div>
            <h1 id="auth-title">
              Give every task
              <br />
              room to <em>move.</em>
            </h1>
            <p>
              Turn priorities into a playful, living orbit. Stay focused,
              finish beautifully, and keep your personal board protected.
            </p>

            <div className="auth-actions">
              <SignUpButton mode="modal">
                <motion.button
                  className="auth-primary"
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Create free account
                  <span aria-hidden="true">→</span>
                </motion.button>
              </SignUpButton>
              <SignInButton mode="modal">
                <motion.button
                  className="auth-secondary"
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  I already have an account
                </motion.button>
              </SignInButton>
            </div>

            <div className="auth-trust" aria-label="Product benefits">
              <span><i aria-hidden="true">✓</i> Secure sign-in</span>
              <span><i aria-hidden="true">✓</i> Private workspace</span>
              <span><i aria-hidden="true">✓</i> Free to start</span>
            </div>
          </div>

          <p className="auth-footnote">
            Authentication and account security are powered by Clerk.
          </p>
        </section>

        <section className="auth-preview" aria-label="Animated Orbit preview">
          <div className="auth-preview-grid" aria-hidden="true" />
          <div className="auth-preview-label">
            <span><i /> Live focus space</span>
            <strong>Today&apos;s orbit</strong>
            <small>Four priorities gently in motion.</small>
          </div>

          <motion.div
            className="auth-demo-bubble auth-demo-high"
            animate={{ x: [0, 22, -8, 0], y: [0, -18, 14, 0] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
          >
            Finish launch plan
            <span>High priority</span>
          </motion.div>
          <motion.div
            className="auth-demo-bubble auth-demo-medium one"
            animate={{ x: [0, -24, 10, 0], y: [0, 18, -10, 0] }}
            transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}
          >
            Design review
          </motion.div>
          <motion.div
            className="auth-demo-bubble auth-demo-medium two"
            animate={{ x: [0, 16, -12, 0], y: [0, 20, -14, 0] }}
            transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
          >
            Weekly metrics
          </motion.div>
          <motion.div
            className="auth-demo-bubble auth-demo-low"
            animate={{ x: [0, -14, 20, 0], y: [0, -20, 12, 0] }}
            transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
          >
            Save ideas
          </motion.div>

          <div className="auth-preview-hint">
            <span aria-hidden="true">↗</span>
            Priorities become visible
          </div>
        </section>
      </motion.div>
    </main>
  );
}

