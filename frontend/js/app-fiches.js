// Application NaturalizeMe - Système de Fiches
const API_BASE_URL = 'http://localhost:3001/api';

// Initialisation Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('app', () => ({
        // État de l'application
        currentView: 'home',
        isLoading: false,
        
        // Données des fiches
        questions: [],
        currentCardIndex: 0,
        showAnswer: false,
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
            this.showAnswer = false;
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
            this.showAnswer = false;
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
                this.showAnswer = false;
                this.userProgress.cardsViewed++;
                this.saveUserProgress();
            }
        },

        previousCard() {
            if (this.currentCardIndex > 0) {
                this.currentCardIndex--;
                this.showAnswer = false;
            }
        },

        // Afficher/Masquer la réponse
        toggleAnswer() {
            this.showAnswer = !this.showAnswer;
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
            this.showAnswer = false;
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
        }
    }));
});

// Chargement de l'application
document.addEventListener('DOMContentLoaded', () => {
    // Application ready
});