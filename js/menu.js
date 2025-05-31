document.addEventListener('DOMContentLoaded', () => {
        const fabToggleBtn = document.getElementById('fabToggleBtn');
        const fabToggleIcon = fabToggleBtn.querySelector('i');
        const fabButtonsContainer = document.getElementById('fabButtonsContainer');
        const newsfeedBtn = document.getElementById('newsfeedBtn');
        const friendRequestsBtn = document.getElementById('friendRequestsBtn');
        const addFriendBtn = document.getElementById('addFriendBtn');
        const openModalBtn = document.getElementById('openModalBtn');

        const buttons = [newsfeedBtn, friendRequestsBtn, addFriendBtn, openModalBtn];

        // Function to set button visibility and animation
        const setButtonVisibility = (show) => {
          buttons.forEach((button, index) => {
            if (show) {
              button.style.display = 'flex';
              // Add animation class with a slight delay
              setTimeout(() => {
                button.classList.add('fab-button-revealed');
                button.style.opacity = '1';
                button.style.transform = 'translateY(0)';
              }, 50 * index); // Staggered animation
            } else {
              button.classList.remove('fab-button-revealed');
              button.style.opacity = '0';
              button.style.transform = 'translateY(20px)';
              // Hide after animation for proper flow
              setTimeout(() => {
                 button.style.display = 'none';
              }, 300 + (50 * index)); // Wait for animation to finish + staggered
            }
          });
        };

        // Function to handle initial state and resize
        const handleResize = () => {
          if (window.innerWidth < 768) {
            // On small screens, hide all except the toggle button
            fabToggleBtn.style.display = 'flex';
            fabToggleIcon.classList.remove('fa-xmark');
            fabToggleIcon.classList.add('fa-bars');
            setButtonVisibility(false); // Hide buttons without animation initially
            buttons.forEach(button => {
                button.classList.remove('fab-button-revealed'); // Remove animation class to prevent flicker on load
                button.style.opacity = '0'; // Ensure hidden initially
                button.style.transform = 'translateY(20px)'; // Ensure hidden initially
            });
          } else {
            // On large screens, show all regular buttons and hide the toggle button
            fabToggleBtn.style.display = 'none';
            setButtonVisibility(true); // Show buttons directly for large screens
            buttons.forEach(button => {
                button.classList.remove('fab-button-revealed'); // No animation needed on larger screens
                button.style.opacity = '1'; // Ensure visible
                button.style.transform = 'translateY(0)'; // Ensure visible
                button.style.display = 'flex'; // Ensure flex display
            });
          }
        };

        // Initial setup
        handleResize();

        // Toggle visibility of buttons on small screens
        fabToggleBtn.addEventListener('click', () => {
          if (window.innerWidth < 768) {
            const isRevealed = fabToggleIcon.classList.contains('fa-xmark');
            if (isRevealed) {
              fabToggleIcon.classList.remove('fa-xmark');
              fabToggleIcon.classList.add('fa-bars');
              setButtonVisibility(false);
            } else {
              fabToggleIcon.classList.remove('fa-bars');
              fabToggleIcon.classList.add('fa-xmark');
              setButtonVisibility(true);
            }
          }
        });

        // Event listener for window resize
        window.addEventListener('resize', handleResize);
      });