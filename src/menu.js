export function installNavMenu() {
  const burger = document.getElementById("mobile-menu-burger");
  const closeBtn = document.getElementById("mobile-menu-close");
  const overlay = document.getElementById("mobile-menu-overlay");

  function toggleMenu() {
    overlay.classList.toggle("active");
  }

  burger.addEventListener("click", toggleMenu);
  closeBtn.addEventListener("click", toggleMenu);
}
