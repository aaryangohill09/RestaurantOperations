/* =========================================================
   ARY'S CAFE
   Main Frontend JavaScript
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* =========================
       MOBILE MENU
       ========================= */

    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const mobileMenu = document.getElementById("mobileMenu");

    if (mobileMenuBtn && mobileMenu) {

        mobileMenuBtn.addEventListener("click", function () {

            mobileMenu.classList.toggle("show");

        });


        const mobileLinks = mobileMenu.querySelectorAll("a");

        mobileLinks.forEach(function (link) {

            link.addEventListener("click", function () {

                mobileMenu.classList.remove("show");

            });

        });

    }


    /* =========================
       CLOSE MOBILE MENU
       WHEN CLICKING OUTSIDE
       ========================= */

    document.addEventListener("click", function (event) {

        if (
            mobileMenu &&
            mobileMenu.classList.contains("show") &&
            !mobileMenu.contains(event.target) &&
            !mobileMenuBtn.contains(event.target)
        ) {

            mobileMenu.classList.remove("show");

        }

    });


    /* =========================
       SMOOTH SCROLL
       ========================= */

    const anchorLinks = document.querySelectorAll(
        'a[href^="#"]'
    );

    anchorLinks.forEach(function (link) {

        link.addEventListener("click", function (event) {

            const targetId = this.getAttribute("href");

            if (
                !targetId ||
                targetId === "#"
            ) {
                return;
            }

            const targetElement =
                document.querySelector(targetId);

            if (targetElement) {

                event.preventDefault();

                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        });

    });


    /* =========================
       ACTIVE NAVIGATION
       ========================= */

    const navLinks =
        document.querySelectorAll(".nav-links a");

    const currentPage =
        window.location.pathname.split("/").pop() || "index.html";

    navLinks.forEach(function (link) {

        const linkPage =
            link.getAttribute("href");

        if (
            linkPage === currentPage &&
            !linkPage.startsWith("#")
        ) {

            navLinks.forEach(function (item) {
                item.classList.remove("active");
            });

            link.classList.add("active");

        }

    });


    /* =========================
       ORDER TYPE
       ========================= */

    const orderCards =
        document.querySelectorAll(".order-card");

    orderCards.forEach(function (card) {

        card.addEventListener("click", function () {

            const url =
                new URL(this.href, window.location.origin);

            const type =
                url.searchParams.get("type");

            if (type) {

                localStorage.setItem(
                    "orderType",
                    type
                );

            }

        });

    });


    /* =========================
       HERO BUTTON FEEDBACK
       ========================= */

    const orderButtons =
        document.querySelectorAll(
            'a[href="menu.html"]'
        );

    orderButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            localStorage.setItem(
                "lastVisitedPage",
                "menu"
            );

        });

    });


    /* =========================
       SIMPLE SCROLL REVEAL
       ========================= */

    const revealElements =
        document.querySelectorAll(
            ".order-card, .menu-item, .step, .about-content, .tracking-box"
        );


    if ("IntersectionObserver" in window) {

        const observer =
            new IntersectionObserver(
                function (entries, observerInstance) {

                    entries.forEach(function (entry) {

                        if (entry.isIntersecting) {

                            entry.target.classList.add(
                                "visible"
                            );

                            observerInstance.unobserve(
                                entry.target
                            );

                        }

                    });

                },
                {
                    threshold: 0.12
                }
            );


        revealElements.forEach(function (element) {

            element.classList.add("reveal");

            observer.observe(element);

        });

    }


    /* =========================
       CURRENT YEAR
       ========================= */

    const yearElements =
        document.querySelectorAll(
            "[data-current-year]"
        );

    yearElements.forEach(function (element) {

        element.textContent =
            new Date().getFullYear();

    });


    /* =========================
       CONSOLE MESSAGE
       ========================= */

    console.log(
        "ARY'S CAFE website loaded successfully."
    );

});