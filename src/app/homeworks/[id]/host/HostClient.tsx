"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { subscribeToHomework } from "@/lib/realtime-client";
import {
  hostStartGame,
  hostRevealQuestion,
  hostNextQuestion,
  hostEndGame,
  hostRestartGame,
  autoRevealIfExpired,
  getLiveState,
} from "@/lib/live-game";
import type {
  ClientQuestion,
  RevealPayload,
  FinishedPayload,
  LivePlayer,
  LiveState,
} from "@/lib/live-events";
import { Leaderboard } from "@/components/Leaderboard";

export function HostClient({
  homeworkId,
  title,
  totalQuestions,
  initialState,
}: {
  homeworkId: string;
  title: string;
  totalQuestions: number;
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
  const [answeredCount, setAnsweredCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPending, startTransition] = useTransition();
  const revealedRef = useRef(false);

  function applyState(state: LiveState) {
    setPlayers(state.players);
    setPhase(state.phase);
    setQuestion(state.phase === "QUESTION" ? state.question : null);
    setReveal(state.phase === "REVEAL" ? state.reveal : null);
    setFinished(state.phase === "FINISHED" ? state.finished : null);
    if (state.phase === "QUESTION") revealedRef.current = false;
    if (state.phase !== "QUESTION") setAnsweredCount(0);
  }

  useEffect(() => {
    return subscribeToHomework(
      homeworkId,
      {
        "lobby:update": ({ students }) => setPlayers(students),
        "phase:question": (q) => {
          setQuestion(q);
          setReveal(null);
          setAnsweredCount(0);
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
          setAnsweredCount(0);
          setPhase("LOBBY");
        },
        "answer:count": ({ answered }) => setAnsweredCount(answered),
      },
      () => {
        getLiveState(homeworkId)
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

  const start = () => startTransition(() => {
    hostStartGame(homeworkId).catch((err) => console.error("Start failed", err));
  });
  const next = () => startTransition(() => {
    if (phase === "QUESTION") {
      hostRevealQuestion(homeworkId).catch((err) => console.error("Reveal failed", err));
    } else if (phase === "REVEAL") {
      hostNextQuestion(homeworkId).catch((err) => console.error("Next failed", err));
    }
  });
  const end = () => startTransition(() => {
    hostEndGame(homeworkId).catch((err) => console.error("End failed", err));
  });
  const restart = () => {
    if (
      window.confirm(
        "Restart the game? This removes every student who joined (and every answer they submitted) - they'll need to rejoin with the join code."
      )
    ) {
      startTransition(() => {
        hostRestartGame(homeworkId).catch((err) => console.error("Restart failed", err));
      });
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-rahoot-border pb-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-rahoot-red">Hosting</p>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        <Link href={`/homeworks/${homeworkId}`} className="btn btn-outline !py-1.5 !px-3 text-sm">
          Exit
        </Link>
      </div>

      {phase === "LOBBY" && (
        <Centered>
          <p className="text-sm font-bold uppercase tracking-wide text-rahoot-muted">
            Waiting in the lobby
          </p>
          <p className="mt-1 text-4xl font-black">{players.length}</p>
          <p className="text-rahoot-muted">player{players.length === 1 ? "" : "s"} joined</p>
          <div className="mt-4 flex max-w-lg flex-wrap justify-center gap-2">
            {players.map((p) => (
              <span key={p.studentId} className="badge bg-rahoot-red-light text-rahoot-red-dark">
                {p.firstName} {p.lastName}
              </span>
            ))}
          </div>
          <button
            onClick={start}
            disabled={totalQuestions === 0 || players.length === 0 || isPending}
            className="btn btn-primary mt-8"
          >
            Start game
          </button>
          {totalQuestions === 0 && (
            <p className="mt-2 text-sm text-rahoot-red">Add at least one question first.</p>
          )}
        </Centered>
      )}

      {phase === "QUESTION" && question && (
        <Centered>
          <p className="text-sm font-bold text-rahoot-muted">
            Question {question.index + 1} of {question.total}
          </p>
          <h2 className="mt-2 max-w-xl text-2xl font-bold">{question.text}</h2>
          <p className={`mt-4 text-3xl font-black ${timeLeft <= 5 ? "text-rahoot-red" : ""}`}>
            {timeLeft}s
          </p>
          <p className="mt-2 text-rahoot-muted">
            {answeredCount}/{players.length} answered
          </p>
          <button onClick={next} disabled={isPending} className="btn btn-primary mt-8">
            Reveal answer
          </button>
        </Centered>
      )}

      {phase === "REVEAL" && reveal && (
        <Centered>
          <p className="text-sm font-bold uppercase tracking-wide text-rahoot-muted">Results</p>
          {reveal.type === "MULTIPLE_CHOICE" && (
            <div className="mt-4 w-full max-w-md text-left">
              {Object.entries(reveal.optionCounts).map(([optionId, count]) => {
                const isCorrect = optionId === reveal.correctOptionId;
                return (
                  <div
                    key={optionId}
                    className={`mb-2 flex items-center gap-3 rounded-lg border-2 p-2 text-sm font-semibold ${
                      isCorrect
                        ? "border-rahoot-red bg-rahoot-red text-[#1a1005]"
                        : "border-rahoot-red bg-black text-rahoot-red"
                    }`}
                  >
                    <span>
                      {count} answer{count === 1 ? "" : "s"}
                      {isCorrect ? " (correct)" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {reveal.type === "PARAGRAPH" && (
            <p className="mt-4 text-rahoot-muted">
              {reveal.paragraphSubmitted} answer{reveal.paragraphSubmitted === 1 ? "" : "s"} submitted for grading
            </p>
          )}
          <p className="mt-8 text-sm font-bold uppercase tracking-wide text-rahoot-muted">
            Leaderboard
          </p>
          <div className="mt-3 w-full max-w-sm">
            <Leaderboard entries={reveal.leaderboard.slice(0, 5)} />
          </div>
          <button onClick={next} disabled={isPending} className="btn btn-primary mt-8">
            Next
          </button>
        </Centered>
      )}

      {phase === "FINISHED" && finished && (
        <Centered>
          <p className="text-sm font-bold uppercase tracking-wide text-rahoot-red">Game over!</p>
          <h2 className="mt-2 text-2xl font-bold">Final leaderboard</h2>
          <div className="mt-6 w-full max-w-sm">
            <Leaderboard entries={finished.leaderboard} />
          </div>
          <div className="mt-8 flex gap-3">
            <Link href={`/homeworks/${homeworkId}`} className="btn btn-outline">
              Back to homework
            </Link>
            <button onClick={restart} disabled={isPending} className="btn btn-primary">
              Restart game
            </button>
          </div>
        </Centered>
      )}

      {(phase === "LOBBY" || phase === "QUESTION" || phase === "REVEAL") && (
        <div className="mt-auto flex justify-center gap-4 pt-6">
          <button onClick={restart} disabled={isPending} className="text-sm text-rahoot-muted hover:text-rahoot-red">
            Restart game
          </button>
          <button onClick={end} disabled={isPending} className="text-sm text-rahoot-muted hover:text-rahoot-red">
            End session early
          </button>
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      {children}
    </div>
  );
}
