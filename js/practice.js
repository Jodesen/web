document.addEventListener("DOMContentLoaded", function () {
  // 特效 5：种植计划计算器。
  // 根据作物和面积，生成简单的种植建议，用于页面交互展示。
  var cropSelect = document.getElementById("cropSelect");
  var areaInput = document.getElementById("areaInput");
  var planButton = document.getElementById("planBtn");
  var planTitle = document.getElementById("planTitle");
  var seedResult = document.getElementById("seedResult");
  var dayResult = document.getElementById("dayResult");
  var incomeResult = document.getElementById("incomeResult");

  var cropMap = {
    rice: {
      name: "水稻",
      seed: 3,
      days: 2,
      point: "重点练习节水灌溉和水位观察"
    },
    corn: {
      name: "玉米",
      seed: 4,
      days: 3,
      point: "重点练习间距管理和成长记录"
    },
    tomato: {
      name: "番茄",
      seed: 5,
      days: 3,
      point: "重点练习搭架、浇水和成熟观察"
    }
  };

  function createPlan() {
    var cropValue = cropSelect.value;
    var areaValue = Number(areaInput.value);

    if (!areaValue || areaValue < 1) {
      areaValue = 1;
      areaInput.value = 1;
    }

    var cropInfo = cropMap[cropValue];
    var seedCount = cropInfo.seed * areaValue;
    var manageDays = cropInfo.days * areaValue;

    planTitle.textContent = "推荐计划：" + areaValue + " 亩" + cropInfo.name;
    seedResult.textContent = "预计种苗准备：" + seedCount + " 份";
    dayResult.textContent = "预计基础管理：" + manageDays + " 天";
    incomeResult.textContent = "预计展示亮点：" + cropInfo.point;
  }

  planButton.addEventListener("click", function () {
    createPlan();
  });

  createPlan();

  // 特效 6：实践任务进度条。
  // 每次点击按钮时完成一个新步骤，同时更新进度条宽度和提示文字。
  var taskItems = document.querySelectorAll(".task-item");
  var nextTaskButton = document.getElementById("nextTaskBtn");
  var progressBar = document.getElementById("progressBar");
  var progressText = document.getElementById("progressText");
  var taskTip = document.getElementById("taskTip");
  var doneCount = 1;

  function updateProgress() {
    var percent = Math.round((doneCount / taskItems.length) * 100);

    progressBar.style.width = percent + "%";
    progressText.textContent = "当前进度：" + percent + "%";

    if (doneCount >= taskItems.length) {
      taskTip.textContent = "全部步骤已完成，祝你在农业实践展示中取得好成绩。";
      nextTaskButton.disabled = true;
      nextTaskButton.textContent = "已全部完成";
    }
  }

  nextTaskButton.addEventListener("click", function () {
    if (doneCount < taskItems.length) {
      taskItems[doneCount].classList.add("done");
      doneCount = doneCount + 1;
      updateProgress();
    }
  });

  updateProgress();
});
