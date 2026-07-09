import { useEffect, useMemo, useRef, useState } from "react";
import {
  TIMER_PRESETS,
  createTimerState,
  formatTime,
  getCurrentPhaseSeconds,
  getNextTimerState,
  getPhaseLabel,
  getPreset
} from "./shared/timerCore.mjs";

type Phase = "idle" | "focus" | "shortBreak" | "longBreak";

type TimerState = {
  presetId: string;
  phase: Phase;
  focusRound: number;
};

type Task = {
  id: string;
  title: string;
  memo: string;
  done: boolean;
};

const STORAGE_KEY = "pomo-note-desktop-state";

function extractVideoId(input: string) {
  const value = input.trim();
  if (!value) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0] || null;
    if (url.hostname.endsWith("youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || null;
    }
  } catch {
    return null;
  }

  return null;
}

function createTask(title = ""): Task {
  return {
    id: crypto.randomUUID(),
    title,
    memo: "",
    done: false
  };
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const savedState = useMemo(loadSavedState, []);
  const [youtubeUrl, setYoutubeUrl] = useState(savedState?.youtubeUrl ?? "");
  const [videoStatus, setVideoStatus] = useState("YouTube API를 불러오는 중입니다.");
  const [manualPlayVisible, setManualPlayVisible] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [timerState, setTimerState] = useState<TimerState>(
    savedState?.timerState ?? createTimerState(savedState?.presetId ?? "classic")
  );
  const [secondsLeft, setSecondsLeft] = useState(() =>
    getCurrentPhaseSeconds(savedState?.timerState ?? createTimerState(savedState?.presetId ?? "classic"))
  );
  const [tasks, setTasks] = useState<Task[]>(
    savedState?.tasks ?? [createTask("오늘 볼 영상 정하기"), createTask("집중 중 처리할 작업 1개 정하기")]
  );
  const [miniOpen, setMiniOpen] = useState(false);
  const playerRef = useRef<YouTubePlayer | null>(null);

  const activePreset = getPreset(timerState.presetId);
  const inBreak = timerState.phase === "shortBreak" || timerState.phase === "longBreak";

  useEffect(() => {
    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true);
      setVideoStatus("YouTube API 준비 완료. 링크를 넣고 불러오세요.");
    };

    if (window.YT?.Player) {
      window.onYouTubeIframeAPIReady();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        youtubeUrl,
        timerState: { ...timerState, phase: "idle" },
        presetId: timerState.presetId,
        tasks
      })
    );
  }, [youtubeUrl, timerState, tasks]);

  useEffect(() => {
    if (timerState.phase === "idle") return;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) return current - 1;
        moveToNextPhase();
        return 0;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timerState]);

  function ensurePlayer(videoId: string) {
    if (!apiReady || !window.YT?.Player) {
      setVideoStatus("YouTube API를 아직 불러오는 중입니다. 잠시 뒤 다시 시도하세요.");
      return;
    }

    if (playerRef.current) {
      playerRef.current.cueVideoById(videoId);
      setPlayerReady(true);
      setVideoStatus("영상을 불러왔습니다. 집중 시작 또는 재생을 누르세요.");
      return;
    }

    playerRef.current = new window.YT.Player("player", {
      videoId,
      width: "100%",
      height: "100%",
      playerVars: {
        playsinline: 1,
        rel: 0,
        modestbranding: 1
      },
      events: {
        onReady: () => {
          setPlayerReady(true);
          setVideoStatus("영상 준비 완료. 집중 시작 또는 재생을 누르세요.");
        },
        onStateChange: (event: { data: number }) => {
          setManualPlayVisible(event.data !== window.YT?.PlayerState.PLAYING);
        }
      }
    });
  }

  function loadVideo() {
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setVideoStatus("유효한 YouTube 링크가 아닙니다.");
      return;
    }
    ensurePlayer(videoId);
  }

  function playVideo() {
    if (!playerReady || !playerRef.current) {
      setVideoStatus("먼저 영상을 불러오세요.");
      return;
    }
    playerRef.current.playVideo();
    setManualPlayVisible(true);
    setVideoStatus("재생을 시도했습니다. Chrome이 막으면 직접 재생 버튼을 누르세요.");
  }

  function pauseVideo() {
    playerRef.current?.pauseVideo();
    if (playerReady) setVideoStatus("영상을 일시정지했습니다.");
  }

  function moveToNextPhase() {
    setTimerState((current) => {
      const next = getNextTimerState(current);
      setSecondsLeft(getCurrentPhaseSeconds(next));
      if (next.phase === "focus") {
        setVideoStatus("휴식이 끝났습니다. 영상 재생을 시도합니다.");
        window.setTimeout(playVideo, 0);
      } else {
        pauseVideo();
      }
      return next;
    });
  }

  function startFocus() {
    const next = { ...timerState, phase: "focus" as const };
    setTimerState(next);
    setSecondsLeft(getCurrentPhaseSeconds(next));
    setVideoStatus("집중을 시작했습니다. 영상 재생을 시도합니다.");
    playVideo();
  }

  function stopTimer() {
    const next = { ...timerState, phase: "idle" as const };
    setTimerState(next);
    setSecondsLeft(getCurrentPhaseSeconds(next));
    setVideoStatus("타이머를 정지했습니다.");
  }

  function changePreset(presetId: string) {
    const next = createTimerState(presetId) as TimerState;
    setTimerState(next);
    setSecondsLeft(getCurrentPhaseSeconds(next));
  }

  function resetApp() {
    stopTimer();
    setYoutubeUrl("");
    setManualPlayVisible(false);
    setTasks([createTask("오늘 볼 영상 정하기"), createTask("집중 중 처리할 작업 1개 정하기")]);
    playerRef.current?.destroy();
    playerRef.current = null;
    setPlayerReady(false);
    setVideoStatus(apiReady ? "초기화했습니다. 링크를 다시 넣으세요." : "초기화했습니다. YouTube API를 불러오는 중입니다.");
  }

  function updateTask(taskId: string, patch: Partial<Task>) {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <strong>Pomo Note</strong>
          <span>영상 집중과 강제 휴식을 한 화면에서 관리합니다.</span>
        </div>
        <button type="button" onClick={resetApp}>
          초기화
        </button>
      </header>

      <section className="stack" aria-label="Pomo Note desktop app">
        <section className="panel" aria-labelledby="videoTitle">
          <div className="panel-header">
            <h2 id="videoTitle">영상</h2>
            <button type="button" onClick={() => setMiniOpen(true)}>
              미니 플레이어
            </button>
          </div>
          <div className="panel-body">
            <div className="video-shell">
              <div id="player">
                <div className="empty-player">YouTube 링크를 넣고 불러오기를 누르세요.</div>
              </div>
            </div>
            <div className="url-row">
              <input
                type="url"
                value={youtubeUrl}
                placeholder="https://www.youtube.com/watch?v=..."
                onChange={(event) => setYoutubeUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") loadVideo();
                }}
              />
              <button className="primary" type="button" onClick={loadVideo}>
                불러오기
              </button>
            </div>
            <div className="actions">
              <button type="button" onClick={playVideo}>
                재생
              </button>
              <button type="button" onClick={pauseVideo}>
                일시정지
              </button>
              {manualPlayVisible ? (
                <button className="primary" type="button" onClick={playVideo}>
                  직접 재생
                </button>
              ) : null}
            </div>
            <div className="status-line">{videoStatus}</div>
          </div>
        </section>

        <section className="panel" aria-labelledby="timerTitle">
          <div className="panel-header">
            <h2 id="timerTitle">타이머</h2>
            <span className="badge">{timerState.phase === "idle" ? "대기" : getPhaseLabel(timerState.phase)}</span>
          </div>
          <div className="panel-body timer-panel">
            <div className="preset-list" aria-label="프리셋 선택">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className={preset.id === activePreset.id ? "active" : ""}
                  type="button"
                  onClick={() => changePreset(preset.id)}
                >
                  <strong>{preset.label}</strong>
                  <span>{preset.description}</span>
                </button>
              ))}
            </div>

            <div className="timer-display">
              <div className="phase">{getPhaseLabel(timerState.phase)}</div>
              <div className="time">{formatTime(secondsLeft)}</div>
              <div className="cycle">집중 {timerState.focusRound} / 4</div>
            </div>

            <div className="actions timer-actions">
              <button className="primary" type="button" onClick={startFocus}>
                집중 시작
              </button>
              <button className="danger" type="button" onClick={stopTimer}>
                정지
              </button>
            </div>
            <div className="status-line">프리셋은 집중 / 짧은 휴식 / 긴 휴식 순서입니다. 휴식과 다음 집중은 자동으로 전환됩니다.</div>
          </div>
        </section>

        <section className="panel" aria-labelledby="taskTitle">
          <div className="panel-header">
            <h2 id="taskTitle">체크리스트와 짧은 메모</h2>
            <button type="button" onClick={() => setTasks((current) => [...current, createTask()])}>
              항목 추가
            </button>
          </div>
          <div className="panel-body checklist">
            {tasks.map((task) => (
              <article className="task" key={task.id}>
                <div className="task-main">
                  <input
                    type="checkbox"
                    aria-label="완료"
                    checked={task.done}
                    onChange={(event) => updateTask(task.id, { done: event.target.checked })}
                  />
                  <input
                    type="text"
                    value={task.title}
                    placeholder="할 일"
                    onChange={(event) => updateTask(task.id, { title: event.target.value })}
                  />
                  <button type="button" onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))}>
                    삭제
                  </button>
                </div>
                <textarea value={task.memo} placeholder="짧은 메모" onChange={(event) => updateTask(task.id, { memo: event.target.value })} />
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className={inBreak ? "rest-overlay active" : "rest-overlay"} aria-live="polite">
        <div className="rest-box">
          <h1>{timerState.phase === "longBreak" ? "긴 휴식" : "휴식 시간"}</h1>
          <div className="rest-time">{formatTime(secondsLeft)}</div>
          <p>영상은 일시정지를 시도했습니다. 휴식이 끝나면 다음 집중 세션으로 자동 전환됩니다.</p>
        </div>
      </section>

      <aside className={miniOpen ? "mini-player active" : "mini-player"} aria-label="Mini player preview">
        <div className="panel-header">
          <h2>미니 플레이어</h2>
          <button type="button" onClick={() => setMiniOpen(false)}>
            닫기
          </button>
        </div>
        <div className="mini-placeholder">데스크탑 앱에서는 별도 창 분리 후보 영역입니다.</div>
      </aside>
    </main>
  );
}

