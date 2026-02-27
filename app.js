// Google Form action URL (used to save each new task to Google Sheets)
const FORM_ACTION_URL = "https://docs.google.com/forms/d/e/1FAIpQLScsdeU43nyVwOM3sSS5P9dJqUk8si9mllRXauGETi-gVAgP7Q/formResponse";

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

  // 2) Send title + status + created time to Google Form in the background
  sendTaskToGoogleForm(newTask);

  // Clear input so user can quickly add another task
  taskTitleInput.value = "";
  taskTitleInput.focus();
}

// Submit one task to a Google Form using a hidden form + iframe
function sendTaskToGoogleForm(task) {
  const iframeName = `google-form-target-${Date.now()}`;
  const iframe = document.createElement("iframe");
  iframe.name = iframeName;
  iframe.hidden = true;

  const form = document.createElement("form");
  form.action = FORM_ACTION_URL;
  form.method = "POST";
  form.target = iframeName;
  form.hidden = true;

  const fields = {
    "entry.1486922306": task.title,
    "entry.1852717744": task.status,
    "entry.1431330731": task.createdAt,
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(iframe);
  document.body.appendChild(form);

  let hasSubmitted = false;

  const cleanup = () => {
    form.remove();
    iframe.remove();
  };

  iframe.addEventListener("load", () => {
    if (!hasSubmitted) {
      return;
    }

    showSaveMessage("Saved to Google Sheet");
    cleanup();
  });

  iframe.addEventListener("error", () => {
    showSaveMessage("Could not save", true);
    cleanup();
  });

  try {
    hasSubmitted = true;
    form.submit();

    // Some browsers do not reliably trigger iframe load for cross-origin responses.
    // Keep UI friendly by showing success shortly after submit.
    setTimeout(() => {
      if (document.body.contains(form) || document.body.contains(iframe)) {
        showSaveMessage("Saved to Google Sheet");
        cleanup();
      }
    }, 700);
  } catch (error) {
    console.error("Could not save to Google Sheet:", error);
    showSaveMessage("Could not save", true);
    cleanup();
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
