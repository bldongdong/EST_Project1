(function () {
  "use strict";

  const databaseClient = window.supabaseClient;
  let loadPromise = null;
  let lastError = null;

  function loadQuizData() {
    if (loadPromise) return loadPromise;

    loadPromise = (async function () {
      if (!databaseClient) {
        lastError = new Error("Supabase에 연결할 수 없습니다.");
        return {};
      }

      try {
        const [certificateResult, questionResult] = await Promise.all([
          databaseClient
            .from("certificates")
            .select("id,name,short_name,description")
            .order("id", { ascending: true }),
          databaseClient
            .from("questions")
            .select("id,certificate_id,display_order,question_text,options,correct_option,explanation")
            .order("certificate_id", { ascending: true })
            .order("display_order", { ascending: true })
        ]);

        if (certificateResult.error) throw certificateResult.error;
        if (questionResult.error) throw questionResult.error;

        const quizData = {};
        (certificateResult.data || []).forEach(function (certificate) {
          quizData[certificate.id] = {
            id: certificate.id,
            shortName: certificate.short_name,
            name: certificate.name,
            description: certificate.description,
            questions: []
          };
        });

        (questionResult.data || []).forEach(function (question) {
          const certificate = quizData[question.certificate_id];
          if (!certificate) return;

          certificate.questions.push({
            id: question.id,
            displayOrder: question.display_order,
            question: question.question_text,
            options: Array.isArray(question.options) ? question.options : [],
            answer: question.correct_option,
            explanation: question.explanation
          });
        });

        window.QUIZ_DATA = quizData;
        lastError = null;
        return quizData;
      } catch (error) {
        console.error("자격증 퀴즈 데이터를 불러오지 못했습니다.", error);
        window.QUIZ_DATA = {};
        lastError = error;
        return {};
      }
    })();

    return loadPromise;
  }

  window.quizDataStore = {
    load: loadQuizData,
    getError: function () {
      return lastError;
    }
  };
})();
