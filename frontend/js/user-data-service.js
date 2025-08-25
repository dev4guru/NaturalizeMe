// Service de gestion des données utilisateur avec Supabase
import { supabase, TABLES } from './supabase-client.js'

export class UserDataService {
    constructor() {
        this.currentUser = null
        this.currentSession = null
    }

    // ===== AUTHENTIFICATION =====

    async checkEmailExists(email) {
        try {
            // Vérifier dans la table public.users
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .select('email')
                .eq('email', email.toLowerCase().trim())
                .limit(1)

            if (error && error.code !== 'PGRST116') {
                console.info('Erreur vérification email:', error)
                return false
            }
            
            return data && data.length > 0
        } catch (error) {
            console.info('Erreur vérification email:', error)
            return false
        }
    }

    async signUp(email, name, password = null) {
        try {
            // Pour l'instant, on utilise un système sans mot de passe
            // On va créer un utilisateur avec un mot de passe temporaire
            const tempPassword = password || this.generateTempPassword()
            
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: tempPassword,
                options: {
                    data: {
                        name: name
                    }
                }
            })

            if (error) {
                // Si l'utilisateur existe déjà dans auth, retourner une erreur spécifique
                if (error.message.includes('already registered')) {
                    console.log('Utilisateur existe déjà dans auth.users');
                    return { 
                        success: false, 
                        error: 'already registered',
                        message: 'Cet email est déjà utilisé. Veuillez vous connecter.'
                    };
                }
                throw error;
            }

            // Créer le profil utilisateur dans notre table
            if (data.user) {
                try {
                    await this.createUserProfile(data.user.id, email, name)
                } catch (profileError) {
                    // Si le profil existe déjà, c'est OK
                    if (profileError.code === '23505') {
                        console.log('Profil utilisateur existe déjà, continuons...');
                    } else {
                        throw profileError;
                    }
                }
                this.currentUser = data.user
            }

            return { success: true, user: data.user }
        } catch (error) {
            console.info('Erreur inscription:', error)
            
            // Si c'est une erreur de doublon, essayer la connexion
            if (error.code === '23505' && error.message.includes('email')) {
                console.log('Email existe déjà, tentative de connexion...');
                return await this.signIn(email);
            }
            
            return { success: false, error: error.message || error }
        }
    }

    async signIn(email, password = null) {
        try {
            // Pour l'instant, utiliser le mot de passe temporaire
            const tempPassword = password || this.generateTempPassword()

            console.log('🔐 Tentative de connexion Supabase pour:', email);
            console.log('🔑 Mot de passe utilisé:', tempPassword);

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: tempPassword
            })

            if (error) {
                // Gestion des erreurs courantes
                if (error.message === 'Invalid login credentials') {
                    return { success: false, error: "Impossible de se connecter avec cet email. Veuillez vérifier que votre compte existe ou en créer un." }
                }
                if (error.message === 'Email not confirmed') {
                    return { success: false, error: 'Votre email n\'est pas confirmé. Veuillez vérifier votre boîte mail et cliquer sur le lien de confirmation.' }
                }
                // Autres erreurs : log minimal
                console.warn('Erreur authentification Supabase:', error.message);
                return { success: false, error: error.message || error }
            }

            // Log minimal en cas de succès
            // console.log('✅ Authentification Supabase réussie:', data);

            this.currentUser = data.user
            this.currentSession = data.session

            // ...aucune synchronisation automatique du profil...

            return { success: true, user: data.user }
        } catch (error) {
            console.info('❌ Erreur connexion complète:', error)
            return { success: false, error: error.message || error }
        }
    }

    async signOut() {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error

            this.currentUser = null
            this.currentSession = null
            
            return { success: true }
        } catch (error) {
            console.info('Erreur déconnexion:', error)
            return { success: false, error: error.message }
        }
    }

    async getCurrentUser() {
        try {
            // Vérifie d'abord la session locale
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) {
                console.warn('Erreur récupération session Supabase:', sessionError);
            }
            if (session && session.user) {
                this.currentUser = session.user;
                this.currentSession = session;
                return session.user;
            }
            // Fallback : tente de récupérer l'utilisateur
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                console.info('Erreur récupération utilisateur:', error);
                return null;
            }
            this.currentUser = user;
            return user;
        } catch (error) {
            console.info('Erreur récupération utilisateur:', error);
            return null;
        }
    }

    // ===== GESTION DU PROFIL =====

    async createUserProfile(userId, email, name) {
        try {
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .insert({
                    id: userId,
                    email: email,
                    name: name
                })
                .select()

            if (error && error.code !== '23505') throw error;
            // Si doublon, le profil existe déjà, on continue

            // Créer aussi l'accès quiz
            await this.createQuizAccess(userId)

            return data ? data[0] : null;
        } catch (error) {
            console.info('Erreur création profil:', error)
            if (error.code === '23505') {
                // Profil existe déjà, continuer
                await this.createQuizAccess(userId);
                return null;
            }
            throw error;
        }
    }

    async getUserProfile(userId = null) {
        try {
            const email = this.currentUser?.email
            console.log('[getUserProfile] email utilisé:', email)
            if (!email) throw new Error('Utilisateur non connecté')

            // Recherche uniquement par email
            const { data, error } = await supabase
                .from(TABLES.USERS)
                .select('*')
                .eq('email', email.toLowerCase().trim())

            console.log('[getUserProfile] Résultat Supabase (email):', { data, error })
            if (error) {
                console.info('[getUserProfile] Erreur Supabase (email):', error)
                throw error
            }
            if (data && data.length > 0) {
                console.log('[getUserProfile] Profil trouvé (email):', data[0])
                return data[0]
            }

            console.warn('[getUserProfile] Aucun profil trouvé pour email:', email)
            return null
        } catch (error) {
            console.info('Erreur récupération profil:', error)
            return null
        }
    }

    async updateUserProfile(updates) {
        try {
            if (!this.currentUser?.id) throw new Error('Utilisateur non connecté')

            const { data, error } = await supabase
                .from(TABLES.USERS)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id)
                .select()

            if (error) throw error
            return data[0]
        } catch (error) {
            console.info('Erreur mise à jour profil:', error)
            throw error
        }
    }

    // ===== GESTION DU QUIZ =====

    async createQuizAccess(userId) {
        try {
            // Vérifier si le profil utilisateur existe dans la table users
            const { data: userProfile, error: userError } = await supabase
                .from(TABLES.USERS)
                .select('id')
                .eq('id', userId)
                .limit(1);

            if (userError) {
                console.info('Erreur vérification profil utilisateur:', userError);
                throw userError;
            }

            if (!userProfile || userProfile.length === 0) {
                // Si le profil n'existe pas, lever une erreur explicite
                throw new Error('Impossible de créer un accès quiz : le profil utilisateur n’existe pas.');
            }
            // Vérifier si l'accès quiz existe déjà
            const { data: quizAccess, error: quizError } = await supabase
                .from(TABLES.QUIZ_ACCESS)
                .select('user_id')
                .eq('user_id', userId)
                .limit(1);
            if (quizError) {
                console.info('Erreur vérification accès quiz:', quizError);
                throw quizError;
            }
            if (quizAccess && quizAccess.length > 0) {
                // Accès quiz existe déjà, ne pas recréer
                return quizAccess[0];
            }

            // Créer l'accès quiz
            const { data, error } = await supabase
                .from(TABLES.QUIZ_ACCESS)
                .insert({
                    user_id: userId,
                    demo_used_count: 0,
                    max_demo_allowed: 1
                })
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.info('Erreur création accès quiz:', error);
            throw error;
        }
    }

    async getQuizAccess(user_id) {
        try {

            const { data, error } = await supabase
                .from(TABLES.QUIZ_ACCESS)
                .select('*')
                .eq('user_id', user_id)

            if (error) throw error
            return data && data.length > 0 ? data[0] : null
        } catch (error) {
            console.info('Erreur récupération accès quiz:', error)
            return null
        }
    }

    async updateQuizAccess(updates) {
        try {
            const profile = await userDataService.getUserProfile();
            const { data, error } = await supabase
                .from(TABLES.QUIZ_ACCESS)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', profile.id)
                .select()

            if (error) throw error
            return data[0]
        } catch (error) {
            console.info('Erreur mise à jour accès quiz:', error)
            throw error
        }
    }

    async incrementDemoUsage() {
        try {
            const profile = await userDataService.getUserProfile();
            const access = await userDataService.getQuizAccess(profile.id);
            if (!access) {
                // Accès quiz non trouvé, ne rien faire
                return null;
            }
            return await this.updateQuizAccess({
                demo_used_count: access.demo_used_count + 1
            })
        } catch (error) {
            console.info('Erreur incrémentation démo:', error)
            throw error
        }
    }

    // ===== PREMIUM =====

    async activatePremium(durationDays = 30) {
        try {
            const expiryDate = new Date()
            expiryDate.setDate(expiryDate.getDate() + durationDays)

            return await this.updateUserProfile({
                is_premium: true,
                premium_expires_at: expiryDate.toISOString()
            })
        } catch (error) {
            console.info('Erreur activation premium:', error)
            throw error
        }
    }

    async checkPremiumStatus() {
        try {
            const profile = await this.getUserProfile()
            if (!profile || !profile.is_premium) return false

            if (profile.premium_expires_at) {
                const expiryDate = new Date(profile.premium_expires_at)
                const now = new Date()
                
                if (now > expiryDate) {
                    // Premium expiré, le désactiver
                    await this.updateUserProfile({
                        is_premium: false,
                        premium_expires_at: null
                    })
                    return false
                }
            }

            return true
        } catch (error) {
            console.info('Erreur vérification premium:', error)
            return false
        }
    }

    // ===== UTILITAIRES =====

    generateTempPassword() {
        // Générer un mot de passe temporaire basé sur l'email
        return 'naturalizeme2025!'
    }

    // ===== MIGRATION DEPUIS LOCALSTORAGE =====

    async migrateFromLocalStorage() {
        try {
            // Récupérer les données existantes du localStorage
            const localQuizAccess = localStorage.getItem('naturalizeme-quiz-access')
            
            if (localQuizAccess && this.currentUser) {
                const quizData = JSON.parse(localQuizAccess)
                
                // Migrer les données quiz essentielles
                await this.updateQuizAccess({
                    demo_used_count: quizData.totalDemoUsed || 0
                })

                // Nettoyer le localStorage après migration
                localStorage.removeItem('naturalizeme-quiz-access')
                localStorage.removeItem('naturalizeme-user-profile')
                localStorage.removeItem('naturalizeme-progress')
                
                console.log('Migration des données localStorage terminée')
            }
        } catch (error) {
            console.info('Erreur migration localStorage:', error)
        }
    }
}

// Instance globale du service
export const userDataService = new UserDataService()
