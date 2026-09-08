"use client";

import { useRef, useState } from "react";
import { OptionGrid, OptionTile } from "@/components/AnswerTiles";

/**
 * Renders inside the page's <form action={submitAsyncAnswer}> - tapping a
 * tile checks the (hidden) radio the server action reads from `optionId`
 * and immediately submits the enclosing form, so there's no separate
 * "Submit" click for multiple choice. Paragraph answers keep an explicit
 * submit button (see the parent page) since there's no equivalent "this
 * click is my final answer" moment for free text.
 */
export function AsyncOptions({
  options,
  defaultSelectedId,
}: {
  options: { id: string; text: string }[];
  defaultSelectedId: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(defaultSelectedId);
  const [submitting, setSubmitting] = useState(false);

  function pick(optionId: string) {
    if (submitting) return;
    setSelected(optionId);
    setSubmitting(true);
    // Wait a tick so the radio's controlled `checked` prop actually commits
    // to the DOM before the form reads it.
    requestAnimationFrame(() => {
      containerRef.current?.closest("form")?.requestSubmit();
    });
  }

  return (
    <div ref={containerRef}>
      <OptionGrid>
        {options.map((opt, i) => (
          <div key={opt.id}>
            <input
              type="radio"
              name="optionId"
              value={opt.id}
              checked={selected === opt.id}
              readOnly
              className="hidden"
            />
            <OptionTile
              index={i}
              onClick={() => pick(opt.id)}
              state={submitting ? (selected === opt.id ? "selected" : "dimmed") : "idle"}
            >
              {opt.text}
            </OptionTile>
          </div>
        ))}
      </OptionGrid>
      {submitting && (
        <p className="mt-4 text-center text-sm font-semibold text-rahoot-muted">Saving...</p>
      )}
    </div>
  );
}
