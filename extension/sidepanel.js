// Meeting Copilot side panel: tab audio → Deepgram → transcript → backend.
const $ = (id) => document.getElementById(id);

let apiBase = "http://localhost:3000";
let apiToken = "";
chrome.storage.local.get(["apiBase", "apiToken"], (saved) => {
  if (saved.apiBase) apiBase = saved.apiBase;
  if (saved.apiToken) apiToken = saved.apiToken;
  $("apiBase").value = apiBase;
  $("apiToken").value = apiToken;
  if (!apiToken) setStatus("Set your API token in Settings (copy it from your Profile page)");
});
$("apiBase").addEventListener("change", (e) => {
  apiBase = e.target.value.replace(/\/$/, "") || "http://localhost:3000";
  chrome.storage.local.set({ apiBase });
});
$("apiToken").addEventListener("change", (e) => {
  apiToken = e.target.value.trim();
  chrome.storage.local.set({ apiToken });
  setStatus(apiToken ? "Token saved" : "Idle");
});

let meetingId = null;
let ws = null;
let recorder = null;
let stream = null;
let pendingSegments = [];
let flushTimer = null;
let detectTimer = null;
let recentForDetect = [];

const setStatus = (t) => ($("status").textContent = t);

// ---------- transcript rendering ----------
let interimEl = null;
function renderFinal(text, speaker) {
  if (interimEl) interimEl.remove(), (interimEl = null);
  const p = document.createElement("p");
  p.textContent = speaker != null ? `Speaker ${speaker}: ${text}` : text;
  $("transcript").appendChild(p);
  $("transcript").scrollTop = $("transcript").scrollHeight;
}
function renderInterim(text) {
  if (!interimEl) {
    interimEl = document.createElement("p");
    interimEl.className = "interim";
    $("transcript").appendChild(interimEl);
  }
  interimEl.textContent = text;
  $("transcript").scrollTop = $("transcript").scrollHeight;
}

// ---------- start / stop ----------
$("startBtn").addEventListener("click", start);
$("endBtn").addEventListener("click", endMeeting);

async function start() {
  try {
    setStatus("Requesting tab audio…");
    const { streamId, tabTitle, error } = await chrome.runtime.sendMessage({ type: "GET_STREAM_ID" });
    if (error) throw new Error(error);

    stream = await navigator.mediaDevices.getUserMedia({
      audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } },
      video: false,
    });
    // Tab capture mutes the tab — route audio back to the speakers.
    const ctx = new AudioContext();
    ctx.createMediaStreamSource(stream).connect(ctx.destination);

    setStatus("Creating meeting…");
    const meeting = await api("POST", "/api/meetings", { title: tabTitle || "Meeting" });
    meetingId = meeting.id;

    setStatus("Connecting to transcription…");
    const { access_token } = await api("POST", "/api/deepgram-token");
    ws = new WebSocket(
      "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true&diarize=true",
      ["bearer", access_token]
    );
    ws.onopen = () => {
      recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      recorder.ondataavailable = (e) => e.data.size > 0 && ws?.readyState === 1 && ws.send(e.data);
      recorder.start(250);
      setStatus("● Live — transcribing");
      $("startBtn").style.display = "none";
      $("endBtn").style.display = "inline-block";
      flushTimer = setInterval(flushSegments, 5000);
      detectTimer = setInterval(autoDetect, 10000);
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      const alt = msg.channel?.alternatives?.[0];
      if (!alt?.transcript) return;
      if (msg.is_final) {
        const speaker = alt.words?.[0]?.speaker ?? null;
        renderFinal(alt.transcript, speaker);
        pendingSegments.push({
          speaker: speaker != null ? `Speaker ${speaker}` : undefined,
          text: alt.transcript,
          tsMs: Math.round((msg.start ?? 0) * 1000),
        });
        recentForDetect.push(alt.transcript);
      } else {
        renderInterim(alt.transcript);
      }
    };
    ws.onerror = () => setStatus("Transcription error — check Deepgram key");
    ws.onclose = () => setStatus(meetingId ? "Transcription disconnected" : "Idle");
  } catch (err) {
    setStatus(`Error: ${err.message}`);
    cleanup();
  }
}

async function flushSegments() {
  if (!meetingId || pendingSegments.length === 0) return;
  const batch = pendingSegments.splice(0);
  try {
    await api("POST", `/api/meetings/${meetingId}/segments`, { segments: batch });
  } catch {
    pendingSegments.unshift(...batch); // retry next flush
  }
}

async function endMeeting() {
  $("endBtn").disabled = true;
  setStatus("Summarizing…");
  cleanup(false);
  await flushSegments();
  try {
    const { summary } = await api("POST", `/api/meetings/${meetingId}/end`);
    showAnswer({ answer: summary ?? "Meeting ended (no transcript).", confident: true, sources: [] });
    setStatus(`Done — see ${apiBase}/meetings/${meetingId}`);
  } catch (err) {
    setStatus(`Summary failed: ${err.message}`);
  }
  meetingId = null;
  $("endBtn").disabled = false;
  $("endBtn").style.display = "none";
  $("startBtn").style.display = "inline-block";
}

function cleanup(resetButtons = true) {
  recorder?.state !== "inactive" && recorder?.stop();
  ws?.close();
  stream?.getTracks().forEach((t) => t.stop());
  clearInterval(flushTimer);
  clearInterval(detectTimer);
  recorder = ws = stream = null;
  if (resetButtons) {
    $("startBtn").style.display = "inline-block";
    $("endBtn").style.display = "none";
  }
}

// ---------- manual ask ----------
$("askForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = $("askInput").value.trim();
  if (!query) return;
  showAnswer({ answer: "Thinking…", confident: true, sources: [] });
  try {
    showAnswer(await api("POST", "/api/ask", { query }));
  } catch (err) {
    showAnswer({ answer: `Error: ${err.message}`, confident: false, sources: [] });
  }
});

function showAnswer({ answer, confident, sources }) {
  const el = $("answer");
  el.style.display = "block";
  el.className = confident ? "" : "low";
  el.textContent = answer;
  for (const s of sources ?? []) {
    const d = document.createElement("div");
    d.className = "src";
    d.textContent = `📄 ${s.source}`;
    el.appendChild(d);
  }
}

// ---------- define a term ----------
$("defineForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const term = $("defineInput").value.trim();
  if (!term) return;
  showAnswer({ answer: "Defining…", confident: true, sources: [] });
  try {
    const d = await api("POST", "/api/define", { term });
    showAnswer({
      answer: `${d.term} — ${d.definition}`,
      confident: d.fromKnowledgeBase,
      sources: d.fromKnowledgeBase ? [{ source: "your knowledge base" }] : [],
    });
  } catch (err) {
    if (err.message !== "unauthorized") showAnswer({ answer: `Error: ${err.message}`, confident: false, sources: [] });
  }
});

// ---------- auto-surfacing (Phase 3.5) ----------
async function autoDetect() {
  if (recentForDetect.length === 0) return;
  const recentTranscript = recentForDetect.splice(0).join(" ");
  try {
    const res = await api("POST", "/api/detect", { recentTranscript });
    if (res.suggestion) showSuggestion(res);
  } catch {
    /* detection is best-effort */
  }
}

function showSuggestion({ query, suggestion }) {
  const card = document.createElement("div");
  card.className = "suggestion";
  const x = document.createElement("span");
  x.className = "dismiss";
  x.textContent = "✕";
  x.onclick = () => card.remove();
  card.append(x, Object.assign(document.createElement("b"), { textContent: query }), document.createElement("br"), suggestion.answer);
  for (const s of suggestion.sources ?? []) {
    const d = document.createElement("div");
    d.className = "src";
    d.textContent = `📄 ${s.source}`;
    card.appendChild(d);
  }
  $("suggestions").prepend(card);
  while ($("suggestions").children.length > 3) $("suggestions").lastChild.remove();
}

// ---------- helpers ----------
async function api(method, path, body) {
  const res = await fetch(apiBase + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    setStatus("Unauthorized — set a valid API token in Settings (Profile page → copy token)");
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json();
}
