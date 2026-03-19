(function () {
  var API_BASE = "http://localhost:8080";

  function parseJsonResponse(res) {
    return res.json().catch(function () {
      return { success: false, message: "Unexpected server response." };
    });
  }

  function apiJson(path, options) {
    return fetch(API_BASE + path, options).then(parseJsonResponse);
  }

  function getToken() {
    try {
      var user = JSON.parse(sessionStorage.getItem("quizUser") || "null");
      return user ? String(user.token || "") : "";
    } catch (e) {
      return "";
    }
  }

  function getStoredUser() {
    try {
      return JSON.parse(sessionStorage.getItem("quizUser") || "null");
    } catch (e) {
      return null;
    }
  }

  function setStoredUser(user) {
    sessionStorage.setItem("quizUser", JSON.stringify(user));
  }

  function showFormMessage(form, msg, tone) {
    var existing = form.querySelector(".login-error");
    if (existing) existing.remove();
    var message = document.createElement("p");
    message.className = "login-error";
    message.style.cssText = [
      "font-size:.875rem",
      "margin:.75rem 0 0",
      "font-weight:500",
      tone === "success" ? "color:#1b6e42" : "color:#c0392b",
    ].join(";");
    message.textContent = msg;
    form.insertBefore(message, form.querySelector("button[type='submit']"));
  }

  function bindLoginForm(role) {
    var form = document.querySelector(".login-form");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var email = (form.querySelector("[name='email']") || {}).value || "";
      var password = (form.querySelector("[name='password']") || {}).value || "";
      var btn = form.querySelector("button[type='submit']");
      var originalText = btn.textContent;

      btn.disabled = true;
      btn.textContent = "Signing in…";

      apiJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password: password, role: role }),
      })
        .then(function (data) {
          if (data.success) {
            setStoredUser({ name: data.name, email: data.email, role: data.role, token: data.token });
            window.location.href = data.role === "ADMIN" ? "admin-dashboard.html" : "student-dashboard.html";
          } else {
            showFormMessage(form, data.message || "Login failed. Please check your credentials.");
            btn.disabled = false;
            btn.textContent = originalText;
          }
        })
        .catch(function () {
          showFormMessage(form, "Cannot reach the server. Make sure the backend is running on port 8080.");
          btn.disabled = false;
          btn.textContent = originalText;
        });
    });
  }

  function getForgotRole() {
    var params = new URLSearchParams(window.location.search || "");
    var role = (params.get("role") || "STUDENT").toUpperCase();
    return role === "ADMIN" ? "ADMIN" : "STUDENT";
  }

  function bindForgotPasswordForms() {
    var requestForm = document.querySelector(".forgot-request-form");
    var resetForm = document.querySelector(".forgot-reset-form");
    if (!requestForm || !resetForm) return;

    var role = getForgotRole();
    var roleLabel = document.querySelector("[data-forgot-role-label]");
    var roleInput = document.querySelector("[data-forgot-role-input]");
    var loginLink = document.querySelector("[data-forgot-login-link]");
    var lastRequestedEmail = "";

    if (roleLabel) {
      roleLabel.textContent = role === "ADMIN" ? "Admin Recovery" : "Student Recovery";
    }
    if (roleInput) {
      roleInput.value = role;
    }
    if (loginLink) {
      loginLink.href = role === "ADMIN" ? "admin-login.html" : "student-login.html";
      loginLink.textContent = role === "ADMIN" ? "Admin Login" : "Student Login";
    }

    requestForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var email = (requestForm.querySelector("[name='email']") || {}).value || "";
      var button = requestForm.querySelector("button[type='submit']");
      var originalText = button.textContent;

      button.disabled = true;
      button.textContent = "Generating code…";

      apiJson("/api/auth/forgot-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role: role }),
      })
        .then(function (data) {
          if (data.success) {
            lastRequestedEmail = email.trim();
            var msg = data.message || "If the account exists, a reset code has been sent to your email.";
            showFormMessage(requestForm, msg, "success");
            return;
          }
          showFormMessage(requestForm, data.message || "Could not generate reset code.");
        })
        .catch(function () {
          showFormMessage(requestForm, "Cannot reach the server. Make sure the backend is running on port 8080.");
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = originalText;
        });
    });

    resetForm.addEventListener("submit", function (event) {
      event.preventDefault();

      var code = (resetForm.querySelector("[name='code']") || {}).value || "";
      var newPassword = (resetForm.querySelector("[name='newPassword']") || {}).value || "";
      var confirmNewPassword = (resetForm.querySelector("[name='confirmNewPassword']") || {}).value || "";
      var email = (requestForm.querySelector("[name='email']") || {}).value || lastRequestedEmail;
      var button = resetForm.querySelector("button[type='submit']");
      var originalText = button.textContent;

      if (newPassword !== confirmNewPassword) {
        showFormMessage(resetForm, "Passwords do not match.");
        return;
      }

      if (!email) {
        showFormMessage(resetForm, "Enter your account email and request a reset code first.");
        return;
      }

      button.disabled = true;
      button.textContent = "Updating password…";

      apiJson("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(email).trim(),
          role: role,
          code: code.trim(),
          newPassword: newPassword,
        }),
      })
        .then(function (data) {
          if (data.success) {
            sessionStorage.setItem("authNotice", data.message || "Password reset successful. Please sign in.");
            window.location.href = role === "ADMIN" ? "admin-login.html" : "student-login.html";
            return;
          }
          showFormMessage(resetForm, data.message || "Could not reset password.");
        })
        .catch(function () {
          showFormMessage(resetForm, "Cannot reach the server. Make sure the backend is running on port 8080.");
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = originalText;
        });
    });
  }

  function bindRegisterForm() {
    var form = document.querySelector(".register-form");
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var name = (form.querySelector("[name='name']") || {}).value || "";
      var email = (form.querySelector("[name='email']") || {}).value || "";
      var faculty = (form.querySelector("[name='faculty']") || {}).value || "IT";
      var password = (form.querySelector("[name='password']") || {}).value || "";
      var confirmPassword = (form.querySelector("[name='confirmPassword']") || {}).value || "";
      var button = form.querySelector("button[type='submit']");
      var originalText = button.textContent;

      if (password !== confirmPassword) {
        showFormMessage(form, "Passwords do not match.");
        return;
      }

      button.disabled = true;
      button.textContent = "Creating account…";

      apiJson("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password: password, faculty: faculty }),
      })
        .then(function (data) {
          if (data.success) {
            sessionStorage.setItem("authNotice", data.message || "Registration successful. You can now sign in.");
            window.location.href = "student-login.html";
            return;
          }

          showFormMessage(form, data.message || "Registration failed.");
          button.disabled = false;
          button.textContent = originalText;
        })
        .catch(function () {
          showFormMessage(form, "Cannot reach the server. Make sure the backend is running on port 8080.");
          button.disabled = false;
          button.textContent = originalText;
        });
    });
  }

  function bindLogoutLinks() {
    document.querySelectorAll("[data-logout]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        var redirectTo = link.dataset.logout === "admin" ? "admin-login.html" : "student-login.html";
        var token = getToken();
        sessionStorage.removeItem("quizUser");
        fetch(API_BASE + "/api/auth/logout", {
          method: "POST",
          headers: { "X-Auth-Token": token },
        }).finally(function () {
          window.location.href = redirectTo;
        });
      });
    });
  }

  function showUserName() {
    var nameSlot = document.querySelector("[data-user-name]");
    if (!nameSlot) return;
    try {
      var user = JSON.parse(sessionStorage.getItem("quizUser") || "null");
      if (user && user.name) nameSlot.textContent = user.name;
    } catch (e) {}
  }

  function showNoticeIfPresent() {
    var form = document.querySelector(".login-form, .register-form");
    var notice = sessionStorage.getItem("authNotice");
    if (!form || !notice) return;
    sessionStorage.removeItem("authNotice");
    showFormMessage(form, notice, "success");
  }

  function loadFacultyModules(token) {
    var moduleContainer = document.querySelector("[data-faculty-modules]");
    if (!moduleContainer) return;

    var badge = document.querySelector("[data-faculty-badge]");

    fetch(API_BASE + "/api/dashboard/modules", {
      method: "GET",
      headers: { "X-Auth-Token": token },
    })
      .then(parseJsonResponse)
      .then(function (data) {
        if (!data || !data.success) {
          moduleContainer.innerHTML = "<p class='quiz-loading'>" + (data && data.message ? data.message : "Could not load faculty modules.") + "</p>";
          if (badge) badge.textContent = "Unavailable";
          return;
        }

        if (badge) badge.textContent = data.faculty || "Faculty";

        var modules = Array.isArray(data.modules) ? data.modules : [];
        if (!modules.length) {
          moduleContainer.innerHTML = "<p class='quiz-loading'>No modules found for your faculty.</p>";
          return;
        }

        moduleContainer.innerHTML = modules
          .map(function (moduleName) {
            return (
              "<article class='module-card'>" +
              "<h3>" + moduleName + "</h3>" +
              "<p>Recommended module for your faculty track.</p>" +
              "</article>"
            );
          })
          .join("");
      })
      .catch(function () {
        moduleContainer.innerHTML = "<p class='quiz-loading'>Cannot load faculty modules right now.</p>";
        if (badge) badge.textContent = "Unavailable";
      });
  }

  function enforceDashboardAuth(requiredRole, loginPage) {
    var user = getStoredUser();
    if (!user || !user.token) {
      window.location.replace(loginPage);
      return;
    }

    fetch(API_BASE + "/api/auth/me", {
      method: "GET",
      headers: { "X-Auth-Token": user.token },
    })
      .then(parseJsonResponse)
      .then(function (data) {
        if (!data.success || data.role !== requiredRole) {
          sessionStorage.removeItem("quizUser");
          window.location.replace(loginPage);
          return;
        }

        setStoredUser({
          name: data.name,
          email: data.email,
          role: data.role,
          token: user.token,
        });
        showUserName();

        if (requiredRole === "STUDENT") {
          loadFacultyModules(user.token);
        }
      })
      .catch(function () {
        sessionStorage.removeItem("quizUser");
        window.location.replace(loginPage);
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Login pages: <body data-login-role="ADMIN"> or data-login-role="STUDENT"
    var loginRole = document.body.dataset.loginRole;
    if (loginRole) {
      bindLoginForm(loginRole);
      showNoticeIfPresent();
      return; // login pages don't need the rest
    }

    if (document.body.dataset.registerRole) {
      bindRegisterForm();
      showNoticeIfPresent();
      return;
    }

    if (document.body.dataset.forgotPassword) {
      bindForgotPasswordForms();
      return;
    }

    var requiredRole = document.body.dataset.requiredRole;
    if (requiredRole) {
      var loginPage = document.body.dataset.loginPage || "student-login.html";
      bindLogoutLinks();
      enforceDashboardAuth(requiredRole, loginPage);
      return;
    }

    // Dashboard pages: show name + wire logout
    showUserName();
    bindLogoutLinks();
  });
})();
