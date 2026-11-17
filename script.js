const guestList = [
  { primaryGuestName: "Judy", reservedSeats: 3 },
  { primaryGuestName: "Gemma", reservedSeats: 5 },
  { primaryGuestName: "Jojie", reservedSeats: 4 },
  { primaryGuestName: "Claudenne", reservedSeats: 3 },
  { primaryGuestName: "Luffy", reservedSeats: 5 },
  { primaryGuestName: "Princess", reservedSeats: 2 },
  { primaryGuestName: "Mochi", reservedSeats: 2 },
  { primaryGuestName: "Kristine", reservedSeats: 5 },
  { primaryGuestName: "Joemel", reservedSeats: 2 }
  // Peanut is not included yet because no reserved-seat count was provided.
];

const guestSearch = document.getElementById("guestSearch");
const searchButton = document.getElementById("searchButton");
const searchMessage = document.getElementById("searchMessage");
const rsvpPanel = document.getElementById("rsvpPanel");
const confirmationPanel = document.getElementById("confirmationPanel");
const seatCount = document.getElementById("seatCount");
const guestRows = document.getElementById("guestRows");
const rsvpForm = document.getElementById("rsvpForm");
const formError = document.getElementById("formError");
const changeGuestButton = document.getElementById("changeGuestButton");
const editRsvpButton = document.getElementById("editRsvpButton");
const newSearchButton = document.getElementById("newSearchButton");

let selectedGuest = null;

function normalizeName(value) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

function findGuest(searchValue) {
  const searchName = normalizeName(searchValue);
  if (!searchName) return null;

  return guestList.find((guest) => {
    const fullName = normalizeName(guest.primaryGuestName);
    const firstName = fullName.split(" ")[0];
    return fullName === searchName || firstName === searchName;
  });
}

function setSearchMessage(message, type = "") {
  searchMessage.textContent = message;
  searchMessage.className = `status-message ${type}`.trim();
}

function getSavedResponse(primaryGuestName) {
  const saved = localStorage.getItem(`wedding-rsvp:${normalizeName(primaryGuestName)}`);
  return saved ? JSON.parse(saved) : null;
}

function makeGuestRow(index, primaryName, savedGuest) {
  const row = document.createElement("div");
  row.className = "guest-row";

  const isPrimary = index === 0;
  const defaultName = isPrimary ? primaryName : (savedGuest?.name || "");
  const isAttending = savedGuest ? savedGuest.attending : isPrimary;

  row.innerHTML = `
    <span class="guest-number">${toRoman(index + 1)}.</span>
    <input
      type="text"
      class="guest-name"
      value="${escapeHtml(defaultName)}"
      placeholder="${isPrimary ? "Primary guest" : `Guest ${index + 1} full name` }"
      ${isPrimary ? "disabled" : ""}
      aria-label="Guest ${index + 1} name"
    >
    <label class="attendance-toggle">
      <input type="checkbox" class="attending-checkbox" ${isAttending ? "checked" : ""}>
      <span class="toggle-track" aria-hidden="true"></span>
      <span class="toggle-label">${isAttending ? "Attending" : "Not attending"}</span>
    </label>
  `;

  const nameInput = row.querySelector(".guest-name");
  const checkbox = row.querySelector(".attending-checkbox");
  const toggleLabel = row.querySelector(".toggle-label");

  checkbox.addEventListener("change", () => {
    toggleLabel.textContent = checkbox.checked ? "Attending" : "Not attending";
    if (!checkbox.checked && !isPrimary) nameInput.value = "";
    nameInput.disabled = isPrimary || !checkbox.checked;
  });

  if (!isPrimary && !isAttending) nameInput.disabled = true;
  return row;
}

function renderRsvpForm(guest) {
  selectedGuest = guest;
  seatCount.textContent = guest.reservedSeats;
  guestRows.innerHTML = "";
  formError.textContent = "";

  const saved = getSavedResponse(guest.primaryGuestName);

  for (let index = 0; index < guest.reservedSeats; index += 1) {
    guestRows.appendChild(
      makeGuestRow(index, guest.primaryGuestName, saved?.guests?.[index])
    );
  }

  confirmationPanel.classList.add("hidden");
  rsvpPanel.classList.remove("hidden");
  rsvpPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleSearch() {
  const guest = findGuest(guestSearch.value);

  if (!guestSearch.value.trim()) {
    setSearchMessage("Please enter the primary guest name.", "error");
    rsvpPanel.classList.add("hidden");
    return;
  }

  if (!guest) {
    setSearchMessage("Invitation not found. Please check the spelling of the name.", "error");
    rsvpPanel.classList.add("hidden");
    confirmationPanel.classList.add("hidden");
    return;
  }

  setSearchMessage(`Invitation found. Welcome, ${guest.primaryGuestName}!`, "success");
  renderRsvpForm(guest);
}

function collectResponse() {
  const rows = [...guestRows.querySelectorAll(".guest-row")];
  const guests = rows.map((row, index) => {
    const nameInput = row.querySelector(".guest-name");
    const checkbox = row.querySelector(".attending-checkbox");
    return {
      name: index === 0 ? selectedGuest.primaryGuestName : nameInput.value.trim(),
      attending: checkbox.checked
    };
  });

  const missingName = guests.some((guest) => guest.attending && !guest.name);
  if (missingName) {
    formError.textContent = "Please enter the name of every guest marked as attending.";
    return null;
  }

  return {
    primaryGuestName: selectedGuest.primaryGuestName,
    reservedSeats: selectedGuest.reservedSeats,
    guests,
    attendingCount: guests.filter((guest) => guest.attending).length,
    submittedAt: new Date().toISOString()
  };
}

function showConfirmation(response) {
  const attendingNames = response.guests
    .filter((guest) => guest.attending)
    .map((guest) => guest.name);

  document.getElementById("summaryPrimary").textContent = response.primaryGuestName;
  document.getElementById("summaryReserved").textContent = response.reservedSeats;
  document.getElementById("summaryAttending").textContent = response.attendingCount;
  document.getElementById("summaryNames").textContent = attendingNames.length
    ? attendingNames.join("\n")
    : "No attendees";

  rsvpPanel.classList.add("hidden");
  confirmationPanel.classList.remove("hidden");
  confirmationPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

rsvpForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formError.textContent = "";

  const response = collectResponse();
  if (!response) return;

  localStorage.setItem(
    `wedding-rsvp:${normalizeName(response.primaryGuestName)}`,
    JSON.stringify(response)
  );

  showConfirmation(response);
});

searchButton.addEventListener("click", handleSearch);
guestSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") handleSearch();
});

changeGuestButton.addEventListener("click", resetSearch);
newSearchButton.addEventListener("click", resetSearch);
editRsvpButton.addEventListener("click", () => {
  if (selectedGuest) renderRsvpForm(selectedGuest);
});

function resetSearch() {
  selectedGuest = null;
  guestSearch.value = "";
  rsvpPanel.classList.add("hidden");
  confirmationPanel.classList.add("hidden");
  setSearchMessage("Enter the name written on the invitation.");
  guestSearch.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toRoman(number) {
  return ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"][number - 1] || number;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
