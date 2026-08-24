import {
  DEFAULT_ACTIVE_DAYS,
  DEFAULT_SCHEDULE,
  buildEventsForDate,
  formatCountdown,
  getCurrentPeriod,
  getTokyoParts,
  getUpcomingEvent,
  isValidTime,
  minutesToTime,
  normalizeActiveDays,
  normalizeSchedule,
  timeToMinutes,
  validatePeriod,
} from "./scheduler-core.js";

const STORAGE_KEY = "school-bell-settings-v1";
const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const DUE_WINDOW_MS = 5000;
const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

const state = {
  schedule: normalizeSchedule(DEFAULT_SCHEDULE),
  activeDays: [...DEFAULT_ACTIVE_DAYS],
  volume: 70,
  monitoring: false,
  clockOffsetMs: 0,
  hasNetworkTime: false,
  syncAccuracyMs: null,
  syncInProgress: false,
  lastSyncAt: 0,
  syncTimerId: 0,
  tickTimerId: 0,
  wakeLock: null,
  audioContext: null,
  firedEvents: new Set(),
  lastChimeMessage: "",
  lastChimeUntil: 0,
};

const el = {
  syncButton: document.getElementById("syncButton"),
  syncLabel: document.getElementById("syncLabel"),
  dateDisplay: document.getElementById("dateDisplay"),
  clockDisplay: document.getElementById("clockDisplay"),
  periodStatus: document.getElementById("periodStatus"),
  nextEventLabel: document.getElementById("nextEventLabel"),
  nextEventTime: document.getElementById("nextEventTime"),
  countdownDisplay: document.getElementById("countdownDisplay"),
  monitorButton: document.getElementById("monitorButton"),
  testButton: document.getElementById("testButton"),
  monitorNote: document.getElementById("monitorNote"),
  scheduleRows: document.getElementById("scheduleRows"),
  scheduleMessage: document.getElementById("scheduleMessage"),
  resetScheduleButton: document.getElementById("resetScheduleButton"),
  addPeriodButton: document.getElementById("addPeriodButton"),
  volumeInput: document.getElementById("volumeInput"),
  volumeOutput: document.getElementById("volumeOutput"),
  scheduleRowTemplate: document.getElementById("scheduleRowTemplate"),
  weekdayInputs: [...document.querySelectorAll('input[name="weekday"]')],
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.schedule = normalizeSchedule(saved.schedule);
    state.activeDays = normalizeActiveDays(saved.activeDays);
    const volume = Number(saved.volume);
    state.volume = Number.isFinite(volume) ? Math.max(10, Math.min(100, volume)) : 70;
  } catch {
    state.schedule = normalizeSchedule(DEFAULT_SCHEDULE);
    state.activeDays = [...DEFAULT_ACTIVE_DAYS];
    state.volume = 70;
  }
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schedule: state.schedule,
      activeDays: state.activeDays,
      volume: state.volume,
    }),
  );
}

function correctedNow() {
  return Date.now() + state.clockOffsetMs;
}

function createPeriodId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `period-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setScheduleMessage(message = "", isError = false) {
  el.scheduleMessage.textContent = message;
  el.scheduleMessage.classList.toggle("error", isError);
}

function validateRow(row, period) {
  const message = validatePeriod(period);
  row.classList.toggle("has-error", Boolean(message));
  row.querySelector(".row-error").textContent = message;
  return message;
}

function refreshValidationSummary() {
  const errorCount = state.schedule.filter((period) => validatePeriod(period)).length;
  if (errorCount) {
    setScheduleMessage(`${errorCount}件の時刻を確認してください。エラーのある時限は鳴りません。`, true);
  } else if (!state.schedule.some((period) => period.enabled)) {
    setScheduleMessage("使用する時限を1つ以上選んでください。", true);
  } else if (!state.activeDays.length) {
    setScheduleMessage("チャイムを鳴らす曜日を1つ以上選んでください。", true);
  } else {
    setScheduleMessage("変更内容はこの端末に自動保存されます。");
  }
}

function updatePeriodFromRow(row, period) {
  period.enabled = row.querySelector(".period-enabled").checked;
  period.label = row.querySelector(".period-label").value.slice(0, 12);
  period.start = row.querySelector(".period-start").value;
  period.end = row.querySelector(".period-end").value;
  validateRow(row, period);
  saveSettings();
  refreshValidationSummary();
  renderTimeline(correctedNow());
}

function renderSchedule() {
  el.scheduleRows.replaceChildren();
  state.schedule.forEach((period) => {
    const row = el.scheduleRowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.periodId = period.id;
    const enabledInput = row.querySelector(".period-enabled");
    const labelInput = row.querySelector(".period-label");
    const startInput = row.querySelector(".period-start");
    const endInput = row.querySelector(".period-end");
    const deleteButton = row.querySelector(".delete-period-button");

    enabledInput.checked = period.enabled;
    labelInput.value = period.label;
    startInput.value = period.start;
    endInput.value = period.end;
    enabledInput.setAttribute("aria-label", `${period.label}を使用`);
    labelInput.setAttribute("aria-label", `${period.label}の名称`);
    startInput.setAttribute("aria-label", `${period.label}の開始時刻`);
    endInput.setAttribute("aria-label", `${period.label}の終了時刻`);
    deleteButton.setAttribute("aria-label", `${period.label}を削除`);
    deleteButton.disabled = state.schedule.length === 1;
    deleteButton.hidden = state.schedule.length === 1;

    [enabledInput, labelInput, startInput, endInput].forEach((input) => {
      input.addEventListener("input", () => updatePeriodFromRow(row, period));
      input.addEventListener("change", () => updatePeriodFromRow(row, period));
    });
    deleteButton.addEventListener("click", () => {
      if (state.schedule.length === 1) return;
      state.schedule = state.schedule.filter((item) => item.id !== period.id);
      saveSettings();
      renderSchedule();
      renderTimeline(correctedNow());
    });

    validateRow(row, period);
    el.scheduleRows.append(row);
  });
  refreshValidationSummary();
}

function addPeriod() {
  if (state.schedule.length >= 12) {
    setScheduleMessage("時限は12件まで追加できます。", true);
    return;
  }
  const last = state.schedule.at(-1);
  const suggestedStart = isValidTime(last?.end) ? Math.min(timeToMinutes(last.end) + 20, 22 * 60) : 8 * 60 + 40;
  const suggestedEnd = Math.min(suggestedStart + 90, 23 * 60 + 59);
  state.schedule.push({
    id: createPeriodId(),
    label: `${state.schedule.length + 1}限`,
    start: minutesToTime(suggestedStart),
    end: minutesToTime(suggestedEnd),
    enabled: true,
  });
  saveSettings();
  renderSchedule();
  el.scheduleRows.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetSchedule() {
  const shouldReset = window.confirm("時間割を指定された1〜6限の初期時刻に戻しますか？");
  if (!shouldReset) return;
  state.schedule = normalizeSchedule(DEFAULT_SCHEDULE);
  saveSettings();
  renderSchedule();
  renderTimeline(correctedNow());
}

function renderActiveDays() {
  el.weekdayInputs.forEach((input) => {
    input.checked = state.activeDays.includes(Number(input.value));
  });
}

function renderVolume() {
  el.volumeInput.value = String(state.volume);
  el.volumeOutput.textContent = `${state.volume}%`;
}

function renderSyncState(status, message) {
  el.syncButton.classList.toggle("synced", status === "synced");
  el.syncButton.classList.toggle("offline", status === "offline");
  el.syncLabel.textContent = message;
}

async function fetchServerTimeSample(sampleIndex) {
  const url = new URL("./index.html", window.location.href);
  url.searchParams.set("clock-sync", `${Date.now()}-${sampleIndex}`);
  const startedAt = Date.now();
  const perfStartedAt = performance.now();
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  const endedAt = Date.now();
  const roundTripMs = performance.now() - perfStartedAt;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const dateHeader = response.headers.get("date");
  if (!dateHeader) throw new Error("Date header is unavailable");
  const ageSeconds = Math.max(0, Number(response.headers.get("age")) || 0);
  const serverEpochMs = Date.parse(dateHeader) + ageSeconds * 1000 + 500;
  if (!Number.isFinite(serverEpochMs)) throw new Error("Invalid server date");
  return {
    roundTripMs,
    offsetMs: serverEpochMs - (startedAt + endedAt) / 2,
  };
}

async function syncNetworkTime() {
  if (state.syncInProgress) return;
  state.syncInProgress = true;
  renderSyncState("syncing", "ネット時刻を同期中");
  try {
    const samples = [];
    for (let index = 0; index < 3; index += 1) {
      samples.push(await fetchServerTimeSample(index));
    }
    samples.sort((a, b) => a.roundTripMs - b.roundTripMs);
    const bestSamples = samples.slice(0, 2);
    state.clockOffsetMs = bestSamples.reduce((sum, sample) => sum + sample.offsetMs, 0) / bestSamples.length;
    state.syncAccuracyMs = Math.max(...bestSamples.map((sample) => sample.roundTripMs / 2 + 500));
    state.hasNetworkTime = true;
    state.lastSyncAt = Date.now();
    const accuracySeconds = Math.max(0.6, Math.ceil(state.syncAccuracyMs / 100) / 10).toFixed(1);
    renderSyncState("synced", `ネット時刻 同期済み ±${accuracySeconds}秒`);
    renderTimeline(correctedNow());
  } catch {
    if (state.hasNetworkTime) {
      renderSyncState("offline", "前回の同期を使用中");
    } else {
      state.clockOffsetMs = 0;
      renderSyncState("offline", "端末時刻を使用中");
    }
  } finally {
    state.syncInProgress = false;
  }
}

function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!state.audioContext) state.audioContext = new AudioContextClass();
  return state.audioContext;
}

async function unlockAudio() {
  const audio = ensureAudioContext();
  if (!audio) throw new Error("Web Audio API is unavailable");
  if (audio.state === "suspended") await audio.resume();
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.02);
  return audio;
}

function strikeBell(audio, frequency, startTime, volumeScale, decayScale = 1) {
  const partials = [
    { ratio: 1, gain: 0.14, duration: 2.5 },
    { ratio: 2.01, gain: 0.052, duration: 1.8 },
    { ratio: 2.72, gain: 0.028, duration: 1.25 },
    { ratio: 4.08, gain: 0.014, duration: 0.82 },
  ];
  partials.forEach((partial) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency * partial.ratio, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(partial.gain * volumeScale, startTime + 0.018);
    const duration = partial.duration * decayScale;
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.05);
  });
}

async function playSchoolChime() {
  const audio = await unlockAudio();
  const beatSeconds = 0.9;
  const notes = [
    { frequency: 523.25, beat: 0 },
    { frequency: 659.25, beat: 1 },
    { frequency: 587.33, beat: 2 },
    { frequency: 392, beat: 3 },
    { frequency: 523.25, beat: 6 },
    { frequency: 587.33, beat: 7 },
    { frequency: 659.25, beat: 8 },
    { frequency: 523.25, beat: 9 },
    { frequency: 659.25, beat: 12 },
    { frequency: 523.25, beat: 13 },
    { frequency: 587.33, beat: 14 },
    { frequency: 392, beat: 15 },
    { frequency: 392, beat: 18 },
    { frequency: 587.33, beat: 19 },
    { frequency: 659.25, beat: 20 },
    { frequency: 523.25, beat: 21, decayScale: 1.45 },
  ];
  const startTime = audio.currentTime + 0.04;
  const volumeScale = state.volume / 100;
  notes.forEach((note) => strikeBell(audio, note.frequency, startTime + note.beat * beatSeconds, volumeScale, note.decayScale));
  if ("vibrate" in navigator) navigator.vibrate([120, 80, 120]);
  document.body.classList.remove("chime-flash");
  window.requestAnimationFrame(() => document.body.classList.add("chime-flash"));
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
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
    // The browser may release the lock when the page becomes hidden.
  }
  state.wakeLock = null;
}

function renderMonitoringState() {
  el.monitorButton.textContent = state.monitoring ? "監視を停止" : "監視を開始";
  el.monitorButton.classList.toggle("active", state.monitoring);
  el.monitorNote.textContent = state.monitoring
    ? "監視中です。このページを前面に表示したままにしてください。"
    : "iPadの音量を確認し、このページを開いたまま「監視を開始」を押してください。";
}

async function toggleMonitoring() {
  if (state.monitoring) {
    state.monitoring = false;
    await releaseWakeLock();
    renderMonitoringState();
    renderTimeline(correctedNow());
    return;
  }

  try {
    await unlockAudio();
    state.monitoring = true;
    state.firedEvents.clear();
    await requestWakeLock();
    renderMonitoringState();
    renderTimeline(correctedNow());
  } catch {
    el.monitorNote.textContent = "このブラウザーでは音声を開始できませんでした。SafariまたはChromeで開き直してください。";
  }
}

function eventDescription(event) {
  return `${event.label} ${event.kind === "start" ? "開始" : "終了"}`;
}

function ringDueEvents(nowMs) {
  if (!state.monitoring) return;
  const { dateKey } = getTokyoParts(nowMs);
  const events = buildEventsForDate(state.schedule, dateKey, state.activeDays);
  events.forEach((event) => {
    const lateness = nowMs - event.atMs;
    if (lateness < 0 || lateness >= DUE_WINDOW_MS || state.firedEvents.has(event.key)) return;
    state.firedEvents.add(event.key);
    state.lastChimeMessage = `${eventDescription(event)}のチャイムを鳴らしました`;
    state.lastChimeUntil = nowMs + 8000;
    playSchoolChime().catch(() => {
      state.monitoring = false;
      renderMonitoringState();
      el.monitorNote.textContent = "音声が停止されました。もう一度「監視を開始」を押してください。";
    });
  });

  if (state.firedEvents.size > 40) {
    state.firedEvents = new Set([...state.firedEvents].filter((key) => key.startsWith(dateKey)));
  }
}

function renderTimeline(nowMs) {
  const parts = getTokyoParts(nowMs);
  const currentPeriod = getCurrentPeriod(state.schedule, nowMs, state.activeDays);
  const nextEvent = getUpcomingEvent(state.schedule, nowMs, state.activeDays);
  el.clockDisplay.textContent = parts.clock;
  el.clockDisplay.dateTime = new Date(nowMs).toISOString();
  el.dateDisplay.textContent = `${parts.year}年${parts.month}月${parts.day}日（${WEEKDAY_NAMES[parts.weekday]}）`;

  if (state.lastChimeUntil > nowMs) {
    el.periodStatus.textContent = state.lastChimeMessage;
  } else if (currentPeriod) {
    el.periodStatus.textContent = `${currentPeriod.label} 授業中${state.monitoring ? "・チャイム監視中" : ""}`;
  } else {
    el.periodStatus.textContent = state.monitoring ? "チャイム監視中" : "監視は停止しています";
  }

  if (!nextEvent) {
    el.nextEventLabel.textContent = "予定なし";
    el.nextEventTime.textContent = "有効な曜日と時限を設定してください";
    el.countdownDisplay.textContent = "--:--:--";
    return;
  }

  el.nextEventLabel.textContent = eventDescription(nextEvent);
  el.nextEventTime.textContent = nextEvent.dateKey === parts.dateKey
    ? `${nextEvent.time}（本日）`
    : `${Number(nextEvent.dateKey.slice(5, 7))}/${Number(nextEvent.dateKey.slice(8, 10))} ${nextEvent.time}`;
  el.countdownDisplay.textContent = formatCountdown(nextEvent.atMs - nowMs);
}

function tick() {
  const nowMs = correctedNow();
  ringDueEvents(nowMs);
  renderTimeline(nowMs);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || window.location.protocol === "file:") return;
  navigator.serviceWorker.register("../service-worker.js").catch(() => {
    // The tool still works online if Service Worker registration is unavailable.
  });
}

function bindEvents() {
  el.syncButton.addEventListener("click", syncNetworkTime);
  el.monitorButton.addEventListener("click", toggleMonitoring);
  el.testButton.addEventListener("click", () => {
    playSchoolChime().catch(() => {
      el.monitorNote.textContent = "チャイムを再生できませんでした。ブラウザーの音声設定を確認してください。";
    });
  });
  el.resetScheduleButton.addEventListener("click", resetSchedule);
  el.addPeriodButton.addEventListener("click", addPeriod);
  el.volumeInput.addEventListener("input", () => {
    state.volume = Number(el.volumeInput.value);
    renderVolume();
    saveSettings();
  });
  el.weekdayInputs.forEach((input) => {
    input.addEventListener("change", () => {
      state.activeDays = normalizeActiveDays(el.weekdayInputs.filter((item) => item.checked).map((item) => Number(item.value)));
      saveSettings();
      refreshValidationSummary();
      renderTimeline(correctedNow());
    });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (state.monitoring) requestWakeLock();
    if (Date.now() - state.lastSyncAt > 60 * 1000) syncNetworkTime();
  });
  window.addEventListener("pagehide", releaseWakeLock);
  window.addEventListener("online", syncNetworkTime);
}

function initialize() {
  loadSettings();
  renderSchedule();
  renderActiveDays();
  renderVolume();
  renderMonitoringState();
  bindEvents();
  tick();
  state.tickTimerId = window.setInterval(tick, 250);
  state.syncTimerId = window.setInterval(syncNetworkTime, SYNC_INTERVAL_MS);
  syncNetworkTime();
  registerServiceWorker();
}

initialize();
