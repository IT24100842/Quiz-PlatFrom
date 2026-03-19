document.addEventListener("DOMContentLoaded", function () {
  var quizForm = document.querySelector("form[data-quiz-timer]");
  var timeElement = document.querySelector("[data-time-left]");
  var timerPill = document.querySelector(".timer-pill");

  if (!quizForm || !timeElement) {
    return;
  }

  var minutes = Number.parseInt(quizForm.dataset.durationMinutes || "", 10);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    minutes = 20;
  }

  var remainingSeconds = minutes * 60;
  var intervalId = null;

  function renderTime() {
    var displayMinutes = Math.floor(remainingSeconds / 60)
      .toString()
      .padStart(2, "0");
    var displaySeconds = (remainingSeconds % 60)
      .toString()
      .padStart(2, "0");

    timeElement.textContent = displayMinutes + ":" + displaySeconds;

    if (timerPill) {
      timerPill.classList.toggle("warning", remainingSeconds <= 60);
    }

    if (remainingSeconds <= 0) {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
      alert("Time is up. Your quiz will be submitted now.");
      quizForm.noValidate = true;
      quizForm.requestSubmit();
      return;
    }

    remainingSeconds -= 1;
  }

  renderTime();
  intervalId = setInterval(renderTime, 1000);

  quizForm.addEventListener(
    "submit",
    function () {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    },
    { once: true }
  );
});
