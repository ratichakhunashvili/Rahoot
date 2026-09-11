"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeToHomework } from "@/lib/realtime-client";
import { studentJoinLobby, studentSubmitAnswer, autoRevealIfExpired } from "@/lib/live-game";
import type {
  ClientQuestion,
  RevealPayload,
  FinishedPayload,
  LivePlayer,
  YourResultPayload,
  LiveState,
} from "@/lib/live-events";
import { Leaderboard } from "@/components/Leaderboard";
import { OptionGrid, OptionTile } from "@/components/AnswerTiles";

export function LiveGame({
  homeworkId,
  homeworkTitle,
  firstName,
  initialState,
}: {
  homeworkId: string;
  homeworkTitle: string;
  firstName: string;
  initialState: LiveState;
}) {
  const [phase, setPhase] = useState<LiveState["phase"]>(initialState.phase);
  const [players, setPlayers] = useState<LivePlayer[]>(initialState.players);
  const [question, setQuestion] = useState<ClientQuestion | null>(
    initialState.phase === "QUESTION" ? initialState.question : null
  );
  const [reveal, setReveal] = useState<RevealPayload | null>(
    initialState.phase === "REVEAL" ? initialState.reveal : null
  );
  const [finished, setFinished] = useState<FinishedPayload | null>(
    initialState.phase === "FINISHED" ? initialState.finished : null
  );
  const [yourResult, setYourResult] = useState<YourResultPayload | null>(
    initialState.phase === "QUESTION" || initialState.phase === "REVEAL" ? initialState.yourAnswer : null
  );
  const [hasAnswered, setHasAnswered] = useState(
    initialState.phase === "QUESTION" ? !!initialState.yourAnswer : false
  );
  // We don't persist which option was picked, only the result - a reload
  // mid-question just falls back to the plain "locked in" text instead of
  // re-highlighting the specific tile, which is fine.
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const revealedRef = useRef(false);

  function applyState(state: LiveState) {
    setPlayers(state.players);
    setPhase(state.phase);
    setQuestion(state.phase === "QUESTION" ? state.question : null);
    setReveal(state.phase === "REVEAL" ? state.reveal : null);
    setFinished(state.phase === "FINISHED" ? state.finished : null);
    if (state.phase === "QUESTION" || state.phase === "REVEAL") {
      setYourResult(state.yourAnswer);
      if (state.phase === "QUESTION") setHasAnswered(!!state.yourAnswer);
    } else {
      setYourResult(null);
      setHasAnswered(false);
      setSelectedOptionId(null);
      setTextAnswer("");
    }
    if (state.phase === "QUESTION") revealedRef.current = false;
  }

  useEffect(() => {
    return subscribeToHomework(
      homeworkId,
      {
        "lobby:update": ({ students }) => setPlayers(students),
        "phase:question": (q) => {
          setQuestion(q);
          setReveal(null);
          setYourResult(null);
          setHasAnswered(false);
          setSelectedOptionId(null);
          setTextAnswer("");
          revealedRef.current = false;
          setPhase("QUESTION");
        },
        "phase:reveal": (r) => {
          setReveal(r);
          setPhase("REVEAL");
        },
        "phase:finished": (f) => {
          setFinished(f);
          setPhase("FINISHED");
        },
        "phase:lobby": () => {
          setQuestion(null);
          setReveal(null);
          setFinished(null);
          setYourResult(null);
          setHasAnswered(false);
          setSelectedOptionId(null);
          setTextAnswer("");
          setPhase("LOBBY");
        },
      },
      () => {
        studentJoinLobby(homeworkId)
          .then((state) => state && applyState(state))
          .catch((err) => console.error("Resync failed", err));
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeworkId]);

  useEffect(() => {
    if (phase !== "QUESTION" || !question) return;
    const tick = () => {
      const elapsed = (Date.now() - question.startedAt) / 1000;
      const left = Math.max(0, Math.ceil(question.timeLimitSec - elapsed));
      setTimeLeft(left);
      if (left === 0 && !revealedRef.current) {
        revealedRef.current = true;
        autoRevealIfExpired(homeworkId).catch((err) => console.error("Auto-reveal failed", err));
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [phase, question, homeworkId]);

  // Multiple choice submits the instant a tile is tapped - no separate
  // submit step. Paragraph answers still need an explicit submit since
  // there's no single "click" that means "this is my answer" for free text.
  function selectMultipleChoice(optionId: string) {
    if (!question || hasAnswered || question.type !== "MULTIPLE_CHOICE") return;
    setSelectedOptionId(optionId);
    setHasAnswered(true);
    studentSubmitAnswer(homeworkId, question.questionId, { selectedOptionId: optionId })
      .then((result) => result && setYourResult(result))
      .catch((err) => console.error("Answer failed", err));
  }

  function submitParagraph() {
    if (!question || hasAnswered || question.type !== "PARAGRAPH" || !textAnswer.trim()) return;
    setHasAnswered(true);
    studentSubmitAnswer(homeworkId, question.questionId, { textAnswer })
      .then((result) => result && setYourResult(result))
      .catch((err) => console.error("Answer failed", err));
  }

  if (phase === "LOBBY") {
    return (
      <Centered>
        <p className="text-sm font-bold uppercase tracking-wide text-rahoot-red">
          {homeworkTitle}
        </p>
        <h1 className="mt-2 text-2xl font-bold">You&apos;re in, {firstName}!</h1>
        <p className="mt-1 text-rahoot-muted">Waiting for your teacher to start...</p>
        <p className="mt-8 text-sm font-semibold text-rahoot-muted">
          {players.length} player{players.length === 1 ? "" : "s"} in the lobby
        </p>
        <div className="mt-3 flex max-w-md flex-wrap justify-center gap-2">
          {players.map((p) => (
            <span key={p.studentId} className="badge bg-rahoot-red-light text-rahoot-red-dark">
              {p.firstName} {p.lastName}
            </span>
          ))}
        </div>
      </Centered>
    );
  }

  if (phase === "QUESTION" && question) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-8">
        <div className="flex items-center justify-between text-sm font-bold text-rahoot-muted">
          <span>
            Question {question.index + 1} of {question.total}
          </span>
          <span className={timeLeft <= 5 ? "text-rahoot-red" : ""}>{timeLeft}s</span>
        </div>
        <h1 className="mt-3 text-center text-xl font-bold">{question.text}</h1>

        {question.type === "MULTIPLE_CHOICE" ? (
          <>
            <div className="mt-8">
              <OptionGrid>
                {question.options.map((opt) => (
                  <OptionTile
                    key={opt.id}
                    onClick={() => selectMultipleChoice(opt.id)}
                    state={!hasAnswered ? "idle" : opt.id === selectedOptionId ? "selected" : "dimmed"}
                  >
                    {opt.text}
                  </OptionTile>
                ))}
              </OptionGrid>
            </div>
            {hasAnswered && (
              <p className="mt-4 text-center text-sm font-semibold text-rahoot-muted">
                Locked in - waiting for the others...
              </p>
            )}
          </>
        ) : hasAnswered ? (
          <p className="mt-8 text-center font-semibold text-rahoot-muted">
            Answer locked in - waiting for the others...
          </p>
        ) : (
          <>
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="Type your answer..."
              className="input mt-8"
              autoFocus
            />
            <button
              onClick={submitParagraph}
              disabled={!textAnswer.trim()}
              className="btn btn-primary mt-6"
            >
              Submit answer
            </button>
          </>
        )}
      </div>
    );
  }

  if (phase === "REVEAL" && reveal) {
    return (
      <Centered>
        {reveal.type === "MULTIPLE_CHOICE" ? (
          yourResult ? (
            <p className={`text-2xl font-black ${yourResult.isCorrect ? "text-green-600" : "text-rahoot-red"}`}>
              {yourResult.isCorrect ? "Correct!" : "Not quite"}
            </p>
          ) : (
            <p className="text-2xl font-black text-rahoot-muted">Time&apos;s up!</p>
          )
        ) : (
          <p className="text-2xl font-black text-rahoot-muted">Answer submitted for grading</p>
        )}
        {yourResult && yourResult.pointsAwarded > 0 && (
          <p className="mt-1 text-lg font-bold text-rahoot-red">+{yourResult.pointsAwarded} points</p>
        )}
        <p className="mt-8 text-sm font-bold uppercase tracking-wide text-rahoot-muted">
          Leaderboard so far
        </p>
        <div className="mt-3 w-full max-w-sm">
          <Leaderboard entries={reveal.leaderboard.slice(0, 5)} />
        </div>
        <p className="mt-6 text-sm text-rahoot-muted">Waiting for the next question...</p>
      </Centered>
    );
  }

  if (phase === "FINISHED" && finished) {
    return (
      <Centered>
        <p className="text-sm font-bold uppercase tracking-wide text-rahoot-red">Game over!</p>
        <h1 className="mt-2 text-2xl font-bold">Final leaderboard</h1>
        <div className="mt-6 w-full max-w-sm">
          <Leaderboard entries={finished.leaderboard} />
        </div>
      </Centered>
    );
  }

  return (
    <Centered>
      <p className="text-rahoot-muted">Loading...</p>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      {children}
    </div>
  );
}
