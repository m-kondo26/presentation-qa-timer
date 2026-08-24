import {
  DEFAULT_ACTIVE_DAYS,
  DEFAULT_SCHEDULE,
  TIME_ZONE,
  buildEventsForDate,
  formatCountdown,
  getCurrentPeriod,
  getPeriodValidationCode,
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

const translations = {
  ja: {
    documentTitle: "学校チャイム",
    description: "ネット時刻に同期し、設定した授業の開始・終了時刻に学校チャイムを鳴らすiPad対応Webツールです。",
    backLink: "← 発表タイマー",
    syncAria: "ネット時刻を再同期",
    languageButton: "English",
    languageAria: "Switch to English",
    pageTitle: "学校チャイム",
    heroDescription: "設定した授業の開始・終了時刻に、ネット時刻を基準としてチャイムを鳴らします。",
    checkingTime: "時刻を確認しています",
    nextChime: "次のチャイム",
    checking: "確認中",
    remaining: "あと",
    startMonitoring: "監視を開始",
    stopMonitoring: "監視を停止",
    testChime: "チャイムを試聴（約22秒）",
    monitorStoppedNote: "iPadの音量を確認し、このページを開いたまま「監視を開始」を押してください。",
    monitorActiveNote: "監視中です。このページを前面に表示したままにしてください。",
    scheduleTitle: "時間割",
    resetSchedule: "初期時間に戻す",
    activeWeekdays: "チャイムを鳴らす曜日",
    mondayShort: "月", tuesdayShort: "火", wednesdayShort: "水", thursdayShort: "木", fridayShort: "金", saturdayShort: "土", sundayShort: "日",
    enabledColumn: "使用", periodColumn: "時限", startColumn: "開始", endColumn: "終了",
    addPeriod: "＋ 時限を追加",
    chimeVolume: "チャイム音量",
    usageTitle: "使用上の注意",
    usageDescription: "iPadでは音声の許可に最初のタップが必要です。監視中は画面のスリープをできるだけ防ぎますが、このページを前面に表示したまま、消音設定と本体音量を事前に確認してください。",
    labelRequired: "名称を入力してください",
    timeRequired: "時刻を入力してください",
    startBeforeEnd: "開始は終了より前にしてください",
    validationErrors: "{count}件の時刻を確認してください。エラーのある時限は鳴りません。",
    selectPeriod: "使用する時限を1つ以上選んでください。",
    selectWeekday: "チャイムを鳴らす曜日を1つ以上選んでください。",
    autoSaved: "変更内容はこの端末に自動保存されます。",
    maximumPeriods: "時限は12件まで追加できます。",
    resetConfirm: "時間割を指定された1〜6限の初期時刻に戻しますか？",
    periodDefault: "{number}限",
    enablePeriodAria: "{label}を使用",
    periodNameAria: "{label}の名称",
    startTimeAria: "{label}の開始時刻",
    endTimeAria: "{label}の終了時刻",
    deletePeriodAria: "{label}を削除",
    delete: "削除",
    syncing: "ネット時刻を同期中",
    synced: "ネット時刻 同期済み ±{seconds}秒",
    usingPreviousSync: "前回の同期を使用中",
    usingDeviceTime: "端末時刻を使用中",
    audioStartError: "このブラウザーでは音声を開始できませんでした。SafariまたはChromeで開き直してください。",
    audioStoppedError: "音声が停止されました。もう一度「監視を開始」を押してください。",
    audioPlaybackError: "チャイムを再生できませんでした。ブラウザーの音声設定を確認してください。",
    eventStart: "{label} 開始",
    eventEnd: "{label} 終了",
    chimePlayed: "{description}のチャイムを鳴らしました",
    classInSession: "{label} 授業中",
    monitoringSuffix: "・チャイム監視中",
    monitoring: "チャイム監視中",
    monitoringStopped: "監視は停止しています",
    noSchedule: "予定なし",
    configureSchedule: "有効な曜日と時限を設定してください",
    today: "{time}（本日）",
  },
  en: {
    documentTitle: "School Bell",
    description: "An iPad-ready school bell that syncs to network time and rings at editable class start and end times.",
    backLink: "← Presentation Timer",
    syncAria: "Resync network time",
    languageButton: "日本語",
    languageAria: "日本語に切り替える",
    pageTitle: "School Bell",
    heroDescription: "Ring a Westminster school chime at each scheduled class start and end, using network-synchronized time.",
    checkingTime: "Checking the time",
    nextChime: "NEXT CHIME",
    checking: "Checking",
    remaining: "IN",
    startMonitoring: "Start Monitoring",
    stopMonitoring: "Stop Monitoring",
    testChime: "Test Chime (about 22 sec)",
    monitorStoppedNote: "Check your iPad volume, keep this page open, and tap “Start Monitoring.”",
    monitorActiveNote: "Monitoring is active. Keep this page open in the foreground.",
    scheduleTitle: "Schedule",
    resetSchedule: "Restore Default Times",
    activeWeekdays: "Days to ring the chime",
    mondayShort: "Mon", tuesdayShort: "Tue", wednesdayShort: "Wed", thursdayShort: "Thu", fridayShort: "Fri", saturdayShort: "Sat", sundayShort: "Sun",
    enabledColumn: "Use", periodColumn: "Period", startColumn: "Start", endColumn: "End",
    addPeriod: "+ Add Period",
    chimeVolume: "Chime Volume",
    usageTitle: "Before You Use It",
    usageDescription: "On iPad, audio requires an initial tap. Monitoring requests that the screen stay awake when supported, but keep this page in the foreground and check Silent Mode and device volume beforehand.",
    labelRequired: "Enter a period name",
    timeRequired: "Enter both times",
    startBeforeEnd: "Start time must be earlier than end time",
    validationErrors: "Check {count} schedule entries. Invalid periods will not ring.",
    selectPeriod: "Select at least one period to use.",
    selectWeekday: "Select at least one day for the chime.",
    autoSaved: "Changes are saved automatically on this device.",
    maximumPeriods: "You can add up to 12 periods.",
    resetConfirm: "Restore the supplied default times for Periods 1–6?",
    periodDefault: "Period {number}",
    enablePeriodAria: "Use {label}",
    periodNameAria: "Name for {label}",
    startTimeAria: "Start time for {label}",
    endTimeAria: "End time for {label}",
    deletePeriodAria: "Delete {label}",
    delete: "Delete",
    syncing: "Syncing network time",
    synced: "Network time synced ±{seconds}s",
    usingPreviousSync: "Using the last time sync",
    usingDeviceTime: "Using device time",
    audioStartError: "Audio could not start in this browser. Reopen the page in Safari or Chrome.",
    audioStoppedError: "Audio was suspended. Tap “Start Monitoring” again.",
    audioPlaybackError: "The chime could not play. Check your browser audio settings.",
    eventStart: "{label} starts",
    eventEnd: "{label} ends",
    chimePlayed: "Chime played: {description}",
    classInSession: "{label} in session",
    monitoringSuffix: " · Monitoring",
    monitoring: "Monitoring chimes",
    monitoringStopped: "Monitoring is stopped",
    noSchedule: "No upcoming chime",
    configureSchedule: "Choose at least one valid day and period",
    today: "{time} today",
  },
};

const state = {
  schedule: normalizeSchedule(DEFAULT_SCHEDULE),
  activeDays: [...DEFAULT_ACTIVE_DAYS],
  volume: 70,
  language: "ja",
  monitoring: false,
  clockOffsetMs: 0,
  hasNetworkTime: false,
  syncAccuracyMs: null,
  syncInProgress: false,
  syncStatus: "syncing",
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
  backLink: document.getElementById("backLink"),
  languageButton: document.getElementById("languageButton"),
  manifestLink: document.getElementById("manifestLink"),
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

function text(key, values = {}) {
  const template = translations[state.language][key] ?? key;
  return Object.entries(values).reduce((result, [name, value]) => result.split(`{${name}}`).join(String(value)), template);
}

function requestedLanguage() {
  const requested = new URLSearchParams(window.location.search).get("lang");
  return requested === "ja" || requested === "en" ? requested : null;
}

function browserLanguage() {
  return navigator.language?.toLowerCase().startsWith("ja") ? "ja" : "en";
}

function localizedPeriodLabel(label) {
  const value = String(label || "").trim();
  const match = value.match(/^(?:Period\s+)?(\d+)(?:限)?$/i);
  return match ? text("periodDefault", { number: match[1] }) : value;
}

function validationMessage(period) {
  const code = getPeriodValidationCode(period);
  return code ? text(code) : "";
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.schedule = normalizeSchedule(saved.schedule);
    state.activeDays = normalizeActiveDays(saved.activeDays);
    const volume = Number(saved.volume);
    state.volume = Number.isFinite(volume) ? Math.max(10, Math.min(100, volume)) : 70;
    state.language = requestedLanguage() || (saved.language === "ja" || saved.language === "en" ? saved.language : browserLanguage());
  } catch {
    state.schedule = normalizeSchedule(DEFAULT_SCHEDULE);
    state.activeDays = [...DEFAULT_ACTIVE_DAYS];
    state.volume = 70;
    state.language = requestedLanguage() || browserLanguage();
  }
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schedule: state.schedule,
      activeDays: state.activeDays,
      volume: state.volume,
      language: state.language,
    }),
  );
}

function renderLanguage() {
  document.documentElement.lang = state.language;
  document.title = text("documentTitle");
  document.querySelector('meta[name="description"]').content = text("description");
  document.querySelector('meta[name="apple-mobile-web-app-title"]').content = text("documentTitle");
  el.manifestLink.href = state.language === "en" ? "./manifest-en.webmanifest" : "./manifest.webmanifest";
  el.backLink.href = `../index.html?lang=${state.language}`;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = text(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", text(node.dataset.i18nAria));
  });
  el.languageButton.textContent = text("languageButton");
  el.languageButton.setAttribute("aria-label", text("languageAria"));
}

function toggleLanguage() {
  state.language = state.language === "ja" ? "en" : "ja";
  const url = new URL(window.location.href);
  url.searchParams.set("lang", state.language);
  window.history.replaceState(null, "", url);
  saveSettings();
  renderLanguage();
  renderSchedule();
  renderMonitoringState();
  renderTimeline(correctedNow());
  if (state.syncInProgress) {
    renderSyncState("syncing", text("syncing"));
  } else if (state.syncStatus === "offline") {
    renderSyncState("offline", text(state.hasNetworkTime ? "usingPreviousSync" : "usingDeviceTime"));
  } else if (state.hasNetworkTime) {
    const accuracySeconds = Math.max(0.6, Math.ceil(state.syncAccuracyMs / 100) / 10).toFixed(1);
    renderSyncState("synced", text("synced", { seconds: accuracySeconds }));
  }
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
  const message = validationMessage(period);
  row.classList.toggle("has-error", Boolean(message));
  row.querySelector(".row-error").textContent = message;
  return message;
}

function refreshValidationSummary() {
  const errorCount = state.schedule.filter((period) => validatePeriod(period)).length;
  if (errorCount) {
    setScheduleMessage(text("validationErrors", { count: errorCount }), true);
  } else if (!state.schedule.some((period) => period.enabled)) {
    setScheduleMessage(text("selectPeriod"), true);
  } else if (!state.activeDays.length) {
    setScheduleMessage(text("selectWeekday"), true);
  } else {
    setScheduleMessage(text("autoSaved"));
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
    const label = localizedPeriodLabel(period.label);
    labelInput.value = label;
    startInput.value = period.start;
    endInput.value = period.end;
    enabledInput.setAttribute("aria-label", text("enablePeriodAria", { label }));
    labelInput.setAttribute("aria-label", text("periodNameAria", { label }));
    startInput.setAttribute("aria-label", text("startTimeAria", { label }));
    endInput.setAttribute("aria-label", text("endTimeAria", { label }));
    deleteButton.textContent = text("delete");
    deleteButton.setAttribute("aria-label", text("deletePeriodAria", { label }));
    row.querySelectorAll(".mobile-label").forEach((node, index) => {
      node.textContent = [text("periodColumn"), text("startColumn"), text("endColumn")][index];
    });
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
    setScheduleMessage(text("maximumPeriods"), true);
    return;
  }
  const last = state.schedule.at(-1);
  const suggestedStart = isValidTime(last?.end) ? Math.min(timeToMinutes(last.end) + 20, 22 * 60) : 8 * 60 + 40;
  const suggestedEnd = Math.min(suggestedStart + 90, 23 * 60 + 59);
  state.schedule.push({
    id: createPeriodId(),
    label: text("periodDefault", { number: state.schedule.length + 1 }),
    start: minutesToTime(suggestedStart),
    end: minutesToTime(suggestedEnd),
    enabled: true,
  });
  saveSettings();
  renderSchedule();
  el.scheduleRows.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetSchedule() {
  const shouldReset = window.confirm(text("resetConfirm"));
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
  state.syncStatus = status;
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
  renderSyncState("syncing", text("syncing"));
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
    renderSyncState("synced", text("synced", { seconds: accuracySeconds }));
    renderTimeline(correctedNow());
  } catch {
    if (state.hasNetworkTime) {
      renderSyncState("offline", text("usingPreviousSync"));
    } else {
      state.clockOffsetMs = 0;
      renderSyncState("offline", text("usingDeviceTime"));
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
  el.monitorButton.textContent = text(state.monitoring ? "stopMonitoring" : "startMonitoring");
  el.monitorButton.classList.toggle("active", state.monitoring);
  el.monitorNote.textContent = text(state.monitoring ? "monitorActiveNote" : "monitorStoppedNote");
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
    el.monitorNote.textContent = text("audioStartError");
  }
}

function eventDescription(event) {
  return text(event.kind === "start" ? "eventStart" : "eventEnd", { label: localizedPeriodLabel(event.label) });
}

function ringDueEvents(nowMs) {
  if (!state.monitoring) return;
  const { dateKey } = getTokyoParts(nowMs);
  const events = buildEventsForDate(state.schedule, dateKey, state.activeDays);
  events.forEach((event) => {
    const lateness = nowMs - event.atMs;
    if (lateness < 0 || lateness >= DUE_WINDOW_MS || state.firedEvents.has(event.key)) return;
    state.firedEvents.add(event.key);
    state.lastChimeMessage = text("chimePlayed", { description: eventDescription(event) });
    state.lastChimeUntil = nowMs + 8000;
    playSchoolChime().catch(() => {
      state.monitoring = false;
      renderMonitoringState();
      el.monitorNote.textContent = text("audioStoppedError");
    });
  });

  if (state.firedEvents.size > 40) {
    state.firedEvents = new Set([...state.firedEvents].filter((key) => key.startsWith(dateKey)));
  }
}

function formatDisplayDate(nowMs) {
  return new Intl.DateTimeFormat(state.language === "ja" ? "ja-JP" : "en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: state.language === "ja" ? "numeric" : "long",
    day: "numeric",
    weekday: state.language === "ja" ? "short" : "long",
  }).format(new Date(nowMs));
}

function formatFutureEventDate(event) {
  const date = new Intl.DateTimeFormat(state.language === "ja" ? "ja-JP" : "en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(event.atMs));
  return `${date} ${event.time}`;
}

function renderTimeline(nowMs) {
  const parts = getTokyoParts(nowMs);
  const currentPeriod = getCurrentPeriod(state.schedule, nowMs, state.activeDays);
  const nextEvent = getUpcomingEvent(state.schedule, nowMs, state.activeDays);
  el.clockDisplay.textContent = parts.clock;
  el.clockDisplay.dateTime = new Date(nowMs).toISOString();
  el.dateDisplay.textContent = formatDisplayDate(nowMs);

  if (state.lastChimeUntil > nowMs) {
    el.periodStatus.textContent = state.lastChimeMessage;
  } else if (currentPeriod) {
    const classStatus = text("classInSession", { label: localizedPeriodLabel(currentPeriod.label) });
    el.periodStatus.textContent = `${classStatus}${state.monitoring ? text("monitoringSuffix") : ""}`;
  } else {
    el.periodStatus.textContent = text(state.monitoring ? "monitoring" : "monitoringStopped");
  }

  if (!nextEvent) {
    el.nextEventLabel.textContent = text("noSchedule");
    el.nextEventTime.textContent = text("configureSchedule");
    el.countdownDisplay.textContent = "--:--:--";
    return;
  }

  el.nextEventLabel.textContent = eventDescription(nextEvent);
  el.nextEventTime.textContent = nextEvent.dateKey === parts.dateKey
    ? text("today", { time: nextEvent.time })
    : formatFutureEventDate(nextEvent);
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
  el.languageButton.addEventListener("click", toggleLanguage);
  el.monitorButton.addEventListener("click", toggleMonitoring);
  el.testButton.addEventListener("click", () => {
    playSchoolChime().catch(() => {
      el.monitorNote.textContent = text("audioPlaybackError");
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
  renderLanguage();
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
