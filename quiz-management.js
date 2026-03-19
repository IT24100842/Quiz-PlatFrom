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

  function apiRequest(method, path, body) {
    var options = {
      method: method,
      headers: { "X-Auth-Token": getToken() }
    };
    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    return fetch(API_BASE + path, options).then(function (res) {
      if (!res.ok) throw new Error("API error: " + res.status);
      var ct = res.headers.get("content-type");
      if (!ct || !ct.includes("application/json")) return null;
      return res.json();
    });
  }

  function createTag(tagName, className, text) {
    var element = document.createElement(tagName);
    if (className) element.className = className;
    if (typeof text === "string") element.textContent = text;
    return element;
  }

  function getToastStack() {
    var existing = document.querySelector(".admin-toast-stack");
    if (existing) return existing;

    var stack = createTag("div", "admin-toast-stack");
    stack.setAttribute("aria-live", "polite");
    stack.setAttribute("aria-atomic", "true");
    document.body.appendChild(stack);
    return stack;
  }

  function showToast(message, type) {
    var stack = getToastStack();
    var toast = createTag("div", "admin-toast " + (type || "success"), String(message || "Done"));
    stack.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.add("show");
    });

    window.setTimeout(function () {
      toast.classList.remove("show");
      window.setTimeout(function () {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 220);
    }, 2800);
  }

  function formatDate(isoDate) {
    if (!isoDate) return "-";
    var d = new Date(isoDate);
    return isNaN(d.getTime()) ? isoDate : d.toLocaleString();
  }

  function formatDateCompact(isoDate) {
    if (!isoDate) return "-";
    var d = new Date(isoDate);
    return isNaN(d.getTime())
      ? isoDate
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function formatDateLabel(isoDate) {
    if (!isoDate) return "TBA";
    var d = new Date(isoDate);
    return isNaN(d.getTime()) ? isoDate : d.toLocaleDateString();
  }

  function quizPlayHref(quiz) {
    return "quiz-take.html?id=" + encodeURIComponent(String(quiz.id));
  }

  function normalizeBusinessLabel(value) {
    return String(value || "").replace(/itroduction to business/gi, "Introduction to Business");
  }

  function getQuizTagTone(moduleName) {
    var normalized = String(moduleName || "").toLowerCase();
    if (normalized.indexOf("account") !== -1) return "quiz-tag--accounting";
    if (normalized.indexOf("general") !== -1) return "quiz-tag--general";
    if (normalized.indexOf("business") !== -1 || normalized.indexOf("management") !== -1) return "quiz-tag--business";
    if (normalized.indexOf("ict") !== -1 || normalized.indexOf("computer") !== -1 || normalized.indexOf("program") !== -1) return "quiz-tag--technology";
    if (normalized.indexOf("math") !== -1 || normalized.indexOf("stats") !== -1) return "quiz-tag--math";
    return "quiz-tag--default";
  }

  function getReadableQuizTitle(rawTitle, moduleName) {
    var normalizedTitle = normalizeBusinessLabel(rawTitle || "").trim();
    var fallbackTitle = moduleName + " Quiz";
    if (!normalizedTitle) return fallbackTitle;

    var cleaned = normalizedTitle
      .replace(/^\s*\d{6,}\s*[-_:|]?\s*/i, "")
      .replace(/^\s*quiz\s*#?\s*\d{6,}\s*[-_:|]?\s*/i, "")
      .replace(/\s*[-_:|]?\s*\d{6,}\s*$/i, "")
      .trim();

    if (!cleaned || /^\d{4,}$/.test(cleaned)) return fallbackTitle;
    return cleaned;
  }

  function getQuizMetaIcon(type) {
    if (type === "minutes") {
      return '<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="8"></circle><path d="M12 8v5l3 2"></path></svg>';
    }
    if (type === "questions") {
      return '<svg viewBox="0 0 24 24" focusable="false"><path d="M7.5 9.5a4.5 4.5 0 0 1 9 0c0 2.5-2.4 3.3-3.4 4.4-.4.4-.6.8-.6 1.6"></path><circle cx="12" cy="18" r="1"></circle></svg>';
    }
    return '<svg viewBox="0 0 24 24" focusable="false"><path d="M6 7.5h12"></path><path d="M9 4.5h6"></path><path d="M8 11.5h8"></path><rect x="7" y="3.5" width="10" height="17" rx="2"></rect></svg>';
  }

  function buildQuizMetaItem(text, iconType) {
    var item = createTag("li", "quiz-meta-item");
    var icon = createTag("span", "quiz-meta-icon");
    var label = createTag("span", "quiz-meta-text", text);
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = getQuizMetaIcon(iconType);
    item.appendChild(icon);
    item.appendChild(label);
    return item;
  }

  function renderAdminList(quizzes, listElement, emptyElement, hasActiveFilters) {
    listElement.innerHTML = "";
    if (!quizzes || quizzes.length === 0) {
      emptyElement.textContent = hasActiveFilters
        ? "No quizzes match your current search/filter."
        : "No custom quizzes added yet.";
      emptyElement.style.display = "block";
      return;
    }

    emptyElement.textContent = "No custom quizzes added yet.";
    emptyElement.style.display = "none";
    quizzes.forEach(function (quiz) {
      var row = createTag("tr", "admin-quiz-row");
      var titleCell = createTag("td", "admin-quiz-title-cell");
      var moduleCell = createTag("td", "admin-quiz-module-cell");
      var statsCell = createTag("td", "admin-quiz-stats-cell");
      var dateCell = createTag("td", "admin-quiz-date-cell", formatDateLabel(quiz.scheduledDate));
      var statusCell = createTag("td", "admin-quiz-status-cell");
      var actionsCell = createTag("td", "admin-quiz-actions-cell");
      var actionsWrap = createTag("div", "admin-quiz-actions");

      var rawTitle = String(quiz.title || "").trim();
      var looksLikeIdTitle = /^\d{10,}$/.test(rawTitle);
      var displayTitle = rawTitle && !looksLikeIdTitle ? rawTitle : "Untitled Quiz";
      var title = createTag("p", "admin-quiz-title", displayTitle);
      var targetFaculty = String(quiz.targetFaculty || "ALL").toUpperCase();
      var examType = quiz.examType || "General";
      var metadata = createTag("p", "admin-quiz-meta", targetFaculty + " audience | " + examType);
      var moduleName = quiz.module || quiz.category || "General";
      var marks = String(quiz.totalMarks || 100);
      var questionCount = String(quiz.questions || 0);
      var stats = createTag("p", "admin-quiz-stats", marks + " marks / " + questionCount + " questions");
      if (quiz.published) {
        row.classList.add("is-published");
      }

      var manageButton = createTag("button", "btn-primary btn-sm admin-action-primary", "Manage Questions");
      manageButton.type = "button";
      manageButton.dataset.action = "manage";
      manageButton.dataset.quizId = String(quiz.id);

      var publishButton = createTag(
        "button",
        quiz.published
          ? "btn-muted btn-sm admin-action-secondary admin-publish-btn is-unpublish"
          : "btn-primary btn-sm admin-action-secondary admin-publish-btn is-publish",
        quiz.published ? "Unpublish" : "Publish"
      );
      publishButton.type = "button";
      publishButton.dataset.action = quiz.published ? "unpublish" : "publish";
      publishButton.dataset.quizId = String(quiz.id);

      var removeButton = createTag("button", "btn-danger-ghost btn-sm", "Remove");
      removeButton.type = "button";
      removeButton.dataset.action = "remove";
      removeButton.dataset.quizId = String(quiz.id);

      titleCell.appendChild(title);
      if (looksLikeIdTitle) {
        titleCell.appendChild(createTag("p", "admin-quiz-id", "ID " + rawTitle));
      }
      titleCell.appendChild(metadata);
      moduleCell.textContent = moduleName;
      statsCell.appendChild(stats);
      statusCell.textContent = quiz.published ? "Published" : "Draft";
      statusCell.classList.add(quiz.published ? "is-published" : "is-draft");
      actionsWrap.appendChild(manageButton);
      actionsWrap.appendChild(publishButton);
      actionsWrap.appendChild(removeButton);
      actionsCell.appendChild(actionsWrap);

      row.appendChild(titleCell);
      row.appendChild(moduleCell);
      row.appendChild(statsCell);
      row.appendChild(dateCell);
      row.appendChild(statusCell);
      row.appendChild(actionsCell);
      listElement.appendChild(row);
    });
  }

  function renderAdminSubmissions(submissions, bodyElement, emptyElement) {
    bodyElement.innerHTML = "";
    if (!submissions || submissions.length === 0) {
      emptyElement.style.display = "block";
      return;
    }
    emptyElement.style.display = "none";
    submissions.forEach(function (sub) {
      var row = createTag("tr", null);
      row.appendChild(createTag("td", null, sub.studentName || sub.studentEmail || "-"));
      row.appendChild(createTag("td", null, sub.quizTitle || "Quiz"));
      row.appendChild(createTag("td", null, String(sub.score || 0) + "/" + String(sub.total || 0)));
      row.appendChild(createTag("td", null, formatDate(sub.submittedAt)));
      bodyElement.appendChild(row);
    });
  }

  function renderAdminStudents(students, bodyElement, emptyElement, countElement, options) {
    var config = options || {};
    bodyElement.innerHTML = "";

    if (countElement) {
      var totalCount = typeof config.totalCount === "number" ? config.totalCount : (students || []).length;
      countElement.textContent = String(totalCount);
    }

    if (!students || students.length === 0) {
      if (emptyElement && config.emptyMessage) {
        emptyElement.textContent = config.emptyMessage;
      }
      emptyElement.style.display = "block";
      return;
    }

    function getStudentInitials(student) {
      var name = String((student && student.name) || "").trim();
      if (name) {
        var parts = name.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
          return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
      }

      var email = String((student && student.email) || "").trim();
      return email ? email.slice(0, 2).toUpperCase() : "ST";
    }

    function createStudentNameCell(student) {
      var wrapper = createTag("div", "student-identity");
      var avatar = createTag("span", "student-avatar", getStudentInitials(student));
      var content = createTag("div", "student-identity-text");
      var name = createTag("p", "student-name", student.name || "Unnamed Student");
      var isActive = !!student.active;
      var status = createTag("p", "student-presence " + (isActive ? "active" : "inactive"));
      var dot = createTag("span", "presence-dot");

      avatar.setAttribute("aria-hidden", "true");
      status.appendChild(dot);
      status.appendChild(document.createTextNode(isActive ? "Active" : "Inactive"));

      content.appendChild(name);
      content.appendChild(status);
      wrapper.appendChild(avatar);
      wrapper.appendChild(content);

      return wrapper;
    }

    emptyElement.style.display = "none";

    function createIconButton(type, ariaLabel, labelText) {
      var button = createTag("button", "student-icon-btn " + type);
      button.type = "button";
      button.setAttribute("aria-label", ariaLabel);

      if (type === "edit") {
        button.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5z"/><path d="M13.5 7 17 10.5"/></svg>';
      } else {
        button.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 7h12"/><path d="M9 7V5h6v2"/><path d="M8 7l1 12h6l1-12"/></svg>';
      }

      button.appendChild(createTag("span", "student-icon-btn-label", labelText || ""));

      return button;
    }

    students.forEach(function (student) {
      var row = createTag("tr", null);
      var nameCell = createTag("td", "student-name-cell");
      var registeredCell = createTag("td", "registered-at-cell", formatDateCompact(student.registeredAt));
      var registeredTitle = formatDate(student.registeredAt);

      if (registeredTitle !== "-") {
        registeredCell.title = registeredTitle;
      }

      nameCell.appendChild(createStudentNameCell(student));
      row.appendChild(nameCell);
      row.appendChild(createTag("td", null, student.email || "-"));
      row.appendChild(registeredCell);

      if (config.includeActions) {
        var actionsCell = createTag("td", "student-actions-cell");
        var actions = createTag("div", "student-actions");
        var viewButton = createTag("button", "btn-outline btn-sm student-action-btn", "View Profile");
        var deleteButton = createIconButton("delete", "Delete student", "Delete Student");

        viewButton.type = "button";
        viewButton.title = "View profile";
        viewButton.dataset.studentAction = "view";
        viewButton.dataset.studentId = String(student.id || "");
        viewButton.dataset.studentEmail = String(student.email || "");

        deleteButton.title = "Delete student";
        deleteButton.dataset.studentAction = "delete";
        deleteButton.dataset.studentId = String(student.id || "");
        deleteButton.dataset.studentEmail = String(student.email || "");
        deleteButton.dataset.studentName = String(student.name || "");

        actions.appendChild(viewButton);
        actions.appendChild(deleteButton);
        actionsCell.appendChild(actions);
        row.appendChild(actionsCell);
      }

      bodyElement.appendChild(row);
    });
  }

  function initAdminDashboard() {
    var form = document.querySelector("[data-admin-quiz-form]");
    var listElement = document.querySelector("[data-admin-quiz-list]");
    var emptyElement = document.querySelector("[data-admin-empty]");
    var quizSearchInput = document.querySelector("[data-quiz-search-input]");
    var quizFacultyFilter = document.querySelector("[data-quiz-faculty-filter]");
    var submissionsBody = document.querySelector("[data-admin-submissions-body]");
    var submissionsEmpty = document.querySelector("[data-admin-submissions-empty]");
    var clearBtn = document.querySelector("[data-clear-submissions]");
    var studentsBody = document.querySelector("[data-admin-students-body]");
    var studentsEmpty = document.querySelector("[data-admin-students-empty]");
    var studentSearchInput = document.querySelector("[data-student-search]");
    var studentProfilePanel = document.querySelector("[data-student-profile-panel]");
    var profileStudentName = document.querySelector("[data-profile-student-name]");
    var profileSummary = document.querySelector("[data-profile-summary]");
    var profileHistoryBody = document.querySelector("[data-profile-history-body]");
    var profileHistoryEmpty = document.querySelector("[data-profile-history-empty]");
    var closeProfileBtn = document.querySelector("[data-close-profile]");
    var studentTotalLabel = document.querySelector("[data-student-total-label]");
    var studentCount = document.querySelector("[data-student-count]");
    var quizCount = document.querySelector("[data-quiz-count]");
    var submissionCount = document.querySelector("[data-submission-count]");

    var editorSection = document.querySelector("[data-question-editor]");
    var editorQuizTitle = document.querySelector("[data-editor-quiz-title]");
    var editorQuestionCount = document.querySelector("[data-editor-question-count]");
    var questionList = document.querySelector("[data-question-list]");
    var questionEmpty = document.querySelector("[data-question-empty]");
    var questionForm = document.querySelector("[data-question-form]");
    var questionText = document.querySelector("#q-text");
    var questionExplanation = document.querySelector("#q-explanation");
    var questionTypeField = document.querySelector("[data-question-type]");
    var optionsBuilder = document.querySelector("[data-options-builder]");
    var editingQuestionId = document.querySelector("[data-editing-question-id]");
    var questionFormTitle = document.querySelector("[data-question-form-title]");
    var questionSubmitBtn = document.querySelector("[data-question-submit-btn]");
    var questionErrorAlert = document.querySelector("[data-question-error-alert]");
    var questionErrorText = document.querySelector("[data-question-error-text]");
    var cancelEditBtn = document.querySelector("[data-cancel-edit]");
    var closeEditorBtn = document.querySelector("[data-close-editor]");

    var hasAdminUi = !!(
      form ||
      listElement ||
      submissionsBody ||
      studentsBody ||
      studentSearchInput ||
      studentProfilePanel ||
      quizCount ||
      studentCount ||
      submissionCount ||
      editorSection
    );
    if (!hasAdminUi) return;

    var currentQuizId = null;
    var currentQuestions = [];
    var allQuizzes = [];
    var allStudents = [];
    var allSubmissions = [];
    var selectedStudentEmail = "";
    var hasStudentActionsColumn = !!(studentProfilePanel || document.querySelector(".student-actions-col"));

    function normalizeFilterValue(value) {
      return String(value || "").trim().toLowerCase();
    }

    function formatFacultyLabel(value) {
      var normalized = String(value || "").trim().toUpperCase();
      if (!normalized) return "Unknown";
      if (normalized === "ALL") return "All students";
      return normalized.charAt(0) + normalized.slice(1).toLowerCase();
    }

    function syncFacultyFilterOptions(quizzes) {
      if (!quizFacultyFilter) return;

      var existing = {};
      Array.prototype.slice.call(quizFacultyFilter.options).forEach(function (option) {
        existing[String(option.value || "")] = true;
      });

      (quizzes || []).forEach(function (quiz) {
        var faculty = String(quiz.targetFaculty || "ALL").trim().toUpperCase();
        if (!faculty || existing[faculty]) return;
        var option = document.createElement("option");
        option.value = faculty;
        option.textContent = formatFacultyLabel(faculty);
        quizFacultyFilter.appendChild(option);
        existing[faculty] = true;
      });
    }

    function getVisibleQuizzes() {
      var searchTerm = normalizeFilterValue(quizSearchInput ? quizSearchInput.value : "");
      var selectedFaculty = String(quizFacultyFilter ? quizFacultyFilter.value : "ALL_FACULTIES");

      return allQuizzes.filter(function (quiz) {
        var faculty = String(quiz.targetFaculty || "ALL").trim().toUpperCase();
        if (selectedFaculty !== "ALL_FACULTIES" && faculty !== selectedFaculty) {
          return false;
        }

        if (!searchTerm) {
          return true;
        }

        var searchableText = [
          quiz.title,
          quiz.module,
          quiz.category,
          quiz.examType,
          faculty
        ]
          .map(function (item) { return String(item || "").toLowerCase(); })
          .join(" ");

        return searchableText.indexOf(searchTerm) !== -1;
      });
    }

    function renderFilteredQuizzes() {
      if (!listElement || !emptyElement) return;
      var selectedFaculty = String(quizFacultyFilter ? quizFacultyFilter.value : "ALL_FACULTIES");
      var hasSearch = normalizeFilterValue(quizSearchInput ? quizSearchInput.value : "") !== "";
      var hasFilters = hasSearch || selectedFaculty !== "ALL_FACULTIES";
      renderAdminList(getVisibleQuizzes(), listElement, emptyElement, hasFilters);
    }

    function getStudentEmailKey(email) {
      return String(email || "").trim().toLowerCase();
    }

    function findStudentByEmail(email) {
      var key = getStudentEmailKey(email);
      if (!key) return null;
      return allStudents.find(function (student) {
        return getStudentEmailKey(student && student.email) === key;
      }) || null;
    }

    function getVisibleStudents() {
      var searchTerm = normalizeFilterValue(studentSearchInput ? studentSearchInput.value : "");
      if (!searchTerm) {
        return allStudents.slice();
      }

      return allStudents.filter(function (student) {
        var searchableText = [student.name, student.email, student.faculty]
          .map(function (item) { return normalizeFilterValue(item); })
          .join(" ");
        return searchableText.indexOf(searchTerm) !== -1;
      });
    }

    function closeStudentProfile() {
      selectedStudentEmail = "";
      if (studentProfilePanel) {
        studentProfilePanel.style.display = "none";
      }
      if (profileHistoryBody) {
        profileHistoryBody.innerHTML = "";
      }
      if (profileHistoryEmpty) {
        profileHistoryEmpty.style.display = "none";
      }
      if (profileSummary) {
        profileSummary.textContent = "";
      }
    }

    function openStudentProfile(student, options) {
      var config = options || {};
      if (!studentProfilePanel || !profileHistoryBody || !profileHistoryEmpty) return;

      var studentName = String((student && student.name) || "").trim() || "Unnamed Student";
      var studentEmail = String((student && student.email) || "").trim();
      var key = getStudentEmailKey(studentEmail);
      var history = allSubmissions.filter(function (submission) {
        return getStudentEmailKey(submission && submission.studentEmail) === key;
      });

      selectedStudentEmail = studentEmail;

      if (profileStudentName) {
        profileStudentName.textContent = studentName;
      }

      if (profileSummary) {
        var attempted = history.length;
        profileSummary.textContent = studentEmail + " | " + String(attempted) + " submission" + (attempted === 1 ? "" : "s");
      }

      profileHistoryBody.innerHTML = "";
      if (history.length === 0) {
        profileHistoryEmpty.style.display = "block";
      } else {
        profileHistoryEmpty.style.display = "none";
        history.forEach(function (submission) {
          var row = createTag("tr", null);
          row.appendChild(createTag("td", null, submission.quizTitle || "Quiz"));
          row.appendChild(createTag("td", null, String(submission.score || 0) + "/" + String(submission.total || 0)));
          row.appendChild(createTag("td", null, formatDate(submission.submittedAt)));
          profileHistoryBody.appendChild(row);
        });
      }

      studentProfilePanel.style.display = "block";
      if (config.scrollIntoView) {
        studentProfilePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }

    function renderFilteredStudents() {
      if (!studentsBody || !studentsEmpty) return;
      var visibleStudents = getVisibleStudents();
      var hasStudentSearch = normalizeFilterValue(studentSearchInput ? studentSearchInput.value : "") !== "";
      if (studentTotalLabel) {
        studentTotalLabel.textContent = "(" + String(allStudents.length) + ")";
      }
      renderAdminStudents(visibleStudents, studentsBody, studentsEmpty, studentCount, {
        includeActions: hasStudentActionsColumn,
        totalCount: allStudents.length,
        emptyMessage: hasStudentSearch ? "No students match your search." : "No students have registered yet."
      });

      if (selectedStudentEmail) {
        var selectedStudent = findStudentByEmail(selectedStudentEmail);
        if (selectedStudent) {
          openStudentProfile(selectedStudent);
        } else {
          closeStudentProfile();
        }
      }
    }

    function refreshQuizList() {
      return apiRequest("GET", "/api/quizzes")
        .then(function (quizzes) {
          allQuizzes = quizzes || [];
          syncFacultyFilterOptions(allQuizzes);
          renderFilteredQuizzes();
          if (quizCount) {
            quizCount.textContent = String(allQuizzes.length);
          }
          return allQuizzes;
        })
        .catch(function () {
          console.error("Failed to load quizzes from server.");
          allQuizzes = [];
          renderFilteredQuizzes();
          return [];
        });
    }

    if (quizSearchInput) {
      quizSearchInput.addEventListener("input", renderFilteredQuizzes);
    }

    if (quizFacultyFilter) {
      quizFacultyFilter.addEventListener("change", renderFilteredQuizzes);
    }

    function refreshSubmissions() {
      if (!submissionsBody && !studentProfilePanel) return;
      apiRequest("GET", "/api/submissions")
        .then(function (submissions) {
          allSubmissions = submissions || [];
          if (submissionsBody && submissionsEmpty) {
            renderAdminSubmissions(allSubmissions, submissionsBody, submissionsEmpty);
          }
          if (submissionCount) {
            submissionCount.textContent = String(allSubmissions.length);
          }
          if (selectedStudentEmail) {
            var selectedStudent = findStudentByEmail(selectedStudentEmail);
            if (selectedStudent) {
              openStudentProfile(selectedStudent);
            } else {
              closeStudentProfile();
            }
          }
        })
        .catch(function () {
          allSubmissions = [];
          console.error("Failed to load submissions from server.");
        });
    }

    function refreshStudents() {
      if (!studentsBody || !studentsEmpty) return;
      return apiRequest("GET", "/api/auth/students")
        .then(function (students) {
          allStudents = students || [];
          renderFilteredStudents();
          return allStudents;
        })
        .catch(function () {
          allStudents = [];
          renderFilteredStudents();
          console.error("Failed to load registered students from server.");
          return [];
        });
    }

    function currentQuestionType() {
      if (!questionTypeField) return "SINGLE";
      return questionTypeField.value === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
    }

    function showQuestionError(message) {
      if (!questionErrorAlert || !questionErrorText) return;
      questionErrorText.textContent = String(message || "");
      questionErrorAlert.style.display = "block";
    }

    function hideQuestionError() {
      if (!questionErrorAlert) return;
      questionErrorAlert.style.display = "none";
    }

    function updateOptionLabel(checkbox, isCorrect) {
      var labelText = checkbox.parentElement.querySelector(".option-label-text");
      if (labelText) {
        labelText.textContent = isCorrect ? "Correct Answer" : "Distractor";
      }
    }

    function createOptionRow(value, checked, questionType, index) {
      var row = createTag("div", "option-row");
      row.dataset.optionRow = "";

      var textInput = createTag("input", "option-input");
      textInput.type = "text";
      textInput.placeholder = "Option text";
      textInput.value = value || "";
      textInput.dataset.optionText = "";

      var correctLabel = createTag("label", "option-correct-wrap");
      var labelText = createTag("span", "option-label-text", checked ? "Correct Answer" : "Distractor");
      var correctRadio = createTag("input", "option-correct");
      var type = questionType === "MULTIPLE" ? "checkbox" : "radio";
      correctRadio.type = type;
      correctRadio.name = "correct-option";
      correctRadio.checked = !!checked;
      correctRadio.dataset.optionCorrect = "";
      correctRadio.ariaLabel = "Mark option " + String(index + 1) + " as correct";
      
      var self = this;
      correctRadio.addEventListener("change", function () {
        updateOptionLabel(correctRadio, correctRadio.checked);
      });
      
      correctLabel.prepend(correctRadio);
      correctLabel.appendChild(labelText);

      row.appendChild(textInput);
      row.appendChild(correctLabel);
      return row;
    }

    function renderFixedOptionRows(optionSeeds, questionType) {
      if (!optionsBuilder) return;
      var seeds = optionSeeds || [];
      optionsBuilder.innerHTML = "";
      for (var i = 0; i < 5; i++) {
        var seed = seeds[i] || { text: "", correct: false };
        optionsBuilder.appendChild(createOptionRow(seed.text || "", !!seed.correct, questionType, i));
      }
    }

    function resetQuestionForm() {
      if (!questionForm || !optionsBuilder) return;
      questionForm.reset();
      if (editingQuestionId) editingQuestionId.value = "";
      if (questionTypeField) questionTypeField.value = "SINGLE";
      renderFixedOptionRows([
        { text: "", correct: true },
        { text: "", correct: false },
        { text: "", correct: false },
        { text: "", correct: false },
        { text: "", correct: false }
      ], "SINGLE");
      if (questionFormTitle) questionFormTitle.textContent = "Add a Question";
      if (questionSubmitBtn) questionSubmitBtn.textContent = "Add Question";
      if (cancelEditBtn) cancelEditBtn.style.display = "none";
      if (questionExplanation) questionExplanation.value = "";
    }

    function readQuestionPayload() {
      if (!questionText || !optionsBuilder) return null;
      var questionType = currentQuestionType();

      var text = String(questionText.value || "").trim();
      var explanation = questionExplanation ? String(questionExplanation.value || "").trim() : "";
      if (!text) {
        alert("Question text is required.");
        return null;
      }

      var rows = Array.prototype.slice.call(optionsBuilder.querySelectorAll("[data-option-row]"));
      if (rows.length !== 5) {
        alert("Exactly five options are required.");
        return null;
      }

      var options = [];
      rows.forEach(function (row, index) {
        var optionTextInput = row.querySelector("[data-option-text]");
        var optionCorrectInput = row.querySelector("[data-option-correct]");
        var optionText = String(optionTextInput ? optionTextInput.value : "").trim();
        options.push({
          text: optionText,
          correct: !!(optionCorrectInput && optionCorrectInput.checked),
          optionOrder: index + 1
        });
      });

      if (options.some(function (o) { return !o.text; })) {
        alert("All option fields are required.");
        return null;
      }

      var correctCount = options.filter(function (o) { return o.correct; }).length;
      if (questionType === "SINGLE" && correctCount !== 1) {
        alert("Single-answer MCQ must have exactly one correct option.");
        return null;
      }
      if (questionType === "MULTIPLE" && correctCount < 2) {
        alert("Multiple-answer MCQ must have at least two correct options.");
        return null;
      }

      return {
        text: text,
        explanation: explanation,
        questionType: questionType,
        options: options
      };
    }

    function renderQuestionList() {
      if (!questionList || !questionEmpty) return;

      questionList.innerHTML = "";
      if (editorQuestionCount) {
        editorQuestionCount.textContent = currentQuestions.length + " question" + (currentQuestions.length === 1 ? "" : "s");
      }

      if (!currentQuestions || currentQuestions.length === 0) {
        questionEmpty.style.display = "block";
        return;
      }
      questionEmpty.style.display = "none";

      currentQuestions.forEach(function (question, index) {
        var item = createTag("li", "question-item");
        var typeLabel = (question.questionType === "MULTIPLE" ? "Multiple-answer" : "Single-answer");
        var questionNumber = String(index + 1).padStart(2, "0");

        var head = createTag("div", "question-item-head");
        var indexBadge = createTag("span", "question-item-index-badge", "Question " + questionNumber);
        var actions = createTag("div", "question-item-actions");

        var editBtn = createTag("button", "btn-outline btn-xs question-action-btn");
        editBtn.type = "button";
        editBtn.dataset.questionAction = "edit";
        editBtn.dataset.questionId = String(question.id);
        editBtn.innerHTML = "<span class=\"question-action-icon\" aria-hidden=\"true\">&#9998;</span>Edit";

        var deleteBtn = createTag("button", "button-danger btn-xs question-action-btn");
        deleteBtn.type = "button";
        deleteBtn.dataset.questionAction = "delete";
        deleteBtn.dataset.questionId = String(question.id);
        deleteBtn.innerHTML = "<span class=\"question-action-icon\" aria-hidden=\"true\">&#128465;</span>Delete";

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        head.appendChild(indexBadge);
        head.appendChild(actions);
        item.appendChild(head);

        var heading = createTag("p", "question-item-title", question.text || "Untitled question");
        var questionTypeMeta = createTag("p", "question-item-type", typeLabel);
        item.appendChild(heading);
        item.appendChild(questionTypeMeta);

        var options = createTag("ul", "question-item-options");
        (question.options || []).forEach(function (option) {
          var rowClass = option.correct ? "question-item-option-row is-correct" : "question-item-option-row";
          var row = createTag("li", rowClass);
          row.appendChild(createTag("span", "question-item-option-text", option.text || ""));
          if (option.correct) {
            var badge = createTag("span", "question-item-correct-badge");
            badge.innerHTML = "<span class=\"question-item-correct-icon\" aria-hidden=\"true\">&#10003;</span>Correct Answer";
            row.appendChild(badge);
          }
          options.appendChild(row);
        });
        item.appendChild(options);

        var explanationText = String(question.explanation || "").trim();
        if (explanationText) {
          var explanation = createTag("div", "question-item-explanation");
          explanation.appendChild(createTag("span", "question-item-explanation-icon", "\ud83d\udca1"));
          var explanationBody = createTag("p", "question-item-explanation-text");
          var explanationLabel = createTag("strong", null, "Explanation:");
          explanationBody.appendChild(explanationLabel);
          explanationBody.appendChild(document.createTextNode(" " + explanationText));
          explanation.appendChild(explanationBody);
          item.appendChild(explanation);
        }

        questionList.appendChild(item);
      });
    }

    function loadQuestionsForQuiz(quizId) {
      return apiRequest("GET", "/api/quizzes/" + quizId + "/questions")
        .then(function (questions) {
          currentQuestions = questions || [];
          renderQuestionList();
        });
    }

    function openEditor(quizId) {
      Promise.all([
        apiRequest("GET", "/api/quizzes/" + quizId),
        apiRequest("GET", "/api/quizzes/" + quizId + "/questions")
      ])
        .then(function (results) {
          var quiz = results[0];
          currentQuizId = quiz.id;
          currentQuestions = results[1] || [];

          if (editorQuizTitle) editorQuizTitle.textContent = quiz.title;
          if (editorSection) editorSection.style.display = "block";

          renderQuestionList();
          resetQuestionForm();
          if (editorSection) editorSection.scrollIntoView({ behavior: "smooth", block: "start" });
        })
        .catch(function () {
          alert("Failed to open question editor for this quiz.");
        });
    }

    if (clearBtn && submissionsBody && submissionsEmpty) {
      clearBtn.addEventListener("click", function () {
        apiRequest("DELETE", "/api/submissions")
          .then(function () {
            allSubmissions = [];
            renderAdminSubmissions([], submissionsBody, submissionsEmpty);
            if (submissionCount) {
              submissionCount.textContent = "0";
            }
            if (selectedStudentEmail) {
              var selectedStudent = findStudentByEmail(selectedStudentEmail);
              if (selectedStudent) {
                openStudentProfile(selectedStudent);
              }
            }
          })
          .catch(function () { alert("Failed to clear submissions."); });
      });
    }

    if (studentSearchInput) {
      studentSearchInput.addEventListener("input", renderFilteredStudents);
    }

    if (closeProfileBtn) {
      closeProfileBtn.addEventListener("click", closeStudentProfile);
    }

    if (studentsBody) {
      studentsBody.addEventListener("click", function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        var button = target.closest("button");
        if (!button) return;

        var action = button.dataset.studentAction;
        if (!action) return;

        var studentId = String(button.dataset.studentId || "").trim();
        var studentEmail = String(button.dataset.studentEmail || "").trim();
        var studentName = String(button.dataset.studentName || "").trim();

        if (action === "view") {
          var targetStudent = studentId
            ? (allStudents.find(function (student) { return String(student.id) === studentId; }) || null)
            : findStudentByEmail(studentEmail);

          if (!targetStudent) {
            showToast("Unable to find that student.", "error");
            return;
          }

          openStudentProfile(targetStudent, { scrollIntoView: true });
          return;
        }

        if (action === "delete") {
          if (!studentId) {
            showToast("This student cannot be deleted right now.", "error");
            return;
          }

          var label = studentName || studentEmail || "this student";
          if (!window.confirm("Delete " + label + "? This action cannot be undone.")) return;

          apiRequest("DELETE", "/api/auth/students/" + encodeURIComponent(studentId))
            .then(function () {
              showToast("Student deleted.", "success");
              if (getStudentEmailKey(selectedStudentEmail) === getStudentEmailKey(studentEmail)) {
                closeStudentProfile();
              }
              return refreshStudents();
            })
            .catch(function () {
              showToast("Failed to delete student.", "error");
            });
        }
      });
    }

    if (form) {
      var validationFields = ["title", "module", "examType", "minutes", "totalMarks"];
      var errorElements = {};
      var submitButton = form.querySelector("[data-add-quiz-submit]");
      var clearButton = form.querySelector("[data-add-quiz-clear]");
      var defaultSubmitText = submitButton ? String(submitButton.textContent || "Add Quiz") : "Add Quiz";

      Array.prototype.slice.call(form.querySelectorAll("[data-field-error]")).forEach(function (errorNode) {
        var key = errorNode.getAttribute("data-field-error");
        if (key) {
          errorElements[key] = errorNode;
        }
      });

      function setFieldError(fieldName, message) {
        var control = form.elements[fieldName];
        var errorNode = errorElements[fieldName];
        if (control && control.classList) {
          control.classList.toggle("is-invalid", !!message);
        }
        if (errorNode) {
          errorNode.textContent = message || "";
          errorNode.style.display = message ? "block" : "none";
        }
      }

      function validateField(fieldName) {
        var control = form.elements[fieldName];
        var rawValue = control ? String(control.value || "").trim() : "";
        var message = "";

        if (fieldName === "title" && !rawValue) {
          message = "Quiz title is required.";
        } else if (fieldName === "module" && !rawValue) {
          message = "Please select a module.";
        } else if (fieldName === "examType" && !rawValue) {
          message = "Please select an exam type.";
        } else if (fieldName === "minutes") {
          var minutes = parseInt(rawValue, 10);
          if (!rawValue || isNaN(minutes) || minutes <= 0) {
            message = "Duration must be greater than 0.";
          }
        } else if (fieldName === "totalMarks") {
          var total = parseInt(rawValue, 10);
          if (!rawValue || isNaN(total) || total <= 0) {
            message = "Total marks must be greater than 0.";
          }
        }

        setFieldError(fieldName, message);
        return !message;
      }

      function validateForm() {
        var firstInvalidControl = null;
        var allValid = true;

        validationFields.forEach(function (fieldName) {
          var valid = validateField(fieldName);
          if (!valid) {
            allValid = false;
            if (!firstInvalidControl && form.elements[fieldName]) {
              firstInvalidControl = form.elements[fieldName];
            }
          }
        });

        if (!allValid && firstInvalidControl && typeof firstInvalidControl.focus === "function") {
          firstInvalidControl.focus();
        }
        return allValid;
      }

      function clearValidationErrors() {
        validationFields.forEach(function (fieldName) {
          setFieldError(fieldName, "");
        });
      }

      function setSubmittingState(submitting) {
        if (submitButton) {
          submitButton.disabled = submitting;
          submitButton.classList.toggle("is-loading", submitting);
          submitButton.textContent = submitting ? "Adding Quiz..." : defaultSubmitText;
          submitButton.setAttribute("aria-busy", submitting ? "true" : "false");
        }
        if (clearButton) {
          clearButton.disabled = submitting;
        }
      }

      validationFields.forEach(function (fieldName) {
        var control = form.elements[fieldName];
        if (!control) return;
        var evt = control.tagName === "SELECT" ? "change" : "input";
        control.addEventListener(evt, function () {
          validateField(fieldName);
        });
        control.addEventListener("blur", function () {
          validateField(fieldName);
        });
      });

      if (clearButton) {
        clearButton.addEventListener("click", function () {
          form.reset();
          clearValidationErrors();
        });
      }

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (!validateForm()) {
          return;
        }

        setSubmittingState(true);
        var formData = new FormData(form);
        var quizData = {
          title: String(formData.get("title") || "").trim(),
          module: String(formData.get("module") || "").trim(),
          targetFaculty: String(formData.get("targetFaculty") || "ALL").trim().toUpperCase(),
          examType: String(formData.get("examType") || "").trim(),
          totalMarks: parseInt(formData.get("totalMarks"), 10) || 100,
          questions: 0,
          minutes: parseInt(formData.get("minutes"), 10) || 0,
          scheduledDate: String(formData.get("scheduledDate") || "").trim(),
          url: ""
        };
        apiRequest("POST", "/api/quizzes", quizData)
          .then(function () { return refreshQuizList(); })
          .then(function () {
            form.reset();
            clearValidationErrors();
            showToast("Quiz added successfully.", "success");
          })
          .catch(function () {
            showToast("Failed to add quiz. Are you logged in as admin?", "error");
          })
          .finally(function () {
            setSubmittingState(false);
          });
      });
    }

    if (listElement) {
      listElement.addEventListener("click", function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        var button = target.closest("button");
        if (!button) return;

        var id = button.dataset.quizId;
        var action = button.dataset.action;
        if (!id || !action) return;

        if (action === "manage") {
          openEditor(id);
          return;
        }

        if (action === "publish" || action === "unpublish") {
          var endpoint = action === "publish" ? "/publish" : "/unpublish";
          apiRequest("PUT", "/api/quizzes/" + id + endpoint)
            .then(function () { return refreshQuizList(); })
            .catch(function () { alert("Failed to update quiz publish status."); });
          return;
        }

        if (action === "remove") {
          apiRequest("DELETE", "/api/quizzes/" + id)
            .then(function () { return refreshQuizList(); })
            .then(function () {
              if (String(currentQuizId || "") === String(id) && editorSection) {
                editorSection.style.display = "none";
                currentQuizId = null;
                currentQuestions = [];
              }
            })
            .catch(function () { alert("Failed to remove quiz."); });
        }
      });
    }

    if (questionTypeField && optionsBuilder) {
      questionTypeField.addEventListener("change", function () {
        var rows = Array.prototype.slice.call(optionsBuilder.querySelectorAll("[data-option-row]"));
        var seeds = rows.map(function (row) {
          var optionTextInput = row.querySelector("[data-option-text]");
          var optionCorrectInput = row.querySelector("[data-option-correct]");
          return {
            text: String(optionTextInput ? optionTextInput.value : ""),
            correct: !!(optionCorrectInput && optionCorrectInput.checked)
          };
        });

        if (currentQuestionType() === "SINGLE") {
          var firstCheckedSeen = false;
          seeds = seeds.map(function (seed) {
            if (seed.correct && !firstCheckedSeen) {
              firstCheckedSeen = true;
              return seed;
            }
            if (seed.correct && firstCheckedSeen) {
              return { text: seed.text, correct: false };
            }
            return seed;
          });
          if (!firstCheckedSeen && seeds.length > 0) {
            seeds[0].correct = true;
          }
        }

        renderFixedOptionRows(seeds, currentQuestionType());
      });
    }

    if (questionList) {
      questionList.addEventListener("click", function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        var button = target.closest("button");
        if (!button) return;

        var questionId = button.dataset.questionId;
        var action = button.dataset.questionAction;
        if (!questionId || !action || !currentQuizId) return;

        var selected = currentQuestions.find(function (q) {
          return String(q.id) === String(questionId);
        });

        if (action === "edit") {
          if (!selected || !optionsBuilder || !questionText) return;
          var selectedType = selected.questionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE";
          if (editingQuestionId) editingQuestionId.value = String(selected.id);
          if (questionTypeField) questionTypeField.value = selectedType;
          questionText.value = selected.text || "";
          if (questionExplanation) questionExplanation.value = selected.explanation || "";
          renderFixedOptionRows(selected.options || [], selectedType);
          if (questionFormTitle) questionFormTitle.textContent = "Edit Question";
          if (questionSubmitBtn) questionSubmitBtn.textContent = "Update Question";
          if (cancelEditBtn) cancelEditBtn.style.display = "inline-block";
          return;
        }

        if (action === "delete") {
          if (!window.confirm("Delete this question?")) return;
          apiRequest("DELETE", "/api/quizzes/" + currentQuizId + "/questions/" + questionId)
            .then(function () { return loadQuestionsForQuiz(currentQuizId); })
            .then(function () { return refreshQuizList(); })
            .then(function () { resetQuestionForm(); })
            .catch(function () { alert("Failed to delete question."); });
        }
      });
    }

    if (questionForm) {
      questionForm.addEventListener("submit", function (event) {
        event.preventDefault();
        hideQuestionError();
        
        if (!currentQuizId) {
          showQuestionError("Select a quiz first.");
          return;
        }

        var payload = readQuestionPayload();
        if (!payload) return;

        var qId = editingQuestionId ? editingQuestionId.value : "";
        var method = qId ? "PUT" : "POST";
        var path = "/api/quizzes/" + currentQuizId + "/questions" + (qId ? "/" + qId : "");

        apiRequest(method, path, payload)
          .then(function () { return loadQuestionsForQuiz(currentQuizId); })
          .then(function () { return refreshQuizList(); })
          .then(function () { resetQuestionForm(); })
          .catch(function (err) {
            showQuestionError(err.message || "Failed to save question. Ensure all fields are valid and one option is correct.");
          });
      });
    }

    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", resetQuestionForm);
    }

    if (closeEditorBtn && editorSection) {
      closeEditorBtn.addEventListener("click", function () {
        editorSection.style.display = "none";
        currentQuizId = null;
        currentQuestions = [];
      });
    }

    refreshQuizList();
    refreshSubmissions();
    refreshStudents();
    resetQuestionForm();
  }

  function buildQuizCard(quiz) {
    var card = createTag("article", "quiz-card");
    var moduleName = normalizeBusinessLabel(quiz.module || quiz.category || "General");
    var totalMarks = Number(quiz.totalMarks) > 0 ? Number(quiz.totalMarks) : 100;
    var questionCount = Number(quiz.questions) >= 0 ? Number(quiz.questions) : 0;
    var minutes = Number(quiz.minutes) >= 0 ? Number(quiz.minutes) : 0;
    var tag = createTag("p", "quiz-tag " + getQuizTagTone(moduleName), moduleName);
    var title = createTag("h3", null, getReadableQuizTitle(quiz.title, moduleName));
    var metaList = createTag("ul", "quiz-meta-list");
    var action = createTag("a", "quiz-action", "Start Quiz");
    action.href = quizPlayHref(quiz);

    metaList.appendChild(buildQuizMetaItem(String(minutes) + " min", "minutes"));
    metaList.appendChild(buildQuizMetaItem(String(questionCount) + " questions", "questions"));
    metaList.appendChild(buildQuizMetaItem(String(totalMarks) + " marks", "marks"));

    card.appendChild(tag);
    card.appendChild(title);
    card.appendChild(metaList);
    card.appendChild(action);
    return card;
  }

  function initStudentDashboard() {
    var studentSidebarNav = document.querySelector("[data-student-sidebar-nav]");
    var grid = document.querySelector("[data-quiz-browse-grid]");
    var loadingEl = document.querySelector("[data-quiz-loading]");
    var searchInput = document.querySelector("[data-quiz-search]");
    var filtersEl = document.querySelector("[data-quiz-filters]");
    var countEl = document.querySelector("[data-quiz-count]");
    var attemptedEl = document.querySelector("[data-attempted-quizzes]");
    var averageEl = document.querySelector("[data-average-score]");
    var highestEl = document.querySelector("[data-highest-score]");
    var averageProgressEl = document.querySelector("[data-average-progress]");
    var averageBandEl = document.querySelector("[data-average-band]");

    if (!grid) return;

    var allQuizzes = [];
    var activeCategory = "All";

    function getFiltered() {
      var term = searchInput ? searchInput.value.trim().toLowerCase() : "";
      return allQuizzes.filter(function (q) {
        var moduleName = normalizeBusinessLabel(q.module || q.category || "General");
        var examType = q.examType || "General";
        var title = normalizeBusinessLabel(q.title || "");
        var matchCat = activeCategory === "All" || moduleName === activeCategory;
        var matchSearch = !term ||
          title.toLowerCase().includes(term) ||
          moduleName.toLowerCase().includes(term) ||
          examType.toLowerCase().includes(term);
        return matchCat && matchSearch;
      });
    }

    function renderGrid() {
      grid.innerHTML = "";
      var filtered = getFiltered();
      if (filtered.length === 0) {
        var empty = createTag("p", "quiz-empty", allQuizzes.length === 0
          ? "No quizzes are currently available for your faculty."
          : "No quizzes match your search.");
        grid.appendChild(empty);
      } else {
        filtered.forEach(function (q) {
          grid.appendChild(buildQuizCard(q));
        });
      }
    }

    function renderFilters(categories) {
      if (!filtersEl) return;
      filtersEl.innerHTML = "";
      ["All"].concat(categories).forEach(function (cat) {
        var btn = createTag("button", "quiz-filter-chip", cat);
        if (cat === activeCategory) btn.classList.add("active");
        btn.addEventListener("click", function () {
          activeCategory = cat;
          filtersEl.querySelectorAll(".quiz-filter-chip")
            .forEach(function (b) { b.classList.remove("active"); });
          btn.classList.add("active");
          renderGrid();
        });
        filtersEl.appendChild(btn);
      });
    }

    function renderStudentStats(submissions) {
      var studentSubs = submissions || [];
      var totalScored = 0;
      var totalPossible = 0;
      var highest = 0;

      studentSubs.forEach(function (sub) {
        var score = Number(sub.score || 0);
        var total = Number(sub.total || 0);
        totalScored += score;
        totalPossible += total;
        if (total > 0) {
          highest = Math.max(highest, Math.round((score / total) * 100));
        }
      });

      var average = totalPossible > 0 ? Math.round((totalScored / totalPossible) * 100) : 0;
      average = Math.max(0, Math.min(100, average));

      if (attemptedEl) {
        attemptedEl.textContent = String(studentSubs.length);
      }

      if (averageEl) {
        averageEl.textContent = String(average) + "%";
      }

      if (highestEl) {
        highestEl.textContent = String(highest) + "%";
      }

      if (averageBandEl) {
        if (average >= 75) {
          averageBandEl.textContent = "High performance";
        } else if (average >= 45) {
          averageBandEl.textContent = "Steady progress";
        } else {
          averageBandEl.textContent = "Needs practice";
        }
      }

      if (averageProgressEl) {
        var radius = 28;
        var circumference = 2 * Math.PI * radius;
        var offset = circumference * (1 - average / 100);
        averageProgressEl.style.strokeDasharray = String(circumference);
        averageProgressEl.style.strokeDashoffset = String(offset);
        averageProgressEl.classList.remove("is-high", "is-medium", "is-low");
        if (average >= 75) {
          averageProgressEl.classList.add("is-high");
        } else if (average >= 45) {
          averageProgressEl.classList.add("is-medium");
        } else {
          averageProgressEl.classList.add("is-low");
        }
      }
    }

    Promise.all([
      apiRequest("GET", "/api/quizzes/published/me"),
      apiRequest("GET", "/api/submissions/me")
    ])
      .then(function (results) {
        allQuizzes = results[0] || [];
        var mySubmissions = results[1] || [];

        if (loadingEl) loadingEl.remove();

        if (countEl) {
          countEl.textContent = allQuizzes.length + " quiz" + (allQuizzes.length !== 1 ? "zes" : "");
        }

        var categories = allQuizzes
          .map(function (q) { return normalizeBusinessLabel(q.module || q.category || "General"); })
          .filter(function (c, i, arr) { return c && arr.indexOf(c) === i; })
          .sort();

        renderFilters(categories);
        renderGrid();
        renderStudentStats(mySubmissions);
      })
      .catch(function () {
        if (loadingEl) loadingEl.textContent = "Failed to load quizzes.";
        console.error("Failed to load quizzes from server.");
      });

    if (studentSidebarNav) {
      studentSidebarNav.addEventListener("click", function (event) {
        var target = event.target;
        if (!(target instanceof HTMLElement)) return;
        var link = target.closest("a");
        if (!link) return;
        studentSidebarNav.querySelectorAll("a").forEach(function (item) {
          item.classList.remove("active");
        });
        link.classList.add("active");
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", renderGrid);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initAdminDashboard();
    initStudentDashboard();
  });
})();
