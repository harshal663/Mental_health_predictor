(() => {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */
  const API_BASE = "https://mental-health-predictor-2oav.onrender.com";
  const GAUGE_ARC_LENGTH = 314; // approx pi * r(100)

  /* =========================================================
     DOM CACHE
     ========================================================= */
  const dom = {
    form: document.getElementById("predict-form"),
    submitBtn: document.getElementById("submit-btn"),
    resetBtn: document.getElementById("reset-btn"),
    errorRetryBtn: document.getElementById("error-retry-btn"),

    resultShell: document.getElementById("result-shell"),

    scoreNumber: document.getElementById("score-number"),
    scoreBand: document.getElementById("score-band"),
    scoreContext: document.getElementById("score-context"),
    gaugeFill: document.getElementById("gauge-fill"),

    errorLabel: document.getElementById("error-label"),
    errorCopy: document.getElementById("error-copy"),

    stressGroup: document.getElementById("stress_level_group"),
    stressInput: document.getElementById("stress_level"),
  };

  /* =========================================================
     RESULT STATE MACHINE
     Exactly one of idle | loading | result | error is ever
     visible — driven entirely by data-state on the shell.
     ========================================================= */
  const ResultPanel = {
    show(state) {
      dom.resultShell.dataset.state = state;
    },
  };

  /* =========================================================
     GAUGE — tick marks + fill animation
     ========================================================= */
  const Gauge = {
    drawTicks() {
      document.querySelectorAll(".gauge-ticks").forEach((g) => {
        g.innerHTML = "";
        const cx = 120, cy = 140, rOuter = 100, rInner = 90;
        for (let i = 0; i <= 10; i += 2) {
          const angle = Math.PI - (i / 10) * Math.PI; // 180deg -> 0deg
          const x1 = cx + rOuter * Math.cos(angle);
          const y1 = cy - rOuter * Math.sin(angle);
          const x2 = cx + rInner * Math.cos(angle);
          const y2 = cy - rInner * Math.sin(angle);
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", x1.toFixed(1));
          line.setAttribute("y1", y1.toFixed(1));
          line.setAttribute("x2", x2.toFixed(1));
          line.setAttribute("y2", y2.toFixed(1));
          g.appendChild(line);
        }
      });
    },

    setFill(score) {
      const clamped = Math.max(0, Math.min(10, score));
      dom.gaugeFill.style.transition = "none";
      dom.gaugeFill.style.strokeDashoffset = String(GAUGE_ARC_LENGTH);
      requestAnimationFrame(() => {
        dom.gaugeFill.style.transition = "";
        const offset = GAUGE_ARC_LENGTH * (1 - clamped / 10);
        dom.gaugeFill.style.strokeDashoffset = String(offset);
      });
    },
  };

  /* =========================================================
     SEGMENTED CONTROL (stress_level)
     ========================================================= */
  const StressControl = {
    init() {
      dom.stressGroup.querySelectorAll(".seg-btn").forEach((btn) => {
        btn.addEventListener("click", () => this.select(btn));
      });
    },
    select(btn) {
      dom.stressGroup.querySelectorAll(".seg-btn").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-checked", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-checked", "true");
      dom.stressInput.value = btn.dataset.value;
      FieldErrors.clear(dom.stressInput);
    },
  };

  /* =========================================================
     FIELD-LEVEL ERROR HELPERS
     ========================================================= */
  const FieldErrors = {
    wrapper(input) {
      return input ? input.closest(".field") : null;
    },
    set(input, message) {
      const wrap = this.wrapper(input);
      if (!wrap) return;
      wrap.classList.add("field-error");
      const msgEl = wrap.querySelector(".error-msg");
      if (msgEl) msgEl.textContent = message;
    },
    clear(input) {
      const wrap = this.wrapper(input);
      if (!wrap) return;
      wrap.classList.remove("field-error");
      const msgEl = wrap.querySelector(".error-msg");
      if (msgEl) msgEl.textContent = "";
    },
    clearAll() {
      dom.form.querySelectorAll(".field").forEach((f) => f.classList.remove("field-error"));
      dom.form.querySelectorAll(".error-msg").forEach((m) => (m.textContent = ""));
    },
  };

  /* =========================================================
     PAYLOAD — mirrors the StudentData API model exactly
     ========================================================= */
  const Payload = {
    collect() {
      const fd = new FormData(dom.form);
      return {
        age: fd.get("age") === "" ? NaN : parseInt(fd.get("age"), 10),
        gender: fd.get("gender") || "",
        country: (fd.get("country") || "").trim(),
        academic_level: fd.get("academic_level") || "",
        most_used_platform: fd.get("most_used_platform") || "",
        purpose_of_use: fd.get("purpose_of_use") || "",
        avg_daily_usage_hours: fd.get("avg_daily_usage_hours") === "" ? NaN : parseFloat(fd.get("avg_daily_usage_hours")),
        daily_unlocks: fd.get("daily_unlocks") === "" ? NaN : parseInt(fd.get("daily_unlocks"), 10),
        study_hours: fd.get("study_hours") === "" ? NaN : parseFloat(fd.get("study_hours")),
        physical_activity_hours: fd.get("physical_activity_hours") === "" ? NaN : parseFloat(fd.get("physical_activity_hours")),
        sleep_hours_per_night: fd.get("sleep_hours_per_night") === "" ? NaN : parseFloat(fd.get("sleep_hours_per_night")),
        stress_level: fd.get("stress_level") || "",
      };
    },

    validate(payload) {
      const errors = [];

      const numericChecks = [
        ["age", 10, 100],
        ["avg_daily_usage_hours", 0, 24],
        ["daily_unlocks", 0, Infinity],
        ["study_hours", 0, 24],
        ["physical_activity_hours", 0, 24],
        ["sleep_hours_per_night", 0, 24],
      ];

      numericChecks.forEach(([key, min, max]) => {
        const input = document.getElementById(key);
        const val = payload[key];
        if (val === "" || val === null || Number.isNaN(val)) {
          errors.push([input, "This field is required."]);
        } else if (val < min || val > max) {
          errors.push([input, `Must be between ${min} and ${max === Infinity ? "0+" : max}.`]);
        }
      });

      ["gender", "country", "academic_level", "most_used_platform", "purpose_of_use"].forEach((key) => {
        const input = document.getElementById(key);
        if (!payload[key] || String(payload[key]).trim() === "") {
          errors.push([input, "This field is required."]);
        }
      });

      if (!payload.stress_level) {
        errors.push([dom.stressInput, "Pick a stress level."]);
      }

      return errors;
    },
  };

  /* =========================================================
     RESULT RENDERING
     ========================================================= */
  function bandFor(score) {
    if (score < 4) {
      return {
        label: "Signal: strained",
        context: "Your responses suggest elevated strain right now. Small shifts in sleep or screen time can go a long way.",
      };
    }
    if (score < 7) {
      return {
        label: "Signal: balanced",
        context: "Your rhythm looks fairly steady, with some room to recover and reset.",
      };
    }
    return {
      label: "Signal: strong",
      context: "Your habits point to a well-supported, resilient baseline. Keep it up.",
    };
  }

  function renderResult(score) {
    const clamped = Math.max(0, Math.min(10, score));
    const { label, context } = bandFor(clamped);

    dom.scoreNumber.textContent = score.toFixed(2);
    dom.scoreBand.textContent = label;
    dom.scoreContext.textContent = context;

    Gauge.setFill(clamped);
    ResultPanel.show("result");
  }

  function renderError(label, copy) {
    dom.errorLabel.textContent = label;
    dom.errorCopy.textContent = copy;
    ResultPanel.show("error");
  }

  function setSubmitting(isSubmitting) {
    dom.submitBtn.disabled = isSubmitting;
    dom.submitBtn.classList.toggle("loading", isSubmitting);
  }

  /* =========================================================
     Parse FastAPI / Pydantic 422 error responses into
     field-level messages where possible
     ========================================================= */
  function applyServerValidationErrors(detail) {
    if (!Array.isArray(detail)) return false;
    let matched = false;
    detail.forEach((err) => {
      const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : null;
      const input = field ? document.getElementById(field) : null;
      const target = field === "stress_level" ? dom.stressInput : input;
      if (target) {
        FieldErrors.set(target, err.msg || "Invalid value.");
        matched = true;
      }
    });
    return matched;
  }

  /* =========================================================
     SUBMIT HANDLER
     ========================================================= */
  async function handleSubmit(e) {
    e.preventDefault();
    FieldErrors.clearAll();

    const payload = Payload.collect();
    const clientErrors = Payload.validate(payload);

    if (clientErrors.length > 0) {
      clientErrors.forEach(([input, msg]) => input && FieldErrors.set(input, msg));
      clientErrors[0][0]?.focus?.();
      return;
    }

    setSubmitting(true);
    ResultPanel.show("loading");

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 422) {
        const body = await res.json().catch(() => null);
        const matched = body && applyServerValidationErrors(body.detail);
        renderError(
          "Check your inputs",
          matched
            ? "The API rejected a few fields — details are marked on the form."
            : "The API rejected this submission. Please review your inputs and try again."
        );
        return;
      }

      if (!res.ok) {
        let detailMsg = `The API responded with status ${res.status}.`;
        const body = await res.json().catch(() => null);
        if (body && typeof body.detail === "string") detailMsg = body.detail;
        renderError("Prediction failed", detailMsg);
        return;
      }

      const data = await res.json();
      if (typeof data.predicted_mental_health_score !== "number") {
        renderError("Unexpected response", "The API responded, but the score was missing or malformed.");
        return;
      }

      renderResult(data.predicted_mental_health_score);
    } catch (err) {
      renderError(
        "Can't reach the server",
        `Couldn't connect to ${API_BASE}. Make sure the backend is running (uvicorn main:app --port 2200 --reload) and reachable from this page.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================================================
     WIRE UP
     ========================================================= */
  function init() {
    Gauge.drawTicks();
    StressControl.init();

    dom.form.addEventListener("submit", handleSubmit);

    dom.form.querySelectorAll("input, select").forEach((el) => {
      el.addEventListener("input", () => FieldErrors.clear(el));
      el.addEventListener("change", () => FieldErrors.clear(el));
    });

    dom.resetBtn.addEventListener("click", () => ResultPanel.show("idle"));
    dom.errorRetryBtn.addEventListener("click", () => ResultPanel.show("idle"));
  }

  init();
})();