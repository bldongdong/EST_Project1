(function () {
  "use strict";

  const authClient = window.supabaseClient;
  const isAuthPage = document.body.dataset.page === "auth";
  let isPageReady = false;
  let isRedirecting = false;

  function redirectTo(path) {
    if (isRedirecting) return;
    isRedirecting = true;
    window.location.replace(path);
  }

  function showProtectedPage(session) {
    document.querySelectorAll("[data-auth-email]").forEach(function (element) {
      element.textContent = session.user.email || "로그인 사용자";
    });

    if (!isPageReady) {
      isPageReady = true;
      document.body.classList.add("auth-ready");
      window.dispatchEvent(new CustomEvent("auth:ready", { detail: { session } }));
    }
  }

  function showAuthPage() {
    if (isPageReady) return;
    isPageReady = true;
    document.body.classList.add("auth-ready");
    window.dispatchEvent(new CustomEvent("auth:ready", { detail: { session: null } }));
  }

  function handleSession(session) {
    if (session) {
      if (isAuthPage) redirectTo("index.html");
      else showProtectedPage(session);
      return;
    }

    if (isAuthPage) showAuthPage();
    else redirectTo("auth.html");
  }

  function showAccountError(message) {
    const messageElement = document.querySelector("[data-auth-message]");
    if (!messageElement) return;
    messageElement.textContent = message;
    messageElement.hidden = false;
  }

  function initializeLogoutButtons() {
    document.querySelectorAll("[data-logout]").forEach(function (button) {
      button.addEventListener("click", async function () {
        button.disabled = true;
        button.textContent = "로그아웃 중...";

        const { error } = await authClient.auth.signOut({ scope: "local" });
        if (error) {
          button.disabled = false;
          button.textContent = "로그아웃";
          showAccountError("로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }

        redirectTo("auth.html");
      });
    });
  }

  if (!authClient) {
    if (isAuthPage) showAuthPage();
    else redirectTo("auth.html?error=connection");
    return;
  }

  initializeLogoutButtons();

  authClient.auth.onAuthStateChange(function (_event, session) {
    handleSession(session);
  });

  authClient.auth.getSession().then(function ({ data, error }) {
    if (error) {
      if (isAuthPage) showAuthPage();
      else redirectTo("auth.html?error=session");
      return;
    }
    handleSession(data.session);
  });
})();
