(function () {
  "use strict";

  const authClient = window.supabaseClient;
  const form = document.querySelector("#auth-form");
  const emailInput = document.querySelector("#auth-email");
  const passwordInput = document.querySelector("#auth-password");
  const submitButton = document.querySelector("#auth-submit");
  const title = document.querySelector("#auth-title");
  const lead = document.querySelector("#auth-lead");
  const message = document.querySelector("#auth-message");
  const tabs = document.querySelectorAll("[data-auth-mode]");
  let mode = "login";

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `auth-message is-${type}`;
    message.hidden = false;
  }

  function clearMessage() {
    message.hidden = true;
    message.textContent = "";
    message.className = "auth-message";
  }

  function getErrorMessage(error) {
    const code = error?.code || "";
    const rawMessage = (error?.message || "").toLowerCase();

    if (code === "invalid_credentials" || rawMessage.includes("invalid login credentials")) {
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    }
    if (code === "email_not_confirmed" || rawMessage.includes("email not confirmed")) {
      return "이메일 인증이 완료되지 않았습니다. 받은편지함을 확인해 주세요.";
    }
    if (code === "user_already_exists" || rawMessage.includes("already registered")) {
      return "이미 가입된 이메일입니다. 로그인해 주세요.";
    }
    if (code === "weak_password" || rawMessage.includes("password should be")) {
      return "비밀번호는 6자 이상으로 입력해 주세요.";
    }
    if (code === "signup_disabled") {
      return "현재 회원가입을 이용할 수 없습니다.";
    }
    if (code.includes("rate_limit") || rawMessage.includes("rate limit")) {
      return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    }
    if (rawMessage.includes("failed to fetch") || rawMessage.includes("network")) {
      return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
    }
    return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  function setMode(nextMode) {
    mode = nextMode;
    const isSignup = mode === "signup";

    tabs.forEach(function (tab) {
      const isActive = tab.dataset.authMode === mode;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    title.textContent = isSignup ? "가볍게 시작해 볼까요?" : "다시 만나서 반가워요!";
    lead.textContent = isSignup
      ? "이메일로 가입하고 매일 7문제를 풀어 보세요."
      : "로그인하고 오늘의 7문제를 시작해 보세요.";
    submitButton.textContent = isSignup ? "회원가입" : "로그인";
    passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
    document.title = `${isSignup ? "회원가입" : "로그인"} | 하루 5분 자격증 퀴즈`;
    clearMessage();
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      setMode(tab.dataset.authMode);
    });
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearMessage();

    if (!authClient) {
      showMessage("인증 서비스에 연결하지 못했습니다. 페이지를 새로고침해 주세요.", "error");
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    submitButton.disabled = true;
    submitButton.textContent = mode === "signup" ? "가입 중..." : "로그인 중...";

    try {
      if (mode === "signup") {
        const { data, error } = await authClient.auth.signUp({ email, password });
        if (error) throw error;

        if (data.session) {
          window.location.replace("index.html");
          return;
        }

        showMessage("회원가입이 완료되었습니다. 이메일의 인증 링크를 확인한 뒤 로그인해 주세요.", "success");
        passwordInput.value = "";
      } else {
        const { error } = await authClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.replace("index.html");
        return;
      }
    } catch (error) {
      showMessage(getErrorMessage(error), "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = mode === "signup" ? "회원가입" : "로그인";
    }
  });

  const pageError = new URLSearchParams(window.location.search).get("error");
  if (pageError === "connection") {
    showMessage("인증 서비스에 연결하지 못했습니다. 잠시 후 페이지를 새로고침해 주세요.", "error");
  } else if (pageError === "session") {
    showMessage("로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.", "error");
  }
})();
