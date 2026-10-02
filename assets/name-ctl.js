// The leaderboard name controls: "Show my best as …", pick another random
// name, or type one. One instance sits in the cabinet's 🏆 panel (ids
// prefixed "lb") and one in the gallery's Records view ("rec"); both
// read and write the same name in this browser. docs/scores.md.
window.ArcadeNameCtl = (function () {
  const { el } = window.ArcadeUI;
  const Scores = window.ArcadeScores;
  const Names = window.ArcadeNames;
  const telemetry = window.ArcadeTelemetry;

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
    const node = el("div", { className: "lb-name-ctl" }, [
      el("div", { className: "lb-me" }, [
        el("label", { className: "check" }, [listed, el("span", {}, ["Show my best on the leaderboard as ", handle])]),
        rename,
        type,
      ]),
      note,
      form,
    ]);

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
    });
    listed.addEventListener("change", () => {
      Scores.setListed(listed.checked);
      sendHandle();
      opts.onChange();
    });
    rename.addEventListener("click", () => {
      closeForm();
      Scores.newHandle();
      sendHandle();
      opts.onChange();
    });

    return { node, render, close: closeForm };
  }

  return { create, nameFields };
})();
