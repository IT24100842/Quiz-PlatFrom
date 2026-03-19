(function () {
  var API_BASE = "http://localhost:8080";

  function getStoredUser() {
    try {
      return JSON.parse(sessionStorage.getItem("quizUser") || "null");
    } catch (e) {
      return null;
    }
  }

  function showError(message) {
    var el = document.getElementById("dashboard-error");
    if (!el) return;
    el.style.display = "block";
    el.textContent = message;
  }

  function renderModules(modules) {
    var list = document.getElementById("module-list");
    if (!list) return;
    list.innerHTML = "";

    if (!modules || !modules.length) {
      list.innerHTML = "<p class='quiz-loading'>No modules found for this faculty.</p>";
      return;
    }

    modules.forEach(function (name) {
      var card = document.createElement("article");
      card.className = "module-card";
      card.innerHTML = "<h3>" + name + "</h3><p>Module for your current faculty track.</p>";
      list.appendChild(card);
    });
  }

  function loadDashboard() {
    var user = getStoredUser();
    if (!user || !user.token) {
      showError("You are not logged in. Please login first.");
      return;
    }

    fetch(API_BASE + "/api/dashboard/modules", {
      method: "GET",
      headers: { "X-Auth-Token": user.token }
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (!data.success) {
          showError(data.message || "Failed to load dashboard modules.");
          return;
        }

        var meta = document.getElementById("faculty-meta");
        if (meta) {
          meta.textContent =
            "Student: " + data.studentName + " | Faculty: " + data.faculty;
        }

        renderModules(data.modules);
      })
      .catch(function () {
        showError("Cannot reach backend server. Ensure Spring Boot is running on port 8080.");
      });
  }

  document.addEventListener("DOMContentLoaded", loadDashboard);
})();
