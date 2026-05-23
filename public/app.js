const apiStatus = document.querySelector("#api-status");

async function updateApiStatus() {
  if (!apiStatus) {
    return;
  }

  try {
    const response = await fetch("/api/status", {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    apiStatus.textContent = payload.ok ? "Ready" : "Unavailable";
  } catch (error) {
    apiStatus.textContent = "Deploy Functions to enable";
    apiStatus.title = error instanceof Error ? error.message : String(error);
  }
}

updateApiStatus();
