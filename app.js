const STORAGE_KEY = "presentation-timer-settings-v1";

const translations = {
  ja: {
    documentTitle: "発表・質疑カウントダウン", languageButton: "English", languageButtonLabel: "Switch to English",
    appLabel: "iPad 発表タイマー", setupTitle: "発表時間と質疑応答を設定", setupDescription: "開始後は残り時間を大きく表示します。",
    durationSettings: "時間設定", presentationTime: "発表時間", qaTime: "質疑応答", minuteSuffix: "分",
    presentationStepper: "発表時間を1分単位で変更", decreasePresentation: "発表時間を1分短くする", presentationMinutes: "発表時間（分）", increasePresentation: "発表時間を1分長くする",
    qaStepper: "質疑応答を1分単位で変更", decreaseQa: "質疑応答を1分短くする", qaMinutes: "質疑応答（分）", increaseQa: "質疑応答を1分長くする",
    start: "スタート", testBell: "ベル確認", configuredTimes: "設定時間", presentationSummary: "分 発表", qaSummary: "分 質疑", remainingTime: "残り時間",
    presenting: "発表中", presentationTitle: "発表時間", presentationMessage: "発表の残り時間です。", qaActive: "質疑応答中", qaTitle: "質疑応答", qaMessage: "質疑応答の残り時間です。",
    pause: "一時停止", resume: "再開", toQa: "質疑へ", toEnd: "終了へ", reset: "リセット", finishedLabel: "終了", finishedTitle: "発表と質疑応答が終了しました", nextSpeaker: "次の演者を開始",
  },
  en: {
    documentTitle: "Presentation & Q&A Countdown", languageButton: "日本語", languageButtonLabel: "日本語に切り替える",
    appLabel: "iPad Presentation Timer", setupTitle: "Set presentation and Q&A times", setupDescription: "The remaining time will be shown prominently after you start.",
    durationSettings: "Time settings", presentationTime: "Presentation", qaTime: "Q&A", minuteSuffix: " min",
    presentationStepper: "Adjust presentation time in one-minute increments", decreasePresentation: "Decrease presentation time by one minute", presentationMinutes: "Presentation time in minutes", increasePresentation: "Increase presentation time by one minute",
    qaStepper: "Adjust Q&A time in one-minute increments", decreaseQa: "Decrease Q&A time by one minute", qaMinutes: "Q&A time in minutes", increaseQa: "Increase Q&A time by one minute",
    start: "Start", testBell: "Test Bell", configuredTimes: "Configured times", presentationSummary: " min Presentation", qaSummary: " min Q&A", remainingTime: "Time remaining",
    presenting: "PRESENTING", presentationTitle: "Presentation", presentationMessage: "Presentation time remaining.", qaActive: "Q&A IN PROGRESS", qaTitle: "Q&A", qaMessage: "Q&A time remaining.",
    pause: "Pause", resume: "Resume", toQa: "Go to Q&A", toEnd: "Finish", reset: "Reset", finishedLabel: "FINISHED", finishedTitle: "Presentation and Q&A completed", nextSpeaker: "Start Next Speaker",
  },
};

const state = {
  presentationMinutes: 7,
  qaMinutes: 3,
  language: "ja",
  phase: "setup",
  isPaused: false,
  phaseStartedAt: 0,
  phaseEndsAt: 0,
  phaseDurationMs: 0,
  pausedRemainingMs: 0,
  tickId: 0,
  audioContext: null,
  wakeLock: null,
};

const el = {
  setupPanel: document.getElementById("setupPanel"),
  timerPanel: document.getElementById("timerPanel"),
  completePanel: document.getElementById("completePanel"),
  presentationInput: document.getElementById("presentationInput"),
  qaInput: document.getElementById("qaInput"),
  presentationValue: document.getElementById("presentationValue"),
  qaValue: document.getElementById("qaValue"),
  startButton: document.getElementById("startButton"),
  testBellButton: document.getElementById("testBellButton"),
  phaseEyebrow: document.getElementById("phaseEyebrow"),
  phaseTitle: document.getElementById("phaseTitle"),
  phaseMessage: document.getElementById("phaseMessage"),
  timeDisplay: document.getElementById("timeDisplay"),
  progressBar: document.getElementById("progressBar"),
  pauseButton: document.getElementById("pauseButton"),
  skipButton: document.getElementById("skipButton"),
  resetDuringButton: document.getElementById("resetDuringButton"),
  summaryPresentation: document.getElementById("summaryPresentation"),
  summaryQa: document.getElementById("summaryQa"),
  nextSpeakerButton: document.getElementById("nextSpeakerButton"),
  resetButton: document.getElementById("resetButton"),
  languageButton: document.getElementById("languageButton"),
};

function text(key) {
  return translations[state.language][key];
}

function clampMinutes(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(60, Math.max(1, parsed));
}

function formatTime(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.presentationMinutes = clampMinutes(saved.presentationMinutes ?? state.presentationMinutes);
    state.qaMinutes = clampMinutes(saved.qaMinutes ?? state.qaMinutes);
    state.language = saved.language === "en" ? "en" : "ja";
  } catch {
    saveSettings();
  }
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      presentationMinutes: state.presentationMinutes,
      qaMinutes: state.qaMinutes,
      language: state.language,
    }),
  );
}

function renderLanguage() {
  document.documentElement.lang = state.language;
  document.title = text("documentTitle");
  document.querySelector('meta[name="apple-mobile-web-app-title"]').content = text("appLabel");
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = text(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", text(node.dataset.i18nAria));
  });
  el.languageButton.textContent = text("languageButton");
  el.languageButton.setAttribute("aria-label", text("languageButtonLabel"));
  if (state.phase === "presentation" || state.phase === "qa") renderPhaseShell();
}

function toggleLanguage() {
  state.language = state.language === "ja" ? "en" : "ja";
  saveSettings();
  renderLanguage();
}

function renderSettings() {
  el.presentationInput.value = state.presentationMinutes;
  el.qaInput.value = state.qaMinutes;
  el.presentationValue.textContent = state.presentationMinutes;
  el.qaValue.textContent = state.qaMinutes;
  el.summaryPresentation.textContent = state.presentationMinutes;
  el.summaryQa.textContent = state.qaMinutes;
}

function setPanel(panelName) {
  el.setupPanel.hidden = panelName !== "setup";
  el.timerPanel.hidden = panelName !== "timer";
  el.completePanel.hidden = panelName !== "complete";
}

function ensureAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!state.audioContext) {
    state.audioContext = new AudioContextClass();
  }
  if (state.audioContext.state === "suspended") {
    state.audioContext.resume();
  }
  return state.audioContext;
}

function playTone(frequency, startTime, duration, gainValue = 0.2) {
  const audio = ensureAudio();
  if (!audio) return;

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

function ringBell(kind = "phase") {
  const audio = ensureAudio();
  if (!audio) return;

  const now = audio.currentTime + 0.02;
  const pattern = kind === "final" ? [880, 1174, 1568] : [880, 1174];
  pattern.forEach((frequency, index) => {
    playTone(frequency, now + index * 0.18, 0.16, 0.22);
  });

  if ("vibrate" in navigator) {
    navigator.vibrate(kind === "final" ? [120, 80, 120] : [120]);
  }

  document.body.classList.remove("flash");
  window.requestAnimationFrame(() => document.body.classList.add("flash"));
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    state.wakeLock = await navigator.wakeLock.request("screen");
  } catch {
    state.wakeLock = null;
  }
}

async function releaseWakeLock() {
  if (!state.wakeLock) return;
  try {
    await state.wakeLock.release();
  } catch {
    // The lock may already be released when the page is hidden.
  }
  state.wakeLock = null;
}

function clearTick() {
  if (state.tickId) {
    window.cancelAnimationFrame(state.tickId);
    state.tickId = 0;
  }
}

function getPhaseDurationMs(phase) {
  return (phase === "presentation" ? state.presentationMinutes : state.qaMinutes) * 60 * 1000;
}

function startPhase(phase) {
  clearTick();
  state.phase = phase;
  state.isPaused = false;
  state.phaseDurationMs = getPhaseDurationMs(phase);
  state.phaseStartedAt = Date.now();
  state.phaseEndsAt = state.phaseStartedAt + state.phaseDurationMs;
  state.pausedRemainingMs = 0;
  renderPhaseShell();
  tick();
}

function startSession() {
  ensureAudio();
  saveSettings();
  renderSettings();
  setPanel("timer");
  document.body.classList.remove("is-finished");
  requestWakeLock();
  startPhase("presentation");
}

function renderPhaseShell() {
  const isQa = state.phase === "qa";
  document.body.classList.toggle("is-qa", isQa);
  el.phaseEyebrow.textContent = text(isQa ? "qaActive" : "presenting");
  el.phaseTitle.textContent = text(isQa ? "qaTitle" : "presentationTitle");
  el.phaseMessage.textContent = text(isQa ? "qaMessage" : "presentationMessage");
  el.skipButton.textContent = text(isQa ? "toEnd" : "toQa");
  el.pauseButton.textContent = text(state.isPaused ? "resume" : "pause");
}

function renderTimer(remainingMs) {
  el.timeDisplay.textContent = formatTime(remainingMs);

  const progressRatio = state.phaseDurationMs === 0 ? 0 : Math.max(0, Math.min(1, remainingMs / state.phaseDurationMs));
  el.progressBar.style.transform = `scaleX(${progressRatio})`;

  const isWarning = remainingMs <= 60 * 1000;
  el.progressBar.style.backgroundColor = isWarning ? "var(--danger)" : "var(--accent)";
}

function tick() {
  if (state.isPaused) {
    renderTimer(state.pausedRemainingMs);
    return;
  }

  const remainingMs = state.phaseEndsAt - Date.now();
  renderTimer(remainingMs);

  if (remainingMs <= 0) {
    if (state.phase === "presentation") {
      ringBell("phase");
      startPhase("qa");
      return;
    }
    finishSession();
    return;
  }

  state.tickId = window.requestAnimationFrame(tick);
}

function finishSession() {
  clearTick();
  state.phase = "complete";
  state.isPaused = false;
  renderTimer(0);
  setPanel("complete");
  document.body.classList.remove("is-qa");
  document.body.classList.add("is-finished");
  releaseWakeLock();
  ringBell("final");
}

function pauseOrResume() {
  if (state.phase !== "presentation" && state.phase !== "qa") return;

  if (state.isPaused) {
    state.isPaused = false;
    state.phaseEndsAt = Date.now() + state.pausedRemainingMs;
    el.pauseButton.textContent = text("pause");
    requestWakeLock();
    tick();
    return;
  }

  state.pausedRemainingMs = Math.max(0, state.phaseEndsAt - Date.now());
  state.isPaused = true;
  clearTick();
  el.pauseButton.textContent = text("resume");
  releaseWakeLock();
  renderTimer(state.pausedRemainingMs);
}

function skipPhase() {
  if (state.phase === "presentation") {
    ringBell("phase");
    startPhase("qa");
    return;
  }
  finishSession();
}

function resetToSetup() {
  clearTick();
  state.phase = "setup";
  state.isPaused = false;
  setPanel("setup");
  document.body.classList.remove("is-qa", "is-finished", "flash");
  releaseWakeLock();
  renderSettings();
}

function updateMinutes(kind, value) {
  const nextValue = clampMinutes(value);
  if (kind === "presentation") {
    state.presentationMinutes = nextValue;
  } else {
    state.qaMinutes = nextValue;
  }
  saveSettings();
  renderSettings();
}

function bindEvents() {
  document.querySelectorAll("[data-adjust]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.adjust;
      const delta = Number.parseInt(button.dataset.delta, 10);
      const current = kind === "presentation" ? state.presentationMinutes : state.qaMinutes;
      updateMinutes(kind, current + delta);
    });
  });

  el.presentationInput.addEventListener("change", () => updateMinutes("presentation", el.presentationInput.value));
  el.qaInput.addEventListener("change", () => updateMinutes("qa", el.qaInput.value));
  el.startButton.addEventListener("click", startSession);
  el.testBellButton.addEventListener("click", () => ringBell("phase"));
  el.pauseButton.addEventListener("click", pauseOrResume);
  el.skipButton.addEventListener("click", skipPhase);
  el.resetDuringButton.addEventListener("click", resetToSetup);
  el.resetButton.addEventListener("click", resetToSetup);
  el.nextSpeakerButton.addEventListener("click", startSession);
  el.languageButton.addEventListener("click", toggleLanguage);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && (state.phase === "presentation" || state.phase === "qa") && !state.isPaused) {
      requestWakeLock();
      clearTick();
      tick();
    }
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The app still works without offline caching when opened from a file URL.
    });
  });
}

loadSettings();
renderSettings();
renderLanguage();
bindEvents();
registerServiceWorker();