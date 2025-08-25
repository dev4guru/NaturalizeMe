// Configuration Supabase pour NaturalizeMe
// Import depuis CDN pour environnement de développement
// En production, utilisez une version installée via npm

// ⚠️ REMPLACEZ CES VALEURS PAR VOS VRAIES CLÉS SUPABASE ⚠️
// Récupérez-les dans Settings > API de votre projet Supabase
const supabaseUrl = 'https://bqdtkqmorosuytcgrnpz.supabase.co'  // Ex: https://xxxxx.supabase.co
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZHRrcW1vcm9zdXl0Y2dybnB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3Nzc5NTEsImV4cCI6MjA3MTM1Mzk1MX0._uQPhOB0XaozxHWi-oqI60KRCOd8XehnzmMWfjd7EDY'     // Ex: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Client Supabase singleton
let _supabaseClient = null;

// Fonction pour obtenir le client (crée une seule fois)
const getSupabaseClient = () => {
    if (!_supabaseClient && window.supabase) {
        _supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true
            }
        });
        console.log('🔐 Client Supabase initialisé (singleton)');
    }
    return _supabaseClient;
};

// Export du client
export const supabase = new Proxy({}, {
    get(target, prop) {
        const client = getSupabaseClient();
        if (client && prop in client) {
            return typeof client[prop] === 'function' 
                ? client[prop].bind(client) 
                : client[prop];
        }
        return undefined;
    }
});

// Configuration des tables
export const TABLES = {
    USERS: 'users',
    QUIZ_ACCESS: 'quiz_access'
}

// Schéma des tables (pour référence)
export const SCHEMAS = {
    users: {
        id: 'UUID PRIMARY KEY',
        email: 'TEXT UNIQUE NOT NULL',
        name: 'TEXT NOT NULL',
        created_at: 'TIMESTAMP DEFAULT NOW()',
        updated_at: 'TIMESTAMP DEFAULT NOW()',
        is_premium: 'BOOLEAN DEFAULT false',
        premium_expires_at: 'TIMESTAMP'
    },
    quiz_access: {
        id: 'UUID PRIMARY KEY',
        user_id: 'UUID REFERENCES users(id)',
        demo_used_count: 'INTEGER DEFAULT 0',
        max_demo_allowed: 'INTEGER DEFAULT 1',
        created_at: 'TIMESTAMP DEFAULT NOW()',
        updated_at: 'TIMESTAMP DEFAULT NOW()'
    }
}

// Initialisation du client au chargement
if (typeof window !== 'undefined') {
    // Variable globale pour éviter les multiples initialisations
    window._supabaseInitialized = window._supabaseInitialized || false;
    
    // S'assurer que Supabase est disponible
    const initClient = () => {
        if (window.supabase && !_supabaseClient && !window._supabaseInitialized) {
            window._supabaseInitialized = true;
            getSupabaseClient();
        }
    };
    
    // Essayer immédiatement si déjà disponible
    if (window.supabase && !window._supabaseInitialized) {
        initClient();
    } else if (!window._supabaseInitialized) {
        // Sinon attendre que le script soit chargé
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initClient, 50);
        });
    }
}
