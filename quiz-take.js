(function () {
  var API_BASE = "http://localhost:8080";

  function getToken() {
    try {
      var user = JSON.parse(sessionStorage.getItem("quizUser") || "null");
      return user ? String(user.token || "") : "";
    } catch (e) { return ""; }
  }

  function getStoredUser() {
    try {
      return JSON.parse(sessionStorage.getItem("quizUser") || "null");
    } catch (e) {
      return null;
    }
  }

  function apiGet(path) {
    return fetch(API_BASE + path, {
      headers: { "X-Auth-Token": getToken() }
    }).then(function (res) {
      if (!res.ok) throw new Error("API error: " + res.status);
      return res.json();
    });
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function toDisplayTime(totalSeconds) {
    var safeTotal = Math.max(0, Number(totalSeconds) || 0);
    var m = Math.floor(safeTotal / 60).toString().padStart(2, "0");
    var s = (safeTotal % 60).toString().padStart(2, "0");
    return m + ":" + s;
  }

  function getFirstName(fullName) {
    var normalized = String(fullName || "").trim();
    if (!normalized) return "Student";
    return normalized.split(/\s+/)[0] || "Student";
  }

  function toSortedIds(values) {
    return (Array.isArray(values) ? values : []).map(function (value) {
      return String(value);
    }).sort();
  }

  function buildQuestionExplanation(question, correctOptions) {
    var explicit = String((question && question.explanation) || "").trim();
    if (explicit) return explicit;

    if (!correctOptions.length) {
      return "The correct answer is determined by the option marked as valid in this quiz configuration.";
    }

    if (correctOptions.length === 1) {
      return "The correct answer is \"" + correctOptions[0] + "\" because it is the option marked as correct for this question.";
    }

    return "The correct answers are " + correctOptions.map(function (label) {
      return "\"" + label + "\"";
    }).join(", ") + " because this question expects multiple valid selections.";
  }

  /* ── Timer ─────────────────────────────────────────────────── */
  function startTimer(minutes, pill, display, onExpire) {
    if (!Number.isFinite(minutes) || minutes <= 0) {
      minutes = 20;
    }
    var remaining = minutes * 60;
    function render() {
      var m = Math.floor(remaining / 60).toString().padStart(2, "0");
      var s = (remaining % 60).toString().padStart(2, "0");
      display.textContent = m + ":" + s;
      if (pill) pill.classList.toggle("warning", remaining <= 60);
    }
    render();
    var iv = setInterval(function () {
      remaining -= 1;
      render();
      if (remaining <= 0) { clearInterval(iv); onExpire(); }
    }, 1000);
    return {
      stop: function () { clearInterval(iv); },
      getRemaining: function () { return Math.max(0, remaining); }
    };
  }

  /* ── Score ──────────────────────────────────────────────────── */
  function calculateScore(form) {
    var questionCards = Array.prototype.slice.call(form.querySelectorAll(".question-card[data-question-id]"));
    var total = questionCards.length;
    var score = 0;

    questionCards.forEach(function (card) {
      var inputs = Array.prototype.slice.call(card.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
      var correct = inputs
        .filter(function (input) { return input.dataset.correct === "true"; })
        .map(function (input) { return input.value; })
        .sort();
      var chosen = inputs
        .filter(function (input) { return input.checked; })
        .map(function (input) { return input.value; })
        .sort();

      var sameLength = correct.length === chosen.length;
      var sameValues = sameLength && correct.every(function (value, idx) { return value === chosen[idx]; });
      if (sameValues) {
        score += 1;
      }
    });

    return { score: score, total: total };
  }

  function syncOptionCardState(scope) {
    if (!scope) return;
    var cards = Array.prototype.slice.call(scope.querySelectorAll(".option-card"));
    cards.forEach(function (card) {
      var input = card.querySelector('input[type="radio"], input[type="checkbox"]');
      card.classList.toggle("is-selected", Boolean(input && input.checked));
    });
  }

  function getProgressState(form, totalQuestions) {
    if (!form || totalQuestions <= 0) {
      return { currentQuestion: 0, percent: 0 };
    }

    var cards = Array.prototype.slice.call(form.querySelectorAll(".question-card[data-question-id]"));
    var firstUnansweredIndex = cards.findIndex(function (card) {
      return !card.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked');
    });
    var currentQuestion = firstUnansweredIndex === -1 ? totalQuestions : firstUnansweredIndex + 1;
    var percent = Math.round((currentQuestion / totalQuestions) * 100);
    return { currentQuestion: currentQuestion, percent: percent };
  }

  function syncProgressBar(form, progressFill, progressText, totalQuestions) {
    if (!form || !progressFill) return;
    var progress = getProgressState(form, totalQuestions);
    progressFill.style.width = progress.percent + "%";
    progressFill.setAttribute("aria-valuenow", String(progress.currentQuestion));
    if (progressText) {
      progressText.textContent = "Question " + progress.currentQuestion + " of " + totalQuestions;
    }
  }

  function toModuleLabel(subject) {
    var base = String(subject || "Quiz").trim();
    if (!base) return "Quiz Platform";
    return /module$/i.test(base) ? base : base + " Module";
  }

  function toReviewHeaderTitle(subject) {
    var base = String(subject || "Quiz").trim() || "Quiz";
    return /quiz$/i.test(base) ? "Review: " + base : "Review: " + base + " Quiz";
  }

  function setHeaderText(quiz, titleEl, subjectEl) {
    if (!quiz) return;
    var headerTitle = quiz.module || quiz.category || quiz.title || "Quiz";
    var headerSubject = toModuleLabel(quiz.title || quiz.module || quiz.category || "Quiz");
    if (titleEl) titleEl.textContent = headerTitle;
    if (subjectEl) subjectEl.textContent = headerSubject;
    document.title = headerTitle;
  }

  function renderResultSummary(main, summary) {
    if (!main || !summary) return;
    var statusText = summary.passed ? "Passed" : "Failed";
    var totalQuestions = Math.max(1, Number(summary.total || 0));

    main.innerHTML = "";

    var hero = document.createElement("section");
    hero.className = "quiz-result-hero " + (summary.passed ? "is-pass" : "is-fail");
    hero.setAttribute("aria-label", "Quiz result summary");

    var ringWrap = document.createElement("div");
    ringWrap.className = "quiz-result-ring-wrap";
    var ring = document.createElement("div");
    ring.className = "quiz-result-ring " + (summary.passed ? "is-pass" : "is-fail");
    ring.style.setProperty("--result-progress", summary.percentage + "%");
    ring.setAttribute("role", "img");
    ring.setAttribute("aria-label", "Final score " + summary.percentage + " percent");
    var ringValue = document.createElement("span");
    ringValue.className = "quiz-result-ring-value";
    ringValue.textContent = summary.percentage + "%";
    ring.appendChild(ringValue);
    ringWrap.appendChild(ring);

    var copy = document.createElement("div");
    copy.className = "quiz-result-copy";
    var kicker = document.createElement("p");
    kicker.className = "quiz-result-kicker";
    kicker.textContent = "Quiz Complete";
    var headline = document.createElement("h2");
    headline.className = "quiz-result-headline";
    headline.textContent = summary.passed
      ? "Great job, " + summary.studentName + "!"
      : "Don't give up, try again!";
    var subtext = document.createElement("p");
    subtext.className = "quiz-result-subtext";
    subtext.textContent = summary.wasAutoSubmitted
      ? "Time is up. Your answers were auto-submitted."
      : "Your answers have been submitted successfully.";
    copy.appendChild(kicker);
    copy.appendChild(headline);
    copy.appendChild(subtext);

    var statGrid = document.createElement("div");
    statGrid.className = "quiz-result-stats";
    statGrid.setAttribute("role", "list");
    statGrid.setAttribute("aria-label", "Result details");

    function createStatCard(label, valueNode) {
      var card = document.createElement("article");
      card.className = "quiz-result-stat";
      card.setAttribute("role", "listitem");
      var labelEl = document.createElement("p");
      labelEl.className = "quiz-result-stat-label";
      labelEl.textContent = label;
      card.appendChild(labelEl);
      card.appendChild(valueNode);
      return card;
    }

    var scoreValue = document.createElement("p");
    scoreValue.className = "quiz-result-stat-value";
    scoreValue.textContent = summary.score + " / " + summary.total;
    statGrid.appendChild(createStatCard("Score", scoreValue));

    var timeValue = document.createElement("p");
    timeValue.className = "quiz-result-stat-value";
    timeValue.textContent = toDisplayTime(summary.elapsedSeconds);
    statGrid.appendChild(createStatCard("Time", timeValue));

    var accuracyValue = document.createElement("p");
    accuracyValue.className = "quiz-result-stat-value";
    accuracyValue.textContent = summary.percentage + "%";
    statGrid.appendChild(createStatCard("Accuracy", accuracyValue));

    var statusValue = document.createElement("span");
    statusValue.className = "quiz-result-status-badge " + (summary.passed ? "is-pass" : "is-fail");
    statusValue.textContent = statusText;
    statGrid.appendChild(createStatCard("Status", statusValue));

    hero.appendChild(ringWrap);
    hero.appendChild(copy);
    hero.appendChild(statGrid);
    main.appendChild(hero);

    var reviewSection = document.createElement("section");
    reviewSection.className = "quiz-review-section";
    reviewSection.setAttribute("aria-label", "Detailed review section");

    var reviewTitle = document.createElement("h3");
    reviewTitle.className = "quiz-review-title";
    reviewTitle.textContent = "Detailed Review";
    reviewSection.appendChild(reviewTitle);

    var reviewList = document.createElement("section");
    reviewList.className = "quiz-review-list";
    reviewList.setAttribute("aria-label", "Question review list");

    (summary.questionReviews || []).forEach(function (item) {
      var card = document.createElement("article");
      card.className = "quiz-review-card";

      var cardHead = document.createElement("div");
      cardHead.className = "quiz-review-head";
      var indexText = document.createElement("p");
      indexText.className = "quiz-review-index";
      indexText.textContent = "Question " + (item.index + 1) + " of " + totalQuestions;
      var badgeStatus = item.reviewStatus || (item.isCorrect ? "correct" : "incorrect");
      var badge = document.createElement("span");
      badge.className = "quiz-review-badge is-" + badgeStatus;
      badge.textContent = badgeStatus === "correct" ? "Correct" : (badgeStatus === "incorrect" ? "Incorrect" : "Unanswered");
      cardHead.appendChild(indexText);
      cardHead.appendChild(badge);

      var questionText = document.createElement("p");
      questionText.className = "quiz-review-question";
      questionText.textContent = item.question.text;

      var optionsList = document.createElement("ul");
      optionsList.className = "quiz-review-options";
      optionsList.setAttribute("aria-label", "Review options for question " + (item.index + 1));

      (item.question.options || []).forEach(function (option) {
        var optionId = String(option.id);
        var isCorrectOption = item.correctIds.indexOf(optionId) !== -1;
        var wasChosen = item.chosenIds.indexOf(optionId) !== -1;

        var optionEl = document.createElement("li");
        optionEl.className = "quiz-review-option" + (isCorrectOption
          ? " is-correct"
          : (wasChosen ? " is-wrong-selected" : ""));

        var optionText = document.createElement("span");
        optionText.className = "quiz-review-option-text";
        optionText.textContent = option.text;
        optionEl.appendChild(optionText);

        if (isCorrectOption) {
          var check = document.createElement("span");
          check.className = "quiz-review-option-icon is-correct";
          check.setAttribute("aria-hidden", "true");
          check.textContent = "\u2713";
          optionEl.appendChild(check);
        }

        if (!isCorrectOption && wasChosen) {
          var cross = document.createElement("span");
          cross.className = "quiz-review-option-icon is-incorrect";
          cross.setAttribute("aria-hidden", "true");
          cross.textContent = "\u2715";
          optionEl.appendChild(cross);
        }

        optionsList.appendChild(optionEl);
      });

      var learningNote = document.createElement("div");
      learningNote.className = "quiz-learning-note";
      learningNote.setAttribute("aria-label", "Learning note");

      var learningNoteTitle = document.createElement("p");
      learningNoteTitle.className = "quiz-learning-note-title";
      learningNoteTitle.innerHTML = "<span class=\"quiz-learning-note-title-icon\" aria-hidden=\"true\">&#128161;</span><span>Why is this correct?</span>";

      var learningNoteText = document.createElement("p");
      learningNoteText.className = "quiz-learning-note-text";
      learningNoteText.textContent = item.explanation;

      learningNote.appendChild(learningNoteTitle);
      learningNote.appendChild(learningNoteText);

      card.appendChild(cardHead);
      card.appendChild(questionText);
      card.appendChild(optionsList);
      card.appendChild(learningNote);
      reviewList.appendChild(card);
    });

    reviewSection.appendChild(reviewList);

    var reviewActions = document.createElement("div");
    reviewActions.className = "quiz-review-actions";
    var dashboardButton = document.createElement("button");
    dashboardButton.type = "button";
    dashboardButton.className = "btn-outline";
    dashboardButton.textContent = "Go to Student Dashboard";
    dashboardButton.addEventListener("click", function () {
      window.location.href = "student-dashboard.html";
    });
    reviewActions.appendChild(dashboardButton);
    reviewSection.appendChild(reviewActions);

    main.appendChild(reviewSection);
  }

  /* ── Render questions ───────────────────────────────────────── */
  function renderQuiz(quiz, questions, main, titleEl, subjectEl) {
    setHeaderText(quiz, titleEl, subjectEl);
    main.innerHTML = "";

    var liveShell = document.createElement("section");
    liveShell.className = "quiz-live-shell";
    main.appendChild(liveShell);

    var progressWrap = document.createElement("section");
    progressWrap.className = "quiz-progress";
    progressWrap.setAttribute("aria-label", "Quiz progress");
    var progressTrack = document.createElement("div");
    progressTrack.className = "quiz-progress-track";
    progressTrack.setAttribute("role", "progressbar");
    progressTrack.setAttribute("aria-valuemin", "1");
    progressTrack.setAttribute("aria-valuemax", String(questions.length));
    progressTrack.setAttribute("aria-valuenow", "1");
    var progressFill = document.createElement("div");
    progressFill.className = "quiz-progress-fill";
    progressTrack.appendChild(progressFill);
    progressWrap.appendChild(progressTrack);
    liveShell.appendChild(progressWrap);

    /* meta bar */
    var meta = document.createElement("div");
    meta.className = "quiz-meta";
    var metaList = document.createElement("ul");
    metaList.className = "quiz-meta-list";
    metaList.setAttribute("aria-label", "Quiz details");
    var moduleName = quiz.module || quiz.category || "General";
    var examType = quiz.examType || "General";
    var totalMarks = quiz.totalMarks || 100;
    var minutes = Number(quiz.minutes || 0);

    function appendMetaItem(icon, text) {
      var item = document.createElement("li");
      item.className = "quiz-meta-item";
      var iconEl = document.createElement("span");
      iconEl.className = "quiz-meta-icon";
      iconEl.setAttribute("aria-hidden", "true");
      iconEl.textContent = icon;
      var textEl = document.createElement("span");
      textEl.textContent = text;
      item.appendChild(iconEl);
      item.appendChild(textEl);
      metaList.appendChild(item);
    }

    appendMetaItem("📘", moduleName);
    appendMetaItem("🧪", examType);
    appendMetaItem("🎯", String(totalMarks) + " marks");
    appendMetaItem("❓", String(questions.length) + " questions");
    appendMetaItem("⏱", String(minutes) + " min");

    var pill = document.createElement("div");
    pill.className = "timer-pill quiz-hud-timer";
    var timerIcon = document.createElement("span");
    timerIcon.className = "timer-pill-icon";
    timerIcon.setAttribute("aria-hidden", "true");
    timerIcon.textContent = "⏳";
    var timerLabel = document.createElement("span");
    timerLabel.textContent = "Time left: ";
    var timerDisplay = document.createElement("span");
    timerDisplay.dataset.timeLeft = "";
    timerDisplay.textContent = "--:--";
    pill.appendChild(timerIcon);
    pill.appendChild(timerLabel);
    pill.appendChild(timerDisplay);
    liveShell.appendChild(pill);
    meta.appendChild(metaList);
    liveShell.appendChild(meta);

    /* quiz form */
    var form = document.createElement("form");
    form.className = "quiz-page";
    form.dataset.quizTimer = "";
    form.dataset.durationMinutes = String(quiz.minutes);
    form.dataset.quizTitle = quiz.title;

    questions.forEach(function (q, qi) {
      var card = document.createElement("article");
      card.className = "question-card";
      card.dataset.questionId = String(q.id);
      var questionType = q.questionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
      card.dataset.questionType = questionType;

      var qNum = document.createElement("p");
      qNum.className = "question-number";
      qNum.textContent = "Question " + (qi + 1) + " of " + questions.length;

      var qText = document.createElement("p");
      qText.className = "question-text";
      qText.textContent = q.text;

      var qHint = document.createElement("p");
      qHint.className = "quiz-instruction";
      qHint.textContent = questionType === "MULTIPLE"
        ? "Select all correct answers."
        : "Select one correct answer.";

      var optList = document.createElement("ul");
      optList.className = "option-list";

      (q.options || []).forEach(function (opt, oi) {
        var li = document.createElement("li");
        var label = document.createElement("label");
        label.className = "option-card";
        var radio = document.createElement("input");
        radio.type = questionType === "MULTIPLE" ? "checkbox" : "radio";
        radio.name = "q" + q.id;
        radio.value = String(opt.id);
        if (opt.correct) radio.dataset.correct = "true";
        radio.addEventListener("change", function () {
          syncOptionCardState(card);
        });
        var optionText = document.createElement("span");
        optionText.className = "option-text";
        optionText.textContent = opt.text;
        label.appendChild(radio);
        label.appendChild(optionText);
        li.appendChild(label);
        optList.appendChild(li);
      });

      card.appendChild(qNum);
      card.appendChild(qText);
      card.appendChild(qHint);
      card.appendChild(optList);
      syncOptionCardState(card);
      form.appendChild(card);
    });

    /* actions */
    var actions = document.createElement("div");
    actions.className = "quiz-actions";
    var submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.className = "btn-primary";
    submitBtn.textContent = "Submit Quiz";
    actions.appendChild(submitBtn);
    form.appendChild(actions);
    liveShell.appendChild(form);
    syncProgressBar(form, progressFill, null, questions.length);
    form.addEventListener("change", function () {
      syncProgressBar(form, progressFill, null, questions.length);
    });

    /* timer */
    var timerControl = startTimer(quiz.minutes, pill, timerDisplay, function () {
      form.dataset.autoSubmitted = "true";
      form.noValidate = true;
      form.requestSubmit();
    });

    /* submission */
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      timerControl.stop();
      var wasAutoSubmitted = form.dataset.autoSubmitted === "true";
      form.dataset.autoSubmitted = "false";
      var remainingSeconds = timerControl.getRemaining();
      var result = calculateScore(form);
      var totalQuestions = Math.max(1, Number(result.total || 0));
      var percentage = Math.round((Number(result.score || 0) / totalQuestions) * 100);
      var allottedSeconds = Math.max(1, Number(quiz.minutes || 20) * 60);
      var elapsedSeconds = Math.max(0, allottedSeconds - remainingSeconds);
      var studentName = getFirstName((getStoredUser() || {}).name);
      var selectedAnswersSnapshot = {};
      var questionReviews = questions.map(function (question, index) {
        var correctIds = toSortedIds((question.options || []).filter(function (option) {
          return option.correct;
        }).map(function (option) {
          return option.id;
        }));
        var chosenIds = toSortedIds(Array.prototype.slice.call(form.querySelectorAll('input[name="q' + question.id + '"]:checked')).map(function (input) {
          return input.value;
        }));
        selectedAnswersSnapshot[String(question.id)] = chosenIds;
        var isUnanswered = chosenIds.length === 0;
        var isCorrect =
          correctIds.length === chosenIds.length &&
          correctIds.every(function (value, idx) {
            return value === chosenIds[idx];
          });
        var reviewStatus = isUnanswered ? "unanswered" : (isCorrect ? "correct" : "incorrect");
        var correctOptions = (question.options || []).filter(function (option) {
          return option.correct;
        }).map(function (option) {
          return option.text;
        }).filter(Boolean);

        return {
          question: question,
          index: index,
          correctIds: correctIds,
          chosenIds: chosenIds,
          isCorrect: isCorrect,
          reviewStatus: reviewStatus,
          explanation: buildQuestionExplanation(question, correctOptions)
        };
      });

      var summary = {
        score: Number(result.score || 0),
        total: Number(result.total || 0),
        percentage: percentage,
        passed: percentage >= 50,
        elapsedSeconds: elapsedSeconds,
        studentName: studentName,
        wasAutoSubmitted: wasAutoSubmitted,
        selectedAnswersSnapshot: selectedAnswersSnapshot,
        questionReviews: questionReviews
      };

      fetch(API_BASE + "/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": getToken()
        },
        body: JSON.stringify({
          quizTitle: quiz.title,
          score: result.score,
          total: result.total
        })
      }).catch(function () { console.error("Failed to save submission."); });

      var reviewHeaderTitle = toReviewHeaderTitle(quiz.module || quiz.category || quiz.title || "Quiz");
      if (titleEl) titleEl.textContent = reviewHeaderTitle;
      document.title = reviewHeaderTitle;
      renderResultSummary(main, summary);
    }, { once: true });
  }

  /* ── Init ───────────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", function () {
    var quizId = getParam("id");
    var main = document.querySelector("[data-quiz-take-main]");
    var titleEl = document.querySelector("[data-quiz-take-title]");
    var subjectEl = document.querySelector("[data-quiz-take-subject]");
    var loadingEl = document.querySelector("[data-quiz-take-loading]");

    if (!quizId) {
      if (loadingEl) loadingEl.textContent = "No quiz selected.";
      return;
    }

    Promise.all([
      apiGet("/api/quizzes/published/me/" + quizId),
      apiGet("/api/quizzes/" + quizId + "/questions")
    ]).then(function (results) {
      var quiz = results[0];
      var questions = results[1];
      setHeaderText(quiz, titleEl, subjectEl);
      if (!questions || questions.length === 0) {
        if (loadingEl) loadingEl.textContent = "This quiz has no questions yet.";
        return;
      }
      renderQuiz(quiz, questions, main, titleEl, subjectEl);
    }).catch(function (err) {
      if (loadingEl) {
        var message = "Failed to load quiz. Please try again.";
        if (err && /403|404/.test(String(err.message || ""))) {
          message = "You can only enroll in quizzes assigned to your faculty.";
        }
        loadingEl.textContent = message;
      }
      console.error(err);
    });
  });
})();
