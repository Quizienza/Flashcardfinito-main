// quiz-system.js - Sistema completo dei quiz

// Variabili globali per il conteggio delle risposte corrette e totali
let correctAnsweredIndexes = [];
let totalAnswered = 0;
let errorFrequencyBySubject = {};   // { subject: { "testo domanda": numero errori } }
let frequentErrorsBySubject = {};   // { subject: [array domande] }
let userAnswers = [];

// Variabile globale per le domande correnti
let questions = [];

// Mappa dei file delle domande per ogni materia
const subjectQuestionFiles = {
    'politica': '/public/domande/domandepoleco.js',
    'organizzazione': '/public/domande/domandeorganizzazione.js',
    'eoi': '/public/domande/domandeeoi.js',
    'empi': '/public/domande/domandeempi.js',
    'ecopol': '/public/domande/domandeecopol.js',
    'privatoad': '/public/domande/domandeprivatoad.js',
    'dirittoprivato': '/public/domande/domandedirittoprivato.js',
    
};

// DOM Elements
const channelCards = document.querySelectorAll('.channel-card');
const subjectSection = document.getElementById('subject-section');
const subjectCards = document.querySelectorAll('.subject-card');
const startQuizBtn = document.getElementById('start-quiz-btn');
const questionCountSelect = document.getElementById('question-count');
const quizScreen = document.getElementById('quiz-screen');
const questionText = document.getElementById('question-text');
const imageContainer = document.getElementById('image-container');
const answerButtons = document.getElementById('answer-buttons');
const nextButton = document.getElementById('next-btn');
const progressText = document.getElementById('progress-text');
const progressFill = document.getElementById('progress-fill');
const timeRemaining = document.getElementById('time-remaining');
const resultsScreen = document.getElementById('results-screen');
const scorePercentage = document.getElementById('score-percentage');
const scoreText = document.getElementById('score-text');
const correctAnswers = document.getElementById('correct-answers');
const wrongAnswersElement = document.getElementById('wrong-answers');
const timeTaken = document.getElementById('time-taken');
const retryWrongBtn = document.getElementById('retry-wrong-btn');
const newQuizBtn = document.getElementById('new-quiz-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const backToDashboardBtn2 = document.getElementById('back-to-dashboard-btn2');

// Quiz variables
let retryMode = false;
let originalWrongAnswers = [];
let shuffledQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let totalQuestions = 0;
let wrongAnswers = [];
let quizStartTime = 0;
let quizTimerInterval = null;
let totalTimeAllowed = 0;
let timeLeft = 0;

// Aggiungi queste variabili per la gestione delle materie
let currentChannel = null;
let currentSubject = null;
const subjectDashboard = document.getElementById('subject-dashboard');
const noQuizMessage = document.getElementById('no-quiz-message');
const currentSubjectName = document.getElementById('current-subject-name');
const currentSubjectBadge = document.getElementById('current-subject-badge');

// Nomi completi delle materie
const subjectNames = {
    politica: "Politica Economica",
    eoi: "Economia e Organizzazione Industriale",
    empi: "Energie, Materie Prime e Innovazione",
    organizzazione: "Organizzazione Aziendale",
    ecopol: "Economia Politica",
    privatoad: "Diritto Privato" 
};

// Canali e materie
const channelSubjects = {
    'A-D': ['politica', 'eoi', 'empi', 'organizzazione', 'ecopol', 'privatoad'],
    'E-M': ['politica', 'eoi', 'empi', 'organizzazione', 'ecopol', 'dirittoprivato'],
    'N-Z': ['politica', 'eoi', 'empi', 'organizzazione', 'ecopol']
};

// Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    if (typeof prefillCredentials === 'function') prefillCredentials();

    // carica errori frequenti PER MATERIA da localStorage
    try {
        errorFrequencyBySubject = JSON.parse(localStorage.getItem("errorFrequencyBySubject") || "{}");
        frequentErrorsBySubject = JSON.parse(localStorage.getItem("frequentErrorsBySubject") || "{}");
    } catch (e) {
        errorFrequencyBySubject = {};
        frequentErrorsBySubject = {};
        console.warn("Errore parsing localStorage per errori frequenti per materia", e);
    }

    // collega il pulsante (se presente) e inizializza lo stato
    const repeatBtn = document.getElementById('repeat-frequent-errors-btn');
    if (repeatBtn) {
        repeatBtn.addEventListener('click', repeatFrequentErrors);
        // Inizializza lo stato del bottone
        setTimeout(updateFrequentErrorsCounter, 100);
    }
    const viewResultsBtn = document.getElementById('view-results-btn');
    if (viewResultsBtn) {
        viewResultsBtn.addEventListener('click', toggleDetailedResults);
    }

    // Pulsante per tornare ai canali dalla sezione materie
    const backToChannelsFromSubjects = document.getElementById('back-to-channels-from-subjects');
    if (backToChannelsFromSubjects) {
        backToChannelsFromSubjects.addEventListener('click', () => {
            subjectSection.style.display = 'none';
            const channelSection = document.querySelector('.channel-section');
            if (channelSection) channelSection.style.display = 'block';
            currentChannel = null;
        });
    }

    // Setup event listeners
    setupQuizEventListeners();
    setupSubjectNavigation();
});

function setupQuizEventListeners() {
    if (startQuizBtn) {
        startQuizBtn.addEventListener("click", startQuiz);
    }

    if (nextButton) {
        nextButton.addEventListener("click", nextQuestion);
    }

    if (retryWrongBtn) {
        retryWrongBtn.addEventListener("click", retryWrongQuestions);
    }

    if (newQuizBtn) {
        newQuizBtn.addEventListener("click", () => {
            if (resultsScreen) resultsScreen.style.display = "none";
            const selectedCount = questionCountSelect.value;
            if (retryMode) {
                retryMode = false;
                questionCountSelect.value = selectedCount;
            }
            startQuiz();
        });
    }

    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener("click", backToSubjectDashboard);
    }
    if (backToDashboardBtn2) {
        backToDashboardBtn2.addEventListener("click", backToSubjectDashboard);
    }

    // Pulsante per tornare ai canali
    const backToChannelsBtn = document.getElementById('back-to-channels');
    if (backToChannelsBtn) {
        backToChannelsBtn.addEventListener('click', () => {
            subjectDashboard.style.display = 'none';
            noQuizMessage.style.display = 'none';
            
            const quizSettings = document.querySelector('.quiz-settings');
            if (quizSettings) quizSettings.style.display = 'none';
            
            const channelSection = document.querySelector('.channel-section');
            if (channelSection) channelSection.style.display = 'block';
            subjectSection.style.display = 'block';
            
            currentSubject = null;
            
            restoreDashboardView();
            
            const siteFooter = document.querySelector('.site-footer');
            if (siteFooter) siteFooter.style.display = 'block';
        });
    }
}

function setupSubjectNavigation() {
    // Gestione selezione canale
    channelCards.forEach(card => {
        card.addEventListener('click', () => {
            currentChannel = card.dataset.channel;
            
            subjectSection.style.display = 'block';
            noQuizMessage.style.display = 'none';
            
            filterSubjectsByChannel(currentChannel);
            subjectSection.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Seleziona materia
    subjectCards.forEach(card => {
        card.addEventListener('click', () => {
            currentSubject = card.dataset.subject;
            const isOralSubject = card.dataset.type === 'flashcards' || card.dataset.type === 'study-method';

            // Se è una materia orale, gestiscila separatamente
            if (isOralSubject) {
                if (card.dataset.type === 'flashcards') {
                    openDirittoPrivatoFlashcards();
                } else if (card.dataset.type === 'study-method') {
                    openStudyMethod();
                }
                return;
            }
            
            handleSubjectSelection();
        });
    });
}

function handleSubjectSelection() {
    const channelSection = document.querySelector('.channel-section');
    if (channelSection) channelSection.style.display = 'none';
    
    if (!hasQuestions(currentSubject)) {
        subjectSection.style.display = 'none';
        subjectDashboard.style.display = 'block';
        noQuizMessage.style.display = 'block';
        
        showNoQuizMessage();
        return;
    }
    
    subjectSection.style.display = 'none';
    noQuizMessage.style.display = 'none';
    updateSubjectDashboard();
    subjectDashboard.style.display = 'block';

    const quizSettings = document.querySelector('.quiz-settings');
    if (quizSettings && hasQuestions(currentSubject)) {
        quizSettings.style.display = 'block';
    }
    
    subjectDashboard.scrollIntoView({ behavior: 'smooth' });
}

function showNoQuizMessage() {
    noQuizMessage.innerHTML = `
        <button id="back-to-subjects" class="back-arrow-btn" title="Torna indietro">
            <i class="fas fa-arrow-left"></i>
        </button>
        <div style="padding-left: 50px;">
            <i class="fas fa-info-circle"></i>
            <h3>Quiz non ancora disponibile</h3>
            <p>La materia <strong>${subjectNames[currentSubject] || currentSubject}</strong> non ha ancora quiz disponibili.</p>
            <p style="color: var(--text-light); font-size: 0.9rem;">
                Stiamo lavorando per aggiungere nuovi contenuti.
            </p>
        </div>
    `;
    
    setTimeout(() => {
        const backButton = document.getElementById('back-to-subjects');
        if (backButton) {
            backButton.addEventListener('click', () => {
                noQuizMessage.style.display = 'none';
                subjectSection.style.display = 'block';
                subjectDashboard.style.display = 'none';
                const quizSettings = document.querySelector('.quiz-settings');
                if (quizSettings) quizSettings.style.display = 'none';
                const channelSection = document.querySelector('.channel-section');
                if (channelSection) channelSection.style.display = 'block';
                currentSubject = null;
                restoreDashboardView();
            });
        }
    }, 100);
}

function filterSubjectsByChannel(channel) {
    const subjectsForChannel = channelSubjects[channel] || [];

     const currentChannelDisplay = document.getElementById('current-channel-display');
     if (currentChannelDisplay) {
         currentChannelDisplay.textContent = channel;
     }
    
    subjectCards.forEach(card => {
        card.style.display = 'none';
    });
    
    subjectsForChannel.forEach(subject => {
        const subjectCard = document.querySelector(`.subject-card[data-subject="${subject}"]`);
        if (subjectCard) {
            subjectCard.style.display = 'block';
            
            const channelBadge = subjectCard.querySelector('.channel-badge');
            if (channelBadge) {
                channelBadge.textContent = `Canale ${channel}`;
            }
        }
    });
    
    updateCategoryTitles(channel);
}

function updateCategoryTitles(channel) {
    const categoryTitles = document.querySelectorAll('.category-title');
    categoryTitles.forEach(title => {
        const originalText = title.textContent;
        const cleanText = originalText.replace(/ - Canale [A-Z]-[A-Z]/, '');
        title.textContent = `${cleanText} - Canale ${channel}`;
    });
}

function hasQuestions(subject) {
    return Object.keys(subjectQuestionFiles).includes(subject);
}

function loadQuestionsForSubject(subject, callback) {
    const scriptFile = subjectQuestionFiles[subject];
    
    if (!scriptFile) {
        console.error('Nessun file domande trovato per la materia:', subject);
        if (callback) callback([]);
        return;
    }
    
    const oldScript = document.getElementById('current-question-script');
    if (oldScript) {
        document.head.removeChild(oldScript);
    }
    
    const script = document.createElement('script');
    script.id = 'current-question-script';
    script.src = scriptFile;
    script.onload = function() {
        console.log(`Domande per ${subject} caricate con successo`);
        if (callback) callback(window.questions || []);
    };
    script.onerror = function() {
        console.error(`Errore nel caricamento delle domande per ${subject}`);
        if (callback) callback([]);
    };
    
    document.head.appendChild(script);
}

function updateSubjectDashboard() {
    if (!currentUser || !currentSubject) return;
    
    const userData = usersDB[currentUser];
    const subjectHistory = userData.quizHistory.filter(quiz => 
        quiz.subject === currentSubject && !quiz.isRetry
    );
    
    const allSubjectQuizzes = userData.quizHistory.filter(quiz => 
        quiz.subject === currentSubject
    );
    
    if (currentSubjectName) {
        currentSubjectName.textContent = subjectNames[currentSubject] || currentSubject;
    }
    
    if (currentSubjectBadge) {
        currentSubjectBadge.textContent = `Canale ${currentChannel}`;
    }
    
    if (completedQuizzes) {
        completedQuizzes.textContent = subjectHistory.length;
    }
    
    const avg = subjectHistory.length > 0 
        ? Math.round(subjectHistory.reduce((sum, quiz) => sum + quiz.score, 0) / subjectHistory.length)
        : 0;
    if (averageScore) averageScore.textContent = `${avg}%`;
    
    const best = subjectHistory.length > 0
        ? Math.max(...subjectHistory.map(quiz => quiz.score))
        : 0;
    if (bestScore) bestScore.textContent = `${best}%`;
    
    updateFrequentErrorsCounter();
    
    const siteFooter = document.querySelector('.site-footer');
    if (siteFooter) {
        siteFooter.style.display = 'block';
    }
}

function startQuiz() {
    if (!currentSubject || !hasQuestions(currentSubject)) {
        alert('Quiz non disponibile per questa materia');
        return;
    }
    
    loadQuestionsForSubject(currentSubject, function(loadedQuestions) {
        if (loadedQuestions.length === 0) {
            alert('Nessuna domanda disponibile per questa materia');
            return;
        }
        
        questions = loadedQuestions;
        
        const siteFooter = document.querySelector('.site-footer');
        if (siteFooter) siteFooter.style.display = 'none';

        retryMode = false;
        originalWrongAnswers = [];
        const selectedCount = parseInt(questionCountSelect.value);
        
        if (selectedCount === 15) {
            totalTimeAllowed = 30 * 60;
        } else if (selectedCount === 30) {
            totalTimeAllowed = 45 * 60;
        } else {
            totalTimeAllowed = 0;
        }
        
        totalQuestions = selectedCount > 0 ? Math.min(selectedCount, questions.length) : questions.length;
        shuffledQuestions = shuffleArray(questions).slice(0, totalQuestions);
        
        currentQuestionIndex = 0;
        score = 0;
        wrongAnswers = [];
        quizStartTime = Date.now();
        timeLeft = totalTimeAllowed;
        
        if (userDashboard) userDashboard.style.display = "none";
        if (quizScreen) quizScreen.style.display = "block";
        if (resultsScreen) resultsScreen.style.display = "none";
        
        const quizSettings = document.querySelector('.quiz-settings');
        if (quizSettings) quizSettings.style.display = 'none';
        
        if (document.querySelector('.quiz-timer')) {
            document.querySelector('.quiz-timer').style.display = totalTimeAllowed > 0 ? 'flex' : 'none';
        }
        
        if (totalTimeAllowed > 0) {
            startQuizTimer();
        }
        
        showQuestion();
    });
}

function startQuizTimer() {
    clearInterval(quizTimerInterval);
    if (timeRemaining) timeRemaining.textContent = formatTime(timeLeft);
    
    quizTimerInterval = setInterval(() => {
        timeLeft--;
        if (timeRemaining) timeRemaining.textContent = formatTime(timeLeft);
        
        if (timeLeft <= 0) {
            clearInterval(quizTimerInterval);
            handleQuizTimeOut();
        }
    }, 1000);
}

function handleQuizTimeOut() {
    currentQuestionIndex = totalQuestions;
    showResults();
}

function updateCorrectCounter() {
    const counter = document.getElementById('correct-counter');
    if (counter) {
        counter.textContent = `${score}/${totalQuestions}`;
    }
}

function showQuestion() {
    resetState();
    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    
    const progressPercent = ((currentQuestionIndex) / totalQuestions) * 100;
    if (progressFill) progressFill.style.width = `${progressPercent}%`;
    if (progressText) progressText.textContent = `Domanda ${currentQuestionIndex + 1} di ${totalQuestions}`;
    
    updateCurrentScore();
    updateCorrectCounter();

    if (questionText) questionText.textContent = `${currentQuestionIndex + 1}. ${currentQuestion.question}`;
    
    if (imageContainer) {
        imageContainer.innerHTML = "";
        if (currentQuestion.image) {
            const img = document.createElement("img");
            img.src = currentQuestion.image;
            img.alt = "Illustrazione domanda";
            img.classList.add("question-image");
            imageContainer.appendChild(img);
        }
    }

    const shuffledAnswers = shuffleArray([...currentQuestion.answers]);
    if (answerButtons) {
        shuffledAnswers.forEach(answer => {
            const button = document.createElement("button");
            button.classList.add("answer-btn");
            
            if (answer.text) {
                button.innerHTML = `<span class="answer-text">${answer.text}</span>`;
            } else if (answer.image) {
                button.innerHTML = `<span class="answer-text"><img src="${answer.image}" class="answer-image"></span>`;
            }
            
            if (answer.correct) {
                button.dataset.correct = answer.correct;
            }
            
            button.addEventListener("click", selectAnswer);
            answerButtons.appendChild(button);
        });
    }
}

function updateCurrentScore() {
    const percentage = Math.round((score / totalQuestions) * 100);
    const scoreElement = document.getElementById('current-score');
    if (scoreElement) {
        scoreElement.textContent = `${percentage}% (${score}/${totalQuestions})`;
    }
}

// Animazione del punteggio
const quizScore = document.querySelector('.quiz-score');
if (quizScore) {
    quizScore.classList.add('score-update');
    setTimeout(() => {
        quizScore.classList.remove('score-update');
    }, 600);
}

function resetState() {
    if (nextButton) nextButton.disabled = true;
    if (answerButtons) {
        while (answerButtons.firstChild) {
            answerButtons.removeChild(answerButtons.firstChild);
        }
    }
    if (imageContainer) imageContainer.innerHTML = "";
}

function selectAnswer(e) {
    const selectedBtn = e.target.closest('.answer-btn');
    if (!selectedBtn) return;
    
    const isCorrect = selectedBtn.dataset.correct === "true";
    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    
    const correctAnswer = currentQuestion.answers.find(a => a.correct);
    const correctAnswerText = correctAnswer?.text || '';
    const correctAnswerImage = correctAnswer?.image || '';
    
    userAnswers[currentQuestionIndex] = {
        question: currentQuestion.question,
        questionImage: currentQuestion.image || '',
        userAnswer: selectedBtn.querySelector('.answer-text')?.textContent?.trim() || selectedBtn.textContent.trim(),
        isCorrect: isCorrect,
        correctAnswerText: correctAnswerText,
        correctAnswerImage: correctAnswerImage
    };
    
    if (!isCorrect) {
        if (!wrongAnswers.some(q => q.question === currentQuestion.question)) {
            wrongAnswers.push(currentQuestion);
        }
    }
    
    if (isCorrect) {
        selectedBtn.classList.add("correct");
        score++;
        if (frequentErrorsBySubject[currentSubject]) {
            frequentErrorsBySubject[currentSubject] =
                frequentErrorsBySubject[currentSubject].filter(q => q.question !== currentQuestion.question);
            localStorage.setItem("frequentErrorsBySubject", JSON.stringify(frequentErrorsBySubject));
        }
    } else {
        selectedBtn.classList.add("incorrect");
    }
    
    if (!isCorrect) {
        if (!errorFrequencyBySubject[currentSubject]) {
            errorFrequencyBySubject[currentSubject] = {};
        }
        if (!frequentErrorsBySubject[currentSubject]) {
            frequentErrorsBySubject[currentSubject] = [];
        }

        errorFrequencyBySubject[currentSubject][currentQuestion.question] =
            (errorFrequencyBySubject[currentSubject][currentQuestion.question] || 0) + 1;

        if (errorFrequencyBySubject[currentSubject][currentQuestion.question] > 2 &&
            !frequentErrorsBySubject[currentSubject].some(q => q.question === currentQuestion.question)) {
            frequentErrorsBySubject[currentSubject].push(currentQuestion);
        }

        localStorage.setItem("errorFrequencyBySubject", JSON.stringify(errorFrequencyBySubject));
        localStorage.setItem("frequentErrorsBySubject", JSON.stringify(frequentErrorsBySubject));
        
        updateFrequentErrorsCounter();
    }

    updateCurrentScore();

    if (answerButtons) {
        Array.from(answerButtons.children).forEach(button => {
            if (button.dataset.correct === "true") {
                button.classList.add("correct");
            }
            button.disabled = true;
        });
    }

    if (nextButton) nextButton.disabled = false;
}

function nextQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex < totalQuestions) {
        showQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    clearInterval(quizTimerInterval);
    
    const timeSpent = Math.floor((Date.now() - quizStartTime) / 1000);
    const percentage = Math.round((score / totalQuestions) * 100);
    
    if (retryMode) {
        originalWrongAnswers = [...wrongAnswers];
    } else {
        originalWrongAnswers = [...wrongAnswers];
    }
    
    if (scorePercentage) scorePercentage.textContent = `${percentage}%`;
    if (scoreText) scoreText.textContent = getResultText(percentage);
    if (correctAnswers) correctAnswers.textContent = score;
    if (wrongAnswersElement) wrongAnswersElement.textContent = totalQuestions - score;
    if (timeTaken) timeTaken.textContent = formatTime(timeSpent);
    
    const detailedResults = document.getElementById('detailed-results');
    const viewResultsBtn = document.getElementById('view-results-btn');
    if (detailedResults) detailedResults.style.display = 'none';
    if (viewResultsBtn) viewResultsBtn.innerHTML = '<i class="fas fa-eye"></i> Vedi Risultati';
    
    if (currentUser) {
        const userData = usersDB[currentUser];
        const quizResult = {
            date: new Date().toISOString(),
            score: percentage,
            totalQuestions: totalQuestions,
            wrongAnswers: wrongAnswers,
            timeSpent: timeSpent,
            isRetry: retryMode,
            subject: currentSubject,
            channel: currentChannel,
            userAnswers: userAnswers
        };
        
        userData.quizHistory.push(quizResult);
        localStorage.setItem('quizUsers', JSON.stringify(usersDB));
        updateUserDashboard();
    }
    
    if (quizScreen) quizScreen.style.display = "none";
    if (resultsScreen) resultsScreen.style.display = "block";
}

function retryWrongQuestions() {
    if (originalWrongAnswers.length === 0) {
        alert('Non ci sono domande da ripetere!');
        return;
    }
    
    shuffledQuestions = [...originalWrongAnswers];
    totalQuestions = shuffledQuestions.length;
    currentQuestionIndex = 0;
    score = 0;
    wrongAnswers = [];
    retryMode = true;
    quizStartTime = Date.now();
    totalTimeAllowed = 0;
    
    if (resultsScreen) resultsScreen.style.display = "none";
    if (quizScreen) quizScreen.style.display = "block";
    
    if (document.querySelector('.quiz-timer')) {
        document.querySelector('.quiz-timer').style.display = 'none';
    }
    
    showQuestion();
}

function backToSubjectDashboard() {
    if (quizScreen) quizScreen.style.display = "none";
    if (resultsScreen) resultsScreen.style.display = "none";
    if (userDashboard) userDashboard.style.display = "block";
    subjectDashboard.style.display = "block";

    const quizSettings = document.querySelector('.quiz-settings');
    if (quizSettings && currentSubject && hasQuestions(currentSubject)) {
        quizSettings.style.display = 'block';
    } else if (quizSettings) {
        quizSettings.style.display = 'none';
    }
    
    updateSubjectDashboard();

    const siteFooter = document.querySelector('.site-footer');
    if (siteFooter) siteFooter.style.display = 'block';
}

function restoreDashboardView() {
    const dashboardHeader = document.querySelector('.subject-dashboard .dashboard-header');
    const dashboardContent = document.querySelector('.dashboard-content');
    if (dashboardHeader) dashboardHeader.style.display = 'block';
    if (dashboardContent) dashboardContent.style.display = 'block';
    noQuizMessage.style.display = 'none';
    
    const quizSettings = document.querySelector('.quiz-settings');
    if (quizSettings) quizSettings.style.display = 'none';
    
    const siteFooter = document.querySelector('.site-footer');
    if (siteFooter) siteFooter.style.display = 'block';
}

// Funzioni per errori frequenti
function repeatFrequentErrors() {
    const subjectErrors = frequentErrorsBySubject[currentSubject] || {};
    const errorCount = Object.keys(subjectErrors).length;
    
    if (errorCount === 0) {
        alert("Non ci sono errori frequenti da ripetere per questa materia!");
        return;
    }

    const subjectErrorsArray = frequentErrorsBySubject[currentSubject] || [];

    if (subjectErrorsArray.length === 0) {
        alert("Non ci sono errori frequenti da ripetere per questa materia!");
        return;
    }

    shuffledQuestions = [...subjectErrorsArray];
    totalQuestions = shuffledQuestions.length;
    currentQuestionIndex = 0;
    score = 0;
    wrongAnswers = [];
    retryMode = true;
    quizStartTime = Date.now();
    totalTimeAllowed = 0;

    if (userDashboard) userDashboard.style.display = "none";
    if (resultsScreen) resultsScreen.style.display = "none";
    if (quizScreen) quizScreen.style.display = "block";

    if (document.querySelector('.quiz-timer')) {
        document.querySelector('.quiz-timer').style.display = 'none';
    }

    showQuestion();
}

function updateFrequentErrorsCounter() {
    const repeatBtn = document.getElementById('repeat-frequent-errors-btn');
    if (!repeatBtn) return;
    
    const subjectErrors = frequentErrorsBySubject[currentSubject] || {};
    const errorCount = Object.keys(subjectErrors).length;
    
    let counterBadge = repeatBtn.querySelector('.error-counter-badge');
    
    repeatBtn.classList.remove('enabled', 'disabled');
    
    if (errorCount > 0) {
        repeatBtn.style.transition = 'all 0.8s ease-in-out';
        
        if (!counterBadge) {
            counterBadge = document.createElement('span');
            counterBadge.className = 'error-counter-badge';
            repeatBtn.appendChild(counterBadge);
        } else {
            counterBadge.classList.remove('fade-out');
        }
        counterBadge.textContent = errorCount;
        
        repeatBtn.classList.add('enabled');
        repeatBtn.removeAttribute('disabled');
        
    } else {
        repeatBtn.style.transition = 'all 0.8s ease-in-out';
        
        if (counterBadge) {
            counterBadge.classList.add('fade-out');
            setTimeout(() => {
                if (counterBadge && counterBadge.parentNode) {
                    counterBadge.remove();
                }
            }, 400);
        }
        
        repeatBtn.classList.add('disabled');
        repeatBtn.removeAttribute('disabled');
    }
}

function toggleDetailedResults() {
    const detailedResults = document.getElementById('detailed-results');
    const viewResultsBtn = document.getElementById('view-results-btn');
    
    if (detailedResults.style.display === 'none') {
        showDetailedResults();
        detailedResults.style.display = 'block';
        viewResultsBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Nascondi Risultati';
    } else {
        detailedResults.style.display = 'none';
        viewResultsBtn.innerHTML = '<i class="fas fa-eye"></i> Vedi Risultati';
    }
}

function showDetailedResults() {
    const resultsList = document.getElementById('results-list');
    if (!resultsList) {
        console.error('Element results-list non trovato');
        return;
    }
    
    resultsList.innerHTML = '';
    
    if (userAnswers.length === 0) {
        resultsList.innerHTML = `
            <div class="no-results-message">
                <i class="fas fa-info-circle"></i>
                <p>Nessun dato disponibile per la visualizzazione dettagliata.</p>
            </div>
        `;
        return;
    }
    
    let hasContent = false;
    
    for (let i = 0; i < totalQuestions; i++) {
        const userAnswer = userAnswers[i];
        const question = shuffledQuestions[i];
        
        if (!question) continue;
        
        hasContent = true;
        const correctAnswer = question.answers.find(a => a.correct);
        const correctAnswerText = correctAnswer?.text || '';
        const correctAnswerImage = correctAnswer?.image || '';
        
        const userSelectedAnswer = userAnswer ? userAnswer.userAnswer : 'Nessuna risposta';
        const isCorrect = userAnswer ? userAnswer.isCorrect : false;
        
        const resultItem = document.createElement('div');
        resultItem.className = `result-item ${isCorrect ? 'correct' : 'wrong'}`;
        
        const explanationButton = !isCorrect ? `
            <button class="explanation-btn" onclick='openAIExplanation({
                question: ${JSON.stringify(question.question)},
                userAnswer: ${JSON.stringify(userSelectedAnswer)},
                correctAnswer: ${JSON.stringify(correctAnswerText)},
                subject: "${subjectNames[currentSubject] || currentSubject}",
                isExplanation: true
            })'>
                <i class="fas fa-lightbulb"></i> Chiedi Spiegazione all'AI
            </button>
        ` : '';
        
        resultItem.innerHTML = `
            <div class="result-item-header">
                <span class="result-status ${isCorrect ? 'correct' : 'wrong'}">
                    ${isCorrect ? '✓' : '✗'}
                </span>
                <span class="result-question">${i + 1}. ${question.question}</span>
            </div>
            
            ${question.image ? `<img src="${question.image}" class="result-image" alt="Domanda">` : ''}
            
            <div class="user-answer ${isCorrect ? 'user-correct' : 'user-wrong'}">
                <i class="fas ${isCorrect ? 'fa-check' : 'fa-times'}"></i>
                <div>
                    <strong>La tua risposta:</strong>
                    <div>${userSelectedAnswer}</div>
                </div>
            </div>
            
            ${!isCorrect ? `
                <div class="result-correct-answer">
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <strong>Risposta corretta:</strong>
                        ${correctAnswerImage ? `<div><img src="${correctAnswerImage}" class="answer-image" alt="Risposta corretta"></div>` : ''}
                        ${correctAnswerText ? `<div>${correctAnswerText}</div>` : ''}
                    </div>
                </div>
                ${explanationButton}
            ` : ''}
        `;
        
        resultsList.appendChild(resultItem);
    }
    
    if (!hasContent) {
        resultsList.innerHTML = `
            <div class="no-results-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Impossibile caricare i dettagli delle risposte.</p>
            </div>
        `;
    }
}

// Utility functions
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getResultText(percentage) {
    if (percentage >= 90) return "Perfetto!";
    if (percentage >= 70) return "Eccellente!";
    if (percentage >= 50) return "Buono";
    if (percentage >= 30) return "Discreto";
    return "Da migliorare";
}
