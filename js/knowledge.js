document.addEventListener("DOMContentLoaded", function () {
  // 特效 3：四季知识切换。
  // 点击不同季节按钮时，只显示对应的知识内容。
  var seasonButtons = document.querySelectorAll(".season-btn");
  var seasonPanels = document.querySelectorAll(".season-panel");

  seasonButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var seasonName = button.getAttribute("data-season");

      seasonButtons.forEach(function (item) {
        item.classList.remove("active");
      });

      seasonPanels.forEach(function (panel) {
        panel.classList.remove("active");
      });

      button.classList.add("active");
      document.getElementById(seasonName).classList.add("active");
    });
  });

  // 特效 4：农业问答手风琴。
  // 点击标题时展开当前答案，并收起其他答案。
  var accordionTitles = document.querySelectorAll(".accordion-title");

  accordionTitles.forEach(function (title) {
    title.addEventListener("click", function () {
      var currentItem = title.parentElement;

      document.querySelectorAll(".accordion-item").forEach(function (item) {
        if (item !== currentItem) {
          item.classList.remove("open");
        }
      });

      currentItem.classList.toggle("open");
    });
  });
});
