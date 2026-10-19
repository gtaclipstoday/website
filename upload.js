/* Upload-Formular (Startseite + upload.html): Videos in 20-MB-Stuecken an den Cloudflare Worker, ohne Konto. */
(function () {
  const API = "https://gtaclipstoday-upload.gtaclipstoday.workers.dev";
  const CATS = [["other", "What kind of clip? (optional)"], ["fail", "Fail"], ["funny", "Funny"], ["crash", "Crash"],
    ["stunt", "Stunt"], ["action", "Action / Chase"], ["glitch", "Glitch"], ["physics", "Physics chaos"],
    ["rage", "Rage / Reaction"], ["feature", "New feature"], ["discovery", "Easter egg / Discovery"],
    ["police", "Police"], ["million", "1 in a million"]];
  const MAX = 5, MAX_BYTES = 4 * 1024 ** 3, EXT = ["mp4", "mov", "mkv", "webm", "avi", "m4v"];
  const $ = id => document.getElementById(id);
  if (!$("upform")) return;
  let files = [];

  $("cat").innerHTML = CATS.map(([k, v]) => `<option value="${k}">${v}</option>`).join("");

  const fmt = b => b > 1e9 ? (b / 1e9).toFixed(2) + " GB" : (b / 1e6).toFixed(1) + " MB";
  const show = (msg, ok) => { const m = $("upmsg"); m.textContent = msg; m.className = "upmsg " + (ok ? "ok" : "err"); };
  function paint() {
    $("upfiles").innerHTML = files.map((f, i) => `<li><span class="n">${f.name.replace(/</g, "&lt;")}</span><span class="s">${fmt(f.size)}</span>
      <span class="prog"><i id="up${i}"></i></span><button type="button" data-rm="${i}" aria-label="Remove">×</button></li>`).join("");
    $("drop").classList.toggle("has", files.length > 0);
  }
  function add(list) {
    for (const f of list) {
      const ext = f.name.split(".").pop().toLowerCase();
      if (!EXT.includes(ext)) { show(`"${f.name}" is not a video file.`); continue; }
      if (f.size > MAX_BYTES) { show(`"${f.name}" is bigger than 4 GB.`); continue; }
      if (files.length >= MAX) { show("Max. 5 videos per submission."); break; }
      files.push(f);
    }
    paint();
  }
  $("drop").onclick = () => $("upfile").click();
  $("upfile").onchange = e => { add(e.target.files); e.target.value = ""; };
  ["dragover", "dragenter"].forEach(ev => $("drop").addEventListener(ev, e => { e.preventDefault(); $("drop").classList.add("over"); }));
  ["dragleave", "drop"].forEach(ev => $("drop").addEventListener(ev, e => { e.preventDefault(); $("drop").classList.remove("over"); }));
  $("drop").addEventListener("drop", e => add(e.dataTransfer.files));
  $("upfiles").onclick = e => { const i = e.target.dataset.rm; if (i !== undefined) { files.splice(+i, 1); paint(); } };

  async function call(path, opts) {
    const r = await fetch(API + path, opts);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Upload failed - please try again.");
    return d;
  }
  async function putPart(id, ticket, fi, n, blob) {
    for (let attempt = 1; ; attempt++) {
      try { return await call(`/part?id=${id}&ticket=${ticket}&f=${fi}&n=${n}`, { method: "PUT", body: blob }); }
      catch (e) { if (attempt >= 4) throw e; await new Promise(r => setTimeout(r, 1500 * attempt)); }
    }
  }

  $("upform").onsubmit = async e => {
    e.preventDefault();
    const link = $("uplink").value.trim(), gamertag = $("gamertag").value.trim();
    if (!files.length && !link) return show("Please add a video or paste a link.");
    if (!gamertag) return show("Please enter your gamertag - it's shown as credit in the video.");
    if (!$("consent").checked) return show("Please confirm the checkbox.");
    const token = (window.turnstile && turnstile.getResponse()) || "";
    $("upsend").disabled = true;
    show("Uploading … please keep this page open.", true);
    try {
      const st = await call("/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        gamertag, links: link ? [link] : [], category: $("cat").value, social: $("social").value, email: $("email").value,
        description: $("desc").value, consent: true, turnstile: token,
        files: files.map(f => ({ name: f.name, size: f.size, type: f.type })) }) });
      const parts = [];
      for (let fi = 0; fi < files.length; fi++) {
        const f = files[fi], list = [], total = st.files[fi].parts;
        for (let n = 1; n <= total; n++) {
          const r = await putPart(st.id, st.ticket, fi, n, f.slice((n - 1) * st.partSize, Math.min(f.size, n * st.partSize)));
          list.push({ n, etag: r.etag });
          $("up" + fi).style.width = (n / total * 100) + "%";
        }
        parts.push(list);
      }
      if (files.length) await call("/complete", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: st.id, ticket: st.ticket, parts }) });
      $("upform").reset(); files = []; paint();
      show("Thank you! Your clip has been sent. Follow us so you don't miss the video it shows up in.", true);
    } catch (err) {
      show(err.message);
    } finally {
      $("upsend").disabled = false;
      if (window.turnstile) turnstile.reset();
    }
  };
})();
