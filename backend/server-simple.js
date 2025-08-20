import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Données en mémoire pour stocker les sessions utilisateur
let userSessions = new Map();
let questionStats = new Map();

// Charger les questions depuis le fichier JSON
let allQuestions = [];

function loadQuestions() {
  try {
    const questionsPath = path.join(__dirname, '../questions-entretien.json');
    const data = fs.readFileSync(questionsPath, 'utf-8');
    const jsonData = JSON.parse(data);
    
    // Transformer les questions du format entretien vers le format fiches
    allQuestions = jsonData.entretien_naturalisation.map((q, index) => ({
      id: q.id || (index + 1),
      question: q.question,
      reponse: q.reponse, // Garder le champ reponse original
      explanation: q.reponse, // Pour compatibilité
      conseils: q.conseils, // Garder les conseils
      quiz_options: q.quiz_options, // Garder les options de quiz
      category: q.category || 'general',
      difficulty: q.difficulty || 'moyen',
      // Créer des options de réponse basées sur la question (pour compatibilité)
      options: generateOptionsForQuestion(q),
      correctAnswer: 0,
      tips: q.conseils || [],
      isOpenQuestion: true // Questions ouvertes pour l'entretien
    }));
    
    console.log(`✅ ${allQuestions.length} questions chargées depuis le fichier`);
  } catch (error) {
    console.error('❌ Erreur chargement questions:', error);
    
    // Questions de fallback si le fichier ne peut pas être lu
    allQuestions = [
      {
        id: 1,
        question: "Pourquoi voulez-vous devenir Français(e) ?",
        options: [
          "Pour les valeurs républicaines et l'attachement à la France",
          "Pour des raisons économiques uniquement", 
          "Par obligation familiale",
          "Pour faciliter les voyages"
        ],
        correctAnswer: 0,
        explanation: "Cette question évalue votre motivation sincère et votre adhésion aux valeurs françaises.",
        category: "motivation",
        difficulty: "difficile",
        isOpenQuestion: true
      },
      {
        id: 2,
        question: "Quelles sont les valeurs de la République française ?",
        options: [
          "Liberté, Égalité, Fraternité",
          "Liberté, Justice, Paix",
          "Égalité, Justice, Solidarité", 
          "Fraternité, Solidarité, Laïcité"
        ],
        correctAnswer: 0,
        explanation: "La devise de la République française est 'Liberté, Égalité, Fraternité'.",
        category: "institutions",
        difficulty: "facile"
      }
    ];
  }
}

// Générer des options pour les questions ouvertes
function generateOptionsForQuestion(question) {
  const q = question.question.toLowerCase();
  
  if (q.includes('pourquoi') || q.includes('motivation')) {
    return [
      "Adhésion aux valeurs républicaines françaises",
      "Raisons économiques uniquement",
      "Contrainte administrative",
      "Influence familiale"
    ];
  }
  
  if (q.includes('fréquence') || q.includes('combien')) {
    return [
      "Rarement, je vis principalement en France",
      "Très souvent, plusieurs fois par an",
      "Jamais, j'ai coupé tous les liens",
      "Seulement pour les urgences familiales"
    ];
  }
  
  if (q.includes('marié') || q.includes('conjoint')) {
    return [
      "Oui, avec un(e) français(e)",
      "Oui, avec un(e) étranger(ère)",
      "Non, je suis célibataire",
      "En couple mais pas marié(e)"
    ];
  }
  
  // Options génériques pour les autres questions
  return [
    "Réponse appropriée et détaillée",
    "Réponse insuffisante",
    "Réponse contradictoire", 
    "Pas de réponse"
  ];
}

// Routes API

// GET /api/questions - Récupérer toutes les questions ou filtrer
app.get('/api/questions', (req, res) => {
  try {
    const { category, difficulty, limit = 10, random = 'false' } = req.query;
    
    let filteredQuestions = [...allQuestions];
    
    // Filtrer par catégorie
    if (category && category !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => q.category === category);
    }
    
    // Filtrer par difficulté
    if (difficulty && difficulty !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === difficulty);
    }
    
    // Mélanger aléatoirement
    if (random === 'true') {
      filteredQuestions.sort(() => Math.random() - 0.5);
    }
    
    // Limiter le nombre
    const limitedQuestions = filteredQuestions.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      questions: limitedQuestions,
      total: filteredQuestions.length
    });
  } catch (error) {
    console.error('Erreur récupération questions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/quiz/questions - Alias pour les fiches (même logique que /api/questions)
app.get('/api/quiz/questions', (req, res) => {
  try {
    const { category, difficulty, limit = 200, random = 'false' } = req.query;
    
    let filteredQuestions = [...allQuestions];
    
    // Filtrer par catégorie
    if (category && category !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => q.category === category);
    }
    
    // Filtrer par difficulté
    if (difficulty && difficulty !== 'all') {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === difficulty);
    }
    
    // Mélanger aléatoirement
    if (random === 'true') {
      filteredQuestions.sort(() => Math.random() - 0.5);
    }
    
    // Pour les fiches, on retourne toutes les questions par défaut
    const limitedQuestions = filteredQuestions.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      questions: limitedQuestions,
      total: filteredQuestions.length
    });
  } catch (error) {
    console.error('Erreur récupération questions quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/quiz/start - Démarrer un nouveau quiz
app.post('/api/quiz/start', (req, res) => {
  try {
    const { sessionId, options = {} } = req.body;
    const { 
      questionCount = 10, 
      category = 'all', 
      difficulty = 'all',
      randomOrder = true 
    } = options;
    
    let quizQuestions = [...allQuestions];
    
    // Filtrer par catégorie
    if (category !== 'all') {
      quizQuestions = quizQuestions.filter(q => q.category === category);
    }
    
    // Filtrer par difficulté  
    if (difficulty !== 'all') {
      quizQuestions = quizQuestions.filter(q => q.difficulty === difficulty);
    }
    
    // Mélanger si demandé
    if (randomOrder) {
      quizQuestions.sort(() => Math.random() - 0.5);
    }
    
    // Limiter le nombre
    quizQuestions = quizQuestions.slice(0, questionCount);
    
    // Créer la session
    const quizSession = {
      id: sessionId || `quiz_${Date.now()}`,
      questions: quizQuestions,
      currentIndex: 0,
      answers: [],
      score: 0,
      startTime: new Date(),
      status: 'active'
    };
    
    userSessions.set(quizSession.id, quizSession);
    
    res.json({
      success: true,
      session: {
        id: quizSession.id,
        totalQuestions: quizQuestions.length,
        currentQuestion: quizQuestions[0] || null
      }
    });
  } catch (error) {
    console.error('Erreur démarrage quiz:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du démarrage du quiz'
    });
  }
});

// POST /api/quiz/answer - Soumettre une réponse
app.post('/api/quiz/answer', (req, res) => {
  try {
    const { sessionId, questionId, answer, timeSpent = 0 } = req.body;
    
    const session = userSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session non trouvée'
      });
    }
    
    const currentQuestion = session.questions[session.currentIndex];
    if (!currentQuestion || currentQuestion.id !== questionId) {
      return res.status(400).json({
        success: false,
        message: 'Question incorrecte'
      });
    }
    
    // Enregistrer la réponse
    const isCorrect = answer === currentQuestion.correctAnswer;
    const answerData = {
      questionId,
      answer,
      isCorrect,
      timeSpent,
      timestamp: new Date()
    };
    
    session.answers.push(answerData);
    if (isCorrect) session.score++;
    
    // Mettre à jour les statistiques
    updateQuestionStats(questionId, isCorrect);
    
    // Passer à la question suivante
    session.currentIndex++;
    const nextQuestion = session.questions[session.currentIndex];
    
    // Vérifier si le quiz est terminé
    if (!nextQuestion) {
      session.status = 'completed';
      session.endTime = new Date();
      
      return res.json({
        success: true,
        isCorrect,
        explanation: currentQuestion.explanation,
        completed: true,
        results: {
          score: session.score,
          total: session.questions.length,
          percentage: Math.round((session.score / session.questions.length) * 100),
          timeSpent: session.endTime - session.startTime
        }
      });
    }
    
    res.json({
      success: true,
      isCorrect,
      explanation: currentQuestion.explanation,
      completed: false,
      nextQuestion
    });
    
  } catch (error) {
    console.error('Erreur soumission réponse:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la soumission'
    });
  }
});

// GET /api/quiz/session/:id - Récupérer l'état d'une session
app.get('/api/quiz/session/:id', (req, res) => {
  try {
    const session = userSessions.get(req.params.id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session non trouvée'
      });
    }
    
    res.json({
      success: true,
      session: {
        id: session.id,
        currentIndex: session.currentIndex,
        totalQuestions: session.questions.length,
        score: session.score,
        status: session.status,
        currentQuestion: session.questions[session.currentIndex] || null
      }
    });
  } catch (error) {
    console.error('Erreur récupération session:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// GET /api/stats - Statistiques globales
app.get('/api/stats', (req, res) => {
  try {
    const categories = [...new Set(allQuestions.map(q => q.category))];
    const difficulties = ['facile', 'moyen', 'difficile'];
    
    const stats = {
      totalQuestions: allQuestions.length,
      categories: categories.map(cat => ({
        name: cat,
        count: allQuestions.filter(q => q.category === cat).length
      })),
      difficulties: difficulties.map(diff => ({
        name: diff,
        count: allQuestions.filter(q => q.difficulty === diff).length
      })),
      totalSessions: userSessions.size,
      questionStats: Array.from(questionStats.entries()).map(([id, stats]) => ({
        questionId: id,
        ...stats
      }))
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Erreur statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// POST /api/progress - Sauvegarder les progrès (en mémoire)
app.post('/api/progress', (req, res) => {
  try {
    const { userId = 'user', progress } = req.body;
    
    // Simuler la sauvegarde des progrès
    const userProgress = {
      userId,
      ...progress,
      lastUpdated: new Date()
    };
    
    // Ici on pourrait sauvegarder dans une vraie base de données
    console.log('Progrès sauvegardés:', userProgress);
    
    res.json({
      success: true,
      message: 'Progrès sauvegardés'
    });
  } catch (error) {
    console.error('Erreur sauvegarde progrès:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// Fonction utilitaire pour mettre à jour les stats des questions
function updateQuestionStats(questionId, isCorrect) {
  if (!questionStats.has(questionId)) {
    questionStats.set(questionId, {
      totalAnswers: 0,
      correctAnswers: 0,
      accuracy: 0
    });
  }
  
  const stats = questionStats.get(questionId);
  stats.totalAnswers++;
  if (isCorrect) stats.correctAnswers++;
  stats.accuracy = Math.round((stats.correctAnswers / stats.totalAnswers) * 100);
  
  questionStats.set(questionId, stats);
}

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur'
  });
});

// Route 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée'
  });
});

// Démarrage du serveur
function startServer() {
  loadQuestions();
  
  app.listen(PORT, () => {
    console.log('🚀 ========================================');
    console.log(`🌟 Serveur NaturalizeMe démarré sur le port ${PORT}`);
    console.log(`📚 ${allQuestions.length} questions chargées`);
    console.log(`🌐 API disponible sur http://localhost:${PORT}`);
    console.log('🚀 ========================================');
  });
}

startServer();

export default app;
