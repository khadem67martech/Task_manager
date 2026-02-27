// Google Apps Script Web App URL (used to save each new task to Google Sheets)
const API_URL =
  "https://script.google.com/macros/s/AKfycbxBURsevVjpayeyJoumk24TG5x624E9eN2E0dERVWapSZEoKKfyDZRRN_8TcQhLlmIQ/exec";

// Storage key used to save/read tasks from localStorage
const STORAGE_KEY = "tasks";

// Grab elements from the page so we can interact with them
const taskTitleInput = document.getElementById("taskTitle");
const taskStatusSelect = document.getElementById("taskStatus");
const addTaskButton = document.getElementById("addTaskButton");
const taskTableBody = document.getElementById("taskTableBody");
const saveMessage = document.getElementById("saveMessage");

// In-memory array of tasks (loaded from localStorage on startup)
let tasks = loadTasks();

// Initial render when page opens
renderTasks();

// Add click event for creating a new task
addTaskButton.addEventListener("click", addTask);

// Also allow pressing Enter inside the title input
taskTitleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTask();
  }
});

// Create a task and save it
function addTask() {
  const title = taskTitleInput.value.trim();
  const status = taskStatusSelect.value;

  // Basic validation: task title should not be empty
  if (!title) {
    alert("Please enter a task title.");
    return;
  }

  // Use a timestamp for a simple unique ID
  const newTask = {
    id: Date.now(),
    title,
    status,
    createdAt: new Date().toLocaleString(),
  };

  // 1) Keep local update first so the UI feels instant
  tasks.push(newTask);
  saveTasks();
  renderTasks();

  // 2) Send title + status to Google Sheets in the background
  sendTaskToSheet(newTask);

  // Clear input so user can quickly add another task
  taskTitleInput.value = "";
  taskTitleInput.focus();
}

// Send one task to the Google Apps Script web app using POST
async function sendTaskToSheet(task) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      // Only send the fields requested
      body: JSON.stringify({
        title: task.title,
        status: task.status,
      }),
    });

    // If request completed successfully, show a small success message
    if (response.ok) {
      showSaveMessage("Saved to Sheet");
      return;
    }

    const responseText = await response.text();
    console.error(
      `Could not save to Google Sheet (HTTP ${response.status}):`,
      responseText
    );
    showSaveMessage("Could not save to Sheet. Please try again.", true);
  } catch (error) {
    // Keep this friendly: local save still works even if network fails
    console.error("Could not save to Google Sheet:", error);
    showSaveMessage("Could not save to Sheet. Please try again.", true);
  }
}

// Show a short status message under the button for a moment
function showSaveMessage(messageText, isError = false) {
  saveMessage.textContent = messageText;
  saveMessage.classList.toggle("error", isError);
  saveMessage.classList.add("visible");

  // Hide it after a short delay
  setTimeout(() => {
    saveMessage.classList.remove("visible");
  }, 1800);
}

// Remove a task by ID
function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderTasks();
}

// Draw task rows in the table
function renderTasks() {
  // Clear old rows
  taskTableBody.innerHTML = "";

  // Show placeholder row when there are no tasks
  if (tasks.length === 0) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="4" class="empty-row">No tasks yet. Add one above.</td>';
    taskTableBody.appendChild(emptyRow);
    return;
  }

  // Build one table row per task
  tasks.forEach((task) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(task.title)}</td>
      <td>${task.status}</td>
      <td>${task.createdAt}</td>
      <td><button class="delete-btn" data-id="${task.id}">Delete</button></td>
    `;

    taskTableBody.appendChild(row);
  });

  // Attach click handlers to each delete button
  const deleteButtons = document.querySelectorAll(".delete-btn");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const taskId = Number(button.dataset.id);
      deleteTask(taskId);
    });
  });
}

// Read tasks from localStorage
function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // If localStorage data is invalid, start fresh
    return [];
  }
}

// Save current tasks array into localStorage
function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// Small helper to avoid HTML injection from user input
function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}
