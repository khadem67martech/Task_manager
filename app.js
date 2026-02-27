// Storage key used to save/read tasks from localStorage
const STORAGE_KEY = "tasks";

// Grab elements from the page so we can interact with them
const taskTitleInput = document.getElementById("taskTitle");
const taskStatusSelect = document.getElementById("taskStatus");
const addTaskButton = document.getElementById("addTaskButton");
const taskTableBody = document.getElementById("taskTableBody");

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

  tasks.push(newTask);
  saveTasks();
  renderTasks();

  // Clear input so user can quickly add another task
  taskTitleInput.value = "";
  taskTitleInput.focus();
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
