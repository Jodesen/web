document.addEventListener("DOMContentLoaded", function () {
  var slides = document.querySelectorAll(".slide-card");
  var dots = document.querySelectorAll(".dot");
  var prevButton = document.getElementById("prevSlide");
  var nextButton = document.getElementById("nextSlide");
  var currentIndex = 0;
  var timer = null;

  // 特效 1：首页轮播图。
  // 点击按钮或小圆点时切换内容，同时每隔 3 秒自动切换一次。
  function showSlide(index) {
    slides.forEach(function (slide, slideIndex) {
      slide.classList.toggle("active", slideIndex === index);
    });

    dots.forEach(function (dot, dotIndex) {
      dot.classList.toggle("active", dotIndex === index);
    });

    currentIndex = index;
  }

  function nextSlide() {
    var nextIndex = currentIndex + 1;

    if (nextIndex >= slides.length) {
      nextIndex = 0;
    }

    showSlide(nextIndex);
  }

  function startAutoPlay() {
    timer = setInterval(function () {
      nextSlide();
    }, 3000);
  }

  if (prevButton && nextButton) {
    prevButton.addEventListener("click", function () {
      var prevIndex = currentIndex - 1;

      if (prevIndex < 0) {
        prevIndex = slides.length - 1;
      }

      showSlide(prevIndex);
    });

    nextButton.addEventListener("click", function () {
      nextSlide();
    });

    dots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        var dotIndex = Number(dot.getAttribute("data-index"));
        showSlide(dotIndex);
      });
    });

    startAutoPlay();
  }

  // 特效 2：首页数字增长。
  // 页面加载后让四个数字从 0 增长到目标值，增强展示感。
  var statNumbers = document.querySelectorAll(".stat-number");

  statNumbers.forEach(function (item) {
    var target = Number(item.getAttribute("data-target"));
    var current = 0;
    var step = Math.ceil(target / 40);

    var countTimer = setInterval(function () {
      current = current + step;

      if (current >= target) {
        current = target;
        clearInterval(countTimer);
      }

      item.textContent = current;
    }, 40);
  });
});
