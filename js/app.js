(function () {
  "use strict";

  const CERTIFICATE_KEY = "dailyQuizCertificate";
  const COMPLETION_KEY = "dailyQuizCompletions";
  const RESULT_KEY = "dailyQuizResult";
  let quizData = {};

  function getLocalDateKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function readJson(storage, key) {
    try {
      return JSON.parse(storage.getItem(key));
    } catch (error) {
      return null;
    }
  }

  function getSelectedCertificate() {
    const certificateId = localStorage.getItem(CERTIFICATE_KEY);
    return certificateId && quizData[certificateId] ? certificateId : null;
  }

  function createRecordId() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, function (byte) {
      return byte.toString(16).padStart(2, "0");
    });
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }

  function initializeHome() {
    const overlay = document.querySelector("#exam-selection");
    const optionContainer = document.querySelector("#exam-options");
    const selectedExam = document.querySelector("#selected-exam");
    const selectedExamName = document.querySelector("#selected-exam-name");
    const homeExamTitle = document.querySelector("#home-exam-title");
    const homeDescription = document.querySelector("#home-description");
    const statusElement = document.querySelector("#today-status");
    const changeButton = document.querySelector("#change-exam");
    const startLink = document.querySelector('a[href="quiz.html"]');
    let selectedCertificateId = getSelectedCertificate();

    if (Object.keys(quizData).length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "empty-state";
      emptyState.textContent = window.quizDataStore?.getError()
        ? "자격증 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "현재 등록된 자격증이 없습니다.";
      optionContainer.replaceChildren(emptyState);
      selectedExam.hidden = true;
      homeExamTitle.textContent = "자격증 퀴즈!";
      homeDescription.textContent = "현재 이용할 수 있는 퀴즈가 없습니다.";
      statusElement.textContent = "확인할 수 없음";
      startLink?.removeAttribute("href");
      startLink?.setAttribute("aria-disabled", "true");
      overlay.hidden = false;
      document.body.classList.add("selection-open");
      return;
    }

    Object.entries(quizData).forEach(function ([certificateId, certificate]) {
      const button = document.createElement("button");
      button.className = "exam-option";
      button.type = "button";
      button.dataset.certificate = certificateId;
      button.innerHTML = `<span class="exam-option-icon" aria-hidden="true">${certificate.shortName.slice(0, 1)}</span><span><strong>${certificate.name}</strong><small>${certificate.description}</small></span><span class="exam-option-arrow" aria-hidden="true">→</span>`;
      optionContainer.appendChild(button);
    });

    function renderHome() {
      const certificate = quizData[selectedCertificateId];
      if (!certificate) {
        return;
      }

      const completions = readJson(localStorage, COMPLETION_KEY) || {};
      const isComplete = completions[selectedCertificateId] === getLocalDateKey();

      selectedExam.hidden = false;
      selectedExamName.textContent = certificate.name;
      homeExamTitle.textContent = `${certificate.shortName} 퀴즈!`;
      homeDescription.innerHTML = `하루 7문제로 준비하는<br />${certificate.name}`;
      statusElement.textContent = isComplete ? "학습 완료" : "학습 전";
      statusElement.classList.toggle("is-complete", isComplete);
      document.title = `하루 5분 ${certificate.shortName} 퀴즈`;
    }

    function openSelection() {
      overlay.hidden = false;
      document.body.classList.add("selection-open");
      const currentOption = selectedCertificateId
        ? optionContainer.querySelector(`[data-certificate="${selectedCertificateId}"]`)
        : optionContainer.querySelector(".exam-option");
      currentOption?.focus();
    }

    function closeSelection() {
      overlay.hidden = true;
      document.body.classList.remove("selection-open");
      changeButton.focus();
    }

    optionContainer.addEventListener("click", function (event) {
      const option = event.target.closest(".exam-option");
      if (!option) {
        return;
      }

      selectedCertificateId = option.dataset.certificate;
      localStorage.setItem(CERTIFICATE_KEY, selectedCertificateId);
      renderHome();
      closeSelection();
    });

    changeButton.addEventListener("click", openSelection);

    if (selectedCertificateId) {
      renderHome();
    } else {
      openSelection();
    }
  }

  function initializeQuiz() {
    const certificateId = getSelectedCertificate();
    const certificate = certificateId && quizData[certificateId];

    if (!certificate) {
      window.location.replace("index.html");
      return;
    }

    const form = document.querySelector("#quiz-form");
    const fieldset = document.querySelector("#answer-fieldset");
    const questionTitle = document.querySelector("#question-title");
    const optionList = document.querySelector("#option-list");
    const submitButton = document.querySelector("#submit-answer");
    const progressText = document.querySelector("#progress-text");
    const progressTrack = document.querySelector(".progress-track");
    const progressBar = document.querySelector("#progress-bar");
    const questions = Array.isArray(certificate.questions) ? certificate.questions : [];
    let currentIndex = 0;
    const answers = [];

    document.querySelector("#quiz-exam-name").textContent = `${certificate.name} · 오늘의 퀴즈`;
    document.title = `오늘의 퀴즈 | ${certificate.name}`;
    sessionStorage.removeItem(RESULT_KEY);

    if (questions.length === 0) {
      progressText.textContent = "0 / 0";
      progressTrack.setAttribute("aria-valuemin", "0");
      progressTrack.setAttribute("aria-valuemax", "0");
      progressTrack.setAttribute("aria-valuenow", "0");
      progressBar.style.width = "0%";
      questionTitle.textContent = window.quizDataStore?.getError()
        ? "문제를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "현재 등록된 문제가 없습니다.";
      optionList.innerHTML = "";
      fieldset.disabled = true;
      submitButton.disabled = true;
      submitButton.textContent = "풀 수 있는 문제가 없습니다";
      return;
    }

    progressTrack.setAttribute("aria-valuemax", String(questions.length));

    function renderQuestion() {
      const currentQuestion = questions[currentIndex];
      progressText.textContent = `${currentIndex + 1} / ${questions.length}`;
      progressTrack.setAttribute("aria-valuenow", String(currentIndex + 1));
      progressBar.style.width = `${((currentIndex + 1) / questions.length) * 100}%`;
      questionTitle.textContent = currentQuestion.question;
      optionList.innerHTML = "";

      currentQuestion.options.forEach(function (option, optionIndex) {
        const label = document.createElement("label");
        label.className = "option-label";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "answer";
        input.value = String(optionIndex);
        const number = document.createElement("span");
        number.className = "option-number";
        number.textContent = String(optionIndex + 1);
        const text = document.createElement("span");
        text.textContent = option;
        label.append(input, number, text);
        optionList.appendChild(label);
      });

      fieldset.disabled = false;
      submitButton.disabled = true;
      submitButton.textContent = currentIndex === questions.length - 1 ? "채점하기" : "다음 문제";
    }

    optionList.addEventListener("change", function () {
      submitButton.disabled = false;
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const selected = form.querySelector('input[name="answer"]:checked');
      if (!selected) return;

      answers[currentIndex] = Number(selected.value);
      if (currentIndex < questions.length - 1) {
        currentIndex += 1;
        renderQuestion();
        questionTitle.focus?.();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const correctCount = answers.reduce(function (count, answer, index) {
        return count + (answer === questions[index].answer ? 1 : 0);
      }, 0);
      const result = {
        certificateId,
        total: questions.length,
        correct: correctCount,
        rate: Math.round((correctCount / questions.length) * 100),
        answers,
        date: getLocalDateKey()
      };
      const completions = readJson(localStorage, COMPLETION_KEY) || {};
      completions[certificateId] = result.date;
      sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
      localStorage.setItem(COMPLETION_KEY, JSON.stringify(completions));

      fieldset.disabled = true;
      submitButton.disabled = true;
      submitButton.textContent = "학습 기록 저장 중...";

      const currentUser = window.currentAuthSession?.user;
      if (currentUser && window.learningRecords) {
        const answerRecords = questions.map(function (question, questionIndex) {
          return {
            question_index: questionIndex,
            selected_answer: answers[questionIndex],
            correct_answer: question.answer,
            is_correct: answers[questionIndex] === question.answer
          };
        });

        await window.learningRecords.saveAttempt({
          id: createRecordId(),
          user_id: currentUser.id,
          certificate_id: certificateId,
          completed_on: result.date,
          total: result.total,
          correct: result.correct,
          rate: result.rate,
          answers: answerRecords,
          created_at: new Date().toISOString()
        });
      }

      window.location.href = "result.html";
    });

    renderQuestion();
  }

  function initializeResult() {
    const result = readJson(sessionStorage, RESULT_KEY);
    const certificate = result && quizData[result.certificateId];
    const isValidResult =
      certificate &&
      Number.isInteger(result.total) &&
      Number.isInteger(result.correct) &&
      Array.isArray(result.answers) &&
      result.total === certificate.questions.length &&
      result.answers.length === result.total &&
      result.answers.every(function (answer) {
        return Number.isInteger(answer) && answer >= 0 && answer < 4;
      }) &&
      result.correct >= 0 &&
      result.correct <= result.total &&
      result.date === getLocalDateKey();

    if (!isValidResult) {
      window.location.replace("index.html");
      return;
    }

    document.querySelector("#result-exam-name").textContent = `${certificate.name} · 오늘의 학습 완료`;
    document.querySelector("#total-count").textContent = `${result.total}문제`;
    document.querySelector("#correct-count").textContent = `${result.correct}문제`;
    document.querySelector("#correct-rate").textContent = `${result.rate}%`;
    document.title = `학습 결과 | ${certificate.name}`;

    const reviewList = document.querySelector("#review-list");
    certificate.questions.forEach(function (question, questionIndex) {
      const selectedAnswer = result.answers[questionIndex];
      const isCorrect = selectedAnswer === question.answer;
      const reviewItem = document.createElement("article");
      reviewItem.className = `review-item ${isCorrect ? "is-correct" : "is-wrong"}`;

      const reviewStatus = document.createElement("span");
      reviewStatus.className = "review-status";
      reviewStatus.textContent = isCorrect ? "정답" : "오답";

      const reviewTitle = document.createElement("h3");
      reviewTitle.textContent = `${questionIndex + 1}. ${question.question}`;

      const myAnswer = document.createElement("p");
      myAnswer.className = "review-answer";
      myAnswer.innerHTML = `<strong>내 답</strong><span>${selectedAnswer + 1}번. ${question.options[selectedAnswer]}</span>`;

      const correctAnswer = document.createElement("p");
      correctAnswer.className = "review-answer correct-answer";
      correctAnswer.innerHTML = `<strong>정답</strong><span>${question.answer + 1}번. ${question.options[question.answer]}</span>`;

      const explanation = document.createElement("div");
      explanation.className = "review-explanation";
      const explanationTitle = document.createElement("strong");
      explanationTitle.textContent = "해설";
      const explanationText = document.createElement("p");
      explanationText.textContent = question.explanation;
      explanation.append(explanationTitle, explanationText);

      reviewItem.append(reviewStatus, reviewTitle, myAnswer, correctAnswer, explanation);
      reviewList.appendChild(reviewItem);
    });
  }

  async function initializePage() {
    quizData = await window.quizDataStore.load();
    const page = document.body.dataset.page;
    if (page === "home") initializeHome();
    else if (page === "quiz") initializeQuiz();
    else if (page === "result") initializeResult();
  }

  if (document.body.classList.contains("auth-ready")) initializePage();
  else window.addEventListener("auth:ready", initializePage, { once: true });
})();
