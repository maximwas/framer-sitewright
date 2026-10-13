import { FEEDBACK_URL } from "@sitewright/core";

/** Where to report a bug or an idea: GitHub's issue forms. */
export function FeedbackLink() {
  return (
    <p className="text-[12px] text-sw-ink-3">
      A bug or an idea?{" "}
      <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className="text-sw-accent-ink underline">
        Tell me on GitHub
      </a>
    </p>
  );
}
