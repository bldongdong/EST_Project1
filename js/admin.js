(function () {
  "use strict";

  const databaseClient = window.supabaseClient;
  const state = {
    certificates: [],
    questions: [],
    profiles: [],
    attempts: [],
    answers: [],
    editing: null
  };

  const panelMeta = {
    overview: ["운영 현황", "현재 서비스의 사용자와 학습 현황을 확인합니다."],
    content: ["자격증·문제 관리", "서비스에 표시되는 자격증, 문제, 정답과 해설을 검수합니다."],
    users: ["사용자 관리", "사용자 프로필과 학습 현황을 확인합니다."],
    records: ["학습 기록 관리", "완료된 퀴즈와 문제별 답안을 확인하고 테스트 기록을 정리합니다."]
  };

  function formatDate(value, includeTime) {
    if (!value) return "-";
    const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: includeTime ? "2-digit" : undefined,
      minute: includeTime ? "2-digit" : undefined
    }).format(date);
  }

  function getLocalDateKey() {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function showMessage(text, type) {
    const message = document.querySelector("#admin-message");
    message.textContent = text;
    message.className = `admin-message is-${type}`;
    message.hidden = false;
  }

  function clearMessage() {
    const message = document.querySelector("#admin-message");
    message.hidden = true;
    message.textContent = "";
    message.className = "admin-message";
  }

  function createCell(text) {
    const cell = document.createElement("td");
    cell.textContent = text ?? "-";
    return cell;
  }

  function createActionButton(label, action, id, variant) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `admin-action ${variant ? `is-${variant}` : ""}`.trim();
    button.textContent = label;
    button.dataset.adminAction = action;
    button.dataset.id = id;
    return button;
  }

  function getCertificate(id) {
    return state.certificates.find(function (certificate) {
      return certificate.id === id;
    });
  }

  function getQuestion(id) {
    return state.questions.find(function (question) {
      return question.id === id;
    });
  }

  function renderOverview() {
    const today = getLocalDateKey();
    const todayUsers = new Set(state.attempts.filter(function (attempt) {
      return attempt.completed_on === today;
    }).map(function (attempt) {
      return attempt.user_id;
    }));
    const averageRate = state.attempts.length
      ? Math.round(state.attempts.reduce(function (sum, attempt) {
        return sum + Number(attempt.rate || 0);
      }, 0) / state.attempts.length)
      : 0;

    document.querySelector("#admin-stat-users").textContent = `${state.profiles.length}명`;
    document.querySelector("#admin-stat-today").textContent = `${todayUsers.size}명`;
    document.querySelector("#admin-stat-attempts").textContent = `${state.attempts.length}회`;
    document.querySelector("#admin-stat-rate").textContent = `${averageRate}%`;

    const body = document.querySelector("#admin-recent-body");
    body.innerHTML = "";
    state.attempts.slice(0, 10).forEach(function (attempt) {
      const certificate = getCertificate(attempt.certificate_id);
      const row = document.createElement("tr");
      row.append(
        createCell(attempt.user_email || attempt.user_id),
        createCell(certificate?.name || attempt.certificate_id),
        createCell(formatDate(attempt.completed_on, false)),
        createCell(`${attempt.correct} / ${attempt.total}`),
        createCell(`${attempt.rate}%`)
      );
      body.appendChild(row);
    });
    document.querySelector("#admin-recent-empty").hidden = body.childElementCount > 0;
  }

  function renderContent() {
    const certificateBody = document.querySelector("#admin-certificates-body");
    certificateBody.innerHTML = "";
    state.certificates.forEach(function (certificate) {
      const row = document.createElement("tr");
      const actions = document.createElement("td");
      actions.appendChild(createActionButton("수정", "edit-certificate", certificate.id));
      row.append(
        createCell(certificate.name),
        createCell(certificate.short_name),
        createCell(certificate.description),
        createCell(`${state.questions.filter(function (question) {
          return question.certificate_id === certificate.id;
        }).length}개`),
        actions
      );
      certificateBody.appendChild(row);
    });
    document.querySelector("#admin-certificates-empty").hidden = certificateBody.childElementCount > 0;

    const questionBody = document.querySelector("#admin-questions-body");
    questionBody.innerHTML = "";
    state.questions.forEach(function (question) {
      const row = document.createElement("tr");
      const actions = document.createElement("td");
      actions.appendChild(createActionButton("수정", "edit-question", question.id));
      row.append(
        createCell(getCertificate(question.certificate_id)?.short_name || question.certificate_id),
        createCell(String(question.display_order)),
        createCell(question.question_text),
        createCell(`${Number(question.correct_option) + 1}번`),
        actions
      );
      questionBody.appendChild(row);
    });
    document.querySelector("#admin-questions-empty").hidden = questionBody.childElementCount > 0;
  }

  function renderUsers() {
    const body = document.querySelector("#admin-users-body");
    body.innerHTML = "";
    state.profiles.forEach(function (profile) {
      const certificate = getCertificate(profile.selected_certificate_id);
      const attemptCount = state.attempts.filter(function (attempt) {
        return attempt.user_id === profile.user_id;
      }).length;
      const row = document.createElement("tr");
      row.append(
        createCell(profile.user_email || profile.user_id),
        createCell(profile.nickname || "설정 전"),
        createCell(certificate?.name || "선택 전"),
        createCell(`${attemptCount}회`),
        createCell(formatDate(profile.updated_at, true))
      );
      body.appendChild(row);
    });
    document.querySelector("#admin-users-empty").hidden = body.childElementCount > 0;
  }

  function createAnswerDetails(attempt) {
    const details = document.createElement("details");
    details.className = "admin-record-detail";
    const attemptAnswers = state.answers.filter(function (answer) {
      return answer.attempt_id === attempt.id;
    });
    const summary = document.createElement("summary");
    summary.textContent = `답안 ${attemptAnswers.length}개`;
    details.appendChild(summary);

    const list = document.createElement("ol");
    attemptAnswers.forEach(function (answer) {
      const question = getQuestion(answer.question_id);
      const item = document.createElement("li");
      const title = document.createElement("strong");
      const result = document.createElement("span");
      title.textContent = question?.question_text || answer.question_id;
      result.textContent = `${answer.selected_option + 1}번 선택 · ${answer.is_correct ? "정답" : "오답"}`;
      result.className = answer.is_correct ? "is-correct" : "is-wrong";
      item.append(title, result);
      list.appendChild(item);
    });
    details.appendChild(list);
    return details;
  }

  function renderRecords() {
    const body = document.querySelector("#admin-records-body");
    body.innerHTML = "";
    state.attempts.forEach(function (attempt) {
      const row = document.createElement("tr");
      const resultCell = document.createElement("td");
      const actions = document.createElement("td");
      resultCell.append(`${attempt.correct} / ${attempt.total} · ${attempt.rate}%`, createAnswerDetails(attempt));
      actions.appendChild(createActionButton("기록 삭제", "delete-attempt", attempt.id, "danger"));
      row.append(
        createCell(attempt.user_email || attempt.user_id),
        createCell(getCertificate(attempt.certificate_id)?.name || attempt.certificate_id),
        createCell(formatDate(attempt.completed_on, false)),
        resultCell,
        actions
      );
      body.appendChild(row);
    });
    document.querySelector("#admin-records-empty").hidden = body.childElementCount > 0;
  }

  function renderAll() {
    renderOverview();
    renderContent();
    renderUsers();
    renderRecords();
  }

  async function loadAdminData() {
    clearMessage();
    const refreshButton = document.querySelector("#admin-refresh");
    refreshButton.disabled = true;
    refreshButton.textContent = "불러오는 중...";

    if (!databaseClient || !window.currentAuthSession?.user) {
      showMessage("로그인 상태에서 관리자 데이터를 불러올 수 있습니다.", "error");
      refreshButton.disabled = false;
      refreshButton.textContent = "새로고침";
      return;
    }

    const results = await Promise.all([
      databaseClient.from("certificates").select("id,name,short_name,description").order("id"),
      databaseClient.from("questions").select("id,certificate_id,display_order,question_text,options,correct_option,explanation").order("certificate_id").order("display_order"),
      databaseClient.from("profiles").select("user_id,user_email,nickname,selected_certificate_id,updated_at").order("updated_at", { ascending: false }),
      databaseClient.from("quiz_attempts").select("id,user_id,user_email,certificate_id,completed_on,total,correct,rate,created_at").order("created_at", { ascending: false }),
      databaseClient.from("quiz_attempt_answers").select("attempt_id,question_id,user_id,user_email,selected_option,is_correct")
    ]);

    const keys = ["certificates", "questions", "profiles", "attempts", "answers"];
    const failed = [];
    results.forEach(function (result, index) {
      if (result.error) failed.push(keys[index]);
      else state[keys[index]] = result.data || [];
    });

    renderAll();
    if (failed.length > 0) {
      showMessage(`일부 데이터를 불러오지 못했습니다: ${failed.join(", ")}. 현재 계정의 권한을 확인해 주세요.`, "error");
    }
    refreshButton.disabled = false;
    refreshButton.textContent = "새로고침";
  }

  function addField(container, labelText, name, value, options) {
    const wrapper = document.createElement("label");
    wrapper.className = "admin-form-field";
    const label = document.createElement("span");
    label.textContent = labelText;
    let input;

    if (options?.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = options.rows || 3;
    } else if (options?.type === "select") {
      input = document.createElement("select");
      options.items.forEach(function (item) {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        input.appendChild(option);
      });
    } else {
      input = document.createElement("input");
      input.type = options?.type || "text";
      if (options?.min !== undefined) input.min = String(options.min);
      if (options?.max !== undefined) input.max = String(options.max);
      if (options?.readonly) input.readOnly = true;
    }

    input.name = name;
    input.value = value ?? "";
    input.required = options?.required !== false;
    wrapper.append(label, input);
    container.appendChild(wrapper);
  }

  function openCertificateEditor(id) {
    const certificate = getCertificate(id);
    if (!certificate) return;
    state.editing = { type: "certificate", id };
    document.querySelector("#admin-dialog-title").textContent = "자격증 정보 수정";
    const fields = document.querySelector("#admin-dialog-fields");
    fields.innerHTML = "";
    addField(fields, "자격증 ID", "id", certificate.id, { readonly: true });
    addField(fields, "자격증명", "name", certificate.name);
    addField(fields, "짧은 이름", "short_name", certificate.short_name);
    addField(fields, "설명", "description", certificate.description, { type: "textarea" });
    document.querySelector("#admin-edit-dialog").showModal();
  }

  function openQuestionEditor(id) {
    const question = getQuestion(id);
    if (!question) return;
    state.editing = { type: "question", id };
    document.querySelector("#admin-dialog-title").textContent = "문제 내용 수정";
    const fields = document.querySelector("#admin-dialog-fields");
    fields.innerHTML = "";
    addField(fields, "자격증", "certificate_id", question.certificate_id, {
      type: "select",
      items: state.certificates.map(function (certificate) {
        return { value: certificate.id, label: certificate.name };
      })
    });
    addField(fields, "문제 순서", "display_order", question.display_order, { type: "number", min: 1 });
    addField(fields, "문제", "question_text", question.question_text, { type: "textarea", rows: 4 });
    (question.options || []).forEach(function (option, index) {
      addField(fields, `선택지 ${index + 1}`, `option_${index}`, option);
    });
    addField(fields, "정답", "correct_option", String(question.correct_option), {
      type: "select",
      items: [0, 1, 2, 3].map(function (value) {
        return { value: String(value), label: `${value + 1}번` };
      })
    });
    addField(fields, "해설", "explanation", question.explanation, { type: "textarea", rows: 4 });
    document.querySelector("#admin-edit-dialog").showModal();
  }

  async function saveEditor(event) {
    event.preventDefault();
    if (!state.editing) return;
    const button = document.querySelector("#admin-dialog-submit");
    const formData = new FormData(event.currentTarget);
    button.disabled = true;
    button.textContent = "저장 중...";
    let result;

    if (state.editing.type === "certificate") {
      result = await databaseClient.from("certificates").update({
        name: formData.get("name").trim(),
        short_name: formData.get("short_name").trim(),
        description: formData.get("description").trim()
      }).eq("id", state.editing.id);
    } else {
      result = await databaseClient.from("questions").update({
        certificate_id: formData.get("certificate_id"),
        display_order: Number(formData.get("display_order")),
        question_text: formData.get("question_text").trim(),
        options: [0, 1, 2, 3].map(function (index) {
          return formData.get(`option_${index}`).trim();
        }),
        correct_option: Number(formData.get("correct_option")),
        explanation: formData.get("explanation").trim()
      }).eq("id", state.editing.id);
    }

    button.disabled = false;
    button.textContent = "저장";
    if (result.error) {
      showMessage("내용을 저장하지 못했습니다. 관리자 권한과 정책을 확인해 주세요.", "error");
      return;
    }
    document.querySelector("#admin-edit-dialog").close();
    await loadAdminData();
    showMessage("변경 내용을 저장했습니다.", "success");
  }

  async function deleteAttempt(id) {
    if (!window.confirm("이 학습 기록과 연결된 문제별 답안을 삭제할까요?")) return;
    const result = await databaseClient.from("quiz_attempts").delete().eq("id", id);
    if (result.error) {
      showMessage("학습 기록을 삭제하지 못했습니다. 관리자 권한과 정책을 확인해 주세요.", "error");
      return;
    }
    await loadAdminData();
    showMessage("학습 기록을 삭제했습니다.", "success");
  }

  function initializeNavigation() {
    document.querySelectorAll("[data-admin-target]").forEach(function (button) {
      button.addEventListener("click", function () {
        const target = button.dataset.adminTarget;
        document.querySelectorAll("[data-admin-target]").forEach(function (item) {
          item.classList.toggle("is-active", item === button);
        });
        document.querySelectorAll("[data-admin-panel]").forEach(function (panel) {
          panel.hidden = panel.dataset.adminPanel !== target;
        });
        document.querySelector("#admin-page-title").textContent = panelMeta[target][0];
        document.querySelector("#admin-page-description").textContent = panelMeta[target][1];
      });
    });
  }

  function initializeActions() {
    document.addEventListener("click", function (event) {
      const button = event.target.closest("[data-admin-action]");
      if (!button) return;
      if (button.dataset.adminAction === "edit-certificate") openCertificateEditor(button.dataset.id);
      else if (button.dataset.adminAction === "edit-question") openQuestionEditor(button.dataset.id);
      else if (button.dataset.adminAction === "delete-attempt") deleteAttempt(button.dataset.id);
    });

    document.querySelector("#admin-refresh").addEventListener("click", loadAdminData);
    document.querySelector("#admin-edit-form").addEventListener("submit", saveEditor);
    document.querySelector("#admin-dialog-close").addEventListener("click", function () {
      document.querySelector("#admin-edit-dialog").close();
    });
    document.querySelector("#admin-dialog-cancel").addEventListener("click", function () {
      document.querySelector("#admin-edit-dialog").close();
    });
  }

  function initializeAdmin() {
    initializeNavigation();
    initializeActions();
    loadAdminData();
  }

  if (document.body.classList.contains("auth-ready")) initializeAdmin();
  else window.addEventListener("auth:ready", function (event) {
    if (event.detail.session) initializeAdmin();
  }, { once: true });
})();
