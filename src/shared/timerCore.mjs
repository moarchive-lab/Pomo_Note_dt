export const TIMER_PRESETS = [
  {
    id: "classic",
    label: "25 / 5 / 15",
    description: "짧게 시작",
    minutes: { focus: 25, shortBreak: 5, longBreak: 15 }
  },
  {
    id: "balanced",
    label: "50 / 10 / 30",
    description: "긴 강의",
    minutes: { focus: 50, shortBreak: 10, longBreak: 30 }
  },
  {
    id: "deep",
    label: "90 / 15 / 45",
    description: "몰입 세션",
    minutes: { focus: 90, shortBreak: 15, longBreak: 45 }
  }
];

export function getPreset(presetId) {
  return TIMER_PRESETS.find((preset) => preset.id === presetId) ?? TIMER_PRESETS[0];
}

export function createTimerState(presetId = "classic") {
  return {
    presetId,
    phase: "idle",
    focusRound: 1
  };
}

export function getCurrentPhaseSeconds(state) {
  const preset = getPreset(state.presetId);
  if (state.phase === "shortBreak") return preset.minutes.shortBreak * 60;
  if (state.phase === "longBreak") return preset.minutes.longBreak * 60;
  return preset.minutes.focus * 60;
}

export function getNextTimerState(state) {
  if (state.phase === "focus") {
    return {
      ...state,
      phase: state.focusRound >= 4 ? "longBreak" : "shortBreak"
    };
  }

  if (state.phase === "longBreak") {
    return {
      ...state,
      phase: "focus",
      focusRound: 1
    };
  }

  if (state.phase === "shortBreak") {
    return {
      ...state,
      phase: "focus",
      focusRound: Math.min(4, state.focusRound + 1)
    };
  }

  return {
    ...state,
    phase: "focus"
  };
}

export function getPhaseLabel(phase) {
  if (phase === "focus") return "집중 중";
  if (phase === "shortBreak") return "짧은 휴식";
  if (phase === "longBreak") return "긴 휴식";
  return "집중 준비";
}

export function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const seconds = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
