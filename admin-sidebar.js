(function () {
  function bySelector(selector) {
    return document.querySelector(selector);
  }

  function bySelectorAll(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function isMobileLayout() {
    return window.matchMedia("(max-width: 860px)").matches;
  }

  function setOpenState(open) {
    if (open) {
      document.body.classList.add("admin-sidebar-open");
    } else {
      document.body.classList.remove("admin-sidebar-open");
    }
  }

  function setCollapsedState(collapsed) {
    if (collapsed) {
      document.body.classList.add("admin-sidebar-collapsed");
    } else {
      document.body.classList.remove("admin-sidebar-collapsed");
    }
  }

  function setActiveView(viewId, buttons, views) {
    buttons.forEach(function (button) {
      var isActive = button.getAttribute("data-admin-view-btn") === viewId;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-current", isActive ? "page" : "false");
    });

    views.forEach(function (panel) {
      var panelId = panel.getAttribute("data-admin-view");
      panel.classList.toggle("active", panelId === viewId);
    });

    window.location.hash = viewId;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var buttons = bySelectorAll("[data-admin-view-btn]");
    var views = bySelectorAll("[data-admin-view]");
    var toggleBtn = bySelector("[data-sidebar-toggle]");
    var backdrop = bySelector("[data-sidebar-backdrop]");

    if (!buttons.length || !views.length || !toggleBtn) {
      return;
    }

    function currentDefaultView() {
      var fromHash = String(window.location.hash || "").replace(/^#/, "");
      if (!fromHash) return "add-quiz-view";
      var exists = views.some(function (panel) {
        return panel.getAttribute("data-admin-view") === fromHash;
      });
      return exists ? fromHash : "add-quiz-view";
    }

    setActiveView(currentDefaultView(), buttons, views);

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var targetView = button.getAttribute("data-admin-view-btn");
        setActiveView(targetView, buttons, views);

        // On mobile, close sidebar after selection so content is visible.
        if (isMobileLayout()) {
          setOpenState(false);
          toggleBtn.setAttribute("aria-expanded", "false");
        }
      });
    });

    toggleBtn.addEventListener("click", function () {
      if (isMobileLayout()) {
        var opening = !document.body.classList.contains("admin-sidebar-open");
        setOpenState(opening);
        toggleBtn.setAttribute("aria-expanded", opening ? "true" : "false");
        return;
      }

      var collapsing = !document.body.classList.contains("admin-sidebar-collapsed");
      setCollapsedState(collapsing);
      toggleBtn.setAttribute("aria-expanded", collapsing ? "false" : "true");
    });

    if (backdrop) {
      backdrop.addEventListener("click", function () {
        setOpenState(false);
        toggleBtn.setAttribute("aria-expanded", "false");
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && document.body.classList.contains("admin-sidebar-open")) {
        setOpenState(false);
        toggleBtn.setAttribute("aria-expanded", "false");
      }
    });

    window.addEventListener("resize", function () {
      // Reset mobile drawer when moving between breakpoints.
      if (!isMobileLayout()) {
        setOpenState(false);
      }
    });
  });
})();
