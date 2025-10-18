// auth-system.js - Gestione autenticazione

// User database
const usersDB = JSON.parse(localStorage.getItem('quizUsers')) || {};
let currentUser = null;

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const authScreen = document.getElementById('auth-screen');
const userDashboard = document.getElementById('user-dashboard');
const welcomeUsername = document.getElementById('welcome-username');
const logoutBtn = document.getElementById('logout-btn');
const completedQuizzes = document.getElementById('completed-quizzes');
const averageScore = document.getElementById('average-score');
const bestScore = document.getElementById('best-score');

// Event listeners per autenticazione
if (showRegister) {
  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'block';
  });
}

if (showLogin) {
  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    if (registerForm) registerForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
  });
}

if (loginBtn) {
  loginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const username = document.getElementById('username')?.value.trim();
    const password = document.getElementById('password')?.value.trim();
    
    if (!username || !password) {
      alert('Per favore inserisci sia username che password');
      return;
    }
    
    if (usersDB[username] && usersDB[username].password === password) {
      currentUser = username;
      localStorage.setItem('lastUser', username);
      loginUser();
    } else {
      alert('Credenziali non valide');
    }
  });
}

if (registerBtn) {
  registerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username')?.value.trim();
    const password = document.getElementById('reg-password')?.value.trim();
    const confirmPassword = document.getElementById('reg-confirm-password')?.value.trim();
    
    if (!username || !password || !confirmPassword) {
      alert('Per favore compila tutti i campi');
      return;
    }
    
    if (password !== confirmPassword) {
      alert('Le password non coincidono');
      return;
    }

    if (usersDB[username]) {
      alert('Username già esistente');
      return;
    }

    usersDB[username] = {
      password: password,
      quizHistory: []
    };
    
    localStorage.setItem('quizUsers', JSON.stringify(usersDB));
    currentUser = username;
    localStorage.setItem('lastUser', username);
    loginUser();
  });
}

function loginUser() {
  if (authScreen) authScreen.style.display = 'none';
  if (userDashboard) userDashboard.style.display = 'block';
  
  // Nascondi quiz-settings all'accesso
  const quizSettings = document.querySelector('.quiz-settings');
  if (quizSettings) quizSettings.style.display = 'none';
  
  // Nascondi anche le altre sezioni
  if (document.getElementById('subject-section')) document.getElementById('subject-section').style.display = 'none';
  if (document.getElementById('subject-dashboard')) document.getElementById('subject-dashboard').style.display = 'none';
  if (document.getElementById('no-quiz-message')) document.getElementById('no-quiz-message').style.display = 'none';
  
  if (document.getElementById('quiz-screen')) document.getElementById('quiz-screen').style.display = 'none';
  if (document.getElementById('results-screen')) document.getElementById('results-screen').style.display = 'none';
  
  updateUserDashboard();
  
  // INIZIALIZZA IL MENU SOLO QUI
  setTimeout(() => {
    initializeMenu();
  }, 100);
}

function updateUserDashboard() {
    if (!currentUser) return;
    
    const userData = usersDB[currentUser];
    // Filtra solo i quiz COMPLETI (escludi i retry)
    const completedQuizzesList = userData.quizHistory.filter(quiz => !quiz.isRetry);
    
    if (welcomeUsername) welcomeUsername.textContent = currentUser;
    
    if (completedQuizzes) {
        completedQuizzes.textContent = completedQuizzesList.length;
    }
    
    // Per media e miglior punteggio, considera TUTTI i quiz (anche retry)
    const avg = userData.quizHistory.length > 0 
        ? Math.round(userData.quizHistory.reduce((sum, quiz) => sum + quiz.score, 0) / userData.quizHistory.length)
        : 0;
    if (averageScore) averageScore.textContent = `${avg}%`;
    
    const best = userData.quizHistory.length > 0
        ? Math.max(...userData.quizHistory.map(quiz => quiz.score))
        : 0;
    if (bestScore) bestScore.textContent = `${best}%`;
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        currentUser = null;
        localStorage.removeItem('lastUser');
        showAuthScreen();
        if (userDashboard) userDashboard.style.display = "none";
        if (document.getElementById('quiz-screen')) document.getElementById('quiz-screen').style.display = "none";
        if (document.getElementById('results-screen')) document.getElementById('results-screen').style.display = "none";
        
        // Nascondi quiz-settings quando torni al login
        const quizSettings = document.querySelector('.quiz-settings');
        if (quizSettings) quizSettings.style.display = 'none';
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
    });
}

function showAuthScreen() {
  if (authScreen) authScreen.style.display = "flex";
  if (userDashboard) userDashboard.style.display = "none";
  if (document.getElementById('quiz-screen')) document.getElementById('quiz-screen').style.display = "none";
  if (document.getElementById('results-screen')) document.getElementById('results-screen').style.display = "none";
  
  if (document.getElementById('auth-forms')) {
    document.getElementById('auth-forms').style.display = 'block';
  }
  if (loginForm) loginForm.style.display = 'block';
  if (registerForm) registerForm.style.display = 'none';
}

// ===================== //
// GESTIONE MENU A TENDINA (SOLO IN DASHBOARD) //
// ===================== //

function initializeMenu() {
    // Controlla se siamo nella dashboard
    const userDashboard = document.getElementById('user-dashboard');
    if (!userDashboard || userDashboard.style.display === 'none') {
        return; // Esci se non siamo nella dashboard
    }
    
    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const sidebarMenu = document.getElementById('sidebarMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    if (!menuToggle || !sidebarMenu) return;

    // Apri menu
    menuToggle.addEventListener('click', () => {
        sidebarMenu.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Chiudi menu
    function closeMenu() {
        sidebarMenu.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (menuClose) menuClose.addEventListener('click', closeMenu);
    if (menuOverlay) menuOverlay.addEventListener('click', closeMenu);

    // Chiudi menu con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebarMenu.classList.contains('active')) {
            closeMenu();
        }
    });

    // Chiudi menu quando si clicca su un link
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', closeMenu);
    });
}
