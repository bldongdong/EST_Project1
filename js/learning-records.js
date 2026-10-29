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
    secondary.concat(primary).forEach(function (attempt) {
      attemptMap.set(attempt.id, attempt);
    });
    return sortAttempts(Array.from(attemptMap.values()));
  }

  async function saveAttempt(attempt) {
    saveAttemptLocally(attempt);

    if (!databaseClient) return { synced: false };

    try {
      const { error } = await databaseClient.from("quiz_attempts").upsert(attempt, {
        onConflict: "id"
      });
      if (!error) return { synced: true };

      console.warn("학습 기록은 이 브라우저에 저장되었습니다. Supabase 동기화는 DB 설정 후 활성화됩니다.");
      return { synced: false, error };
    } catch (error) {
      return { synced: false, error };
    }
  }

  async function getAttempts(userId) {
    const localAttempts = getLocalAttempts(userId);
    if (!databaseClient) return { attempts: sortAttempts(localAttempts), synced: false };

    try {
      let syncError = null;
      if (localAttempts.length > 0) {
        const syncResult = await databaseClient
          .from("quiz_attempts")
          .upsert(localAttempts, { onConflict: "id" });
        syncError = syncResult.error;
      }

      const { data, error } = await databaseClient
        .from("quiz_attempts")
        .select("id,user_id,certificate_id,completed_on,total,correct,rate,answers,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) return { attempts: sortAttempts(localAttempts), synced: false, error };

      const attempts = mergeAttempts(data || [], localAttempts);
      writeLocal(getAttemptKey(userId), attempts);
      return { attempts, synced: !syncError, error: syncError };
    } catch (error) {
      return { attempts: sortAttempts(localAttempts), synced: false, error };
    }
  }

  async function getProfile(userId) {
    const localProfile = readLocal(getProfileKey(userId), { nickname: "" });
    if (!databaseClient) return { profile: localProfile, synced: false };

    try {
      let syncError = null;
      if (localProfile.nickname) {
        const syncResult = await databaseClient.from("profiles").upsert(
          {
            user_id: userId,
            nickname: localProfile.nickname,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id" }
        );
        syncError = syncResult.error;
      }

      const { data, error } = await databaseClient
        .from("profiles")
        .select("nickname")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) return { profile: localProfile, synced: false, error };

      const profile = data || localProfile;
      writeLocal(getProfileKey(userId), profile);
      return { profile, synced: !syncError, error: syncError };
    } catch (error) {
      return { profile: localProfile, synced: false, error };
    }
  }

  async function updateNickname(userId, nickname) {
    const profile = { nickname };
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

  window.learningRecords = {
    getAttempts,
    getProfile,
    saveAttempt,
    updateNickname
  };
})();
