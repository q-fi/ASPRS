let currentIndex = 0;

const slider = document.querySelector(".image-section .slider");
const slides = slider.querySelectorAll("img");

const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

const autoSlideDelay = 3000;   
const pauseAfterClick = 2000;  

let autoSlideInterval;

function showSlide(index) {
    slides.forEach((slide, i) => {
        slide.style.display = i === index ? "block" : "none";
    });
}

function nextSlide() {
    currentIndex = (currentIndex + 1) % slides.length;
    showSlide(currentIndex);
}

function prevSlide() {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    showSlide(currentIndex);
}

function startAutoSlide() {
    stopAutoSlide(); 
    autoSlideInterval = setInterval(nextSlide, autoSlideDelay);
}

function stopAutoSlide() {
    clearInterval(autoSlideInterval);
}

nextBtn.addEventListener("click", () => {
    nextSlide();
    stopAutoSlide();
    setTimeout(startAutoSlide, pauseAfterClick);
});

prevBtn.addEventListener("click", () => {
    prevSlide();
    stopAutoSlide();
    setTimeout(startAutoSlide, pauseAfterClick);
});

showSlide(currentIndex);
startAutoSlide();
