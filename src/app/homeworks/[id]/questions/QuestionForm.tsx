const ERROR_MESSAGES: Record<string, string> = {
  text: "Please enter the question text.",
  options: "Multiple choice needs at least 2 filled-in answers.",
  correct: "Pick which answer is correct.",
};

export type QuestionDefaults = {
  text: string;
  type: "MULTIPLE_CHOICE" | "PARAGRAPH";
  points: number;
  timeLimitSec: number;
  options: string[]; // up to 4, padded with ""
  correctIndex: number | null; // 1-based
};

export function QuestionForm({
  action,
  defaults,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaults?: QuestionDefaults;
  error?: string | null;
  submitLabel: string;
}) {
  const opts = defaults?.options ?? ["", "", "", ""];
  while (opts.length < 4) opts.push("");

  return (
    <form action={action} className="question-form card flex flex-col gap-4 p-6">
      <label className="text-sm font-semibold">
        Question
        <textarea
          name="text"
          required
          maxLength={500}
          rows={2}
          defaultValue={defaults?.text}
          className="input mt-1"
          autoFocus
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-semibold">
          Points
          <input
            type="number"
            name="points"
            min={1}
            max={10000}
            defaultValue={defaults?.points ?? 1000}
            className="input mt-1"
          />
        </label>
        <label className="text-sm font-semibold">
          Time limit (seconds)
          <input
            type="number"
            name="timeLimitSec"
            min={5}
            max={600}
            defaultValue={defaults?.timeLimitSec ?? 20}
            className="input mt-1"
          />
        </label>
      </div>

      <fieldset className="text-sm font-semibold">
        Answer type
        <div className="mt-2 flex gap-4">
          <label className="flex items-center gap-2 font-normal">
            <input
              type="radio"
              name="type"
              value="MULTIPLE_CHOICE"
              defaultChecked={!defaults || defaults.type === "MULTIPLE_CHOICE"}
            />
            Multiple choice
          </label>
          <label className="flex items-center gap-2 font-normal">
            <input
              type="radio"
              name="type"
              value="PARAGRAPH"
              defaultChecked={defaults?.type === "PARAGRAPH"}
            />
            Paragraph (open answer)
          </label>
        </div>
      </fieldset>

      <div data-mc-only className="flex flex-col gap-2">
        <p className="text-sm font-semibold">
          Answers <span className="font-normal text-rahoot-muted">- mark the correct one</span>
        </p>
        {[1, 2, 3, 4].map((i) => (
          <label key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              value={i}
              defaultChecked={defaults?.correctIndex === i}
            />
            <input
              type="text"
              name={`opt${i}`}
              maxLength={200}
              placeholder={`Answer ${i}${i > 2 ? " (optional)" : ""}`}
              defaultValue={opts[i - 1]}
              className="input"
            />
          </label>
        ))}
      </div>

      {error && ERROR_MESSAGES[error] && (
        <p className="text-sm font-medium text-rahoot-red">{ERROR_MESSAGES[error]}</p>
      )}

      <button type="submit" className="btn btn-primary mt-2">
        {submitLabel}
      </button>
    </form>
  );
}
