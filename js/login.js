const form         = q("#auth-form");
const titleEl      = q("#form-title");
const modeSignin   = q("#mode-signin");
const modeSignup   = q("#mode-signup");
const pseudoWrap   = q("#pseudo-wrap");
const pseudoInput  = q("#pseudo");
const emailInput   = q("#email");
const passInput    = q("#password");
const submitBtn    = q("#submit-btn");
const feedback     = q("#login-feedback");

let mode = "signin";

function setMode(newMode) {
  mode = newMode;
  if (mode === "signin") {
    titleEl.textContent = "Se connecter";
    pseudoWrap.style.display = "none";
    submitBtn.textContent = "Se connecter";
    modeSignin.classList.add("primary");
    modeSignup.classList.remove("primary");
    passInput.setAttribute("autocomplete", "current-password");
  } else {
    titleEl.textContent = "Créer un compte";
    pseudoWrap.style.display = "";
    submitBtn.textContent = "Créer mon compte";
    modeSignup.classList.add("primary");
    modeSignin.classList.remove("primary");
    passInput.setAttribute("autocomplete", "new-password");
  }
  feedback.textContent = "";
}
modeSignin?.addEventListener("click", () => setMode("signin"));
modeSignup?.addEventListener("click", () => setMode("signup"));
setMode("signin");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  feedback.textContent = mode === "signin" ? "Connexion…" : "Création du compte…";
  const email = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !password) {
    feedback.textContent = "Email et mot de passe requis.";
    return;
  }

  try {
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const username = (pseudoInput.value || "").trim();
      if (!username) { feedback.textContent = "Merci de saisir un pseudo."; return; }
      if (!/^[A-Za-z0-9_\-\.]{3,20}$/.test(username)) {
        feedback.textContent = "Pseudo invalide (3-20 caractères, lettres/chiffres/_-.).";
        return;
      }
      const { error } = await supabase.auth.signUp({
        email, password, options: { data: { username } }
      });
      if (error) throw error;
    }

    const profile = await getCurrentProfile();
    if (profile?.role === "waiting") window.location.href = "./waiting.html";
    else window.location.href = "./index.html";

  } catch (err) {
    feedback.textContent = "Erreur : " + (err?.message || err);
  }
});
