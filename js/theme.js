(function () {
  "use strict";

  const STORAGE_KEY = "dailyQuizTheme";
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function getSavedTheme() {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY);
      return savedTheme === "light" || savedTheme === "dark" ? savedTheme : null;
    } catch (_error) {
      return null;
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    const button = document.querySelector("#theme-toggle");
    if (!button) return;

    const isDark = theme === "dark";
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", isDark ? "라이트 모드로 전환" : "다크 모드로 전환");
    button.querySelector(".theme-toggle-icon").textContent = isDark ? "☀" : "☾";
    button.querySelector(".theme-toggle-label").textContent = isDark ? "라이트" : "다크";
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_error) {
      // 저장이 제한된 환경에서도 현재 페이지의 테마 전환은 유지합니다.
    }
  }

  applyTheme(getSavedTheme() || (mediaQuery.matches ? "dark" : "light"));

  document.addEventListener("DOMContentLoaded", function () {
    const button = document.createElement("button");
    button.className = "theme-toggle";
    button.id = "theme-toggle";
    button.type = "button";
    button.innerHTML = '<span class="theme-toggle-icon" aria-hidden="true"></span><span class="theme-toggle-label"></span>';
    button.addEventListener("click", function () {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      saveTheme(nextTheme);
      applyTheme(nextTheme);
    });
    document.body.appendChild(button);
    applyTheme(document.documentElement.dataset.theme);
  });

  function handleSystemThemeChange(event) {
    if (!getSavedTheme()) applyTheme(event.matches ? "dark" : "light");
  }

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handleSystemThemeChange);
  } else {
    mediaQuery.addListener(handleSystemThemeChange);
  }

  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY && (event.newValue === "light" || event.newValue === "dark")) {
      applyTheme(event.newValue);
    }
  });
})();
