const API_URL =
  "https://script.google.com/macros/s/AKfycbzIw0ISPQ-y0kUxM_mIuEWLxzUjo12AVnCqCKbnz72VM1XB4E1C_K7LAJCRjQsDBvUq/exec";


const guestSearch = document.getElementById("guestSearch");
const searchButton = document.getElementById("searchButton");
const searchMessage = document.getElementById("searchMessage");

const rsvpPanel = document.getElementById("rsvpPanel");
const confirmationPanel =
  document.getElementById("confirmationPanel");

const seatCount = document.getElementById("seatCount");
const guestRows = document.getElementById("guestRows");
const rsvpForm = document.getElementById("rsvpForm");
const formError = document.getElementById("formError");

const submitButton =
  document.getElementById("submitButton");

const changeGuestButton =
  document.getElementById("changeGuestButton");

const editRsvpButton =
  document.getElementById("editRsvpButton");

const newSearchButton =
  document.getElementById("newSearchButton");


let selectedGuest = null;
let existingResponse = null;


/*
  SEARCH PRIMARY GUEST
*/
async function handleSearch() {
  const searchName = guestSearch.value.trim();

  if (!searchName) {
    setSearchMessage(
      "Please enter the primary guest name.",
      "error"
    );

    rsvpPanel.classList.add("hidden");
    confirmationPanel.classList.add("hidden");

    guestSearch.focus();
    return;
  }

  setSearchLoading(true);

  setSearchMessage(
    "Searching for your invitation..."
  );

  rsvpPanel.classList.add("hidden");
  confirmationPanel.classList.add("hidden");

  try {
    const searchUrl =
      API_URL +
      "?action=searchGuest&name=" +
      encodeURIComponent(searchName);

    const response = await fetch(searchUrl, {
      method: "GET",
      redirect: "follow"
    });

    if (!response.ok) {
      throw new Error(
        "Unable to connect to the RSVP database."
      );
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.message ||
        "The guest search could not be completed."
      );
    }

    if (!result.found) {
      selectedGuest = null;
      existingResponse = null;

      setSearchMessage(
        result.message ||
        "Invitation not found. Please check the spelling.",
        "error"
      );

      return;
    }

    selectedGuest = result.guest;
    existingResponse = result.existingResponse || null;

    setSearchMessage(
      result.message ||
      `Invitation found. Welcome, ${selectedGuest.primaryGuestName}!`,
      "success"
    );

    renderRsvpForm(
      selectedGuest,
      existingResponse
    );

  } catch (error) {
    console.error("Guest search error:", error);

    setSearchMessage(
      "We could not search the guest list. Please try again.",
      "error"
    );

  } finally {
    setSearchLoading(false);
  }
}


/*
  CREATE THE RSVP FORM BASED ON RESERVED SEATS
*/
function renderRsvpForm(
  guest,
  savedResponse = null
) {
  selectedGuest = guest;
  existingResponse = savedResponse;

  seatCount.textContent = guest.reservedSeats;
  guestRows.innerHTML = "";
  formError.textContent = "";

  const savedGuests =
    savedResponse &&
    Array.isArray(savedResponse.guests)
      ? savedResponse.guests
      : [];

  for (
    let index = 0;
    index < guest.reservedSeats;
    index += 1
  ) {
    const savedGuest =
      savedGuests[index] || null;

    const guestRow = createGuestRow(
      index,
      guest.primaryGuestName,
      savedGuest
    );

    guestRows.appendChild(guestRow);
  }

  confirmationPanel.classList.add("hidden");
  rsvpPanel.classList.remove("hidden");

  rsvpPanel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/*
  CREATE ONE GUEST ROW
*/
function createGuestRow(
  index,
  primaryGuestName,
  savedGuest
) {
  const row = document.createElement("div");

  row.className = "guest-row";

  const isPrimaryGuest = index === 0;

  let guestName = "";

  if (isPrimaryGuest) {
    guestName = primaryGuestName;
  } else if (savedGuest && savedGuest.name) {
    guestName = savedGuest.name;
  }

  let isAttending;

  if (savedGuest) {
    isAttending =
      savedGuest.attending === true;
  } else {
    /*
      Primary guest is marked attending by default.

      Companion rows are marked not attending until
      the guest turns them on.
    */
    isAttending = isPrimaryGuest;
  }

  row.innerHTML = `
    <span class="guest-number">
      ${toRoman(index + 1)}.
    </span>

    <input
      type="text"
      class="guest-name"
      value="${escapeHtml(guestName)}"
      placeholder="${
        isPrimaryGuest
          ? "Primary guest"
          : `Guest ${index + 1} full name`
      }"
      ${
        isPrimaryGuest ||
        !isAttending
          ? "disabled"
          : ""
      }
      aria-label="Guest ${index + 1} name"
    >

    <label class="attendance-toggle">
      <input
        type="checkbox"
        class="attending-checkbox"
        ${isAttending ? "checked" : ""}
      >

      <span
        class="toggle-track"
        aria-hidden="true"
      ></span>

      <span class="toggle-label">
        ${
          isAttending
            ? "Attending"
            : "Not attending"
        }
      </span>
    </label>
  `;

  const nameInput =
    row.querySelector(".guest-name");

  const attendingCheckbox =
    row.querySelector(".attending-checkbox");

  const toggleLabel =
    row.querySelector(".toggle-label");


  attendingCheckbox.addEventListener(
    "change",
    function () {
      const attending =
        attendingCheckbox.checked;

      toggleLabel.textContent =
        attending
          ? "Attending"
          : "Not attending";

      /*
        Primary guest name always remains visible.

        Companion name field becomes available only
        when the companion is attending.
      */
      if (isPrimaryGuest) {
        nameInput.disabled = true;
      } else {
        nameInput.disabled = !attending;

        if (!attending) {
          nameInput.value = "";
        } else {
          nameInput.focus();
        }
      }

      formError.textContent = "";
    }
  );

  return row;
}


/*
  COLLECT THE FORM INFORMATION
*/
function collectResponse() {
  if (!selectedGuest) {
    formError.textContent =
      "Please search for the invitation again.";

    return null;
  }

  const rows = [
    ...guestRows.querySelectorAll(
      ".guest-row"
    )
  ];

  const guests = rows.map(
    function (row, index) {
      const nameInput =
        row.querySelector(".guest-name");

      const attendingCheckbox =
        row.querySelector(
          ".attending-checkbox"
        );

      const attending =
        attendingCheckbox.checked;

      let name =
        index === 0
          ? selectedGuest.primaryGuestName
          : nameInput.value.trim();

      if (!attending) {
        name = "";
      }

      return {
        name: name,
        attending: attending
      };
    }
  );

  const missingName =
    guests.some(function (guest) {
      return (
        guest.attending === true &&
        !guest.name
      );
    });

  if (missingName) {
    formError.textContent =
      "Please enter the name of every guest marked as attending.";

    return null;
  }

  const attendingCount =
    guests.filter(function (guest) {
      return guest.attending;
    }).length;

  if (
    attendingCount >
    selectedGuest.reservedSeats
  ) {
    formError.textContent =
      "The number of attendees exceeds the reserved seats.";

    return null;
  }

  return {
    action: "submitRSVP",
    guestId: selectedGuest.guestId,
    primaryGuestName:
      selectedGuest.primaryGuestName,
    reservedSeats:
      selectedGuest.reservedSeats,
    guests: guests
  };
}


/*
  SAVE OR UPDATE RSVP IN GOOGLE SHEETS
*/
async function submitRSVP(event) {
  event.preventDefault();

  formError.textContent = "";

  const responseData = collectResponse();

  if (!responseData) {
    return;
  }

  setSubmitLoading(true);

  try {
    /*
      URLSearchParams sends a simple form request.

      This works reliably between GitHub Pages
      and the Google Apps Script Web App.
    */
    const requestBody =
      new URLSearchParams();

    requestBody.append(
      "payload",
      JSON.stringify(responseData)
    );

    const response = await fetch(
      API_URL,
      {
        method: "POST",
        redirect: "follow",
        body: requestBody
      }
    );

    if (!response.ok) {
      throw new Error(
        "Unable to save the RSVP response."
      );
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(
        result.message ||
        "The RSVP response could not be saved."
      );
    }

    existingResponse = result.response;

    showConfirmation(result.response);

  } catch (error) {
    console.error(
      "RSVP submission error:",
      error
    );

    formError.textContent =
      error.message ||
      "We could not save your RSVP. Please try again.";

  } finally {
    setSubmitLoading(false);
  }
}


/*
  DISPLAY RSVP CONFIRMATION
*/
function showConfirmation(response) {
  const attendingNames =
    Array.isArray(
      response.allAttendingNames
    )
      ? response.allAttendingNames
      : [];

  document.getElementById(
    "summaryPrimary"
  ).textContent =
    response.primaryGuestName;

  document.getElementById(
    "summaryReserved"
  ).textContent =
    response.reservedSeats;

  document.getElementById(
    "summaryAttending"
  ).textContent =
    response.attendingCount;

  document.getElementById(
    "summaryNames"
  ).textContent =
    attendingNames.length > 0
      ? attendingNames.join("\n")
      : "No attendees";

  rsvpPanel.classList.add("hidden");

  confirmationPanel.classList.remove(
    "hidden"
  );

  confirmationPanel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/*
  EDIT THE EXISTING RSVP
*/
function editExistingRsvp() {
  if (!selectedGuest) {
    resetSearch();
    return;
  }

  /*
    Search again so the latest response is loaded
    directly from Google Sheets.
  */
  guestSearch.value =
    selectedGuest.primaryGuestName;

  handleSearch();
}


/*
  RESET THE RSVP SEARCH
*/
function resetSearch() {
  selectedGuest = null;
  existingResponse = null;

  guestSearch.value = "";

  guestRows.innerHTML = "";
  formError.textContent = "";

  rsvpPanel.classList.add("hidden");

  confirmationPanel.classList.add(
    "hidden"
  );

  setSearchMessage(
    "Enter the name written on the invitation."
  );

  guestSearch.focus();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/*
  LOADING STATES
*/
function setSearchLoading(isLoading) {
  searchButton.disabled = isLoading;

  searchButton.textContent =
    isLoading
      ? "Searching..."
      : "Find Invitation";

  guestSearch.disabled = isLoading;
}


function setSubmitLoading(isLoading) {
  submitButton.disabled = isLoading;

  submitButton.textContent =
    isLoading
      ? "Saving RSVP..."
      : "Confirm RSVP";
}


/*
  DISPLAY SEARCH MESSAGE
*/
function setSearchMessage(
  message,
  type = ""
) {
  searchMessage.textContent = message;

  searchMessage.className =
    `status-message ${type}`.trim();
}


/*
  HELPER FUNCTIONS
*/
function toRoman(number) {
  const romanNumbers = [
    "i",
    "ii",
    "iii",
    "iv",
    "v",
    "vi",
    "vii",
    "viii",
    "ix",
    "x"
  ];

  return (
    romanNumbers[number - 1] ||
    number
  );
}


function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/*
  EVENT LISTENERS
*/
searchButton.addEventListener(
  "click",
  handleSearch
);


guestSearch.addEventListener(
  "keydown",
  function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  }
);


rsvpForm.addEventListener(
  "submit",
  submitRSVP
);


changeGuestButton.addEventListener(
  "click",
  resetSearch
);


newSearchButton.addEventListener(
  "click",
  resetSearch
);


editRsvpButton.addEventListener(
  "click",
  editExistingRsvp
);
