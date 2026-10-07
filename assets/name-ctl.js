// The leaderboard name controls: "Show my best as …", pick another random
// name, or type one, and the recovery code that carries them to another
// browser ("Save your leaderboard identity", "Use a saved code";
// assets/identity.js). One instance sits in the cabinet's 🏆 panel (ids
// prefixed "lb") and one in the gallery's Records view ("rec"); both
// read and write the same name in this browser. docs/scores.md.
window.ArcadeNameCtl = (function () {
  const { el } = window.ArcadeUI;
  const Scores = window.ArcadeScores;
  const Names = window.ArcadeNames;
  const telemetry = window.ArcadeTelemetry;
  const Identity = window.ArcadeIdentity;

  // The public name in a telemetry row: the random handle, and the typed
  // name if any. The builder checks the typed one again and shows the
  // random one when it's taken or not allowed (docs/scores.md).
  function nameFields() {
    const name = Scores.typedName();
    return name ? { handle: Scores.handle(), name } : { handle: Scores.handle() };
  }

  // A name change or opt-out reaches the leaderboard at the next hourly
  // build, without another round (scripts/build-leaderboards.mjs reads it).
  function sendHandle() {
    telemetry.event("handle", Scores.listed() ? Object.assign(nameFields(), { lb: 1 }) : { lb: 0 });
  }

  // opts: { toast(text, opts), onChange() } — onChange redraws whatever
  // shows the name (the panel or the Records view) after a change here.
  function create(p, opts) {
    const listed = el("input", { type: "checkbox", id: `${p}Listed` });
    const handle = el("b", { id: `${p}Handle` });
    const rename = el("button", { type: "button", className: "linkish", id: `${p}Rename`, textContent: "Pick another name" });
    const type = el("button", { type: "button", className: "linkish", id: `${p}Type`, textContent: "Type a name" });
    type.setAttribute("aria-expanded", "false");
    type.setAttribute("aria-controls", `${p}NameForm`);
    const note = el("p", { id: `${p}NameNote`, className: "lb-name-note", hidden: true });
    const input = el("input", { id: `${p}NameInput`, type: "text", maxLength: 32, autocomplete: "nickname", autocapitalize: "words", spellcheck: false });
    const save = el("button", { type: "submit", className: "primary", id: `${p}NameSave`, textContent: "Save" });
    const cancel = el("button", { type: "button", className: "secondary", id: `${p}NameCancel`, textContent: "Cancel" });
    const msg = el("p", { id: `${p}NameMsg`, className: "lb-name-msg muted" });
    msg.setAttribute("aria-live", "polite");
    const form = el("form", { id: `${p}NameForm`, className: "lb-name", hidden: true, noValidate: true }, [
      el("label", { htmlFor: input.id }, ["Your name ", el("span", { className: "muted", textContent: "(3–16 letters, digits or spaces)" })]),
      el("div", { className: "lb-name-row" }, [input, save, cancel]),
      msg,
    ]);

    // ---------- recovery code: save ----------
    const idSave = el("button", { type: "button", className: "linkish", id: `${p}IdSave`, textContent: "Save your leaderboard identity" });
    idSave.setAttribute("aria-expanded", "false");
    idSave.setAttribute("aria-controls", `${p}IdBox`);
    const code = el("textarea", { id: `${p}IdCode`, className: "lb-id-code", readOnly: true, rows: 2, spellcheck: false });
    code.setAttribute("aria-describedby", `${p}IdWarn`);
    const copy = el("button", { type: "button", className: "secondary", id: `${p}IdCopy`, textContent: "Copy code" });
    const idMsg = el("p", { id: `${p}IdMsg`, className: "lb-name-msg muted", role: "status" });
    const box = el("div", { id: `${p}IdBox`, className: "lb-id", hidden: true }, [
      el("label", { htmlFor: code.id, textContent: "Your leaderboard code" }),
      code,
      el("p", { id: `${p}IdWarn`, className: "lb-id-warn", textContent: "Anyone with this code can play as you. Keep it like a password." }),
      el("div", { className: "lb-name-row" }, [copy]),
      idMsg,
      el("p", { className: "muted", textContent: "On another browser or device, open Records and choose “Use a saved code”: your name, tag and published scores come back." }),
    ]);

    // ---------- recovery code: use ----------
    const idUse = el("button", { type: "button", className: "linkish", id: `${p}IdUse`, textContent: "Use a saved code" });
    idUse.setAttribute("aria-expanded", "false");
    idUse.setAttribute("aria-controls", `${p}IdForm`);
    const paste = el("input", { id: `${p}IdInput`, type: "text", maxLength: 120, autocomplete: "off", autocapitalize: "none", spellcheck: false });
    paste.setAttribute("aria-describedby", `${p}IdUseMsg`);
    const idCheck = el("button", { type: "submit", className: "primary", id: `${p}IdCheck`, textContent: "Check" });
    const idCancel = el("button", { type: "button", className: "secondary", id: `${p}IdCancel`, textContent: "Cancel" });
    const useMsg = el("p", { id: `${p}IdUseMsg`, className: "lb-name-msg muted", role: "status" });
    const confirmText = el("span", { id: `${p}IdConfirmText` });
    const idYes = el("button", { type: "button", className: "primary", id: `${p}IdYes`, textContent: "Use this code" });
    const idNo = el("button", { type: "button", className: "secondary", id: `${p}IdNo`, textContent: "Cancel" });
    const confirmBox = el("div", { id: `${p}IdConfirm`, className: "confirm", hidden: true }, [confirmText, idYes, idNo]);
    const useForm = el("form", { id: `${p}IdForm`, className: "lb-name", hidden: true, noValidate: true }, [
      el("label", { htmlFor: paste.id }, ["Saved code ", el("span", { className: "muted", textContent: "(6 words, or a longer code from before)" })]),
      el("div", { className: "lb-name-row" }, [paste, idCheck, idCancel]),
      useMsg,
      confirmBox,
    ]);

    const node = el("div", { className: "lb-name-ctl" }, [
      el("div", { className: "lb-me" }, [
        el("label", { className: "check" }, [listed, el("span", {}, ["Show my best on the leaderboard as ", handle])]),
        rename,
        type,
      ]),
      note,
      form,
      el("div", { className: "lb-me lb-id-row" }, [idSave, idUse]),
      box,
      useForm,
    ]);
    // Which copy of the controls was used, for the identity event.
    const from = p === "lb" ? "cabinet" : "records";

    // Before the leaderboard file arrives: the name as this browser knows it.
    function render(data) {
      listed.checked = Scores.listed();
      handle.textContent = Scores.publicName(data || null);
      // The published file says who holds each typed name: if another
      // player claimed ours first, say so (the board shows our random name).
      const name = Scores.typedName();
      const owner = data && name && Scores.nameOwner(data, Names.key(name));
      note.hidden = !(owner && owner !== Scores.me());
      if (!note.hidden) note.textContent = `“${name}” is taken, so the leaderboard shows you as ${Scores.handle()}. Type another name.`;
    }

    // ---------- typed name ----------
    // Checked here for instant feedback, with the same rules and word lists
    // the builder uses; the builder has the last word.
    let check = null;

    function closeForm() {
      form.hidden = true;
      type.setAttribute("aria-expanded", "false");
    }

    function closeSave() {
      box.hidden = true;
      idSave.setAttribute("aria-expanded", "false");
    }

    let pending = null; // the checked code waiting for "Use this code"
    function closeUse() {
      useForm.hidden = true;
      confirmBox.hidden = true;
      pending = null;
      idUse.setAttribute("aria-expanded", "false");
    }

    function closeAll() {
      closeForm();
      closeSave();
      closeUse();
    }

    // Shows this browser's code. `focus` selects it (from the callout).
    function openSave(focus) {
      closeForm();
      closeUse();
      code.value = Identity.current();
      idMsg.textContent = "";
      box.hidden = false;
      idSave.setAttribute("aria-expanded", "true");
      // From the callout after the panel was closed: say where the code is.
      if (!box.offsetParent) {
        if (focus) opts.toast("Your code is in Records, under “Save your leaderboard identity”.", { ms: 6000 });
        return;
      }
      if (!Identity.shown()) telemetry.event("identity", { step: "show", from });
      Identity.markShown();
      if (focus) {
        code.focus();
        code.select();
      }
    }

    async function checkTyped() {
      const text = input.value;
      const [lists, data] = await Promise.all([Scores.nameLists(), Scores.leaderboards()]);
      if (input.value !== text) return check; // typed on meanwhile
      check = Names.check(text, {
        lists, isRandom: Scores.isHandle, owner: (k) => Scores.nameOwner(data, k), me: Scores.me(),
      });
      const quiet = check.reason === "empty" || (check.reason === "length" && Array.from(check.name).length < Names.MIN);
      msg.classList.toggle("bad", !check.ok && !quiet);
      msg.textContent = check.ok ? `Shows as ${Names.display(check.name, Scores.me())}` : quiet ? `${Names.MIN} to ${Names.MAX} characters.` : check.message;
      save.disabled = !check.ok;
      return check;
    }

    type.addEventListener("click", () => {
      if (!form.hidden) return closeForm();
      closeSave();
      closeUse();
      form.hidden = false;
      type.setAttribute("aria-expanded", "true");
      input.value = Scores.typedName();
      save.disabled = true;
      checkTyped();
      input.focus();
    });
    input.addEventListener("input", checkTyped);
    cancel.addEventListener("click", () => {
      closeForm();
      type.focus();
    });
    form.addEventListener("submit", async (evt) => {
      evt.preventDefault();
      const got = await checkTyped();
      if (!got || !got.ok) return;
      Scores.setTypedName(got.name);
      if (!Scores.listed()) Scores.setListed(true);
      sendHandle();
      closeForm();
      opts.onChange();
      const shown = Names.display(got.name, Scores.me());
      opts.toast(telemetry.active() ? `Saved. The leaderboard shows ${shown} within the hour.` : `Saved as ${shown}. Play stats are off, so it stays in this browser.`, { ms: 4000 });
      // The moment a name is worth keeping: offer the code (until seen once).
      idSave.focus();
      if (!Identity.shown()) {
        telemetry.event("identity", { step: "callout", from });
        opts.toast(`Keep ${shown} on other devices: save your code.`, {
          actions: [{ label: "Save my code", primary: true, onClick: () => openSave(true) }, { label: "Not now" }],
        });
      }
    });

    // ---------- recovery code ----------
    idSave.addEventListener("click", () => (box.hidden ? openSave(false) : closeSave()));
    // Read-only but selectable: a press selects the whole code.
    code.addEventListener("focus", () => code.select());
    code.addEventListener("mouseup", (evt) => {
      if (code.selectionStart === code.selectionEnd) {
        evt.preventDefault();
        code.select();
      }
    });
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.value);
        idMsg.textContent = "Code copied. Keep it somewhere safe, like a password manager or a note.";
        telemetry.event("identity", { step: "copy", from });
      } catch (_) {
        code.focus();
        code.select();
        idMsg.textContent = "Couldn't copy here: the code is selected, copy it from the box.";
      }
    });

    idUse.addEventListener("click", () => {
      if (!useForm.hidden) return closeUse();
      closeForm();
      closeSave();
      useForm.hidden = false;
      idUse.setAttribute("aria-expanded", "true");
      paste.value = "";
      useMsg.textContent = "";
      useMsg.classList.remove("bad");
      paste.focus();
    });
    idCancel.addEventListener("click", () => {
      closeUse();
      idUse.focus();
    });
    paste.addEventListener("input", () => {
      confirmBox.hidden = true;
      pending = null;
    });
    useForm.addEventListener("submit", async (evt) => {
      evt.preventDefault();
      confirmBox.hidden = true;
      pending = null;
      const got = Identity.parse(paste.value);
      useMsg.classList.toggle("bad", !got.ok);
      if (!got.ok) {
        useMsg.textContent = got.message;
        return paste.focus();
      }
      if (got.id === Identity.current()) {
        useMsg.textContent = "That's already this browser's code.";
        return;
      }
      const text = paste.value;
      const data = await Scores.leaderboards();
      if (paste.value !== text) return;
      pending = Object.assign({ id: got.id }, Identity.published(data, got.id));
      useMsg.textContent = "Code accepted. Confirm below.";
      confirmText.textContent = `The leaderboard will show you as ${Identity.shownAs(pending)}` +
        (pending.name ? "" : " (no typed name for this code on the leaderboard yet: if you typed one in the last hour, type it again)") +
        ". This browser's leaderboard name and code are replaced by the saved ones; its achievements and bests stay. The page reloads.";
      confirmBox.hidden = false;
      idYes.focus();
    });
    idYes.addEventListener("click", () => {
      if (!pending || (window.ArcadeClassroom && window.ArcadeClassroom.on())) return;
      telemetry.event("identity", { step: "restore", from });
      Identity.use(pending.id, pending);
      location.reload();
    });
    idNo.addEventListener("click", () => {
      confirmBox.hidden = true;
      pending = null;
      useMsg.textContent = "";
      paste.focus();
    });
    listed.addEventListener("change", () => {
      Scores.setListed(listed.checked);
      sendHandle();
      opts.onChange();
    });
    rename.addEventListener("click", () => {
      closeAll();
      Scores.newHandle();
      sendHandle();
      opts.onChange();
    });

    return { node, render, close: closeAll };
  }

  return { create, nameFields };
})();
