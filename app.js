const STORAGE_KEY = "presentation-timer-settings-v1";

const translations = {
  ja: {
    documentTitle: "発表・質疑カウントダウン", languageButton: "English", languageButtonLabel: "Switch to English",
    appLabel: "iPad 発表タイマー", setupTitle: "発表時間と質疑応答を設定", setupDescription: "開始後は残り時間を大きく表示します。",
    durationSettings: "時間設定", presentationTime: "発表時間", qaTime: "質疑応答", minuteSuffix: "分", secondSuffix: "秒", minutesLabel: "分", secondsLabel: "秒",
    presentationMinuteStepper: "発表時間の分を変更", presentationSecondStepper: "発表時間の秒を変更", decreasePresentation: "発表時間を1分短くする", presentationMinutes: "発表時間（分）", increasePresentation: "発表時間を1分長くする", decreasePresentationSecond: "発表時間を1秒短くする", presentationSeconds: "発表時間（秒）", increasePresentationSecond: "発表時間を1秒長くする",
    qaMinuteStepper: "質疑応答時間の分を変更", qaSecondStepper: "質疑応答時間の秒を変更", decreaseQa: "質疑応答を1分短くする", qaMinutes: "質疑応答（分）", increaseQa: "質疑応答を1分長くする", decreaseQaSecond: "質疑応答を1秒短くする", qaSeconds: "質疑応答（秒）", increaseQaSecond: "質疑応答を1秒長くする",
    soundSettings: "通知音設定", soundLabel: "通知音", soundBell: "ベル", soundChime: "チャイム", soundBeep: "ビープ", soundModeLabel: "通知", soundEnabledAria: "通知音の有無", soundOn: "音あり", soundOff: "無音",
    start: "スタート", testBell: "音を確認", configuredTimes: "設定時間", presentationSummary: " 発表", qaSummary: " 質疑", remainingTime: "残り時間",
    presenting: "発表中", presentationTitle: "発表時間", presentationMessage: "発表の残り時間です。", qaActive: "質疑応答中", qaTitle: "質疑応答", qaMessage: "質疑応答の残り時間です。",
    pause: "一時停止", resume: "再開", toQa: "質疑へ", toEnd: "終了へ", reset: "リセット", finishedLabel: "終了", finishedTitle: "発表と質疑応答が終了しました", nextSpeaker: "次の演者を開始",
  },
  en: {
    documentTitle: "Presentation & Q&A Countdown", languageButton: "日本語", languageButtonLabel: "日本語に切り替える",
    appLabel: "iPad Presentation Timer", setupTitle: "Set presentation and Q&A times", setupDescription: "The remaining time will be shown prominently after you start.",
    durationSettings: "Time settings", presentationTime: "Presentation", qaTime: "Q&A", minuteSuffix: " min", secondSuffix: " sec", minutesLabel: "min", secondsLabel: "sec",
    presentationMinuteStepper: "Adjust presentation minutes", presentationSecondStepper: "Adjust presentation seconds", decreasePresentation: "Decrease presentation time by one minute", presentationMinutes: "Presentation time in minutes", increasePresentation: "Increase presentation time by one minute", decreasePresentationSecond: "Decrease presentation time by one second", presentationSeconds: "Presentation time in seconds", increasePresentationSecond: "Increase presentation time by one second",
    qaMinuteStepper: "Adjust Q&A minutes", qaSecondStepper: "Adjust Q&A seconds", decreaseQa: "Decrease Q&A time by one minute", qaMinutes: "Q&A time in minutes", increaseQa: "Increase Q&A time by one minute", decreaseQaSecond: "Decrease Q&A time by one second", qaSeconds: "Q&A time in seconds", increaseQaSecond: "Increase Q&A time by one second",
    soundSettings: "Alert sound settings", soundLabel: "Alert Sound", soundBell: "Bell", soundChime: "Chime", soundBeep: "Beep", soundModeLabel: "Alert", soundEnabledAria: "Enable alert sound", soundOn: "Sound On", soundOff: "Muted",
    start: "Start", testBell: "Test Sound", configuredTimes: "Configured times", presentationSummary: " Presentation", qaSummary: " Q&A", remainingTime: "Time remaining",
    presenting: "PRESENTING", presentationTitle: "Presentation", presentationMessage: "Presentation time remaining.", qaActive: "Q&A IN PROGRESS", qaTitle: "Q&A", qaMessage: "Q&A time remaining.",
    pause: "Pause", resume: "Resume", toQa: "Go to Q&A", toEnd: "Finish", reset: "Reset", finishedLabel: "FINISHED", finishedTitle: "Presentation and Q&A completed", nextSpeaker: "Start Next Speaker",
  },
};

const state = {
  presentationMinutes: 7,
  presentationSeconds: 0,
  qaMinutes: 3,
  qaSeconds: 0,
  language: "en",
  sound: "beep",
  soundEnabled: true,
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
  presentationSecondsInput: document.getElementById("presentationSecondsInput"),
  qaInput: document.getElementById("qaInput"),
  qaSecondsInput: document.getElementById("qaSecondsInput"),
  presentationValue: document.getElementById("presentationValue"),
  presentationSecondsValue: document.getElementById("presentationSecondsValue"),
  qaValue: document.getElementById("qaValue"),
  qaSecondsValue: document.getElementById("qaSecondsValue"),
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
  soundSelect: document.getElementById("soundSelect"),
  soundEnabledInput: document.getElementById("soundEnabledInput"),
  soundEnabledLabel: document.getElementById("soundEnabledLabel"),
};

function text(key) {
  return translations[state.language][key];
}

function clampPresentationMinutes(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(60, Math.max(0, parsed));
}

function clampSeconds(value) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.min(59, Math.max(0, parsed));
}

function ensurePresentationDuration() {
  if (state.presentationMinutes === 0 && state.presentationSeconds === 0) {
    state.presentationSeconds = 1;
  }
}

function ensureQaDuration() {
  if (state.qaMinutes === 0 && state.qaSeconds === 0) {
    state.qaSeconds = 1;
  }
}

function formatConfiguredPresentation() {
  return `${String(state.presentationMinutes).padStart(2, "0")}:${String(state.presentationSeconds).padStart(2, "0")}`;
}

function formatConfiguredQa() {
  return `${String(state.qaMinutes).padStart(2, "0")}:${String(state.qaSeconds).padStart(2, "0")}`;
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
    state.presentationMinutes = clampPresentationMinutes(saved.presentationMinutes ?? state.presentationMinutes);
    state.presentationSeconds = clampSeconds(saved.presentationSeconds ?? state.presentationSeconds);
    ensurePresentationDuration();
    state.qaMinutes = clampPresentationMinutes(saved.qaMinutes ?? state.qaMinutes);
    state.qaSeconds = clampSeconds(saved.qaSeconds ?? state.qaSeconds);
    ensureQaDuration();
    state.language = saved.language === "ja" ? "ja" : "en";
    state.sound = saved.soundDefaultVersion === 2 && ["bell", "chime", "beep"].includes(saved.sound) ? saved.sound : "beep";
    state.soundEnabled = typeof saved.soundEnabled === "boolean" ? saved.soundEnabled : (saved.volume ?? 70) > 0;
    saveSettings();
  } catch {
    saveSettings();
  }
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      presentationMinutes: state.presentationMinutes,
      presentationSeconds: state.presentationSeconds,
      qaMinutes: state.qaMinutes,
      qaSeconds: state.qaSeconds,
      language: state.language,
      sound: state.sound,
      soundEnabled: state.soundEnabled,
      soundDefaultVersion: 2,
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
  el.soundEnabledLabel.textContent = text(state.soundEnabled ? "soundOn" : "soundOff");
}

function toggleLanguage() {
  state.language = state.language === "ja" ? "en" : "ja";
  saveSettings();
  renderLanguage();
}

function renderSettings() {
  el.presentationInput.value = state.presentationMinutes;
  el.presentationSecondsInput.value = state.presentationSeconds;
  el.qaInput.value = state.qaMinutes;
  el.qaSecondsInput.value = state.qaSeconds;
  renderDurationValues();
  el.soundSelect.value = state.sound;
  el.soundEnabledInput.checked = state.soundEnabled;
  el.soundEnabledLabel.textContent = text(state.soundEnabled ? "soundOn" : "soundOff");
}

function renderDurationValues() {
  el.presentationValue.textContent = state.presentationMinutes;
  el.presentationSecondsValue.textContent = String(state.presentationSeconds).padStart(2, "0");
  el.qaValue.textContent = state.qaMinutes;
  el.qaSecondsValue.textContent = String(state.qaSeconds).padStart(2, "0");
  el.summaryPresentation.textContent = formatConfiguredPresentation();
  el.summaryQa.textContent = formatConfiguredQa();
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

function playTone(frequency, startTime, duration, gainValue = 0.2, oscillatorType = "sine") {
  const audio = ensureAudio();
  if (!audio) return;

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = oscillatorType;
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
  const profiles = {
    bell: { notes: [880, 1174, 1568], type: "sine", duration: 0.16, interval: 0.18, gain: 0.28 },
    chime: { notes: [659, 784, 1047], type: "triangle", duration: 0.34, interval: 0.28, gain: 0.22 },
    beep: { notes: [1047, 1047, 1047], type: "square", duration: 0.1, interval: 0.16, gain: 0.16 },
  };
  const profile = profiles[state.sound];
  const noteCount = kind === "final" ? 3 : 2;
  if (state.soundEnabled) {
    const audio = ensureAudio();
    if (audio) {
      const now = audio.currentTime + 0.02;
      profile.notes.slice(0, noteCount).forEach((frequency, index) => {
        playTone(frequency, now + index * profile.interval, profile.duration, profile.gain, profile.type);
      });
    }
  }

  if (state.soundEnabled && "vibrate" in navigator) {
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
  if (phase === "presentation") {
    return (state.presentationMinutes * 60 + state.presentationSeconds) * 1000;
  }
  return (state.qaMinutes * 60 + state.qaSeconds) * 1000;
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
  if (state.soundEnabled) ensureAudio();
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

function updateDuration(kind, value, renderInputs = true) {
  if (kind === "presentation") {
    state.presentationMinutes = clampPresentationMinutes(value);
  } else if (kind === "presentationSeconds") {
    state.presentationSeconds = clampSeconds(value);
  } else if (kind === "qaSeconds") {
    state.qaSeconds = clampSeconds(value);
  } else {
    state.qaMinutes = clampPresentationMinutes(value);
  }
  ensurePresentationDuration();
  ensureQaDuration();
  saveSettings();
  if (renderInputs) {
    renderSettings();
  } else {
    renderDurationValues();
  }
}

function handleDurationInput(kind, input) {
  if (input.value === "") return;
  updateDuration(kind, input.value, false);
}

function commitDurationInput(kind, input) {
  updateDuration(kind, input.value === "" ? 0 : input.value);
}

function bindEvents() {
  document.querySelectorAll("[data-adjust]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.adjust;
      const delta = Number.parseInt(button.dataset.delta, 10);
      const current = kind === "presentation" ? state.presentationMinutes : kind === "presentationSeconds" ? state.presentationSeconds : kind === "qaSeconds" ? state.qaSeconds : state.qaMinutes;
      updateDuration(kind, current + delta);
    });
  });

  [
    ["presentation", el.presentationInput],
    ["presentationSeconds", el.presentationSecondsInput],
    ["qa", el.qaInput],
    ["qaSeconds", el.qaSecondsInput],
  ].forEach(([kind, input]) => {
    input.addEventListener("input", () => handleDurationInput(kind, input));
    input.addEventListener("change", () => commitDurationInput(kind, input));
    input.addEventListener("blur", () => commitDurationInput(kind, input));
  });
  el.startButton.addEventListener("click", startSession);
  el.testBellButton.addEventListener("click", () => ringBell("phase"));
  el.pauseButton.addEventListener("click", pauseOrResume);
  el.skipButton.addEventListener("click", skipPhase);
  el.resetDuringButton.addEventListener("click", resetToSetup);
  el.resetButton.addEventListener("click", resetToSetup);
  el.nextSpeakerButton.addEventListener("click", startSession);
  el.languageButton.addEventListener("click", toggleLanguage);
  el.soundSelect.addEventListener("change", () => {
    state.sound = el.soundSelect.value;
    saveSettings();
  });
  el.soundEnabledInput.addEventListener("change", () => {
    state.soundEnabled = el.soundEnabledInput.checked;
    el.soundEnabledLabel.textContent = text(state.soundEnabled ? "soundOn" : "soundOff");
    saveSettings();
  });

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
    navigator.serviceWorker
      .register("./service-worker.js?v=12")
      .then((registration) => registration.update())
      .catch(() => {
        // The app still works without offline caching when opened from a file URL.
      });
  });
}

loadSettings();
renderSettings();
renderLanguage();
bindEvents();
registerServiceWorker();