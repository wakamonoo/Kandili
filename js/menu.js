document.addEventListener("DOMContentLoaded", () => {
  const fabToggleBtn = document.getElementById("fabToggleBtn");
  const fabToggleIcon = fabToggleBtn.querySelector("i");
  const fabButtonsContainer = document.getElementById("fabButtonsContainer");
  const newsfeedBtn = document.getElementById("newsfeedBtn");
  const friendRequestsBtn = document.getElementById("friendRequestsBtn");
  const addFriendBtn = document.getElementById("addFriendBtn");
  const openModalBtn = document.getElementById("openModalBtn");

  const buttons = [newsfeedBtn, friendRequestsBtn, addFriendBtn, openModalBtn];

  // ━━━━━━━━━━━━━━━━━━ Timeline Page Elements ━━━━━━━━━━━━━━━━━━ //
  const setButtonVisibility = (show) => {
    buttons.forEach((button, index) => {
      if (show) {
        button.style.display = "flex";
        setTimeout(() => {
          button.classList.add("fab-button-revealed");
          button.style.opacity = "1";
          button.style.transform = "translateY(0)";
        }, 50 * index);
      } else {
        button.classList.remove("fab-button-revealed");
        button.style.opacity = "0";
        button.style.transform = "translateY(20px)";
        setTimeout(() => {
          button.style.display = "none";
        }, 300 + 50 * index);
      }
    });
  };

  // ━━━━━━━━━━━━━━━━━━ Timeline Page Elements ━━━━━━━━━━━━━━━━━━ //
  const handleResize = () => {
    if (window.innerWidth < 768) {
      fabToggleBtn.style.display = "flex";
      fabToggleIcon.classList.remove("fa-xmark");
      fabToggleIcon.classList.add("fa-bars");
      setButtonVisibility(false);
      buttons.forEach((button) => {
        button.classList.remove("fab-button-revealed");
        button.style.opacity = "0";
        button.style.transform = "translateY(20px)";
      });
    } else {
      fabToggleBtn.style.display = "none";
      setButtonVisibility(true);
      buttons.forEach((button) => {
        button.classList.remove("fab-button-revealed");
        button.style.opacity = "1";
        button.style.transform = "translateY(0)";
        button.style.display = "flex";
      });
    }
  };

  // ━━━━━━━━━━━━━━━━━━ Timeline Page Elements ━━━━━━━━━━━━━━━━━━ //
  handleResize();

  // ━━━━━━━━━━━━━━━━━━ Timeline Page Elements ━━━━━━━━━━━━━━━━━━ //
  fabToggleBtn.addEventListener("click", () => {
    if (window.innerWidth < 768) {
      const isRevealed = fabToggleIcon.classList.contains("fa-xmark");
      if (isRevealed) {
        fabToggleIcon.classList.remove("fa-xmark");
        fabToggleIcon.classList.add("fa-bars");
        setButtonVisibility(false);
      } else {
        fabToggleIcon.classList.remove("fa-bars");
        fabToggleIcon.classList.add("fa-xmark");
        setButtonVisibility(true);
      }
    }
  });

  // ━━━━━━━━━━━━━━━━━━ Timeline Page Elements ━━━━━━━━━━━━━━━━━━ //
  window.addEventListener("resize", handleResize);
});
