// Global State
let state = {
  token: localStorage.getItem("token") || null,
  user: JSON.parse(localStorage.getItem("user")) || null,
  currentClass: null
};

// DOM Elements
const authView = document.getElementById("auth-view");
const teacherDashboard = document.getElementById("teacher-dashboard");
const classDetailView = document.getElementById("class-detail-view");
const studentDashboard = document.getElementById("student-dashboard");
const navbar = document.getElementById("navbar");
const userInfo = document.getElementById("user-info");
const userName = document.getElementById("user-name");
const userRole = document.getElementById("user-role");
const userAvatar = document.getElementById("user-avatar");
const logoutBtn = document.getElementById("logout-btn");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const toggleLoginBtn = document.getElementById("toggle-login");
const toggleRegisterBtn = document.getElementById("toggle-register");

// Toast Notifications Helper
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  const icon = type === "success" 
    ? '<i class="fa-solid fa-circle-check" style="color: var(--success-color)"></i>' 
    : '<i class="fa-solid fa-circle-xmark" style="color: var(--danger-color)"></i>';
    
  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Request Helper
async function apiRequest(endpoint, options = {}) {
  const url = `${window.location.origin}${endpoint}`;
  
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };
  
  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  
  return data;
}

// View Routing Manager
function showView(viewId) {
  const views = [authView, teacherDashboard, classDetailView, studentDashboard];
  views.forEach(view => {
    if (view.id === viewId) {
      view.classList.remove("hidden");
    } else {
      view.classList.add("hidden");
    }
  });

  if (state.token && state.user) {
    navbar.classList.remove("hidden");
    userName.textContent = state.user.name;
    userRole.textContent = state.user.role;
    userRole.className = `role-badge ${state.user.role}`;
    userAvatar.textContent = state.user.name.charAt(0).toUpperCase();
  } else {
    navbar.classList.add("hidden");
  }
}

// Check auth state on start
function initAuth() {
  if (state.token && state.user) {
    if (state.user.role === "teacher") {
      showView("teacher-dashboard");
      loadTeacherDashboard();
    } else {
      showView("student-dashboard");
      loadStudentDashboard();
    }
  } else {
    showView("auth-view");
  }
}

// Login/Register Toggle
toggleLoginBtn.addEventListener("click", () => {
  toggleLoginBtn.classList.add("active");
  toggleRegisterBtn.classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
});

toggleRegisterBtn.addEventListener("click", () => {
  toggleRegisterBtn.classList.add("active");
  toggleLoginBtn.classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
});

// Authentication Forms Event Listeners
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  
  try {
    const data = await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    showToast("Logged in successfully!");
    initAuth();
    
    loginForm.reset();
  } catch (error) {
    showToast(error.message, "error");
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const role = document.querySelector('input[name="reg-role"]:checked').value;
  
  try {
    const data = await apiRequest("/api/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role })
    });
    
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    showToast("Registration successful!");
    initAuth();
    
    registerForm.reset();
  } catch (error) {
    showToast(error.message, "error");
  }
});

// Logout
logoutBtn.addEventListener("click", () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  showToast("Logged out successfully");
  showView("auth-view");
});

// Tab Handlers
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const tabContainer = e.currentTarget.closest(".tabs-container");
    tabContainer.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    tabContainer.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
    
    e.currentTarget.classList.add("active");
    const targetTab = e.currentTarget.getAttribute("data-tab");
    document.getElementById(targetTab).classList.remove("hidden");
  });
});

/* ==========================================================================
   TEACHER DASHBOARD LOGIC
   ========================================================================== */
const newClassBtn = document.getElementById("btn-new-class");
const createClassModal = document.getElementById("create-class-modal");
const closeClassModal = document.getElementById("close-class-modal");
const cancelClassModal = document.getElementById("cancel-class-modal");
const createClassForm = document.getElementById("create-class-form");
const teacherClassesGrid = document.getElementById("teacher-classes-grid");

// Modal Controls
newClassBtn.addEventListener("click", () => createClassModal.classList.remove("hidden"));
closeClassModal.addEventListener("click", () => createClassModal.classList.add("hidden"));
cancelClassModal.addEventListener("click", () => createClassModal.classList.add("hidden"));

createClassForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const className = document.getElementById("class-name").value;
  try {
    await apiRequest("/api/classes", {
      method: "POST",
      body: JSON.stringify({ className })
    });
    showToast("Class created successfully");
    createClassModal.classList.add("hidden");
    createClassForm.reset();
    loadTeacherDashboard();
  } catch (error) {
    showToast(error.message, "error");
  }
});

async function loadTeacherDashboard() {
  try {
    const classes = await apiRequest("/api/classes");
    
    if (classes.length === 0) {
      teacherClassesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <i class="fa-regular fa-folder-open"></i>
          <p>No classes created yet. Click "Create Class" to get started.</p>
        </div>
      `;
      return;
    }
    
    teacherClassesGrid.innerHTML = classes.map(c => `
      <div class="card">
        <div class="card-body">
          <span class="code-pill">${c.classCode}</span>
          <h3>${c.className}</h3>
        </div>
        <div class="card-footer">
          <span class="card-students-count">
            <i class="fa-solid fa-user-graduate"></i> ${c.students ? c.students.length : 0} enrolled
          </span>
          <button class="btn btn-outline btn-sm" onclick="viewClassDetails('${c.classId}')">
            Manage <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </div>
    `).join("");
  } catch (error) {
    showToast(error.message, "error");
  }
}

/* ==========================================================================
   CLASS DETAILS & ATTENDANCE LOGIC
   ========================================================================== */
const backToClassesBtn = document.getElementById("btn-back-classes");
const loadHistoryBtn = document.getElementById("btn-load-history");
const saveAttendanceBtn = document.getElementById("btn-save-attendance");
const studentsTableBody = document.getElementById("students-list-body");
const noStudentsPlaceholder = document.getElementById("no-students-placeholder");
const studentsTable = document.getElementById("students-table");
const historyRecordsContainer = document.getElementById("history-records-container");

backToClassesBtn.addEventListener("click", () => {
  showView("teacher-dashboard");
  loadTeacherDashboard();
});

// Set default date input value to today
function setDefaultDate() {
  const dateInput = document.getElementById("attendance-date");
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
}

async function viewClassDetails(classId) {
  try {
    showView("class-detail-view");
    setDefaultDate();
    
    // Reset tabs
    document.querySelectorAll('[data-tab="mark-attendance-tab"]').forEach(b => b.click());

    const classData = await apiRequest(`/api/classes/${classId}`);
    state.currentClass = classData;
    
    document.getElementById("detail-class-name").textContent = classData.className;
    document.getElementById("detail-class-code").textContent = classData.classCode;
    document.getElementById("detail-student-count").textContent = classData.students ? classData.students.length : 0;
    
    renderStudentsList(classData.studentDetails);
  } catch (error) {
    showToast(error.message, "error");
  }
}

function renderStudentsList(students) {
  if (!students || students.length === 0) {
    studentsTable.classList.add("hidden");
    noStudentsPlaceholder.classList.remove("hidden");
    saveAttendanceBtn.classList.add("hidden");
    return;
  }
  
  studentsTable.classList.remove("hidden");
  noStudentsPlaceholder.classList.add("hidden");
  saveAttendanceBtn.classList.remove("hidden");
  
  studentsTableBody.innerHTML = students.map(student => `
    <tr>
      <td><strong>${student.name}</strong></td>
      <td>${student.email}</td>
      <td>
        <div class="status-selector">
          <label class="status-label present">
            <input type="radio" name="status-${student.userId}" value="present" checked>
            <span>P</span>
          </label>
          <label class="status-label absent">
            <input type="radio" name="status-${student.userId}" value="absent">
            <span>A</span>
          </label>
        </div>
      </td>
    </tr>
  `).join("");
}

saveAttendanceBtn.addEventListener("click", async () => {
  if (!state.currentClass) return;
  
  const date = document.getElementById("attendance-date").value;
  if (!date) {
    showToast("Please select a date", "error");
    return;
  }

  const records = [];
  const students = state.currentClass.studentDetails || [];
  
  students.forEach(student => {
    const radio = document.querySelector(`input[name="status-${student.userId}"]:checked`);
    records.push({
      studentId: student.userId,
      status: radio ? radio.value : "present"
    });
  });
  
  try {
    await apiRequest("/api/attendance", {
      method: "POST",
      body: JSON.stringify({
        classId: state.currentClass.classId,
        date,
        records
      })
    });
    
    showToast("Attendance saved successfully!");
  } catch (error) {
    showToast(error.message, "error");
  }
});

loadHistoryBtn.addEventListener("click", async () => {
  if (!state.currentClass) return;
  try {
    const history = await apiRequest(`/api/attendance/${state.currentClass.classId}`);
    renderAttendanceHistory(history);
  } catch (error) {
    showToast(error.message, "error");
  }
});

function renderAttendanceHistory(history) {
  if (history.length === 0) {
    historyRecordsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-calendar-times"></i>
        <p>No attendance sessions recorded yet.</p>
      </div>
    `;
    return;
  }
  
  historyRecordsContainer.innerHTML = history.map(session => {
    const presentCount = session.records.filter(r => r.status === "present").length;
    const absentCount = session.records.filter(r => r.status === "absent").length;
    
    // Create details list of students
    const detailsHtml = session.records.map(record => {
      const student = state.currentClass.studentDetails.find(s => s.userId === record.studentId);
      const name = student ? student.name : "Unknown Student";
      return `
        <div class="history-student-pill">
          <span>${name}</span>
          <span class="status-badge ${record.status}">${record.status}</span>
        </div>
      `;
    }).join("");
    
    return `
      <div class="history-card">
        <div class="history-card-header">
          <span class="history-card-date"><i class="fa-regular fa-calendar"></i> ${session.date}</span>
          <div class="history-stats">
            <span class="stat-p">Present: ${presentCount}</span>
            <span class="stat-a">Absent: ${absentCount}</span>
          </div>
        </div>
        <div class="history-details-list">
          ${detailsHtml}
        </div>
      </div>
    `;
  }).join("");
}

/* ==========================================================================
   STUDENT DASHBOARD LOGIC
   ========================================================================== */
const joinClassBtn = document.getElementById("btn-join-class");
const studentClassesGrid = document.getElementById("student-classes-grid");
const loadStudentAttendanceBtn = document.getElementById("btn-load-student-attendance");
const studentAttendanceBody = document.getElementById("student-attendance-body");
const studentAttendanceEmpty = document.getElementById("student-attendance-empty");

joinClassBtn.addEventListener("click", async () => {
  const classCode = document.getElementById("join-class-code").value;
  if (!classCode || classCode.trim() === "") {
    showToast("Please enter a class code", "error");
    return;
  }
  
  try {
    await apiRequest("/api/classes/join", {
      method: "POST",
      body: JSON.stringify({ classCode })
    });
    
    showToast("Joined class successfully!");
    document.getElementById("join-class-code").value = "";
    loadStudentDashboard();
  } catch (error) {
    showToast(error.message, "error");
  }
});

async function loadStudentDashboard() {
  try {
    const classes = await apiRequest("/api/student/classes");
    
    if (classes.length === 0) {
      studentClassesGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <i class="fa-solid fa-graduation-cap"></i>
          <p>You haven't joined any classes yet. Use a Class Code above to join a class.</p>
        </div>
      `;
      return;
    }
    
    studentClassesGrid.innerHTML = classes.map(c => `
      <div class="card">
        <div class="card-body">
          <span class="code-pill">${c.classCode}</span>
          <h3>${c.className}</h3>
        </div>
        <div class="card-footer">
          <span class="card-students-count">
            <i class="fa-solid fa-chalkboard-user"></i> Enrolled
          </span>
        </div>
      </div>
    `).join("");
  } catch (error) {
    showToast(error.message, "error");
  }
}

loadStudentAttendanceBtn.addEventListener("click", async () => {
  try {
    const attendance = await apiRequest("/api/my-attendance");
    
    if (attendance.length === 0) {
      studentAttendanceBody.innerHTML = "";
      studentAttendanceEmpty.classList.remove("hidden");
      return;
    }
    
    studentAttendanceEmpty.classList.add("hidden");
    studentAttendanceBody.innerHTML = attendance.map(rec => `
      <tr>
        <td><strong>${rec.className}</strong></td>
        <td>${rec.date}</td>
        <td><span class="status-badge ${rec.status}">${rec.status}</span></td>
      </tr>
    `).join("");
  } catch (error) {
    showToast(error.message, "error");
  }
});

// App Entry Point
window.onload = initAuth;
