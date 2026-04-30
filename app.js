(function () {
  const STORAGE_KEYS = {
    history: "nbti-history",
    latest: "nbti-latest-result",
  };
  const DIMENSIONS = ["overwork", "balance", "slacker", "social", "rebel", "survivor"];
  const DIMENSION_META = {
    overwork: { name: "卷王驱动力", title: "任务燃烧程度", concentration: 97 },
    balance: { name: "边界清醒度", title: "准点下线本能", concentration: 46 },
    slacker: { name: "摸鱼回血值", title: "精神省电指数", concentration: 82 },
    social: { name: "人情控场力", title: "空气读懂能力", concentration: 74 },
    rebel: { name: "反 PUA 雷达", title: "话术拆弹速度", concentration: 63 },
    survivor: { name: "背锅求生欲", title: "风险避让系统", concentration: 88 },
  };
  const TEST_TOTALS = {
    quick: 15,
    standard: 30,
  };
  const OPTION_LABELS = ["A", "B", "C"];

  const state = {
    view: "home",
    testMode: "quick",
    sessionQuestions: [],
    answers: [],
    currentIndex: 0,
    currentRecord: null,
    activeHistoryId: "",
    posterUrl: "",
  };

  const dom = {
    views: Array.from(document.querySelectorAll(".view")),
    headerBackButton: document.getElementById("headerBackButton"),
    headerHistoryButton: document.getElementById("headerHistoryButton"),
    latestResultSection: document.getElementById("latestResultSection"),
    startQuickButton: document.getElementById("startQuickButton"),
    startStandardButton: document.getElementById("startStandardButton"),
    questionCounter: document.getElementById("questionCounter"),
    testModeLabel: document.getElementById("testModeLabel"),
    progressFill: document.getElementById("progressFill"),
    questionText: document.getElementById("questionText"),
    optionList: document.getElementById("optionList"),
    prevQuestionButton: document.getElementById("prevQuestionButton"),
    cancelTestButton: document.getElementById("cancelTestButton"),
    resultContent: document.getElementById("resultContent"),
    historyList: document.getElementById("historyList"),
    toastStack: document.getElementById("toastStack"),
    posterDialog: document.getElementById("posterDialog"),
    posterPreviewImage: document.getElementById("posterPreviewImage"),
    downloadPosterLink: document.getElementById("downloadPosterLink"),
    closePosterDialogButton: document.getElementById("closePosterDialogButton"),
  };

  function init() {
    bindEvents();
    renderHome();
    renderHistory();
    setView("home");
  }

  function bindEvents() {
    dom.startQuickButton.addEventListener("click", function () {
      startTest("quick");
    });
   dom.startStandardButton.addEventListener("click", function () {
      startTest("standard");
    });
    dom.headerBackButton.addEventListener("click", function () {
      handleBack();
    });
    dom.prevQuestionButton.addEventListener("click", goPrevQuestion);
    dom.cancelTestButton.addEventListener("click", function () {
      renderHome();
      setView("home");
    });
    dom.closePosterDialogButton.addEventListener("click", closePosterDialog);
    dom.posterDialog.addEventListener("click", function (event) {
      if (event.target && event.target.dataset && event.target.dataset.closeDialog === "true") {
        closePosterDialog();
      }
    });
    dom.posterDialog.addEventListener("close", revokePosterUrl);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && dom.posterDialog.open) {
        closePosterDialog();
      }
    });
  }

  function setView(viewName) {
    state.view = viewName;
    dom.views.forEach(function (view) {
      view.classList.toggle("view--active", view.dataset.view === viewName);
    });
    dom.headerBackButton.hidden = viewName === "home";
    dom.headerHistoryButton.textContent = viewName === "history" ? "回到首页" : "历史档案";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    if (state.view === "test") {
      renderHome();
      setView("home");
      return;
    }
    if (state.view === "history") {
      renderHome();
      setView("home");
      return;
    }
    if (state.view === "result" && state.activeHistoryId) {
      renderHistory();
      setView("history");
      return;
    }
    renderHome();
    setView("home");
  }

  dom.headerHistoryButton.addEventListener("click", function () {
    if (state.view === "history") {
      renderHome();
      setView("home");
      return;
    }
    renderHistory();
    setView("history");
  });

  function startTest(mode) {
    state.testMode = mode;
    state.activeHistoryId = "";
    state.sessionQuestions = buildSessionQuestions(mode);
    state.answers = Array(state.sessionQuestions.length).fill(null);
    state.currentIndex = 0;
    renderTest();
    setView("test");
  }

  function shuffle(list) {
    const items = list.slice();
    for (let index = items.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const temp = items[index];
      items[index] = items[randomIndex];
      items[randomIndex] = temp;
    }
    return items;
  }

  function getQuestionCounts(total) {
    const counts = {};
    const baseCount = Math.floor(total / DIMENSIONS.length);
    const extraCount = total % DIMENSIONS.length;
    const extraDimensions = shuffle(DIMENSIONS).slice(0, extraCount);

    DIMENSIONS.forEach(function (dimension) {
      counts[dimension] = baseCount + (extraDimensions.indexOf(dimension) > -1 ? 1 : 0);
    });

    return counts;
  }

  function buildSessionQuestions(mode) {
    const total = TEST_TOTALS[mode] || TEST_TOTALS.standard;
    const counts = getQuestionCounts(total);
    const selected = [];

    DIMENSIONS.forEach(function (dimension) {
      const grouped = window.NBTI_DATA.questions.filter(function (item) {
        return item.dimension === dimension;
      });
      shuffle(grouped)
        .slice(0, counts[dimension])
        .forEach(function (item, index) {
          selected.push({
            id: item.id,
            dimension: item.dimension,
            text: item.text,
            options: item.options,
            sessionIndex: index,
          });
        });
    });

    return shuffle(selected).map(function (item, index) {
      return Object.assign({}, item, { sessionIndex: index });
    });
  }

  function renderHome() {
    const history = getHistory();
    const latestRecord = history[0] || null;
    if (!latestRecord) {
      dom.latestResultSection.innerHTML =
        '<div class="latest-card"><h3 class="latest-card__title">还没有结果</h3><p class="latest-card__copy">完成测试后，这里会展示最近一次结果和你的历史档案入口。</p></div>';
      return;
    }

    const personality = findPersonality(latestRecord.personalityId);
    const wrapper = document.createElement("div");
    wrapper.className = "latest-card";
    wrapper.innerHTML =
      '<div class="latest-card__head">' +
      '<div>' +
      '<h3 class="latest-card__title">最近一次结果</h3>' +
      '<p class="latest-card__meta">' +
      escapeHtml(formatDate(latestRecord.timestamp, true)) +
      " · 已保存 " +
      history.length +
      " 条历史</p>" +
      "</div>" +
      '<span class="latest-card__label">' +
      escapeHtml(personality.name) +
      "</span>" +
      "</div>" +
      '<p class="latest-card__copy">' +
      escapeHtml(personality.title) +
      "</p>" +
      '<p class="latest-card__copy" style="margin-top: 10px;">' +
      escapeHtml(personality.slogan) +
      "</p>" +
      '<div class="result-actions" style="margin-top: 20px;">' +
      '<button class="button button--secondary" type="button" data-action="open-latest">查看这次结果</button>' +
      '<button class="button button--ghost" type="button" data-action="go-history">查看全部历史</button>' +
      "</div>";
    wrapper.querySelector('[data-action="open-latest"]').addEventListener("click", function () {
      openResultRecord(latestRecord.id);
    });
    wrapper.querySelector('[data-action="go-history"]').addEventListener("click", function () {
      renderHistory();
      setView("history");
    });
    dom.latestResultSection.innerHTML = "";
    dom.latestResultSection.appendChild(wrapper);
  }

  function renderTest() {
    const question = state.sessionQuestions[state.currentIndex];
    if (!question) {
      return;
    }

    dom.questionCounter.textContent =
      String(state.currentIndex + 1) + " / " + String(state.sessionQuestions.length);
    dom.testModeLabel.textContent = state.testMode === "quick" ? "快速测试" : "标准测试";
    dom.progressFill.style.width =
      String(Math.round(((state.currentIndex + 1) / state.sessionQuestions.length) * 100)) + "%";
    dom.questionText.textContent = question.text;
    dom.prevQuestionButton.disabled = state.currentIndex === 0;
    dom.optionList.innerHTML = "";

    question.options.forEach(function (option, index) {
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "option-card" + (state.answers[state.currentIndex] === index ? " option-card--selected" : "");
      button.innerHTML =
        '<span class="option-card__badge">' +
        OPTION_LABELS[index] +
        "</span>" +
        '<span class="option-card__text">' +
        escapeHtml(option.text) +
        "</span>";
      button.addEventListener("click", function () {
        chooseOption(index);
      });
      dom.optionList.appendChild(button);
    });
  }

  function chooseOption(optionIndex) {
    state.answers[state.currentIndex] = optionIndex;
    renderTest();
    window.setTimeout(function () {
      if (state.currentIndex >= state.sessionQuestions.length - 1) {
        finishTest();
        return;
      }
      state.currentIndex += 1;
      renderTest();
    }, 180);
  }

  function goPrevQuestion() {
    if (state.currentIndex === 0) {
      return;
    }
    state.currentIndex -= 1;
    renderTest();
  }

  function calculateResult(answers, questions) {
    const dimensionScores = {};
    DIMENSIONS.forEach(function (dimension) {
      dimensionScores[dimension] = 0;
    });

    answers.forEach(function (optionIndex, questionIndex) {
      if (typeof optionIndex !== "number") {
        return;
      }
      const question = questions[questionIndex];
      const selectedOption = question && question.options ? question.options[optionIndex] : null;
      if (!selectedOption || !selectedOption.scores) {
        return;
      }

      Object.keys(selectedOption.scores).forEach(function (dimension) {
        if (typeof dimensionScores[dimension] === "number") {
          dimensionScores[dimension] += selectedOption.scores[dimension];
        }
      });
    });

    const dimensionRanking = DIMENSIONS.map(function (dimension) {
      return {
        id: dimension,
        name: DIMENSION_META[dimension].name,
        title: DIMENSION_META[dimension].title,
        score: dimensionScores[dimension],
        concentration: DIMENSION_META[dimension].concentration,
      };
    }).sort(function (left, right) {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return right.concentration - left.concentration;
    });

    const maxScore = Math.max.apply(
      null,
      DIMENSIONS.map(function (dimension) {
        return dimensionScores[dimension];
      }),
    );
    const personalityRanking = window.NBTI_DATA.personalities
      .map(function (personality) {
        return {
          id: personality.id,
          name: personality.name,
          score: getProfileScore(personality, dimensionScores, maxScore),
          concentration: personality.concentration,
        };
      })
      .sort(function (left, right) {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        return right.concentration - left.concentration;
      });

    const top = personalityRanking[0];
    const personality = findPersonality(top.id);

    return {
      personality: personality,
      dimensionScores: dimensionScores,
      ranking: dimensionRanking,
      personalityRanking: personalityRanking,
    };
  }

  function getProfileScore(personality, dimensionScores, maxScore) {
    const profile = personality.profile || {};
    let score = 0;

    DIMENSIONS.forEach(function (dimension) {
      const actual = maxScore ? dimensionScores[dimension] / maxScore : 0;
      const expected = (profile[dimension] || 0) / 6;
      score += 6 - Math.abs(actual * 6 - expected * 6);
    });

    return Math.max(0, Math.round(score * 10));
  }

  function finishTest() {
    const result = calculateResult(state.answers, state.sessionQuestions);
    const record = {
      id: String(Date.now()),
      personalityId: result.personality.id,
      timestamp: Date.now(),
      answers: state.answers.slice(),
      dimensionScores: result.dimensionScores,
      ranking: result.ranking,
      personalityRanking: result.personalityRanking,
      testMode: state.testMode,
    };

    const history = getHistory();
    history.unshift(record);
    const trimmed = history.slice(0, 10);
    saveHistory(trimmed);
    saveLatest(record);

    state.currentRecord = record;
    state.activeHistoryId = "";
    renderHome();
    renderHistory();
    renderResult(record, false);
    setView("result");
    showToast("测试完成，结果已经保存在当前浏览器。");
  }

  function renderResult(record, fromHistory) {
    const personality = findPersonality(record.personalityId);
    state.currentRecord = record;
    state.activeHistoryId = fromHistory ? String(record.id) : "";
    revokePosterUrl();

    const rankingView = (record.ranking || []).slice(0, 3);
    dom.resultContent.innerHTML =
      '<div class="result-grid">' +
      '<div class="section-heading">' +
      '<h2 class="hero-title hero-title--compact">' +
      escapeHtml(fromHistory ? personality.name : "你的结果是 " + personality.name) +
      "</h2>" +
      '<p class="body-copy">' +
      escapeHtml(
        (fromHistory ? "这条结果生成于 " : "测试完成于 ") +
          formatDate(record.timestamp, false) +
          "，是你当时的工位精神切片。",
      ) +
      "</p>" +
      "</div>" +
      renderPersonalityCard(personality) +
      '<section class="result-panel"><h3 class="result-panel__title">得分画像</h3><div class="score-grid">' +
      rankingView.map(renderScoreCard).join("") +
      "</div></section>" +
      '<section class="result-panel"><h3 class="result-panel__title">办公室生存提示</h3><p class="result-panel__copy">' +
      escapeHtml(personality.advice) +
      "</p></section>" +
      '<section class="result-panel result-panel--warn"><h3 class="result-panel__title">风险提示</h3><p class="result-panel__copy">测试仅供娱乐，请勿对号入座。</p></section>' +
      '<div class="result-actions">' +
      '<button class="button button--secondary" type="button" id="generatePosterButton">生成海报</button>' +
      '<button class="button button--primary" type="button" id="downloadPosterButton">下载海报</button>' +
      '<button class="button button--ghost" type="button" id="restartTestButton">再测一次</button>' +
      "</div>" +
      "</div>";

    document.getElementById("generatePosterButton").addEventListener("click", function () {
      openPosterDialog(record);
    });
    document.getElementById("downloadPosterButton").addEventListener("click", function () {
      downloadPoster(record);
    });
    document.getElementById("restartTestButton").addEventListener("click", function () {
      startTest("standard");
    });
  }

  function renderPersonalityCard(personality) {
    return (
      '<div class="personality-wrap"><article class="personality-card">' +
      '<p class="personality-title">' +
      escapeHtml(personality.title) +
      "</p>" +
      '<h3 class="personality-name">' +
      escapeHtml(personality.name) +
      "</h3>" +
      '<p class="personality-slogan">' +
      escapeHtml(personality.slogan) +
      "</p>" +
      '<div class="meter-row"><span>班味浓度</span><strong>' +
      String(personality.concentration) +
      "%</strong></div>" +
      '<div class="meter-track"><div class="meter-fill" style="width: ' +
      String(personality.concentration) +
      '%;"></div></div>' +
      '<p class="personality-description">' +
      escapeHtml(personality.description) +
      "</p>" +
      '<div class="tag-row">' +
      (personality.tags || [])
        .map(function (tag) {
          return '<span class="tag">' + escapeHtml(tag) + "</span>";
        })
        .join("") +
      "</div></article></div>"
    );
  }

  function renderScoreCard(item, index) {
    return (
      '<article class="score-card">' +
      '<div class="score-card__head">' +
      '<span class="score-card__rank">' +
      String(index + 1) +
      "</span>" +
      '<div style="flex: 1;">' +
      '<div class="score-card__name">' +
      escapeHtml(item.name) +
      "</div>" +
      '<p class="score-card__title">' +
      escapeHtml(item.title) +
      "</p>" +
      "</div>" +
      '<span class="score-card__value">' +
      String(item.score) +
      " 分</span>" +
      "</div></article>"
    );
  }

  function renderHistory() {
    const history = getHistory();
    if (!history.length) {
      dom.historyList.innerHTML =
        '<div class="history-empty"><h3 class="section-title">还没有历史记录</h3><p class="body-copy">先做一轮测试，再回来查看结果。</p><div class="result-actions" style="margin-top: 18px;"><button class="button button--primary" type="button" id="emptyHistoryStartButton">现在去测</button></div></div>';
      document.getElementById("emptyHistoryStartButton").addEventListener("click", function () {
        startTest("quick");
      });
      return;
    }

    dom.historyList.innerHTML = "";
    history.forEach(function (record) {
      const personality = findPersonality(record.personalityId);
      const card = document.createElement("article");
      card.className = "history-card";
      card.innerHTML =
        '<div class="history-card__head">' +
        '<div>' +
        '<h3 class="history-card__name">' +
        escapeHtml(personality.name) +
        "</h3>" +
        '<p class="history-card__title">' +
        escapeHtml(personality.title) +
        "</p>" +
        "</div>" +
        '<span class="latest-card__label">' +
        String(personality.concentration) +
        "%</span>" +
        "</div>" +
        '<p class="history-card__meta">' +
        escapeHtml(formatDate(record.timestamp, false)) +
        " · " +
        escapeHtml(record.testMode === "quick" ? "快速测试" : "标准测试") +
        "</p>" +
        '<p class="history-card__copy">' +
        escapeHtml(personality.slogan) +
        "</p>" +
        '<div class="history-card__actions">' +
        '<button class="history-card__action" type="button" data-action="view">查看详情</button>' +
        '<button class="history-card__action" type="button" data-action="poster">生成海报</button>' +
        "</div>";
      card.querySelector('[data-action="view"]').addEventListener("click", function () {
        openResultRecord(record.id);
      });
      card.querySelector('[data-action="poster"]').addEventListener("click", function () {
        downloadPoster(record);
      });
      dom.historyList.appendChild(card);
    });
  }

  function openResultRecord(recordId) {
    const record = getHistory().find(function (item) {
      return String(item.id) === String(recordId);
    });
    if (!record) {
      showToast("没有找到这条历史记录。", "error");
      return;
    }
    renderResult(record, true);
    setView("result");
  }

  function findPersonality(personalityId) {
    return (
      window.NBTI_DATA.personalities.find(function (item) {
        return item.id === personalityId;
      }) || window.NBTI_DATA.personalities[0]
    );
  }

  function getHistory() {
    const raw = window.localStorage.getItem(STORAGE_KEYS.history);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory(history) {
    window.localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  }

  function saveLatest(record) {
    window.localStorage.setItem(STORAGE_KEYS.latest, JSON.stringify(record));
  }

  function formatDate(timestamp, compact) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return compact
      ? month + "-" + day + " " + hours + ":" + minutes
      : year + "-" + month + "-" + day + " " + hours + ":" + minutes;
  }

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = "toast" + (type === "error" ? " toast--error" : "");
    toast.textContent = message;
    dom.toastStack.appendChild(toast);
    window.setTimeout(function () {
      toast.remove();
    }, 2600);
  }

  function downloadPoster(record) {
    const poster = buildPoster(record);
    const link = document.createElement("a");
    link.href = poster.dataUrl;
    link.download = poster.fileName;
    link.click();
    showToast("海报已开始下载。");
  }

  function openPosterDialog(record) {
    const poster = buildPoster(record);
    state.posterUrl = poster.dataUrl;
    dom.posterPreviewImage.src = poster.dataUrl;
    dom.downloadPosterLink.href = poster.dataUrl;
    dom.downloadPosterLink.download = poster.fileName;
    dom.posterDialog.showModal();
  }

  function closePosterDialog() {
    dom.posterDialog.close();
  }

  function revokePosterUrl() {
    if (!state.posterUrl) {
      return;
    }
    dom.posterPreviewImage.removeAttribute("src");
    dom.downloadPosterLink.removeAttribute("href");
    state.posterUrl = "";
  }

  function buildPoster(record) {
    const personality = findPersonality(record.personalityId);
    const ranking = (record.ranking || []).slice(0, 3);
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1600;
    const context = canvas.getContext("2d");

    context.fillStyle = "#fcf8f9";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const topGradient = context.createRadialGradient(1100, 80, 0, 1100, 80, 420);
    topGradient.addColorStop(0, "rgba(233, 221, 253, 0.95)");
    topGradient.addColorStop(1, "rgba(233, 221, 253, 0)");
    context.fillStyle = topGradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const sideGradient = context.createRadialGradient(140, 120, 0, 140, 120, 360);
    sideGradient.addColorStop(0, "rgba(191, 255, 229, 0.9)");
    sideGradient.addColorStop(1, "rgba(191, 255, 229, 0)");
    context.fillStyle = sideGradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawRoundedRect(context, 104, 130, 992, 540, 48, "#e7e1ae", "#707974", 4, 16, 16);
    drawRoundedRect(context, 88, 114, 992, 540, 48, "#ffffff", "#707974", 4, 0, 0);

    context.fillStyle = "#404944";
    context.font = '700 24px "Sora", "Noto Sans SC", sans-serif';
    context.fillText("NBTI PERSONALITY", 148, 188);

    context.fillStyle = "#1b1b1c";
    context.font = '800 74px "Sora", "Noto Sans SC", sans-serif';
    wrapText(context, personality.name, 148, 280, 780, 92);

    context.fillStyle = "#2b6955";
    context.font = '600 34px "Sora", "Noto Sans SC", sans-serif';
    wrapText(context, personality.slogan, 148, 420, 780, 54);

    context.fillStyle = "#404944";
    context.font = '400 28px "Noto Sans SC", sans-serif';
    wrapText(context, personality.description, 148, 540, 792, 44, 5);

    drawRoundedRect(context, 760, 760, 320, 240, 40, "#13231f", "#13231f", 0, 0, 0);
    context.fillStyle = "rgba(244, 248, 245, 0.74)";
    context.font = '700 22px "Sora", "Noto Sans SC", sans-serif';
    context.fillText("班味浓度", 804, 826);
    context.fillStyle = "#f4f8f5";
    context.font = '800 96px "Sora", "Noto Sans SC", sans-serif';
    context.fillText(String(personality.concentration) + "%", 804, 934);
    context.fillStyle = "rgba(244, 248, 245, 0.88)";
    context.font = '400 24px "Noto Sans SC", sans-serif';
    context.fillText("随机抽题，结果只保存在本地", 804, 974);

    drawRoundedRect(context, 88, 760, 620, 460, 40, "#ffffff", "#707974", 4, 0, 0);
    context.fillStyle = "#1b1b1c";
    context.font = '700 34px "Sora", "Noto Sans SC", sans-serif';
    context.fillText("得分画像", 144, 834);

    ranking.forEach(function (item, index) {
      const top = 904 + index * 110;
      context.fillStyle = "#bfffe5";
      drawRoundedRect(context, 142, top - 38, 50, 50, 25, "#bfffe5", "#2b6955", 0, 0, 0);
      context.fillStyle = "#1b1b1c";
      context.font = '700 24px "Sora", "Noto Sans SC", sans-serif';
      context.fillText(String(index + 1), 160, top - 6);
      context.font = '700 28px "Noto Sans SC", sans-serif';
      context.fillText(item.name, 220, top);
      context.fillStyle = "#2b6955";
      context.font = '700 26px "Sora", "Noto Sans SC", sans-serif';
      context.fillText(String(item.score) + " 分", 560, top);
      context.fillStyle = "#404944";
      context.font = '400 22px "Noto Sans SC", sans-serif';
      wrapText(context, item.title, 220, top + 36, 320, 34, 1);
    });

    drawRoundedRect(context, 88, 1260, 992, 232, 40, "#fffdf4", "#707974", 4, 0, 0);
    context.fillStyle = "#1b1b1c";
    context.font = '700 30px "Sora", "Noto Sans SC", sans-serif';
    context.fillText("办公室生存提示", 144, 1336);
    context.fillStyle = "#404944";
    context.font = '400 28px "Noto Sans SC", sans-serif';
    wrapText(context, personality.advice, 144, 1396, 870, 42, 3);

    context.fillStyle = "#67643b";
    context.font = '400 22px "Noto Sans SC", sans-serif';
    context.fillText("测试仅供娱乐，请勿对号入座。", 88, 1548);
    context.fillText(formatDate(record.timestamp, false), 826, 1548);

    return {
      dataUrl: canvas.toDataURL("image/png"),
      fileName: "nbti-" + personality.id + "-" + record.id + ".png",
    };
  }

  function drawRoundedRect(context, x, y, width, height, radius, fillColor, strokeColor, lineWidth, shadowX, shadowY) {
    context.save();
    if (shadowX || shadowY) {
      context.translate(shadowX || 0, shadowY || 0);
    }
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
    context.fillStyle = fillColor;
    context.fill();
    if (lineWidth) {
      context.lineWidth = lineWidth;
      context.strokeStyle = strokeColor;
      context.stroke();
    }
    context.restore();
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines) {
    const chars = String(text).split("");
    let line = "";
    let row = 0;
    chars.forEach(function (char, index) {
      const testLine = line + char;
      if (context.measureText(testLine).width > maxWidth && line !== "") {
        if (!maxLines || row < maxLines) {
          context.fillText(line, x, y + row * lineHeight);
        }
        row += 1;
        line = char;
      } else {
        line = testLine;
      }

      const isLast = index === chars.length - 1;
      if (isLast && (!maxLines || row < maxLines)) {
        context.fillText(line, x, y + row * lineHeight);
      }
    });
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  init();
})();
