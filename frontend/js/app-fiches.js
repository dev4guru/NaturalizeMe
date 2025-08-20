// Application NaturalizeMe - Système de Fiches
const API_BASE_URL = 'http://localhost:3001/api';

// Initialisation Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        // État de l'application
        currentView: 'home',
        isLoading: false,
        mobileMenuOpen: false,
        
        // Données des fiches
        questions: [],
        currentCardIndex: 0,
        filteredQuestions: [],
        
        // Configuration des fiches
        selectedCategory: 'all',
        categories: [
            { id: 'all', name: 'Toutes les questions', icon: '📚', count: 0 },
            { id: 'motivation', name: 'Motivation et Projet', icon: '🎯', count: 0 },
            { id: 'attaches', name: 'Attachés à la France', icon: '🇫🇷', count: 0 },
            { id: 'parcours_personnel', name: 'Parcours Personnel', icon: '👤', count: 0 },
            { id: 'valeurs_republicaines', name: 'Valeurs Républicaines', icon: '⚖️', count: 0 },
            { id: 'langue', name: 'Langue Française', icon: '🗣️', count: 0 },
            { id: 'culture', name: 'Culture Française', icon: '🎨', count: 0 },
            { id: 'histoire', name: 'Histoire de France', icon: '📜', count: 0 },
            { id: 'institutions', name: 'Institutions', icon: '🏛️', count: 0 }
        ],

        // Progrès utilisateur
        userProgress: {
            studiedToday: 0,
            totalStudied: 0,
            cardsViewed: 0,
            favoriteCards: [],
            lastStudyDate: null,
            streak: 0,
            completedCategories: [],
            successRate: 94
        },

        // Premium et Quiz
        isPremium: false,
        showSubscription: false,
        preRegisterEmail: '',
        
        // Gestion des accès quiz
        hasUsedDemo: false,
        quizAccess: {
            totalDemoUsed: 0,
            maxDemoAllowed: 1,
            premiumSubscriptionDate: null,
            premiumExpiryDate: null
        },
        
        // Quiz Premium
        quizQuestions: [],
        currentQuizIndex: 0,
        quizProgress: { current: 1, total: 30 },
        timeLeft: 30,
        quizTimer: null,
        selectedAnswer: null,
        quizAnswers: [],
        quizResults: {
            score: 0,
            correct: 0,
            total: 30,
            conseils: []
        },

        // Stats calculées
        get stats() {
            return {
                totalQuestions: this.questions.length,
                categoriesCount: this.categories.filter(c => c.id !== 'all').length
            };
        },

        // Initialisation
        async init() {
            this.loadUserProgress();
            this.loadPremiumStatus();
            await this.loadQuestions();
        },

        // Chargement des questions
        async loadQuestions() {
            try {
                this.isLoading = true;
                
                const response = await fetch(`${API_BASE_URL}/quiz/questions`);
                if (!response.ok) throw new Error('Erreur lors du chargement des questions');
                
                const data = await response.json();
                this.questions = data.questions || [];
                
                this.updateCategoryCounts();
                this.filterQuestions();
                
                this.isLoading = false;
            } catch (error) {
                this.isLoading = false;
                alert('Erreur lors du chargement des questions: ' + error.message);
            }
        },

        // Filtrage des questions par catégorie
        filterQuestions() {
            if (this.selectedCategory === 'all') {
                this.filteredQuestions = [...this.questions];
            } else {
                this.filteredQuestions = this.questions.filter(q => q.category === this.selectedCategory);
            }
            this.currentCardIndex = 0;
        },

        // Navigation
        goToHome() {
            this.currentView = 'home';
        },

        goToCards() {
            this.currentView = 'cards';
        },

        goToProgress() {
            this.currentView = 'progress';
        },

        // Démarrer l'étude des fiches
        startStudying() {
            this.goToCards();
            this.currentCardIndex = 0;
            this.userProgress.studiedToday++;
            this.saveUserProgress();
        },

        // Sélection de catégorie
        selectCategory(categoryId) {
            this.selectedCategory = categoryId;
            this.filterQuestions();
        },

        // Navigation entre les fiches
        nextCard() {
            if (this.currentCardIndex < this.filteredQuestions.length - 1) {
                this.currentCardIndex++;
                this.userProgress.cardsViewed++;
                this.saveUserProgress();
            }
        },

        previousCard() {
            if (this.currentCardIndex > 0) {
                this.currentCardIndex--;
            }
        },

        // Marquer comme favori
        toggleFavorite() {
            const currentQuestion = this.getCurrentCard();
            if (!currentQuestion) return;

            const questionId = currentQuestion.id || this.currentCardIndex;
            const index = this.userProgress.favoriteCards.indexOf(questionId);
            
            if (index === -1) {
                this.userProgress.favoriteCards.push(questionId);
            } else {
                this.userProgress.favoriteCards.splice(index, 1);
            }
            
            this.saveUserProgress();
        },

        // Mélanger les fiches
        shuffleCards() {
            for (let i = this.filteredQuestions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.filteredQuestions[i], this.filteredQuestions[j]] = [this.filteredQuestions[j], this.filteredQuestions[i]];
            }
            this.currentCardIndex = 0;
        },

        // Accesseurs
        getCurrentCard() {
            return this.filteredQuestions[this.currentCardIndex] || null;
        },

        getCurrentCategory() {
            return this.categories.find(cat => cat.id === this.selectedCategory) || this.categories[0];
        },

        isFirstCard() {
            return this.currentCardIndex === 0;
        },

        isLastCard() {
            return this.currentCardIndex === this.filteredQuestions.length - 1;
        },

        isFavorite() {
            const currentQuestion = this.getCurrentCard();
            if (!currentQuestion) return false;
            const questionId = currentQuestion.id || this.currentCardIndex;
            return this.userProgress.favoriteCards.includes(questionId);
        },

        // Formatage
        formatCategoryName(categoryId) {
            const category = this.categories.find(cat => cat.id === categoryId);
            return category ? category.name : 'Catégorie inconnue';
        },

        formatCardNumber() {
            return `${this.currentCardIndex + 1}/${this.filteredQuestions.length}`;
        },

        // Gestion du progrès utilisateur
        loadUserProgress() {
            try {
                const saved = localStorage.getItem('naturalizeme-progress');
                if (saved) {
                    this.userProgress = { ...this.userProgress, ...JSON.parse(saved) };
                }
            } catch (error) {
                // Ignorer les erreurs de parsing
            }
        },

        saveUserProgress() {
            try {
                localStorage.setItem('naturalizeme-progress', JSON.stringify(this.userProgress));
            } catch (error) {
                // Ignorer les erreurs de sauvegarde
            }
        },

        // Mise à jour des compteurs de catégories
        updateCategoryCounts() {
            this.categories.forEach(category => {
                if (category.id === 'all') {
                    category.count = this.questions.length;
                } else {
                    category.count = this.questions.filter(q => q.category === category.id).length;
                }
            });
        },

        // === FONCTIONS PREMIUM ===
        
        // Activation premium (mode démo)
        activatePremium() {
            this.isPremium = true;
            this.showSubscription = false;
            
            // Configurer l'abonnement premium (en mode démo, 30 jours)
            const now = new Date();
            const expiryDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 jours
            
            this.quizAccess.premiumSubscriptionDate = now.toISOString();
            this.quizAccess.premiumExpiryDate = expiryDate.toISOString();
            
            // Sauvegarder le statut premium
            localStorage.setItem('naturalizeme-premium', 'true');
            this.saveQuizAccess();
            
            alert('🎉 Félicitations ! Votre abonnement Premium est activé (mode démo - 30 jours)\n\n✅ Quiz illimité activé !');
        },

        // Activation premium pour vrai paiement (à implémenter plus tard)
        activatePremiumPaid(subscriptionData) {
            this.isPremium = true;
            this.showSubscription = false;
            
            // Configurer l'abonnement premium réel
            const now = new Date();
            const expiryDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 jours
            
            this.quizAccess.premiumSubscriptionDate = now.toISOString();
            this.quizAccess.premiumExpiryDate = expiryDate.toISOString();
            this.quizAccess.paymentData = subscriptionData; // Informations de paiement
            
            localStorage.setItem('naturalizeme-premium', 'true');
            this.saveQuizAccess();
            
            return true;
        },

        // Pré-inscription par email
        submitPreRegistration() {
            if (!this.preRegisterEmail || !this.isValidEmail(this.preRegisterEmail)) {
                alert('⚠️ Veuillez saisir un email valide');
                return;
            }

            // Sauvegarder l'email localement
            const preRegistrations = JSON.parse(localStorage.getItem('naturalizeme-pre-registrations') || '[]');
            if (!preRegistrations.includes(this.preRegisterEmail)) {
                preRegistrations.push(this.preRegisterEmail);
                localStorage.setItem('naturalizeme-pre-registrations', JSON.stringify(preRegistrations));
            }

            // Dans un vrai projet, envoyer à un service d'email
            console.log('Pré-inscription:', this.preRegisterEmail);
            
            this.showSubscription = false;
            this.preRegisterEmail = '';
            
            alert('🎉 Merci ! Vous serez notifié dès le lancement du Premium Quiz.\n\nEn attendant, profitez du mode démo gratuit !');
            
            // Activer le mode démo automatiquement
            this.activatePremium();
        },

        // Validation d'email simple
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        // Charger le statut premium
        loadPremiumStatus() {
            const premium = localStorage.getItem('naturalizeme-premium');
            const quizAccess = localStorage.getItem('naturalizeme-quiz-access');
            
            this.isPremium = premium === 'true';
            
            if (quizAccess) {
                try {
                    this.quizAccess = { ...this.quizAccess, ...JSON.parse(quizAccess) };
                } catch (error) {
                    console.error('Erreur lors du chargement des accès quiz:', error);
                }
            }
            
            // Vérifier si l'abonnement premium a expiré
            if (this.isPremium && this.quizAccess.premiumExpiryDate) {
                const now = new Date();
                const expiryDate = new Date(this.quizAccess.premiumExpiryDate);
                
                if (now > expiryDate) {
                    // Abonnement expiré
                    this.isPremium = false;
                    localStorage.setItem('naturalizeme-premium', 'false');
                    alert('⚠️ Votre abonnement Premium a expiré. Renouvelez pour continuer à profiter du Quiz Premium illimité.');
                }
            }
        },

        // Sauvegarder les accès quiz
        saveQuizAccess() {
            try {
                localStorage.setItem('naturalizeme-quiz-access', JSON.stringify(this.quizAccess));
            } catch (error) {
                console.error('Erreur lors de la sauvegarde des accès quiz:', error);
            }
        },

        // Démarrer le quiz premium
        startPremiumQuiz() {
            // Vérifier les accès
            if (!this.canAccessQuiz()) {
                return;
            }

            // Sélectionner 30 questions aléatoires avec options de quiz
            const questionsWithOptions = this.questions.filter(q => q.quiz_options && q.quiz_options.length > 0);
            
            if (questionsWithOptions.length < 30) {
                alert('Pas assez de questions avec options disponibles pour le quiz premium.');
                return;
            }

            // Mélanger et prendre 30 questions
            this.quizQuestions = this.shuffleArray([...questionsWithOptions]).slice(0, 30);
            this.currentQuizIndex = 0;
            this.quizProgress = { current: 1, total: 30 };
            this.quizAnswers = [];
            this.selectedAnswer = null;
            this.timeLeft = 30;
            
            // Marquer l'utilisation si c'est un utilisateur gratuit
            if (!this.isPremium) {
                this.quizAccess.totalDemoUsed++;
                this.saveQuizAccess();
            }
            
            this.currentView = 'premiumQuiz';
            this.startQuizTimer();
        },

        // Vérifier si l'utilisateur peut accéder au quiz
        canAccessQuiz() {
            // Utilisateur premium : accès illimité
            if (this.isPremium) {
                return true;
            }
            
            // Utilisateur gratuit : vérifier la démo
            if (this.quizAccess.totalDemoUsed >= this.quizAccess.maxDemoAllowed) {
                // Démo épuisée
                this.showQuizLimitReached();
                return false;
            }
            
            // Première utilisation de la démo
            return true;
        },

        // Afficher le message de limite atteinte
        showQuizLimitReached() {
            const remaining = this.quizAccess.maxDemoAllowed - this.quizAccess.totalDemoUsed;
            
            if (remaining <= 0) {
                alert('🚫 Démo épuisée !\n\n' +
                      'Vous avez utilisé votre quiz démo gratuit.\n' +
                      'Abonnez-vous pour un accès illimité au Quiz Premium !\n\n' +
                      '✨ Quiz illimité\n' +
                      '📊 Analyses détaillées\n' +
                      '🎯 Conseils personnalisés');
                
                this.showSubscription = true;
            } else {
                alert(`⚠️ Quiz démo limité !\n\nIl vous reste ${remaining} utilisation${remaining > 1 ? 's' : ''} de la démo.\n\nAbonnez-vous pour un accès illimité !`);
            }
        },

        // Démarrer le timer du quiz
        startQuizTimer() {
            this.timeLeft = 30;
            
            this.quizTimer = setInterval(() => {
                this.timeLeft--;
                
                if (this.timeLeft <= 0) {
                    // Temps écoulé, passer à la question suivante
                    this.submitQuizAnswer(true); // true = timeout
                }
            }, 1000);
        },

        // Arrêter le timer
        stopQuizTimer() {
            if (this.quizTimer) {
                clearInterval(this.quizTimer);
                this.quizTimer = null;
            }
        },

        // Obtenir la question actuelle du quiz
        getCurrentQuizQuestion() {
            return this.quizQuestions[this.currentQuizIndex] || null;
        },

        // Sélectionner une réponse
        selectQuizAnswer(answer) {
            this.selectedAnswer = answer;
        },

        // Soumettre la réponse
        submitQuizAnswer(isTimeout = false) {
            const currentQuestion = this.getCurrentQuizQuestion();
            if (!currentQuestion) return;

            // Enregistrer la réponse
            const correctOption = currentQuestion.quiz_options.find(opt => opt.correct);
            const isCorrect = !isTimeout && this.selectedAnswer === correctOption?.option;
            
            this.quizAnswers.push({
                questionId: currentQuestion.id,
                question: currentQuestion.question,
                selectedAnswer: this.selectedAnswer,
                correctAnswer: correctOption?.option,
                isCorrect: isCorrect,
                isTimeout: isTimeout,
                category: currentQuestion.category
            });

            this.stopQuizTimer();

            // Passer à la question suivante ou terminer
            if (this.currentQuizIndex < this.quizQuestions.length - 1) {
                this.currentQuizIndex++;
                this.quizProgress.current++;
                this.selectedAnswer = null;
                this.startQuizTimer();
            } else {
                // Terminer le quiz
                this.finishQuiz();
            }
        },

        // Terminer le quiz et calculer les résultats
        finishQuiz() {
            this.stopQuizTimer();
            
            const correctAnswers = this.quizAnswers.filter(a => a.isCorrect).length;
            const score = Math.round((correctAnswers / 30) * 100);
            
            // Analyser les erreurs par catégorie
            const errorsByCategory = {};
            this.quizAnswers.forEach(answer => {
                if (!answer.isCorrect) {
                    if (!errorsByCategory[answer.category]) {
                        errorsByCategory[answer.category] = 0;
                    }
                    errorsByCategory[answer.category]++;
                }
            });

            // Générer des conseils personnalisés
            const conseils = this.generatePersonalizedAdvice(score, errorsByCategory);

            this.quizResults = {
                score: score,
                correct: correctAnswers,
                total: 30,
                conseils: conseils,
                details: this.quizAnswers
            };

            this.currentView = 'quizResults';
        },

        // Générer des conseils personnalisés
        generatePersonalizedAdvice(score, errorsByCategory) {
            const conseils = [];

            if (score >= 80) {
                conseils.push("🏆 Excellent résultat ! Vous maîtrisez très bien les sujets de naturalisation.");
                conseils.push("📋 Vous êtes prêt(e) pour l'entretien officiel.");
            } else if (score >= 60) {
                conseils.push("📚 Bon travail ! Quelques révisions supplémentaires vous permettront d'atteindre l'excellence.");
            } else {
                conseils.push("💪 Ne vous découragez pas ! Continuez à réviser, vous progressez.");
                conseils.push("🎯 Concentrez-vous sur vos points faibles identifiés ci-dessous.");
            }

            // Conseils par catégorie d'erreurs
            const categoryNames = {
                'motivation': 'Motivation et Projet',
                'attaches': 'Attachement à la France',
                'parcours_personnel': 'Parcours Personnel',
                'valeurs_republicaines': 'Valeurs Républicaines',
                'langue': 'Langue Française',
                'culture': 'Culture Française',
                'histoire': 'Histoire de France',
                'institutions': 'Institutions'
            };

            Object.entries(errorsByCategory).forEach(([category, errors]) => {
                if (errors >= 3) {
                    conseils.push(`📖 Révisez en priorité : ${categoryNames[category] || category} (${errors} erreurs)`);
                }
            });

            if (Object.keys(errorsByCategory).length === 0) {
                conseils.push("🎯 Parfait ! Aucune catégorie n'a besoin de révisions particulières.");
            }

            return conseils;
        },

        // Fonction utilitaire pour mélanger un tableau
        shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        },

        // Navigation vers les différentes vues
        goToQuizResults() {
            this.currentView = 'quizResults';
        },

        // === FONCTIONS DE GESTION DES ACCÈS ===
        
        // Obtenir le statut d'accès pour l'affichage
        getQuizAccessStatus() {
            if (this.isPremium) {
                return {
                    type: 'premium',
                    message: '👑 Accès illimité',
                    canUse: true,
                    remaining: '∞'
                };
            }
            
            const remaining = this.quizAccess.maxDemoAllowed - this.quizAccess.totalDemoUsed;
            
            if (remaining > 0) {
                return {
                    type: 'demo',
                    message: `🎯 Démo (${remaining} restant${remaining > 1 ? 's' : ''})`,
                    canUse: true,
                    remaining: remaining
                };
            }
            
            return {
                type: 'limited',
                message: '🚫 Démo épuisée',
                canUse: false,
                remaining: 0
            };
        },

        // Réinitialiser la démo (pour les tests)
        resetDemo() {
            this.quizAccess.totalDemoUsed = 0;
            this.saveQuizAccess();
            alert('🔄 Démo réinitialisée pour les tests !');
        },

        // Obtenir les jours restants d'abonnement
        getDaysRemaining() {
            if (!this.isPremium || !this.quizAccess.premiumExpiryDate) {
                return 0;
            }
            
            const now = new Date();
            const expiryDate = new Date(this.quizAccess.premiumExpiryDate);
            const diffTime = expiryDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return Math.max(0, diffDays);
        }
    }));
});

// Chargement de l'application
document.addEventListener('DOMContentLoaded', () => {
    // Application ready
});