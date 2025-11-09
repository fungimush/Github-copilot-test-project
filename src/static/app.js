document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-container");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Clear activity select except the placeholder
      if (activitySelect) {
        activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
  const activityCard = document.createElement("div");
  activityCard.className = "activity-card";
  // mark card for easier lookup when updating UI after signup
  activityCard.setAttribute('data-activity', name);

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p data-availability><strong>Availability:</strong> ${details.participants.length}/${details.max_participants} spots filled</p>
          <div class="participants-section">
            <h5>Current Participants:</h5>
            <ul class="participants-list">
              ${details.participants.map(email => `<li>${email} <button class="unregister-btn" data-activity="${name}" data-email="${email}">🗑️</button></li>`).join('')}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);

        // Attach unregister handlers for this activity card
        const buttons = activityCard.querySelectorAll('.unregister-btn');
        buttons.forEach(btn => {
          btn.addEventListener('click', async () => {
            const email = btn.dataset.email;
            const activityName = btn.dataset.activity;

            // Ask for confirmation before unregistering
            if (!confirm(`Unregister ${email} from ${activityName}?`)) return;

            try {
              const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
              if (resp.ok) {
                const li = btn.closest('li'); if (li) li.remove();
                // update availability
                const avail = activityCard.querySelector('[data-availability]');
                const list = activityCard.querySelector('.participants-list');
                const current = list ? list.querySelectorAll('li').length : 0;
                if (avail) avail.textContent = `Availability: ${current}/${details.max_participants} spots filled`;
              } else {
                const err = await resp.json().catch(() => null);
                alert(err && err.detail ? err.detail : 'Failed to unregister');
              }
            } catch (err) {
              console.error('Error unregistering:', err);
              alert('Error unregistering participant');
            }
          });
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Update UI: append the new participant to the activity card if present
        const activityCard = document.querySelector(`[data-activity="${activity}"]`);
        if (activityCard) {
          const list = activityCard.querySelector('.participants-list');
          if (list) {
            const li = document.createElement('li');
            li.innerHTML = `${email} <button class="unregister-btn" data-activity="${activity}" data-email="${email}">🗑️</button>`;
            list.appendChild(li);

            // attach unregister handler for the new button
            const btn = li.querySelector('.unregister-btn');
            if (btn) {
              btn.addEventListener('click', async () => {
                if (!confirm(`Unregister ${email} from ${activity}?`)) return;
                try {
                  const resp = await fetch(`/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
                  if (resp.ok) {
                    li.remove();
                    const avail = activityCard.querySelector('[data-availability]');
                    const current = list.querySelectorAll('li').length;
                    if (avail) avail.textContent = `Availability: ${current}/${(details && details.max_participants) || 0} spots filled`;
                  } else {
                    const err = await resp.json().catch(() => null);
                    alert(err && err.detail ? err.detail : 'Failed to unregister');
                  }
                } catch (err) {
                  console.error('Error unregistering:', err);
                  alert('Error unregistering participant');
                }
              });
            }
          }
        }

        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
