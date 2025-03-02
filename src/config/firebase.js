import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc 
} from "firebase/firestore";
import { 
  getAuth, 
  signInAnonymously, 
  initializeAuth, 
  browserLocalPersistence 
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDA1-31YeLcO7Jhp-1Z0WlWOkgWd1_10Qg",
  authDomain: "betx-1fbaf.firebaseapp.com",
  projectId: "betx-1fbaf",
  storageBucket: "betx-1fbaf.firebasestorage.app",
  messagingSenderId: "574827226755",
  appId: "1:574827226755:web:14d035f94a531deda69db6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Auth with local persistence
const auth = initializeAuth(app, {
  persistence: browserLocalPersistence
});

/**
 * Authenticate anonymously with Firebase
 * @returns {Promise<Object>} User credential
 */
const authenticateFirebase = async () => {
  try {
    // Check if a user is already signed in
    const currentUser = auth.currentUser;
    if (currentUser) {
      console.log('Already authenticated with user ID:', currentUser.uid);
      return currentUser;
    }

    // Attempt anonymous sign-in
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    
    console.log('Authenticated anonymously with user ID:', user.uid);
    return user;
  } catch (error) {
    console.error('Anonymous authentication error:', error);
    
    // Provide more detailed error handling
    if (error.code === 'auth/configuration-not-found') {
      console.error('Firebase Authentication is not properly configured.');
      console.error('Please check your Firebase project settings.');
    }
    
    throw error;
  }
};

export class BetService {
  /**
   * Save a new bet to Firestore
   * @param {Object} betData - Bet details to save
   * @returns {Promise<string>} Firestore document ID
   */
  static async saveBet(betData) {
    try {
      // Authenticate first
      await authenticateFirebase();

      // Validate bet data
      if (!betData || typeof betData !== 'object') {
        throw new Error('Invalid bet data');
      }

      // Preserve temporary ID if exists
      const { tempId, ...dataToSave } = betData;

      // Add timestamp and temporary ID
      const betWithTimestamp = {
        ...dataToSave,
        tempId: tempId || `bet_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'Open'
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'bets'), betWithTimestamp);
      console.log('Bet saved with ID:', docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error saving bet:', error);
      throw error;
    }
  }

  /**
   * Update bet status in Firestore
   * @param {string} identifier - Bet identifier (ID or transaction hash)
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  static async updateBetStatus(identifier, updateData) {
    try {
      // Authenticate first
      await authenticateFirebase();

      // Log all existing bets for comprehensive debugging
      const allBetsQuery = collection(db, 'bets');
      const allBetsSnapshot = await getDocs(allBetsQuery);
      
      const existingBets = allBetsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          docId: doc.id,
          ...data,
          // Extract key identifiers for logging
          identifiers: {
            docId: doc.id,
            tempId: data.tempId,
            description: data.description,
            status: data.status
          }
        };
      });

      console.log('Comprehensive Bet Search Context:', {
        searchIdentifier: identifier,
        totalBetsCount: existingBets.length,
        betsDetails: existingBets.map(bet => bet.identifiers)
      });

      // Comprehensive search strategies
      const searchStrategies = [
        // Strategy 1: Direct tempId match
        async () => {
          const tempIdQuery = query(
            collection(db, 'bets'), 
            where('tempId', '==', identifier)
          );
          const tempIdSnapshot = await getDocs(tempIdQuery);
          return tempIdSnapshot.docs[0] || null;
        },
        
        // Strategy 2: Description match (fallback)
        async () => {
          const descQuery = query(
            collection(db, 'bets'), 
            where('description', '==', identifier)
          );
          const descSnapshot = await getDocs(descQuery);
          return descSnapshot.docs[0] || null;
        },
        
        // Strategy 3: Partial description match
        async () => {
          const partialDescQuery = query(
            collection(db, 'bets'), 
            where('description', '>=', identifier),
            where('description', '<=', identifier + '\uf8ff')
          );
          const partialDescSnapshot = await getDocs(partialDescQuery);
          return partialDescSnapshot.docs[0] || null;
        }
      ];

      // Find bet using multiple strategies
      let betDoc = null;
      for (const strategy of searchStrategies) {
        betDoc = await strategy();
        if (betDoc) break;
      }

      // Comprehensive error handling if no bet found
      if (!betDoc) {
        const errorDetails = {
          identifier,
          updateData,
          existingBetsCount: existingBets.length,
          existingBetIdentifiers: existingBets.map(bet => bet.identifiers)
        };

        console.error('Bet Not Found - Comprehensive Error Details:', errorDetails);
        
        throw new Error(`No bet found with identifier: ${identifier}. 
          Searched using multiple strategies.
          Total existing bets: ${existingBets.length}
          Search context: ${JSON.stringify(errorDetails, null, 2)}`);
      }

      // Get the actual document data
      const betData = betDoc.data();

      console.log('Bet Found for Update:', {
        docId: betDoc.id,
        foundData: {
          tempId: betData.tempId,
          description: betData.description,
          currentStatus: betData.status
        }
      });

      // Prepare update data with additional context
      const updatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString(),
        // Preserve existing important fields
        tempId: betData.tempId,
        description: betData.description
      };

      // Update the found document
      await updateDoc(doc(db, 'bets', betDoc.id), updatePayload);

      console.log('Bet Status Updated Successfully', {
        betId: betDoc.id,
        updatePayload,
        originalData: betData
      });
    } catch (error) {
      console.error('Comprehensive Bet Status Update Error:', {
        identifier,
        updateData,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw error;
    }
  }

  /**
   * Fetch all active bets
   * @returns {Promise<Array>} List of active bets
   */
  static async getAllBets() {
    try {
      // Authenticate first
      await authenticateFirebase();

      const q = query(collection(db, 'bets'), where('status', '==', 'Open'));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('firebasedata',data,doc.id);
        
        return {
          id: doc.id, // Firestore document ID
          tempId: data.tempId || doc.id, // Preserve temporary ID if exists
          ...data
        };
      });
    } catch (error) {
      console.error('Error fetching active bets:', error);
      return [];
    }
  }

  /**
   * Fetch bets for a specific user
   * @param {string} userAddress - User's wallet address
   * @returns {Promise<Array>} List of user's bets
   */
  static async getUserBets(userAddress) {
    try {
      // Authenticate first
      await authenticateFirebase();

      const q = query(
        collection(db, 'bets'), 
        where('creator', '==', userAddress)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching user bets:', error);
      return [];
    }
  }
}

export { 
  db, 
  auth, 
  authenticateFirebase 
};
