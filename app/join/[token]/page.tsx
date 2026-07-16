import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { JoinTeamCard } from "../../components/JoinTeamCard";

export default async function JoinTeamPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="join-page">
      <section className="join-shell">
        <Link className="join-brand" href="/">
          <span aria-hidden="true">◉</span>
          Orbit
        </Link>
        <div className="join-copy">
          <p className="join-kicker">Team invitation</p>
          <h1>There&apos;s room for you in this orbit.</h1>
          <p>Join the team to see, create, and complete shared bubble tasks together.</p>
        </div>

        <Show when="signed-out">
          <div className="join-actions">
            <SignUpButton mode="modal">
              <button type="button">Create account & join</button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button type="button" className="join-secondary">Sign in to join</button>
            </SignInButton>
          </div>
        </Show>

        <Show when="signed-in">
          <JoinTeamCard token={token} />
        </Show>
      </section>
    </main>
  );
}
