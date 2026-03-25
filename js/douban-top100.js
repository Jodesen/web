(function () {
  var dataset = window.DOUBAN_TOP100_DATA;

  if (!dataset || !Array.isArray(dataset.movies)) {
    return;
  }

  var movies = dataset.movies.slice();
  var state = {
    query: "",
    decade: "all",
    region: "all",
    sort: "rank"
  };

  var spotlightCard = document.getElementById("spotlightCard");
  var heroDeck = document.getElementById("heroDeck");
  var heroStats = document.getElementById("heroStats");
  var heroLead = document.getElementById("heroLead");
  var insightGrid = document.getElementById("insightGrid");
  var decadeBars = document.getElementById("decadeBars");
  var topTenMain = document.getElementById("topTenMain");
  var topTenPrev = document.getElementById("topTenPrev");
  var topTenNext = document.getElementById("topTenNext");
  var topTenShowcase = document.getElementById("topTenShowcase");
  var movieGrid = document.getElementById("movieGrid");
  var sourceSummary = document.getElementById("sourceSummary");
  var sourceMeta = document.getElementById("sourceMeta");
  var sourceLinks = document.getElementById("sourceLinks");
  var footerNote = document.getElementById("footerNote");
  var resultCount = document.getElementById("resultCount");
  var searchInput = document.getElementById("searchInput");
  var decadeFilter = document.getElementById("decadeFilter");
  var regionFilter = document.getElementById("regionFilter");
  var sortSelect = document.getElementById("sortSelect");
  var revealObserver = null;
  var topTenState = {
    activeIndex: 0,
    timer: null,
    transitionTimer: null,
    isAnimating: false
  };
  var TOP_TEN_OUT_DURATION = 720;
  var TOP_TEN_BLANK_GAP = 150;
  var TOP_TEN_IN_DURATION = 880;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
  }

  function formatVotes(value) {
    var votes = Number(value || 0);

    if (votes >= 10000) {
      return (votes / 10000).toFixed(votes >= 1000000 ? 1 : 0) + " 万人评价";
    }

    return formatNumber(votes) + " 人评价";
  }

  function formatDateTime(value) {
    var date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function getDecadeLabel(year) {
    var numericYear = Number(year);

    if (!numericYear) {
      return "未知年代";
    }

    return Math.floor(numericYear / 10) * 10 + "年代";
  }

  function getDecadeOrder(label) {
    var order = parseInt(label, 10);
    return Number.isNaN(order) ? 9999 : order;
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function countBy(items, accessor) {
    return items.reduce(function (result, item) {
      var key = accessor(item);

      if (!key) {
        return result;
      }

      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
  }

  function getSortedEntries(counter) {
    return Object.keys(counter)
      .map(function (key) {
        return [key, counter[key]];
      })
      .sort(function (left, right) {
        return right[1] - left[1];
      });
  }

  function averageRating(items) {
    var total = items.reduce(function (sum, item) {
      return sum + Number(item.rating || 0);
    }, 0);

    return (total / items.length).toFixed(2);
  }

  function createPosterMarkup(movie, sizeClass) {
    return (
      '<div class="' + sizeClass + '">' +
        '<img src="' + escapeHtml(movie.poster) + '" alt="' + escapeHtml(movie.title + " 海报") + '" data-poster-title="' + escapeHtml(movie.title) + '" loading="lazy">' +
        '<div class="poster-shade"></div>' +
        '<div class="poster-topline">' +
          '<span class="rank-chip">#' + movie.rank + "</span>" +
          '<span class="rating-chip">' + movie.rating.toFixed(1) + "</span>" +
        "</div>" +
      "</div>"
    );
  }

  function getTopTenMovies() {
    return movies.slice(0, 10);
  }

  function createTopTenCopyMarkup(movie, nextMovie) {
    return (
      '<span class="top-ten-kicker">#' + movie.rank + " · " + movie.rating.toFixed(1) + " 分</span>" +
      '<h3 class="top-ten-title">' + escapeHtml(movie.title) + "</h3>" +
      '<p class="top-ten-desc">' + escapeHtml(movie.otherTitle || movie.creditLine || movie.metaLine) + "</p>" +
      '<div class="top-ten-meta">' +
        '<span class="top-ten-large-chip">' + escapeHtml(movie.year || "未知年份") + "</span>" +
        '<span class="top-ten-large-chip">' + escapeHtml(movie.region || "未知地区") + "</span>" +
        '<span class="top-ten-large-chip">' + escapeHtml(movie.director || "导演未标注") + "</span>" +
        '<span class="top-ten-large-chip">' + escapeHtml(formatVotes(movie.votes)) + "</span>" +
      "</div>" +
      '<div class="top-ten-actions">' +
        '<a class="top-ten-inline-link" href="' + escapeHtml(movie.detailUrl) + '" target="_blank" rel="noreferrer">查看豆瓣详情</a>' +
      "</div>" +
      '<p class="top-ten-nextline">下一部：#' + nextMovie.rank + " " + escapeHtml(nextMovie.title) + "</p>"
    );
  }

  function createTopTenTransitionLayer(posterPath, variantClass) {
    var slices = [];
    var sliceCount = 7;

    for (var index = 0; index < sliceCount; index += 1) {
      slices.push(
        '<span class="top-ten-transition-slice" style="--slice-index:' + index + ';">' +
            '<img src="' +
            escapeHtml(posterPath) +
            '" alt="" loading="eager">' +
          "</span>"
      );
    }

    return '<div class="top-ten-transition-layer ' + variantClass + '" style="--slice-count:' + sliceCount + ';" aria-hidden="true">' + slices.join("") + "</div>";
  }

  function createPosterFallbackDataUri(title) {
    var safeTitle = String(title || "Movie").replace(/[<>&"]/g, "");
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800">' +
        '<defs>' +
          '<linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">' +
            '<stop offset="0%" stop-color="#12284a"/>' +
            '<stop offset="55%" stop-color="#0b1730"/>' +
            '<stop offset="100%" stop-color="#08111f"/>' +
          "</linearGradient>" +
          '<radialGradient id="glow" cx="0.2" cy="0.2" r="0.8">' +
            '<stop offset="0%" stop-color="#6ce7d2" stop-opacity="0.9"/>' +
            '<stop offset="100%" stop-color="#6ce7d2" stop-opacity="0"/>' +
          "</radialGradient>" +
        "</defs>" +
        '<rect width="600" height="800" fill="url(#bg)"/>' +
        '<rect width="600" height="800" fill="url(#glow)"/>' +
        '<circle cx="470" cy="150" r="110" fill="#8ab2ff" opacity="0.2"/>' +
        '<path d="M120 620C205 520 322 450 480 390" stroke="#6ce7d2" stroke-opacity="0.35" stroke-width="6" fill="none"/>' +
        '<text x="64" y="660" fill="#f4f8ff" font-family="Segoe UI, Microsoft YaHei, sans-serif" font-size="42" font-weight="700">' + safeTitle + "</text>" +
        '<text x="64" y="716" fill="rgba(244,248,255,0.72)" font-family="Segoe UI, Microsoft YaHei, sans-serif" font-size="24">Poster unavailable</text>' +
      "</svg>";

    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function setupPosterFallbacks() {
    Array.prototype.forEach.call(document.querySelectorAll("img[data-poster-title]"), function (image) {
      function applyFallback() {
        if (image.dataset.fallbackApplied === "1") {
          return;
        }

        image.dataset.fallbackApplied = "1";
        image.src = createPosterFallbackDataUri(image.dataset.posterTitle);
      }

      image.addEventListener("error", applyFallback, { once: true });

      if (image.complete && image.naturalWidth === 0) {
        applyFallback();
      }
    });
  }

  function observeRevealTargets() {
    if (!("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(document.querySelectorAll("[data-reveal]"), function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              revealObserver.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -40px 0px"
        }
      );
    }

    Array.prototype.forEach.call(document.querySelectorAll("[data-reveal]:not(.is-visible)"), function (item) {
      revealObserver.observe(item);
    });
  }

  function renderHero() {
    var topMovie = movies[0];
    var deckMovies = movies.slice(1, 4);
    var generatedAtText = formatDateTime(dataset.generatedAt);
    var highestVotesMovie = movies.reduce(function (currentMax, movie) {
      return movie.votes > currentMax.votes ? movie : currentMax;
    }, movies[0]);
    var years = movies
      .map(function (movie) { return Number(movie.year); })
      .filter(Boolean)
      .sort(function (left, right) { return left - right; });

    heroLead.textContent =
      "数据抓取时间为 " +
      generatedAtText +
      "，直接来自豆瓣电影 Top 250 当前列表，按官方排序截取前 100 名。页面支持搜索、年代筛选、热度排序和沉浸式浏览。";

    spotlightCard.innerHTML =
      createPosterMarkup(topMovie, "spotlight-poster") +
      '<div class="spotlight-copy">' +
        '<p class="eyebrow">No.1 Spotlight</p>' +
        "<h2>" + escapeHtml(topMovie.title) + "</h2>" +
        "<p>" + escapeHtml(topMovie.otherTitle || topMovie.metaLine || topMovie.creditLine) + "</p>" +
        '<div class="spotlight-meta">' +
          '<span class="meta-chip">' + escapeHtml(topMovie.year || "年份未知") + "</span>" +
          '<span class="meta-chip">' + escapeHtml(topMovie.region || "地区未知") + "</span>" +
          '<span class="meta-chip">' + escapeHtml(topMovie.genre || "类型未标注") + "</span>" +
        "</div>" +
      "</div>";

    heroDeck.innerHTML = deckMovies
      .map(function (movie) {
        return (
          '<article class="hero-deck-card tilt-card" data-reveal>' +
            '<div class="hero-deck-layout">' +
              createPosterMarkup(movie, "hero-deck-poster") +
              '<div class="hero-deck-copy">' +
                "<h3>" + escapeHtml(movie.title) + "</h3>" +
                "<p>" + escapeHtml(movie.director || movie.otherTitle) + "</p>" +
                '<div class="hero-deck-meta">' +
                  "<span>#" + movie.rank + "</span>" +
                  "<span>" + movie.rating.toFixed(1) + "</span>" +
                  "<span>" + escapeHtml(movie.year || "未知") + "</span>" +
                "</div>" +
              "</div>" +
            "</div>" +
          "</article>"
        );
      })
      .join("");

    heroStats.innerHTML = [
      {
        label: "平均评分",
        value: averageRating(movies),
        note: "前 100 全部影片"
      },
      {
        label: "时间跨度",
        value: years[0] + " - " + years[years.length - 1],
        note: "跨越 " + (years[years.length - 1] - years[0]) + " 年"
      },
      {
        label: "评分 9.4+",
        value: movies.filter(function (movie) { return Number(movie.rating) >= 9.4; }).length + " 部",
        note: "头部密度非常高"
      },
      {
        label: "最高热度",
        value: highestVotesMovie.title,
        note: formatVotes(highestVotesMovie.votes)
      }
    ]
      .map(function (item) {
        return (
          '<article class="hero-stat-card">' +
            "<span>" + escapeHtml(item.label) + "</span>" +
            "<strong>" + escapeHtml(item.value) + "</strong>" +
            "<small>" + escapeHtml(item.note) + "</small>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderInsights() {
    var decadeCounter = countBy(movies, function (movie) {
      return getDecadeLabel(movie.year);
    });
    var topDecadeEntry = getSortedEntries(decadeCounter)[0];
    var oldestMovie = movies
      .slice()
      .filter(function (movie) { return Number(movie.year); })
      .sort(function (left, right) {
        return Number(left.year) - Number(right.year);
      })[0];
    var newestMovie = movies
      .slice()
      .filter(function (movie) { return Number(movie.year); })
      .sort(function (left, right) {
        return Number(right.year) - Number(left.year);
      })[0];
    var mostReviewedMovie = movies.reduce(function (currentMax, movie) {
      return movie.votes > currentMax.votes ? movie : currentMax;
    }, movies[0]);
    var genreCounter = countBy(
      movies.flatMap(function (movie) {
        return String(movie.genre || "")
          .split(" ")
          .map(function (genre) {
            return genre.trim();
          })
          .filter(Boolean);
      }),
      function (genre) {
        return genre;
      }
    );
    var topGenreEntry = getSortedEntries(genreCounter)[0];

    insightGrid.innerHTML = [
      {
        tag: "Rating",
        value: averageRating(movies),
        title: "评分均值",
        description: "高分段极度集中，平均值依然保持在很高的位置。"
      },
      {
        tag: "Peak Decade",
        value: topDecadeEntry[0],
        title: "年代峰值",
        description: topDecadeEntry[0] + " 一共出现 " + topDecadeEntry[1] + " 部电影。"
      },
      {
        tag: "Heat",
        value: formatVotes(mostReviewedMovie.votes).replace("人评价", ""),
        title: "最高评价人数",
        description: "热度最高的影片是《" + mostReviewedMovie.title + "》。"
      },
      {
        tag: "Genre",
        value: topGenreEntry[0],
        title: "最常见类型标签",
        description: "从整体看，" + topGenreEntry[0] + " 仍然是这份榜单最稳固的底色。"
      }
    ]
      .map(function (item) {
        return (
          '<article class="metric-card" data-reveal>' +
            '<div class="metric-copy">' +
              "<span>" + escapeHtml(item.tag) + "</span>" +
              "<strong>" + escapeHtml(item.value) + "</strong>" +
              "<h3>" + escapeHtml(item.title) + "</h3>" +
              "<p>" + escapeHtml(item.description) + "</p>" +
            "</div>" +
          "</article>"
        );
      })
      .join("");

    var decadeEntries = getSortedEntries(decadeCounter);
    var maxDecadeCount = decadeEntries[0][1];

    decadeBars.innerHTML = decadeEntries
      .map(function (entry) {
        var width = (entry[1] / maxDecadeCount) * 100;

        return (
          '<div class="decade-bar-row">' +
            '<div class="decade-bar-top">' +
              "<span>" + escapeHtml(entry[0]) + "</span>" +
              "<strong>" + entry[1] + " 部</strong>" +
            "</div>" +
            '<div class="decade-track"><span style="width: ' + width.toFixed(1) + '%;"></span></div>' +
          "</div>"
        );
      })
      .join("");

    sourceSummary.textContent =
      "本页数据抓取于 " +
      formatDateTime(dataset.generatedAt) +
      "，来自豆瓣电影 Top 250 当前列表的前四页，截取前 100 名电影。榜单中的最早作品为《" +
      oldestMovie.title +
      "》（" +
      oldestMovie.year +
      "），最新作品为《" +
      newestMovie.title +
      "》（" +
      newestMovie.year +
      "）。";
  }

  function renderTopTen() {
    var topTenMovies = getTopTenMovies();
    var activeMovie = topTenMovies[topTenState.activeIndex];
    var nextMovie = topTenMovies[(topTenState.activeIndex + 1) % topTenMovies.length];

    topTenMain.innerHTML =
      '<article class="top-ten-slide">' +
        '<div class="top-ten-copy-stack">' +
          createTopTenCopyMarkup(activeMovie, nextMovie) +
        "</div>" +
        '<div class="top-ten-visual">' +
          '<div class="top-ten-visual-glow" aria-hidden="true"></div>' +
          '<div class="top-ten-visual-image">' +
            '<div class="top-ten-poster-stage">' +
              '<img class="top-ten-poster-base" src="' + escapeHtml(activeMovie.poster) + '" alt="' + escapeHtml(activeMovie.title + " 海报") + '" data-poster-title="' + escapeHtml(activeMovie.title) + '" loading="lazy">' +
            "</div>" +
          "</div>" +
          '<div class="top-ten-visual-shade"></div>' +
          '<div class="top-ten-visual-frame" aria-hidden="true"></div>' +
        "</div>" +
      "</article>";

    setupPosterFallbacks();
  }

  function setTopTenSlide(nextIndex, skipAnimation) {
    var topTenMovies = getTopTenMovies();
    var count = topTenMovies.length;
    var normalizedIndex = (nextIndex + count) % count;

    if (normalizedIndex === topTenState.activeIndex && !skipAnimation) {
      return;
    }

    if (skipAnimation) {
      topTenState.activeIndex = normalizedIndex;
      renderTopTen();
      return;
    }

    if (topTenState.isAnimating) {
      return;
    }

    var visual = topTenMain.querySelector(".top-ten-visual");
    var copyStack = topTenMain.querySelector(".top-ten-copy-stack");
    var posterStage = topTenMain.querySelector(".top-ten-poster-stage");
    var baseImage = topTenMain.querySelector(".top-ten-poster-base");

    if (!visual || !copyStack || !posterStage || !baseImage) {
      topTenState.activeIndex = normalizedIndex;
      renderTopTen();
      return;
    }

    topTenState.isAnimating = true;
    var currentMovie = topTenMovies[topTenState.activeIndex];
    var targetMovie = topTenMovies[normalizedIndex];

    posterStage.insertAdjacentHTML(
      "beforeend",
      createTopTenTransitionLayer(currentMovie.poster, "is-outgoing")
    );

    visual.classList.add("is-transitioning");
    posterStage.classList.add("is-empty-stage");
    baseImage.classList.add("is-hidden-base");
    setupPosterFallbacks();

    if (topTenState.transitionTimer) {
      window.clearTimeout(topTenState.transitionTimer);
    }

    topTenState.transitionTimer = window.setTimeout(function () {
      Array.prototype.forEach.call(posterStage.querySelectorAll(".is-outgoing"), function (layer) {
        layer.remove();
      });

      var nextMoviePreview = topTenMovies[(normalizedIndex + 1) % count];

      topTenState.transitionTimer = window.setTimeout(function () {
        copyStack.innerHTML = createTopTenCopyMarkup(targetMovie, nextMoviePreview);
        baseImage.src = targetMovie.poster;
        baseImage.alt = targetMovie.title + " 海报";
        baseImage.dataset.posterTitle = targetMovie.title;

        posterStage.insertAdjacentHTML(
          "beforeend",
          createTopTenTransitionLayer(targetMovie.poster, "is-incoming")
        );

        setupPosterFallbacks();

        topTenState.transitionTimer = window.setTimeout(function () {
          Array.prototype.forEach.call(posterStage.querySelectorAll(".is-incoming"), function (layer) {
            layer.remove();
          });

          posterStage.classList.remove("is-empty-stage");
          baseImage.classList.remove("is-hidden-base");
          topTenState.activeIndex = normalizedIndex;
          topTenState.isAnimating = false;
          topTenState.transitionTimer = null;
        }, TOP_TEN_IN_DURATION);
      }, TOP_TEN_BLANK_GAP);
    }, TOP_TEN_OUT_DURATION);
  }

  function startTopTenAutoPlay() {
    if (topTenState.timer) {
      window.clearInterval(topTenState.timer);
    }

    topTenState.timer = window.setInterval(function () {
      setTopTenSlide(topTenState.activeIndex + 1);
    }, 5500);
  }

  function stopTopTenAutoPlay() {
    if (topTenState.timer) {
      window.clearInterval(topTenState.timer);
      topTenState.timer = null;
    }
  }

  function setupFilters() {
    var decades = uniqueSorted(movies.map(function (movie) {
      return getDecadeLabel(movie.year);
    })).sort(function (left, right) {
      return getDecadeOrder(left) - getDecadeOrder(right);
    });
    var regionCounts = getSortedEntries(countBy(movies, function (movie) {
      return movie.region;
    }));

    decadeFilter.innerHTML += decades
      .map(function (decade) {
        return '<option value="' + escapeHtml(decade) + '">' + escapeHtml(decade) + "</option>";
      })
      .join("");

    regionFilter.innerHTML += regionCounts
      .map(function (entry) {
        return '<option value="' + escapeHtml(entry[0]) + '">' + escapeHtml(entry[0]) + " · " + entry[1] + "</option>";
      })
      .join("");
  }

  function matchesQuery(movie, query) {
    if (!query) {
      return true;
    }

    var haystack = [
      movie.title,
      movie.otherTitle,
      movie.year,
      movie.region,
      movie.genre,
      movie.director,
      movie.actors
    ]
      .join(" ")
      .toLowerCase();

    return haystack.indexOf(query) >= 0;
  }

  function getFilteredMovies() {
    return movies
      .filter(function (movie) {
        return matchesQuery(movie, state.query);
      })
      .filter(function (movie) {
        return state.decade === "all" || getDecadeLabel(movie.year) === state.decade;
      })
      .filter(function (movie) {
        return state.region === "all" || movie.region === state.region;
      })
      .sort(function (left, right) {
        if (state.sort === "rating") {
          return Number(right.rating) - Number(left.rating) || left.rank - right.rank;
        }

        if (state.sort === "votes") {
          return Number(right.votes) - Number(left.votes) || left.rank - right.rank;
        }

        if (state.sort === "year") {
          return Number(right.year) - Number(left.year) || left.rank - right.rank;
        }

        return left.rank - right.rank;
      });
  }

  function renderMovieGrid() {
    var filteredMovies = getFilteredMovies();

    resultCount.textContent = "当前显示 " + filteredMovies.length + " 部电影";

    if (!filteredMovies.length) {
      movieGrid.innerHTML =
        '<div class="empty-state">' +
          "<div>" +
            "<strong>没有找到匹配结果</strong>" +
            "<p>试试更短的关键词，或者把年代和地区筛选恢复为“全部”。</p>" +
          "</div>" +
        "</div>";
      observeRevealTargets();
      return;
    }

    movieGrid.innerHTML = filteredMovies
      .map(function (movie) {
        return (
          '<article class="movie-card" data-reveal>' +
            '<div class="movie-poster-wrap">' +
              createPosterMarkup(movie, "movie-poster") +
            "</div>" +
            '<div class="movie-copy">' +
              "<h3>" + escapeHtml(movie.title) + "</h3>" +
              '<p class="movie-alt">' + escapeHtml(movie.otherTitle || movie.creditLine || movie.metaLine) + "</p>" +
              '<div class="movie-meta-row">' +
                '<span class="movie-tag">#' + movie.rank + "</span>" +
                '<span class="movie-tag">' + movie.rating.toFixed(1) + " 分</span>" +
                '<span class="movie-tag">' + escapeHtml(movie.year || "未知年份") + "</span>" +
              "</div>" +
              '<p class="movie-meta">' +
                "地区：" + escapeHtml(movie.region || "未知") +
                "<br>类型：" + escapeHtml(movie.genre || "未知") +
                "<br>导演：" + escapeHtml(movie.director || "未知") +
              "</p>" +
              '<div class="movie-footer">' +
                "<span>" + escapeHtml(formatVotes(movie.votes)) + "</span>" +
                '<a class="movie-link" href="' + escapeHtml(movie.detailUrl) + '" target="_blank" rel="noreferrer">豆瓣详情</a>' +
              "</div>" +
            "</div>" +
          "</article>"
        );
      })
      .join("");

    setupPosterFallbacks();
    observeRevealTargets();
  }

  function renderSources() {
    sourceMeta.innerHTML = [
      {
        label: "快照时间",
        value: formatDateTime(dataset.generatedAt)
      },
      {
        label: "榜单范围",
        value: "豆瓣 Top 250 前 100"
      },
      {
        label: "海报模式",
        value: "100 张本地缓存"
      },
      {
        label: "页面说明",
        value: "已规避豆瓣海报防盗链"
      }
    ]
      .map(function (item) {
        return (
          '<article class="source-metric">' +
            "<span>" + escapeHtml(item.label) + "</span>" +
            "<strong>" + escapeHtml(item.value) + "</strong>" +
          "</article>"
        );
      })
      .join("");

    sourceLinks.innerHTML = dataset.source.pages
      .map(function (page, index) {
        return (
          '<article class="source-link">' +
            '<span class="source-tag">Page ' + (index + 1) + "</span>" +
            "<strong>豆瓣电影 Top 250 第 " + (index + 1) + " 页</strong>" +
            "<p>当前页面抓取入口：" + escapeHtml(page) + "</p>" +
            '<a href="' + escapeHtml(page) + '" target="_blank" rel="noreferrer">打开源页面</a>' +
          "</article>"
        );
      })
      .join("");

    footerNote.textContent =
      "豆瓣电影 Top 250 当前快照 · 截取前 100 名 · 数据时间 " + formatDateTime(dataset.generatedAt);
  }

  function setupTiltCards() {
    Array.prototype.forEach.call(document.querySelectorAll(".tilt-card"), function (card) {
      card.addEventListener("pointermove", function (event) {
        var bounds = card.getBoundingClientRect();
        var x = (event.clientX - bounds.left) / bounds.width;
        var y = (event.clientY - bounds.top) / bounds.height;
        var tiltY = (x - 0.5) * 10;
        var tiltX = (0.5 - y) * 10;
        card.style.setProperty("--tilt-x", tiltX.toFixed(2) + "deg");
        card.style.setProperty("--tilt-y", tiltY.toFixed(2) + "deg");
      });

      card.addEventListener("pointerleave", function () {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  function setupScrollEffects() {
    var ticking = false;

    function updateScrollProgress() {
      var maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      var progress = window.scrollY / maxScroll;
      document.body.style.setProperty("--scroll-progress", progress.toFixed(4));
      ticking = false;
    }

    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateScrollProgress);
      }
    }, { passive: true });

    updateScrollProgress();
  }

  function bindEvents() {
    topTenPrev.addEventListener("click", function () {
      setTopTenSlide(topTenState.activeIndex - 1);
      startTopTenAutoPlay();
    });

    topTenNext.addEventListener("click", function () {
      setTopTenSlide(topTenState.activeIndex + 1);
      startTopTenAutoPlay();
    });

    topTenShowcase.addEventListener("mouseenter", stopTopTenAutoPlay);
    topTenShowcase.addEventListener("mouseleave", startTopTenAutoPlay);

    searchInput.addEventListener("input", function (event) {
      state.query = event.target.value.trim().toLowerCase();
      renderMovieGrid();
    });

    decadeFilter.addEventListener("change", function (event) {
      state.decade = event.target.value;
      renderMovieGrid();
    });

    regionFilter.addEventListener("change", function (event) {
      state.region = event.target.value;
      renderMovieGrid();
    });

    sortSelect.addEventListener("change", function (event) {
      state.sort = event.target.value;
      renderMovieGrid();
    });
  }

  function init() {
    renderHero();
    renderInsights();
    setTopTenSlide(0, true);
    renderSources();
    setupFilters();
    renderMovieGrid();
    setupPosterFallbacks();
    bindEvents();
    observeRevealTargets();
    setupTiltCards();
    setupScrollEffects();
    startTopTenAutoPlay();
  }

  init();
})();
