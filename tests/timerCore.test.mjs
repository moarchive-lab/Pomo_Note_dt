import test from "node:test";
import assert from "node:assert/strict";
import {
  TIMER_PRESETS,
  createTimerState,
  getCurrentPhaseSeconds,
  getNextTimerState
} from "../src/shared/timerCore.mjs";

test("provides three fixed timer presets", () => {
  assert.deepEqual(TIMER_PRESETS.map((preset) => preset.minutes), [
    { focus: 25, shortBreak: 5, longBreak: 15 },
    { focus: 50, shortBreak: 10, longBreak: 30 },
    { focus: 90, shortBreak: 15, longBreak: 45 }
  ]);
});

test("moves from focus to short break for rounds one through three", () => {
  const state = createTimerState("balanced");
  const next = getNextTimerState({ ...state, phase: "focus", focusRound: 2 });

  assert.equal(next.phase, "shortBreak");
  assert.equal(next.focusRound, 2);
  assert.equal(getCurrentPhaseSeconds(next), 10 * 60);
});

test("moves from fourth focus round to long break", () => {
  const state = createTimerState("classic");
  const next = getNextTimerState({ ...state, phase: "focus", focusRound: 4 });

  assert.equal(next.phase, "longBreak");
  assert.equal(next.focusRound, 4);
  assert.equal(getCurrentPhaseSeconds(next), 15 * 60);
});

test("moves from breaks back to the correct focus round", () => {
  const shortBreakState = getNextTimerState({
    ...createTimerState("deep"),
    phase: "shortBreak",
    focusRound: 2
  });
  const longBreakState = getNextTimerState({
    ...createTimerState("deep"),
    phase: "longBreak",
    focusRound: 4
  });

  assert.equal(shortBreakState.phase, "focus");
  assert.equal(shortBreakState.focusRound, 3);
  assert.equal(longBreakState.phase, "focus");
  assert.equal(longBreakState.focusRound, 1);
});
