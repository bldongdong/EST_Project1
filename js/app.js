(function () {
  "use strict";

  const COMPLETION_KEY = "bigbungiQuizCompletion";
  const RESULT_KEY = "bigbungiQuizResult";

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

  function initializeHome() {
    const statusElement = document.querySelector("#today-status");
    const completion = readJson(localStorage, COMPLETION_KEY);
    const isComplete = completion && completion.date === getLocalDateKey();

    statusElement.textContent = isComplete ? "학습 완료" : "학습 전";
    statusElement.classList.toggle("is-complete", Boolean(isComplete));
  }

  function initializeQuiz() {
    if (!Array.isArray(window.MOCK_QUESTIONS) && typeof MOCK_QUESTIONS === "undefined") {
      return;
    }

    const questions = MOCK_QUESTIONS;
    let currentIndex = 0;
    let correctCount = 0;
    let isSubmitted = false;

    const form = document.querySelector("#quiz-form");
    const fieldset = document.querySelector("#answer-fieldset");
    const questionTitle = document.querySelector("#question-title");
    const optionList = document.querySelector("#option-list");
    const submitButton = document.querySelector("#submit-answer");
    const feedback = document.querySelector("#feedback");
    const feedbackResult = document.querySelector("#feedback-result");
    const feedbackAnswer = document.querySelector("#feedback-answer");
    const feedbackExplanation = document.querySelector("#feedback-explanation");
    const nextButton = document.querySelector("#next-question");
    const progressText = document.querySelector("#progress-text");
    const progressTrack = document.querySelector(".progress-track");
    const progressBar = document.querySelector("#progress-bar");

    sessionStorage.removeItem(RESULT_KEY);

    function renderQuestion() {
      const currentQuestion = questions[currentIndex];
      isSubmitted = false;

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
      form.hidden = false;
      feedback.hidden = true;
      nextButton.textContent = currentIndex === questions.length - 1 ? "결과 확인" : "다음 문제";
    }

    optionList.addEventListener("change", function () {
      if (!isSubmitted) {
        submitButton.disabled = false;
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (isSubmitted) {
        return;
      }

      const selected = form.querySelector('input[name="answer"]:checked');
      if (!selected) {
        return;
      }

      isSubmitted = true;
      const selectedIndex = Number(selected.value);
      const currentQuestion = questions[currentIndex];
      const isCorrect = selectedIndex === currentQuestion.answer;

      if (isCorrect) {
        correctCount += 1;
      }

      fieldset.disabled = true;
      submitButton.disabled = true;
      submitButton.hidden = true;

      const optionLabels = optionList.querySelectorAll(".option-label");
      optionLabels[currentQuestion.answer].classList.add("is-correct");
      if (!isCorrect) {
        optionLabels[selectedIndex].classList.add("is-wrong");
      }

      feedbackResult.textContent = isCorrect ? "정답이에요!" : "아쉬워요, 오답이에요.";
      feedbackResult.className = `feedback-result ${isCorrect ? "is-correct" : "is-wrong"}`;
      feedbackAnswer.textContent = `정답: ${currentQuestion.answer + 1}번. ${currentQuestion.options[currentQuestion.answer]}`;
      feedbackExplanation.textContent = currentQuestion.explanation;
      feedback.hidden = false;
      nextButton.focus();
    });

    nextButton.addEventListener("click", function () {
      if (!isSubmitted) {
        return;
      }

      if (currentIndex < questions.length - 1) {
        currentIndex += 1;
        submitButton.hidden = false;
        renderQuestion();
        questionTitle.focus?.();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const result = {
        total: questions.length,
        correct: correctCount,
        rate: Math.round((correctCount / questions.length) * 100),
        date: getLocalDateKey()
      };

      sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
      localStorage.setItem(COMPLETION_KEY, JSON.stringify({ date: result.date }));
      window.location.href = "result.html";
    });

    renderQuestion();
  }

  function initializeResult() {
    const result = readJson(sessionStorage, RESULT_KEY);
    const isValidResult =
      result &&
      Number.isInteger(result.total) &&
      Number.isInteger(result.correct) &&
      result.total === 5 &&
      result.correct >= 0 &&
      result.correct <= result.total &&
      result.date === getLocalDateKey();

    if (!isValidResult) {
      window.location.replace("index.html");
      return;
    }

    document.querySelector("#total-count").textContent = `${result.total}문제`;
    document.querySelector("#correct-count").textContent = `${result.correct}문제`;
    document.querySelector("#correct-rate").textContent = `${result.rate}%`;
  }

  const page = document.body.dataset.page;

  if (page === "home") {
    initializeHome();
  } else if (page === "quiz") {
    initializeQuiz();
  } else if (page === "result") {
    initializeResult();
  }
})();
