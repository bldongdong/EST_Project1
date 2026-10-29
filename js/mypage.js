(function () {
  "use strict";

  const recordsApi = window.learningRecords;
  const quizData = window.QUIZ_DATA || {};
  let attempts = [];
  let visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatDate(dateValue) {
    if (!dateValue) return "-";
    const date = new Date(dateValue.length === 10 ? `${dateValue}T00:00:00` : dateValue);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }).format(date);
  }

  function getStudyDates() {
    return new Set(attempts.map(function (attempt) {
      return attempt.completed_on;
    }));
  }

  function calculateStreak(studyDates) {
    let cursor = new Date();
    cursor.setHours(12, 0, 0, 0);

    if (!studyDates.has(toDateKey(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;
    while (studyDates.has(toDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function renderStats() {
    const total = attempts.reduce(function (sum, attempt) {
      return sum + Number(attempt.total || 0);
    }, 0);
    const correct = attempts.reduce(function (sum, attempt) {
      return sum + Number(attempt.correct || 0);
    }, 0);
    const studyDates = getStudyDates();

    document.querySelector("#stat-total").textContent = `${total}문제`;
    document.querySelector("#stat-correct").textContent = `${correct}문제`;
    document.querySelector("#stat-rate").textContent = `${total ? Math.round((correct / total) * 100) : 0}%`;
    document.querySelector("#stat-days").textContent = `${studyDates.size}일`;
    document.querySelector("#stat-streak").textContent = `${calculateStreak(studyDates)}일`;
  }

  function renderCalendar() {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const todayKey = toDateKey(new Date());
    const studyDates = getStudyDates();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const learnedThisMonth = Array.from(studyDates).filter(function (date) {
      return date.startsWith(monthPrefix);
    }).length;
    const container = document.querySelector("#calendar-days");

    document.querySelector("#calendar-month").textContent = `${year}년 ${month + 1}월`;
    document.querySelector("#calendar-summary").textContent = `이달에는 ${learnedThisMonth}일 학습했어요.`;
    container.innerHTML = "";

    for (let index = 0; index < firstWeekday; index += 1) {
      const blank = document.createElement("span");
      blank.className = "calendar-day is-blank";
      container.appendChild(blank);
    }

    for (let day = 1; day <= lastDay; day += 1) {
      const date = new Date(year, month, day);
      const dateKey = toDateKey(date);
      const dayElement = document.createElement("span");
      dayElement.className = "calendar-day";
      dayElement.textContent = String(day);
      dayElement.setAttribute("aria-label", `${formatDate(dateKey)}${studyDates.has(dateKey) ? ", 학습 완료" : ""}`);
      dayElement.classList.toggle("is-learned", studyDates.has(dateKey));
      dayElement.classList.toggle("is-today", dateKey === todayKey);
      container.appendChild(dayElement);
    }
  }

  function renderRecentRecords() {
    const container = document.querySelector("#recent-records");
    const emptyState = document.querySelector("#recent-empty");
    container.innerHTML = "";
    emptyState.hidden = attempts.length > 0;

    attempts.slice(0, 10).forEach(function (attempt) {
      const certificate = quizData[attempt.certificate_id];
      const item = document.createElement("article");
      item.className = "record-item";

      const info = document.createElement("div");
      const title = document.createElement("strong");
      const date = document.createElement("span");
      title.textContent = certificate?.name || "자격증 퀴즈";
      date.textContent = formatDate(attempt.completed_on);
      info.append(title, date);

      const scores = document.createElement("div");
      scores.className = "record-scores";
      const total = document.createElement("span");
      const correct = document.createElement("span");
      const rate = document.createElement("strong");
      total.textContent = `${attempt.total}문제`;
      correct.textContent = `${attempt.correct}개 정답`;
      rate.textContent = `${attempt.rate}%`;
      scores.append(total, correct, rate);
      item.append(info, scores);
      container.appendChild(item);
    });
  }

  function renderWrongAnswers() {
    const container = document.querySelector("#wrong-list");
    const emptyState = document.querySelector("#wrong-empty");
    const wrongAnswers = [];
    container.innerHTML = "";

    attempts.forEach(function (attempt) {
      (attempt.answers || []).forEach(function (answer) {
        if (!answer.is_correct) wrongAnswers.push({ attempt, answer });
      });
    });

    wrongAnswers.forEach(function ({ attempt, answer }) {
      const certificate = quizData[attempt.certificate_id];
      const question = certificate?.questions?.[answer.question_index];
      if (!question) return;

      const details = document.createElement("details");
      details.className = "wrong-item";
      const summary = document.createElement("summary");
      const label = document.createElement("span");
      const questionText = document.createElement("strong");
      label.textContent = `${formatDate(attempt.completed_on)} · ${certificate.shortName}`;
      questionText.textContent = question.question;
      summary.append(label, questionText);

      const body = document.createElement("div");
      body.className = "wrong-answer-body";
      const selected = document.createElement("p");
      selected.innerHTML = `<strong>내 답</strong><span>${Number(answer.selected_answer) + 1}번. ${question.options[answer.selected_answer]}</span>`;
      const correct = document.createElement("p");
      correct.innerHTML = `<strong>정답</strong><span>${question.answer + 1}번. ${question.options[question.answer]}</span>`;
      const explanation = document.createElement("div");
      explanation.innerHTML = `<strong>해설</strong><p></p>`;
      explanation.querySelector("p").textContent = question.explanation;
      body.append(selected, correct, explanation);
      details.append(summary, body);
      container.appendChild(details);
    });

    emptyState.hidden = container.childElementCount > 0;
  }

  function showProfileMessage(text, type) {
    const element = document.querySelector("#profile-message");
    element.textContent = text;
    element.className = `profile-message is-${type}`;
    element.hidden = false;
  }

  async function initializeMypage(session) {
    const user = session.user;
    const status = document.querySelector("#data-status");
    document.querySelector("#profile-email").textContent = user.email || "-";
    document.querySelector("#profile-created-at").textContent = formatDate(user.created_at);

    const [profileResult, attemptsResult] = await Promise.all([
      recordsApi.getProfile(user.id),
      recordsApi.getAttempts(user.id)
    ]);

    const nickname = profileResult.profile?.nickname || "";
    document.querySelector("#profile-nickname").textContent = nickname || "설정 전";
    document.querySelector("#nickname-input").value = nickname;
    attempts = attemptsResult.attempts || [];

    if (!profileResult.synced || !attemptsResult.synced) {
      status.textContent = "데이터베이스 적용 전에는 이 브라우저에 저장된 사용자별 학습 기록을 표시합니다.";
      status.hidden = false;
    }

    renderStats();
    renderCalendar();
    renderRecentRecords();
    renderWrongAnswers();

    document.querySelector("#nickname-form").addEventListener("submit", async function (event) {
      event.preventDefault();
      const input = document.querySelector("#nickname-input");
      const button = document.querySelector("#nickname-submit");
      const nextNickname = input.value.trim();
      if (!nextNickname) {
        showProfileMessage("닉네임을 입력해 주세요.", "error");
        return;
      }

      button.disabled = true;
      button.textContent = "저장 중...";
      const result = await recordsApi.updateNickname(user.id, nextNickname);
      document.querySelector("#profile-nickname").textContent = nextNickname;
      showProfileMessage(
        result.synced ? "닉네임을 저장했습니다." : "닉네임을 이 브라우저에 저장했습니다. DB 적용 후 자동 연동됩니다.",
        "success"
      );
      button.disabled = false;
      button.textContent = "저장";
    });
  }

  document.querySelector("#calendar-prev").addEventListener("click", function () {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
    renderCalendar();
  });

  document.querySelector("#calendar-next").addEventListener("click", function () {
    visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
    renderCalendar();
  });

  if (window.currentAuthSession) initializeMypage(window.currentAuthSession);
  else {
    window.addEventListener("auth:ready", function (event) {
      if (event.detail.session) initializeMypage(event.detail.session);
    }, { once: true });
  }
})();
