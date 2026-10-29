(function () {
  "use strict";

  const SUPABASE_URL = "https://qnwfpqomqakoykphucqm.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_pMk1rEQcwa2gmXbbng0gtA_2ix68she";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase 라이브러리를 불러오지 못했습니다.");
    return;
  }

  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
})();
