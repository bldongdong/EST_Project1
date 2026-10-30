(function () {
  "use strict";

  const databaseClient = window.supabaseClient;
  const ATTEMPT_KEY_PREFIX = "dailyQuizUserAttempts:v1:";
  const PROFILE_KEY_PREFIX = "dailyQuizUserProfile:v1:";

  function readLocal(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function getAttemptKey(userId) {
    return `${ATTEMPT_KEY_PREFIX}${userId}`;
  }

  function getProfileKey(userId) {
    return `${PROFILE_KEY_PREFIX}${userId}`;
  }

  function saveAttemptLocally(attempt) {
    const key = getAttemptKey(attempt.user_id);
    const attempts = readLocal(key, []);
    const nextAttempts = [attempt].concat(
      attempts.filter(function (item) {
        return item.id !== attempt.id;
      })
    );
    writeLocal(key, nextAttempts);
  }

  function getLocalAttempts(userId) {
    return readLocal(getAttemptKey(userId), []);
  }

  function sortAttempts(attempts) {
    return attempts.sort(function (a, b) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  function mergeAttempts(primary, secondary) {
    const attemptMap = new Map();
    secondary.forEach(function (attempt) {
      attemptMap.set(attempt.id, attempt);
    });
    primary.forEach(function (attempt) {
      const localAttempt = attemptMap.get(attempt.id);
      attemptMap.set(attempt.id, {
        ...localAttempt,
        ...attempt,
        answers: attempt.answers?.length ? attempt.answers : (localAttempt?.answers || [])
      });
    });
    return sortAttempts(Array.from(attemptMap.values()));
  }

  function getAttemptRow(attempt) {
    return {
      id: attempt.id,
      user_id: attempt.user_id,
      certificate_id: attempt.certificate_id,
      completed_on: attempt.completed_on,
      total: attempt.total,
      correct: attempt.correct,
      rate: attempt.rate,
      created_at: attempt.created_at
    };
  }

  function getAnswerRows(attempt) {
    return (attempt.answers || []).filter(function (answer) {
      return Boolean(answer.question_id);
    }).map(function (answer) {
      return {
        attempt_id: attempt.id,
        question_id: answer.question_id,
        selected_option: answer.selected_answer,
        is_correct: answer.is_correct
      };
    });
  }

  async function saveAttemptToDatabase(attempt) {
    const attemptResult = await databaseClient
      .from("quiz_attempts")
      .upsert(getAttemptRow(attempt), { onConflict: "id" });
    if (attemptResult.error) return { synced: false, error: attemptResult.error };

    const answerRows = getAnswerRows(attempt);
    if (answerRows.length === 0) return { synced: true };

    const existingResult = await databaseClient
      .from("quiz_attempt_answers")
      .select("question_id")
      .eq("attempt_id", attempt.id);
    if (existingResult.error) return { synced: false, error: existingResult.error };

    const existingQuestionIds = new Set((existingResult.data || []).map(function (answer) {
      return answer.question_id;
    }));
    const missingAnswers = answerRows.filter(function (answer) {
      return !existingQuestionIds.has(answer.question_id);
    });
    if (missingAnswers.length === 0) return { synced: true };

    const answerResult = await databaseClient
      .from("quiz_attempt_answers")
      .insert(missingAnswers);
    if (answerResult.error) return { synced: false, error: answerResult.error };
    return { synced: true };
  }

  async function saveAttempt(attempt) {
    saveAttemptLocally(attempt);

    if (!databaseClient) return { synced: false };

    try {
      const result = await saveAttemptToDatabase(attempt);
      if (result.synced) return result;

      console.warn("학습 기록은 이 브라우저에 저장되었습니다. Supabase 동기화는 DB 설정 후 활성화됩니다.");
      return result;
    } catch (error) {
      return { synced: false, error };
    }
  }

  async function getAttempts(userId) {
    const localAttempts = getLocalAttempts(userId);
    if (!databaseClient) return { attempts: sortAttempts(localAttempts), synced: false };

    try {
      let syncError = null;
      for (const attempt of localAttempts) {
        const syncResult = await saveAttemptToDatabase(attempt);
        if (!syncResult.synced && !syncError) syncError = syncResult.error;
      }

      const { data, error } = await databaseClient
        .from("quiz_attempts")
        .select("id,user_id,certificate_id,completed_on,total,correct,rate,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) return { attempts: sortAttempts(localAttempts), synced: false, error };

      const databaseAttempts = data || [];
      const attemptIds = databaseAttempts.map(function (attempt) {
        return attempt.id;
      });
      let databaseAnswers = [];

      if (attemptIds.length > 0) {
        const answerResult = await databaseClient
          .from("quiz_attempt_answers")
          .select("attempt_id,question_id,selected_option,is_correct")
          .in("attempt_id", attemptIds);
        if (answerResult.error) {
          return { attempts: sortAttempts(localAttempts), synced: false, error: answerResult.error };
        }
        databaseAnswers = answerResult.data || [];
      }

      const attemptsWithAnswers = databaseAttempts.map(function (attempt) {
        return {
          ...attempt,
          answers: databaseAnswers.filter(function (answer) {
            return answer.attempt_id === attempt.id;
          }).map(function (answer) {
            return {
              question_id: answer.question_id,
              selected_answer: answer.selected_option,
              is_correct: answer.is_correct
            };
          })
        };
      });
      const attempts = mergeAttempts(attemptsWithAnswers, localAttempts);
      writeLocal(getAttemptKey(userId), attempts);
      return { attempts, synced: !syncError, error: syncError };
    } catch (error) {
      return { attempts: sortAttempts(localAttempts), synced: false, error };
    }
  }

  async function getProfile(userId) {
    const localProfile = readLocal(getProfileKey(userId), {
      nickname: "",
      selected_certificate_id: null
    });
    if (!databaseClient) return { profile: localProfile, synced: false };

    try {
      const { data, error } = await databaseClient
        .from("profiles")
        .select("nickname,selected_certificate_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) return { profile: localProfile, synced: false, error };

      const profile = data || localProfile;
      writeLocal(getProfileKey(userId), profile);
      return { profile, synced: true };
    } catch (error) {
      return { profile: localProfile, synced: false, error };
    }
  }

  async function updateNickname(userId, nickname) {
    const currentProfile = readLocal(getProfileKey(userId), {
      nickname: "",
      selected_certificate_id: null
    });
    const profile = { ...currentProfile, nickname };
    writeLocal(getProfileKey(userId), profile);

    if (!databaseClient) return { profile, synced: false };

    try {
      const { error } = await databaseClient.from("profiles").upsert(
        {
          user_id: userId,
          nickname,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );

      if (error) return { profile, synced: false, error };
      return { profile, synced: true };
    } catch (error) {
      return { profile, synced: false, error };
    }
  }

  async function updateSelectedCertificate(userId, certificateId) {
    const currentProfile = readLocal(getProfileKey(userId), {
      nickname: "",
      selected_certificate_id: null
    });
    const profile = { ...currentProfile, selected_certificate_id: certificateId };
    writeLocal(getProfileKey(userId), profile);

    if (!databaseClient) return { profile, synced: false };

    try {
      const { error } = await databaseClient.from("profiles").upsert(
        {
          user_id: userId,
          selected_certificate_id: certificateId,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );

      if (error) return { profile, synced: false, error };
      return { profile, synced: true };
    } catch (error) {
      return { profile, synced: false, error };
    }
  }

  window.learningRecords = {
    getAttempts,
    getProfile,
    saveAttempt,
    updateNickname,
    updateSelectedCertificate
  };
})();
