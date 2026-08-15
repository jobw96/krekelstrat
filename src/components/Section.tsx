import type { ReactNode } from "react";

/**
 * A titled block of the page. The heading sits on the page background with the
 * card(s) below it, rather than inside a card: stacking every title in its own
 * bordered box turns a page into a wall of frames with nothing to breathe.
 *
 * `action` is right-aligned against the title (buttons, toggles, timestamps).
 */
export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  /** Node rather than string: some subtitles carry a P&L colour. */
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[15px] leading-tight text-white" style={{ fontWeight: 560 }}>
            {title}
          </h2>
          {subtitle && <div className="text-[12px] text-[#7A828D]">{subtitle}</div>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
