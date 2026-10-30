(function () {
  "use strict";

  const authClient = window.supabaseClient;
  const isAuthPage = document.body.dataset.page === "auth";
  const isAdminPage = document.body.dataset.page === "admin";
  let isPageReady = false;
  let isRedirecting = false;
  let sessionCheckVersion = 0;
  let cachedRoleCheck = null;

  function redirectTo(path) {
    if (isRedirecting) return;
    isRedirecting = true;
    window.location.replace(path);
  }

  function addAdminMenu() {
    document.querySelectorAll(".account-bar").forEach(function (accountBar) {
      if (accountBar.querySelector(".admin-menu-link")) return;
      const link = document.createElement("a");
      link.className = "mypage-link admin-menu-link";
      link.href = "admin.html";
      link.textContent = "관리자 메뉴";
      const email = accountBar.querySelector("[data-auth-email]");
      accountBar.insertBefore(link, email || null);
    });

    const mypageHeader = document.querySelector(".mypage-header");
    if (mypageHeader && !mypageHeader.querySelector(".admin-menu-link")) {
      const link = document.createElement("a");
      link.className = "mypage-link admin-menu-link admin-menu-standalone";
      link.href = "admin.html";
      link.textContent = "관리자 메뉴";
      const homeLink = mypageHeader.querySelector(".home-link");
      homeLink?.insertAdjacentElement("afterend", link);
    }
  }

  async function getUserRole(session) {
    const userId = session.user.id;
    if (cachedRoleCheck?.userId === userId) return cachedRoleCheck.promise;

    const promise = (async function () {
      const { data: profile, error: profileError } = await authClient
        .from("profiles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("사용자 역할을 확인하지 못했습니다.", profileError);
        return "user";
      }

      const role = profile?.role === "admin" ? "admin" : "user";
      if (role !== "admin") return "user";

      const { data: isAdmin, error: adminError } = await authClient.rpc("is_admin");
      if (adminError) {
        console.error("관리자 권한을 확인하지 못했습니다.", adminError);
        return "user";
      }

      return isAdmin === true ? "admin" : "user";
    })();

    cachedRoleCheck = { userId, promise };
    return promise;
  }

  function showProtectedPage(session, role) {
    window.currentAuthSession = session;
    window.currentUserRole = role;
    document.querySelectorAll("[data-auth-email]").forEach(function (element) {
      element.textContent = session.user.email || "로그인 사용자";
    });
    if (role === "admin" && !isAdminPage) addAdminMenu();

    if (!isPageReady) {
      isPageReady = true;
      document.body.classList.add("auth-ready");
      window.dispatchEvent(new CustomEvent("auth:ready", { detail: { session, role } }));
    }
  }

  function showAuthPage() {
    window.currentAuthSession = null;
    window.currentUserRole = null;
    if (isPageReady) return;
    isPageReady = true;
    document.body.classList.add("auth-ready");
    window.dispatchEvent(new CustomEvent("auth:ready", { detail: { session: null } }));
  }

  async function handleSession(session) {
    const checkVersion = ++sessionCheckVersion;
    if (session) {
      if (isAuthPage) redirectTo("index.html");
      else {
        const role = await getUserRole(session);
        if (checkVersion !== sessionCheckVersion || isRedirecting) return;
        if (isAdminPage && role !== "admin") {
          redirectTo("index.html");
          return;
        }
        showProtectedPage(session, role);
      }
      return;
    }

    cachedRoleCheck = null;
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
