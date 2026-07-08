const $ = (id) => document.getElementById(id);

const refs = {
  authView: $("AuthView"), appView: $("AppView"), btnRetryAccess: $("BtnRetryAccess"), accessError: $("AccessError"),
  currentUser: $("CurrentUser"), stationName: $("StationName"), btnLogout: $("BtnLogout"), btnAdmin: $("BtnAdmin"),
  passwordModal: $("PasswordModal"), passwordForm: $("PasswordForm"), newPassword: $("NewPassword"), confirmPassword: $("ConfirmPassword"), passwordError: $("PasswordError"),
  adminModal: $("AdminModal"), btnCloseAdmin: $("BtnCloseAdmin"), createUserForm: $("CreateUserForm"), newUserEmail: $("NewUserEmail"), newUserPassword: $("NewUserPassword"), usersList: $("UsersList"), adminError: $("AdminError"),
  btnPreload: $("BtnPreload"), readyControls: $("ReadyControls"), btnPlay: $("BtnPlay"), btnStop: $("BtnStop"), btnCough: $("BtnCough"), btnMonitor: $("BtnMonitor"),
  micSelect: $("MicSelect"), btnReloadMics: $("BtnReloadMics"), outputSelect: $("MonitorOutputSelect"), btnReloadOutputs: $("BtnReloadOutputs"),
  gain: $("Gain"), gainLabel: $("GainLabel"), status: $("Status"), airDot: $("AirDot"), airText: $("AirText"), timer: $("TimerPill"), canvas: $("VisualizerCanvas"),
  alert: $("Alert"), alertText: $("AlertText"), btnCloseAlert: $("BtnCloseAlert"), soundboard: $("SoundboardGrid"),
};

const SOUNDS = [{ id: "aplausos", label: "Aplausos", src: "/sounds/aplausos.mp3" }];
const FILLER = { id: "filler", label: "Filler", src: "/sounds/filler.mp3" };
const AUDIO = Object.freeze({ format: "s16le", sampleRate: 48000, channels: 1 });
const state = {
  user: null, runtime: null, prepared: false, running: false, stopping: false, socket: null, streamReady: false,
  audioContext: null, micStream: null, micSource: null, gainNode: null, fillerNode: null, cough: false, monitor: false,
  timerId: null, startedAt: 0, wakeLock: null, startTimerId: null,
};

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin", cache: "no-store", ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  let payload = {};
  try { payload = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(payload.error || `Error HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function showAlert(message) { refs.alertText.textContent = message; refs.alert.hidden = false; }
function hideAlert() { refs.alert.hidden = true; }
function setStatus(message) { refs.status.textContent = message; }
function setAir(mode) {
  refs.airDot.classList.remove("connecting", "onair");
  if (mode === "connecting") refs.airDot.classList.add("connecting");
  if (mode === "onair") refs.airDot.classList.add("onair");
  refs.airText.textContent = mode === "onair" ? "AL AIRE" : mode === "connecting" ? "CONECTANDO" : "EN ESPERA";
}
function syncButtons() {
  refs.btnPlay.disabled = !state.prepared || state.running || Boolean(state.user?.mustChangePassword);
  refs.btnStop.disabled = !state.running;
  refs.btnCough.disabled = !state.running;
  refs.btnPreload.disabled = state.prepared;
}
function startClock() {
  stopClock(false); state.startedAt = Date.now();
  const tick = () => { const total = Math.floor((Date.now() - state.startedAt) / 1000); refs.timer.textContent = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; };
  tick(); state.timerId = setInterval(tick, 250);
}
function stopClock(reset = true) { if (state.timerId) clearInterval(state.timerId); state.timerId = null; if (reset) refs.timer.textContent = "00:00"; }
function renderWaveform() {
  if (!state.running || !refs.canvas) return;
  const context = refs.canvas.getContext("2d"); const width = refs.canvas.width; const height = refs.canvas.height; const waveform = window.RayoEngine?.getWaveform?.();
  context.clearRect(0, 0, width, height); context.strokeStyle = "rgba(220,220,215,.88)"; context.lineWidth = 2; context.beginPath();
  if (waveform?.length) { for (let i = 0; i < waveform.length; i += 1) { const x = (i / (waveform.length - 1)) * width; const y = height / 2 + waveform[i] * height * .34; if (i === 0) context.moveTo(x, y); else context.lineTo(x, y); } }
  else { context.moveTo(0, height / 2); context.lineTo(width, height / 2); }
  context.stroke(); requestAnimationFrame(renderWaveform);
}
function clearWaveform() { const context = refs.canvas?.getContext("2d"); if (context) context.clearRect(0, 0, refs.canvas.width, refs.canvas.height); }
async function requestWakeLock() { try { state.wakeLock = await navigator.wakeLock?.request("screen"); } catch {} }
async function releaseWakeLock() { try { await state.wakeLock?.release(); } catch {} state.wakeLock = null; }

async function showAuthenticated(user) {
  state.user = user; refs.authView.hidden = true; refs.appView.hidden = false;
  refs.currentUser.textContent = `${user.email} · ${user.role === "admin" ? "Administrador" : "Operador"}`;
  refs.btnAdmin.hidden = user.role !== "admin";
  refs.passwordModal.hidden = !user.mustChangePassword;
  syncButtons();
  if (!user.mustChangePassword) await loadRuntime();
}
function showLocked(message = "Abra esta consola desde RayoCaster Desktop después de iniciar sesión.") {
  state.user = null; state.runtime = null; refs.authView.hidden = false; refs.appView.hidden = true; refs.passwordModal.hidden = true; refs.adminModal.hidden = true; refs.accessError.textContent = message;
}
async function restoreSession() {
  refs.accessError.textContent = "";
  try { const payload = await api("/api/auth-me"); await showAuthenticated(payload.user); }
  catch (error) { showLocked(error.message); }
}
async function loadRuntime() {
  const payload = await api("/api/runtime-config"); state.runtime = payload; refs.stationName.textContent = payload.stationName; setStatus("Sesión autorizada. Prepare la consola para habilitar audio.");
}
refs.btnRetryAccess.addEventListener("click", restoreSession);
refs.btnLogout.addEventListener("click", async () => {
  if (state.running) await stopBroadcast();
  try { await api("/api/auth-logout", { method: "POST", body: "{}" }); } catch {}
  showLocked("Sesión web cerrada. Use RayoCaster Desktop para abrir una nueva sesión.");
});

function validNewPassword(value) { const text = String(value || ""); return text.length >= 8 && text.length <= 72 && /[A-Za-z]/.test(text) && /\d/.test(text); }
refs.passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault(); refs.passwordError.textContent = "";
  if (!validNewPassword(refs.newPassword.value)) { refs.passwordError.textContent = "Use entre 8 y 72 caracteres e incluya letras y números."; return; }
  if (refs.newPassword.value !== refs.confirmPassword.value) { refs.passwordError.textContent = "La confirmación no coincide."; return; }
  try {
    const payload = await api("/api/auth-change-password", { method: "POST", body: JSON.stringify({ newPassword: refs.newPassword.value }) });
    refs.passwordForm.reset(); refs.passwordModal.hidden = true; await showAuthenticated(payload.user);
  } catch (error) { refs.passwordError.textContent = error.message; }
});

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
async function loadUsers() {
  refs.adminError.textContent = ""; const payload = await api("/api/users");
  refs.usersList.innerHTML = payload.users.map((user) => `
    <div class="user-row">
      <div><strong>${escapeHtml(user.email)}</strong><br><small>${user.role === "admin" ? "Administrador protegido" : user.mustChangePassword ? "Operador · cambio pendiente" : "Operador activo"}</small></div>
      <small>${user.disabled ? "Deshabilitado" : new Date(user.createdAt).toLocaleDateString("es-CO")}</small>
      ${user.protectedAccount ? "<span></span>" : `<button class="button danger compact" type="button" data-delete-user="${user.uid}">Eliminar</button>`}
    </div>`).join("");
}
refs.btnAdmin.addEventListener("click", async () => { refs.adminModal.hidden = false; try { await loadUsers(); } catch (error) { refs.adminError.textContent = error.message; } });
refs.btnCloseAdmin.addEventListener("click", () => { refs.adminModal.hidden = true; });
refs.adminModal.addEventListener("click", (event) => { if (event.target === refs.adminModal) refs.adminModal.hidden = true; });
refs.createUserForm.addEventListener("submit", async (event) => {
  event.preventDefault(); refs.adminError.textContent = "";
  if (!validNewPassword(refs.newUserPassword.value)) { refs.adminError.textContent = "La contraseña temporal debe tener letras, números y al menos 8 caracteres."; return; }
  try {
    await api("/api/users", { method: "POST", body: JSON.stringify({ email: refs.newUserEmail.value.trim(), password: refs.newUserPassword.value }) });
    refs.createUserForm.reset(); await loadUsers();
  } catch (error) { refs.adminError.textContent = error.message; }
});
refs.usersList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-user]"); if (!button) return; refs.adminError.textContent = "";
  try { await api("/api/users", { method: "DELETE", body: JSON.stringify({ uid: button.dataset.deleteUser }) }); await loadUsers(); }
  catch (error) { refs.adminError.textContent = error.message; }
});

async function populateInputs() {
  refs.micSelect.innerHTML = '<option value="">Micrófono predeterminado</option>';
  refs.outputSelect.innerHTML = '<option value="">Salida predeterminada</option>';
  const devices = await navigator.mediaDevices.enumerateDevices();
  devices.filter((device) => device.kind === "audioinput").forEach((device, index) => {
    const option = document.createElement("option"); option.value = device.deviceId; option.textContent = device.label || `Micrófono ${index + 1}`; refs.micSelect.append(option);
  });
  devices.filter((device) => device.kind === "audiooutput").forEach((device, index) => {
    const option = document.createElement("option"); option.value = device.deviceId; option.textContent = device.label || `Salida ${index + 1}`; refs.outputSelect.append(option);
  });
}

async function prepareConsole() {
  hideAlert();
  try {
    setStatus("Inicializando motor de audio...");
    if (!state.runtime) await loadRuntime();
    if (!window.RayoEngine || !(await window.RayoEngine.init())) throw new Error("El navegador no pudo inicializar el motor de audio.");
    state.audioContext = window.RayoEngine.ctx;
    await window.RayoBoard?.init?.([...SOUNDS, FILLER], state.audioContext);
    refs.soundboard.innerHTML = SOUNDS.map((sound) => `<button class="SbBtn" type="button" data-sound="${sound.id}">${sound.label}</button>`).join("");
    await populateInputs();
    window.RayoDeck?.init?.();
    state.prepared = true;
    refs.readyControls.hidden = false;
    setStatus("Consola preparada. Verifique el micrófono antes de iniciar.");
    syncButtons();
  } catch (error) {
    showAlert(error.message || "No fue posible preparar la consola.");
    setStatus("Preparación incompleta.");
  }
}

refs.btnPreload.addEventListener("click", prepareConsole);
refs.btnReloadMics.addEventListener("click", populateInputs);
refs.btnReloadOutputs.addEventListener("click", populateInputs);
refs.btnCloseAlert.addEventListener("click", hideAlert);
refs.soundboard.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("[data-sound]");
  if (button) window.RayoBoard?.play?.(button.dataset.sound);
});

refs.gain.addEventListener("input", () => {
  refs.gainLabel.textContent = `${refs.gain.value}%`;
  if (state.gainNode && !state.cough) state.gainNode.gain.value = Number(refs.gain.value) / 100;
});

refs.outputSelect.addEventListener("change", async () => {
  const ok = await window.RayoEngine?.setMonitorOutput?.(refs.outputSelect.value || "");
  if (ok === false) showAlert("El navegador no permitió usar esa salida de audio.");
});

refs.btnMonitor.addEventListener("click", async () => {
  const next = !state.monitor;
  if (next) await window.RayoEngine?.setMonitorOutput?.(refs.outputSelect.value || "");
  const ok = await window.RayoEngine?.setMonitor?.(next);
  if (!ok) return showAlert("No fue posible cambiar el monitor local.");
  state.monitor = next;
  refs.btnMonitor.textContent = next ? "Monitor activo" : "Monitor";
});

function setCough(enabled) {
  if (!state.running || !state.gainNode || !state.audioContext || state.cough === enabled) return;
  state.cough = enabled;
  state.gainNode.gain.setTargetAtTime(enabled ? 0 : Number(refs.gain.value) / 100, state.audioContext.currentTime, .03);
  if (enabled) {
    const buffer = window.RayoBoard?.buffers?.filler;
    if (buffer) {
      state.fillerNode = state.audioContext.createBufferSource();
      state.fillerNode.buffer = buffer;
      state.fillerNode.loop = true;
      state.fillerNode.connect(window.RayoEngine.compressor);
      state.fillerNode.start();
    }
  } else if (state.fillerNode) {
    try { state.fillerNode.stop(); state.fillerNode.disconnect(); } catch {}
    state.fillerNode = null;
  }
}
refs.btnCough.addEventListener("pointerdown", (event) => { event.preventDefault(); setCough(true); });
["pointerup", "pointercancel", "pointerleave"].forEach((name) => refs.btnCough.addEventListener(name, () => setCough(false)));

function floatToInt16(samples) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return pcm.buffer;
}

function sendPcm(payload) {
  if (!payload?.samples || !state.running || state.socket?.readyState !== WebSocket.OPEN) return;
  if (state.socket.bufferedAmount > 128 * 1024) return;
  state.socket.send(floatToInt16(payload.samples));
}

async function startBroadcast() {
  if (state.running || state.stopping || state.user?.mustChangePassword) return;
  hideAlert();
  try {
    const auth = await api("/api/stream-token", { method: "POST", body: "{}" });
    if (!state.runtime) await loadRuntime();
    state.audioContext = window.RayoEngine.ctx;
    await state.audioContext.resume();
    state.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: refs.micSelect.value ? { exact: refs.micSelect.value } : undefined,
        channelCount: { ideal: 1 }, sampleRate: { ideal: 48000 }, sampleSize: { ideal: 16 },
        echoCancellation: false, noiseSuppression: false, autoGainControl: false, latency: 0,
      },
    });
    state.micSource = state.audioContext.createMediaStreamSource(state.micStream);
    state.gainNode = state.audioContext.createGain();
    state.gainNode.gain.value = Number(refs.gain.value) / 100;
    state.micSource.connect(window.RayoEngine.micAnalyser);
    state.micSource.connect(state.gainNode);
    state.gainNode.connect(window.RayoEngine.compressor);
    if (!window.RayoEngine.bindExporter(sendPcm)) throw new Error("No fue posible activar la salida PCM.");

    const separator = state.runtime.gatewayUrl.includes("?") ? "&" : "?";
    state.socket = new WebSocket(`${state.runtime.gatewayUrl}${separator}token=${encodeURIComponent(auth.token)}`);
    state.socket.binaryType = "arraybuffer";
    state.running = true;
    state.streamReady = false;
    setAir("connecting");
    setStatus("Abriendo enlace seguro con el gateway...");
    syncButtons();
    await requestWakeLock();

    state.startTimerId = setTimeout(() => {
      if (!state.streamReady) {
        showAlert("El gateway no confirmó la conexión con Icecast dentro del tiempo esperado.");
        void stopBroadcast();
      }
    }, 15000);

    state.socket.onopen = () => state.socket.send(JSON.stringify({ type: "START", audio: AUDIO }));
    state.socket.onmessage = (event) => {
      if (typeof event.data !== "string") return;
      let message; try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === "CONNECTING") {
        setAir("connecting");
        setStatus(`Gateway conectado. Validando publicación en Icecast${message.recordingFile ? ` y grabación ${message.recordingFile}` : ""}...`);
      } else if (message.type === "OK_START") {
        state.streamReady = true;
        clearTimeout(state.startTimerId);
        setAir("onair");
        setStatus(`Emisión activa como ${message.operator}. Códec Opus/Ogg.`);
        startClock();
        renderWaveform();
      } else if (message.type === "WARN") {
        showAlert(message.message || "Advertencia de red.");
      } else if (message.type === "ERR") {
        showAlert(message.message || "El gateway detuvo la emisión.");
        void stopBroadcast();
      }
    };
    state.socket.onerror = () => { showAlert("No fue posible conectar con el gateway de transmisión."); void stopBroadcast(); };
    state.socket.onclose = () => { if (state.running && !state.stopping) { showAlert("La conexión de transmisión se cerró."); void stopBroadcast(); } };
  } catch (error) {
    showAlert(error.message || "No fue posible iniciar la emisión.");
    await stopBroadcast();
  }
}

async function stopBroadcast() {
  if (state.stopping) return;
  state.stopping = true;
  clearTimeout(state.startTimerId);
  state.startTimerId = null;
  try {
    setStatus("Deteniendo emisión...");
    setCough(false);
    if (state.socket?.readyState === WebSocket.OPEN) {
      try { state.socket.send(JSON.stringify({ type: "STOP" })); } catch {}
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    try { state.socket?.close(); } catch {}
    state.socket = null;
    window.RayoEngine?.unbindExporter?.();
    try { state.micSource?.disconnect(); } catch {}
    try { state.gainNode?.disconnect(); } catch {}
    state.micStream?.getTracks?.().forEach((track) => track.stop());
    state.micSource = null;
    state.gainNode = null;
    state.micStream = null;
    state.running = false;
    state.streamReady = false;
    setAir("idle");
    stopClock();
    clearWaveform();
    await releaseWakeLock();
    setStatus("Emisión detenida. La consola permanece preparada.");
  } finally {
    state.stopping = false;
    state.running = false;
    syncButtons();
  }
}

refs.btnPlay.addEventListener("click", startBroadcast);
refs.btnStop.addEventListener("click", stopBroadcast);
window.addEventListener("beforeunload", () => { try { state.socket?.close(); } catch {} });
document.addEventListener("visibilitychange", () => { if (document.hidden) setCough(false); });

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
restoreSession();
setInterval(async () => {
  if (!state.user) return;
  try { await api("/api/auth-me"); }
  catch (error) {
    if (state.running) await stopBroadcast();
    showLocked(error.message || "El ejecutable dejó de mantener la sesión activa.");
  }
}, 25000);
