(function () {
  var API_BASE = "http://localhost:8080";

  function getToken() {
    try {
      var user = JSON.parse(sessionStorage.getItem("quizUser") || "null");
      return user ? String(user.token || "") : "";
    } catch (e) {
      return "";
    }
  }

  function getQuizTitle(form) {
    return String(form.dataset.quizTitle || document.title || "Quiz").trim();
  }

  function getQuestionGroups(form) {
    var inputs = form.querySelectorAll('input[type="radio"][name]');
    var uniqueNames = [];
    inputs.forEach(function (input) {
      if (!uniqueNames.includes(input.name)) uniqueNames.push(input.name);
    });
    return uniqueNames;
  }

  function calculateScore(form) {
    var questionGroups = getQuestionGroups(form);
    var total = questionGroups.length;
    var score = 0;
    questionGroups.forEach(function (groupName) {
      var checked = form.querySelector('input[type="radio"][name="' + groupName + '"]:checked');
      if (checked && checked.dataset.correct === "true") score += 1;
    });
    return { score: score, total: total };
  }

  function saveSubmission(submission) {
    fetch(API_BASE + "/api/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": getToken(),
      },
      body: JSON.stringify({
        quizTitle: submission.quizTitle,
        score: submission.score,
        total: submission.total,
      }),
    }).catch(function () {
      console.error("Failed to save submission to server.");
    });
  }

  function initQuizSubmission() {
    var form = document.querySelector("form[data-quiz-timer]");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var result = calculateScore(form);
      saveSubmission({
        quizTitle: getQuizTitle(form),
        score: result.score,
        total: result.total,
      });
      alert("Quiz submitted. Score: " + result.score + "/" + result.total);
      window.location.href = "student-dashboard.html";
    });
  }

  document.addEventListener("DOMContentLoaded", initQuizSubmission);
})();
