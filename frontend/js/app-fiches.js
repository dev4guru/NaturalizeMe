// Application NaturalizeMe - Système de Fiches
const API_BASE_URL = 'http://localhost:3001/api';

// Import du service Supabase
import { userDataService } from './user-data-service.js';
import { supabase } from './supabase-client.js';

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

        // Premium et Quiz
        isPremium: false,
        showSubscription: false,
        preRegisterEmail: '',
        
        // === SYSTÈME D'AUTHENTIFICATION UTILISATEUR ===
        userProfile: {
            id: null,
            email: null,
            name: null,
            registeredAt: null,
            isAuthenticated: false,
            visitCount: 0,
            lastVisit: null
        },
        
        // Modal d'authentification
        showAuthModal: false,
        authStep: 'welcome', // 'welcome', 'register', 'login'
        
        // Formulaires d'identification
        registerForm: {
            name: '',
            email: '',
            agreeTerms: false
            // Pas de champ password, mot de passe unique utilisé
        },
        loginForm: {
            email: ''
            // Pas de champ password, mot de passe unique utilisé
        },
        
        // === SYSTÈME DE NOTIFICATIONS ===
    // Système de messages modaux
    modalMessage: null, // { type, message }
    showModal: false,
        
        // Gestion des accès quiz
        hasUsedDemo: false,
        quizAccess: {
            totalDemoUsed: 0,
            maxDemoAllowed: 1,
            premiumSubscriptionDate: null,
            premiumExpiryDate: null,
            userType: 'anonymous' // 'anonymous', 'authenticated', 'premium'
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
            await this.initializeUser(); // Initialiser l'utilisateur avec Supabase
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
                this.showError('Erreur lors du chargement des questions\n\n' + error.message);
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

        // === SYSTÈME D'AUTHENTIFICATION AVEC SUPABASE ===
        
        // Initialiser l'utilisateur
        async initializeUser() {
            try {
                // Vérifier si un utilisateur est déjà connecté
                const user = await userDataService.getCurrentUser();
                
                if (user) {
                    // Utilisateur connecté, charger son profil
                    await this.loadUserProfileFromSupabase();
                    await this.loadQuizProgressFromSupabase();
                    
                    // Note: Incrémentation des visites supprimée pour simplifier
                } else {
                    // Pas d'utilisateur connecté, vérifier s'il y a des données localStorage à migrer
                    await this.checkLocalStorageMigration();
                }
            } catch (error) {
                console.info('Erreur initialisation utilisateur:', error);
                this.showError('Erreur de connexion à la base de données');
            }
        },
        
        // Charger le profil utilisateur depuis Supabase
        async loadUserProfileFromSupabase() {
            try {
                const profile = await userDataService.getUserProfile();
                if (profile) {
                    console.log('✅ Profil utilisateur trouvé:', profile);
                    this.userProfile = {
                        id: profile.id,
                        email: profile.email,
                        name: profile.name,
                        isAuthenticated: true,
                        visitCount: 0, // Simplifié - compteur non utilisé
                        lastVisit: null, // Simplifié - non utilisé
                        isPremium: profile.is_premium || false,
                        premiumExpiryDate: profile.premium_expires_at
                    };
                } else {
                    console.log('⚠️ Profil non trouvé, mais utilisateur authentifié');
                    // Ne pas créer automatiquement le profil ni l'accès quiz
                    // Utiliser les données de auth.users uniquement
                    const currentUser = await userDataService.getCurrentUser();
                    if (currentUser) {
                        this.userProfile = {
                            id: currentUser.id,
                            email: currentUser.email,
                            name: currentUser.user_metadata?.name || currentUser.email.split('@')[0],
                            isAuthenticated: true,
                            visitCount: 0,
                            lastVisit: null,
                            isPremium: false,
                            premiumExpiryDate: null
                        };
                        console.log('✅ Profil configuré (auth.users uniquement):', this.userProfile);
                    }
                }
            } catch (error) {
                console.info('Erreur chargement profil Supabase:', error);
                // En cas d'erreur, vérifier si on a quand même un utilisateur authentifié
                const currentUser = await userDataService.getCurrentUser();
                if (currentUser) {
                    this.userProfile = {
                        id: currentUser.id,
                        email: currentUser.email,
                        name: currentUser.user_metadata?.name || currentUser.email,
                        isAuthenticated: true,
                        visitCount: 0,
                        lastVisit: null,
                        isPremium: false,
                        premiumExpiryDate: null
                    };
                    console.log('✅ Profil créé malgré l\'erreur:', this.userProfile);
                }
            }
        },
        
        // Charger la progression quiz depuis Supabase
        async loadQuizProgressFromSupabase() {
            try {
                const profile = await userDataService.getUserProfile();
                const access = await userDataService.getQuizAccess(profile.id);
                if (access) {
                    this.quizAccess = {
                        totalDemoUsed: access.demo_used_count,
                        maxDemoAllowed: access.max_demo_allowed,
                        userType: this.userProfile.isPremium ? 'premium' : 'authenticated'
                    };
                    console.log('✅ Quiz access chargé:', this.quizAccess);
                } else {
                    // Si pas d'accès, utiliser des valeurs par défaut sans créer d'accès quiz
                    console.log('⚠️ Pas d\'accès quiz trouvé, valeurs par défaut utilisées');
                    this.quizAccess = {
                        totalDemoUsed: 0,
                        maxDemoAllowed: 1,
                        userType: 'authenticated'
                    };
                }
            } catch (error) {
                console.info('Erreur chargement accès quiz:', error);
                // En cas d'erreur, initialiser avec des valeurs par défaut
                this.quizAccess = {
                    totalDemoUsed: 0,
                    maxDemoAllowed: 1,
                    userType: 'authenticated'
                };
            }
        },
        
        // Vérifier s'il faut migrer des données du localStorage
        async checkLocalStorageMigration() {
            const localProfile = localStorage.getItem('naturalizeme-user-profile');
            if (localProfile) {
                // Il y a des données locales, proposer de les migrer
                const shouldMigrate = confirm('Des données locales ont été trouvées. Voulez-vous créer un compte pour les sauvegarder ?');
                if (shouldMigrate) {
                    this.showAuthentication();
                }
            }
        },
        
        // Afficher la modal d'authentification
        showAuthentication() {
            this.showAuthModal = true;
            this.authStep = 'welcome';
        },
        
        // Fermer la modal d'authentification
        closeAuthModal() {
            this.showAuthModal = false;
            this.resetAuthForms();
        },
        
        // Réinitialiser les formulaires
        resetAuthForms() {
            this.registerForm = { name: '', email: '', agreeTerms: false };
            this.loginForm = { email: '' };
        },
        
        // Aller à l'étape d'inscription
        goToRegister() {
            this.authStep = 'register';
            this.resetAuthForms();
        },
        
        // Aller à l'étape de connexion
        goToLogin() {
            this.authStep = 'login';
            this.resetAuthForms();
        },
        
        // Créer un compte utilisateur avec Supabase
        async createAccount() {
            // Validation
            if (!this.registerForm.name.trim()) {
                this.showWarning('Veuillez saisir votre nom');
                return;
            }
            
            if (!this.isValidEmail(this.registerForm.email)) {
                this.showWarning('Veuillez saisir un email valide');
                return;
            }
            
            if (!this.registerForm.agreeTerms) {
                this.showWarning('Veuillez accepter les conditions d\'utilisation');
                return;
            }
            
            try {
                // Vérifier d'abord si l'email existe déjà
                const emailExists = await userDataService.checkEmailExists(this.registerForm.email.toLowerCase().trim());

                if (emailExists) {
                    this.showWarning('Cet email est déjà utilisé\n\nRedirection vers la connexion...');
                    setTimeout(() => {
                        this.loginForm.email = this.registerForm.email;
                        this.goToLogin();
                    }, 2000);
                    return;
                }

                // Créer le compte avec Supabase
                const result = await userDataService.signUp(
                    this.registerForm.email.toLowerCase().trim(),
                    this.registerForm.name.trim(),
                    'naturalizeme2025!'
                );

                if (result.success) {
                    // Si l'email n'est pas confirmé, ne pas créer le profil en base
                    if (result.user && !result.user.confirmed_at) {
                        this.showInfo('Un email de confirmation vient de vous être envoyé. Veuillez cliquer sur le lien reçu pour activer votre compte.\n\nVotre profil sera créé après confirmation.');
                        this.closeAuthModal();
                        return;
                    }
                    // Email déjà confirmé (cas rare, ex: test local)
                    console.log('✅ Compte créé avec succès:', result);
                    await userDataService.migrateFromLocalStorage();
                    await this.loadUserProfileFromSupabase();
                    await this.loadQuizProgressFromSupabase();
                    console.log('État après chargement:');
                    console.log('- isAuthenticated:', this.userProfile.isAuthenticated);
                    console.log('- quizAccess:', this.quizAccess);
                    this.closeAuthModal();
                    this.showSuccess('Compte créé avec succès ! Bienvenue dans NaturalizeMe !');
                    this.showSuccess(`Bienvenue ${this.userProfile.name} !\n\nCompte créé avec succès\nVous avez droit à 1 quiz démo gratuit !`, 6000);
                } else {
                    if (result.error && result.error.includes('already registered')) {
                        this.showWarning('Cet email est déjà utilisé\n\nRedirection vers la connexion...');
                        setTimeout(() => {
                            this.loginForm.email = this.registerForm.email;
                            this.goToLogin();
                        }, 2000);
                    } else {
                        this.showError('Erreur lors de la création du compte\n\n' + result.error);
                    }
                }
            } catch (error) {
                console.info('Erreur création compte:', error);
                this.showError('Erreur de connexion à la base de données');
            }
        },
        
        // Se connecter avec un email existant
        async loginWithEmail() {
            if (!this.isValidEmail(this.loginForm.email)) {
                this.showWarning('Veuillez saisir un email valide');
                return;
            }

            const email = this.loginForm.email.toLowerCase().trim();
            try {
                // Tentative de connexion avec Supabase
                const result = await userDataService.signIn(email, 'naturalizeme2025!');
                if (result.success) {
                    // Vérifier si l'utilisateur existe dans la base (table public.users)
                    const existsInBase = await userDataService.checkEmailExists(email);
                    if (!existsInBase) {
                        this.showWarning("Votre compte n'existe pas encore dans la base. Veuillez créer un compte.");
                        this.registerForm.email = email;
                        this.goToRegister();
                        return;
                    }
                    // Charger le profil utilisateur
                    await this.loadUserProfileFromSupabase();
                    await this.loadQuizProgressFromSupabase();
                    this.closeAuthModal();
                    this.showSuccess(`Bon retour ${this.userProfile.name || 'utilisateur'} !\n\nConnexion réussie`, 5000);
                } else {
                    this.showWarning(`Connexion échouée\n\n${result.error}`);
                    this.registerForm.email = email;
                    this.goToRegister();
                }
            } catch (error) {
                this.showError('Erreur de connexion\n\nVeuillez réessayer');
            }
        },
        
        // Déconnexion
        async logout() {
            try {
                // Déconnexion via Supabase
                const result = await userDataService.signOut();
                if (result.success) {
                    // Réinitialiser l'état local
                    this.userProfile.isAuthenticated = false;
                    this.userProfile.id = null;
                    this.userProfile.email = null;
                    this.userProfile.name = null;
                    this.quizAccess.userType = 'anonymous';
                    this.isPremium = false;
                    this.showSuccess('À bientôt ! Vous êtes maintenant déconnecté(e)');
                    this.currentView = 'home';
                } else {
                    this.showError('Erreur lors de la déconnexion');
                }
            } catch (error) {
                // Forcer la déconnexion locale même en cas d'erreur
                this.userProfile.isAuthenticated = false;
                this.userProfile.id = null;
                this.userProfile.email = null;
                this.userProfile.name = null;
                this.quizAccess.userType = 'anonymous';
                this.isPremium = false;
                this.currentView = 'home';
            }
        },
        
        // Validation d'email
        isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },

        // === SYSTÈME DE NOTIFICATIONS ===
        
        // Afficher un message modal
        showModalMessage(message, type = 'info') {
            this.modalMessage = { type, message };
            this.showModal = true;
        },
        closeModalMessage() {
            this.showModal = false;
            this.modalMessage = null;
        },
        showSuccess(message) {
            this.showModalMessage(message, 'success');
        },
        showError(message) {
            this.showModalMessage(message, 'error');
        },
        showWarning(message) {
            this.showModalMessage(message, 'warning');
        },
        showInfo(message) {
            this.showModalMessage(message, 'info');
        },

        // === CONTRÔLE D'ACCÈS QUIZ ===
        
        // Vérifier l'accès au quiz
        checkQuizAccess() {
            // Si pas authentifié, demander l'authentification
            if (!this.userProfile.isAuthenticated) {
                this.showWarning('Authentification requise\n\nPour accéder au quiz, veuillez créer un compte ou vous connecter');
                this.showAuthentication();
                return false;
            }
            
            // Si démo déjà utilisée et pas premium
            if (this.quizAccess.totalDemoUsed >= this.quizAccess.maxDemoAllowed && !this.isPremium) {
                console.log('❌ Démo déjà utilisée et pas premium');
                this.showQuizUpgrade();
                return false;
            }
            
            console.log('✅ Accès au quiz autorisé');
            return true;
        },
        
        // Démarrer le quiz démo
        async startDemoQuiz() {
            if (!this.checkQuizAccess()) {
                return;
            }
            // Démarrage direct du quiz démo avec notification
            this.showInfo('Démarrage du quiz démo...\n\n30 questions chronométrées\nAttention : Un seul essai gratuit !');
            try {
                // Marquer la démo comme utilisée en base de données (Supabase uniquement)
                await userDataService.incrementDemoUsage();
                // Recharger l'accès quiz depuis Supabase pour garantir la synchro
                const profile = await userDataService.getUserProfile();
                const access = await userDataService.getQuizAccess(profile.id);
                if (access) {
                    this.quizAccess.totalDemoUsed = access.demo_used_count;
                    this.quizAccess.maxDemoAllowed = access.max_demo_allowed;
                }
                this.hasUsedDemo = true;
            } catch (error) {
                // En cas d'erreur, ne pas incrémenter localement
            }
            // Démarrer le quiz
            this.currentView = 'premiumQuiz';
            this.loadQuizQuestions();
            this.startQuizTimer();
            this.showSuccess(`Quiz démo démarré !\n\nBonne chance ${this.userProfile.name || 'candidat'} !`);
        },
        
        // Afficher la proposition d'upgrade
        showQuizUpgrade() {
            this.showWarning('Quiz démo épuisé !\n\nVous avez utilisé votre essai gratuit.\nVersion Premium disponible : Quiz illimités pour 9,99€/mois', 6000);
            
            // Afficher le modal d'abonnement après un délai
            setTimeout(() => {
                this.showSubscription = true;
            }, 2000);
        },

        // === FONCTIONS QUIZ ===
        
        // Charger les questions du quiz
        async loadQuizQuestions() {
            try {
                // Sélectionner 30 questions aléatoires
                const shuffled = this.shuffleArray([...this.questions]);
                this.quizQuestions = shuffled.slice(0, 30).map((q, index) => ({
                    ...q,
                    questionNumber: index + 1
                }));
                
                this.currentQuizIndex = 0;
                this.quizProgress = { current: 1, total: 30 };
                this.quizAnswers = [];
                this.selectedAnswer = null;
                
            } catch (error) {
                this.showError('Erreur lors du chargement du quiz\n\n' + error.message);
            }
        },

        // Démarrer le timer du quiz
        startQuizTimer() {
            this.timeLeft = 30 * 60; // 30 minutes en secondes
            
            this.quizTimer = setInterval(() => {
                this.timeLeft--;
                
                if (this.timeLeft <= 0) {
                    this.finishQuiz();
                }
            }, 1000);
        },

        // Format du temps restant
        get formattedTime() {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        },

        // Sélectionner une réponse
        selectAnswer(answer) {
            this.selectedAnswer = answer;
        },

        // Question suivante
        nextQuizQuestion() {
            if (!this.selectedAnswer) {
                this.showWarning('Veuillez sélectionner une réponse avant de continuer');
                return;
            }

            // Enregistrer la réponse
            this.quizAnswers[this.currentQuizIndex] = {
                questionId: this.quizQuestions[this.currentQuizIndex].id,
                selectedAnswer: this.selectedAnswer,
                correctAnswer: this.quizQuestions[this.currentQuizIndex].reponse,
                isCorrect: this.selectedAnswer === this.quizQuestions[this.currentQuizIndex].reponse,
                category: this.quizQuestions[this.currentQuizIndex].category
            };

            // Passer à la question suivante ou terminer
            if (this.currentQuizIndex < this.quizQuestions.length - 1) {
                this.currentQuizIndex++;
                this.quizProgress.current = this.currentQuizIndex + 1;
                this.selectedAnswer = null;
            } else {
                this.finishQuiz();
            }
        },

        // Terminer le quiz
        finishQuiz() {
            if (this.quizTimer) {
                clearInterval(this.quizTimer);
                this.quizTimer = null;
            }

            this.calculateQuizResults();
            this.currentView = 'quiz-results';
        },

        // Calculer les résultats
        calculateQuizResults() {
            const correct = this.quizAnswers.filter(a => a.isCorrect).length;
            const total = this.quizAnswers.length;
            const score = Math.round((correct / total) * 100);

            // Analyser les erreurs par catégorie
            const errorsByCategory = {};
            this.quizAnswers.forEach(answer => {
                if (!answer.isCorrect) {
                    errorsByCategory[answer.category] = (errorsByCategory[answer.category] || 0) + 1;
                }
            });

            this.quizResults = {
                score: score,
                correct: correct,
                total: total,
                conseils: this.generatePersonalizedAdvice(score, errorsByCategory)
            };
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
            const newArray = [...array];
            for (let i = newArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
            }
            return newArray;
        },

        // Démarrer le quiz premium
        startPremiumQuiz() {
            if (!this.isPremium && this.quizAccess.totalDemoUsed >= this.quizAccess.maxDemoAllowed) {
                this.showQuizUpgrade();
                return;
            }

            this.currentView = 'premium-quiz';
            this.loadQuizQuestions();
            this.startQuizTimer();
        },

        // Afficher le modal d'abonnement
        showPremiumModal() {
            this.showSubscription = true;
        },

        // === GESTION DES FICHES ===
        
        // Démarrer l'étude des fiches
        startStudying() {
            this.goToCards();
            this.currentCardIndex = 0;
        },

        // Sélection de catégorie
        selectCategory(categoryId) {
            this.selectedCategory = categoryId;
            this.filterQuestions();
        },

        // Mettre à jour le nombre de questions par catégorie
        updateCategoryCounts() {
            this.categories.forEach(cat => {
                if (cat.id === 'all') {
                    cat.count = this.questions.length;
                } else {
                    cat.count = this.questions.filter(q => q.category === cat.id).length;
                }
            });
        },

        // Navigation des fiches
        nextCard() {
            if (this.currentCardIndex < this.filteredQuestions.length - 1) {
                this.currentCardIndex++;
            }
        },

        prevCard() {
            if (this.currentCardIndex > 0) {
                this.currentCardIndex--;
            }
        },

        randomCard() {
            if (this.filteredQuestions.length > 1) {
                let newIndex;
                do {
                    newIndex = Math.floor(Math.random() * this.filteredQuestions.length);
                } while (newIndex === this.currentCardIndex);
            }
            try {
                this.isPremium = localStorage.getItem('naturalizeme-premium') === 'true';
                this.loadQuizAccess();
            } catch (error) {
                console.info('Erreur chargement premium:', error);
            }
        },

        // Charger les accès quiz
        loadQuizAccess() {
            try {
                const saved = localStorage.getItem('naturalizeme-quiz-access');
                if (saved) {
                    this.quizAccess = { ...this.quizAccess, ...JSON.parse(saved) };
                }
                
                // Vérifier si l'utilisateur a déjà utilisé sa démo
                this.hasUsedDemo = this.quizAccess.totalDemoUsed >= this.quizAccess.maxDemoAllowed;
            } catch (error) {
                console.info('Erreur chargement accès quiz:', error);
            }
        },

        // Sauvegarder les accès quiz
        saveQuizAccess() {
            try {
                localStorage.setItem('naturalizeme-quiz-access', JSON.stringify(this.quizAccess));
            } catch (error) {
                console.info('Erreur sauvegarde accès quiz:', error);
            }
        },

        // Fonction pour enregistrer l'email de pré-inscription
        submitPreRegistration() {
            if (!this.preRegisterEmail || !this.isValidEmail(this.preRegisterEmail)) {
                this.showError('Veuillez saisir un email valide');
                return;
            }

            // Simuler l'enregistrement
            this.showSuccess('Merci ! Vous serez notifié dès le lancement de la version complète.');
            
            // Sauvegarder l'email
            localStorage.setItem('naturalizeme-preregister-email', this.preRegisterEmail);
            
            this.showSubscription = false;
        },

        // === FONCTIONS D'ACCÈS QUIZ ===
        
        // Obtenir le statut d'accès au quiz
        getQuizAccessStatus() {
            if (this.isPremium) {
                return {
                    canUse: true,
                    status: 'premium',
                    message: 'Accès illimité'
                };
            }
            
            if (!this.userProfile.isAuthenticated) {
                return {
                    canUse: false,
                    status: 'not-authenticated',
                    message: 'Authentification requise'
                };
            }
            
            if (this.quizAccess.totalDemoUsed >= this.quizAccess.maxDemoAllowed) {
                return {
                    canUse: false,
                    status: 'demo-used',
                    message: 'Démo épuisée - Abonnement requis'
                };
            }
            
            return {
                canUse: true,
                status: 'demo-available',
                message: '1 quiz démo disponible'
            };
        },

        // === GESTION DES FICHES ===
        
        // Démarrer l'étude des fiches
        startStudying() {
            this.goToCards();
            this.currentCardIndex = 0;
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
            }
        },

        previousCard() {
            if (this.currentCardIndex > 0) {
                this.currentCardIndex--;
            }
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

        // Formatage
        formatCategoryName(categoryId) {
            const category = this.categories.find(cat => cat.id === categoryId);
            return category ? category.name : 'Catégorie inconnue';
        },

        formatCardNumber() {
            return `${this.currentCardIndex + 1}/${this.filteredQuestions.length}`;
        },

        // Gestion du progrès utilisateur
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
            
            this.showSuccess('Félicitations ! Votre abonnement Premium est activé (mode démo - 30 jours)\n\nQuiz illimité activé !');
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
                this.showError('Veuillez saisir un email valide');
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
            
            this.showSuccess('Merci ! Vous serez notifié dès le lancement du Premium Quiz.\n\nEn attendant, profitez du mode démo gratuit !');
            
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
                    console.info('Erreur lors du chargement des accès quiz:', error);
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
                    this.showWarning('Votre abonnement Premium a expiré. Renouvelez pour continuer à profiter du Quiz Premium illimité.');
                }
            }
        },

        // Sauvegarder les accès quiz
        saveQuizAccess() {
            try {
                localStorage.setItem('naturalizeme-quiz-access', JSON.stringify(this.quizAccess));
            } catch (error) {
                console.info('Erreur lors de la sauvegarde des accès quiz:', error);
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
                this.showError('Pas assez de questions avec options disponibles pour le quiz premium.');
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
                this.showError('Démo épuisée !\n\n' +
                      'Vous avez utilisé votre quiz démo gratuit.\n' +
                      'Abonnez-vous pour un accès illimité au Quiz Premium !\n\n' +
                      'Quiz illimité • Analyses détaillées • Conseils personnalisés');
                
                this.showSubscription = true;
            } else {
                this.showWarning(`Quiz démo limité !\n\nIl vous reste ${remaining} utilisation${remaining > 1 ? 's' : ''} de la démo.\n\nAbonnez-vous pour un accès illimité !`);
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
            this.showInfo('Démo réinitialisée pour les tests !');
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