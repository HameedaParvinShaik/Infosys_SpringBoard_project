const bcrypt = require('bcryptjs');
const { logger } = require('../utils/logger');

// PLACEHOLDER: In production, this would interact with your database
// Your friend will replace this with actual DB calls

/**
 * Service layer for authentication operations
 */

/**
 * Find user by email
 * @param {string} email - User's email
 * @returns {Promise<Object|null>} User object or null
 */
const findUserByEmail = async (email) => {
  try {
    // PLACEHOLDER: Replace with actual database query
    // Example: return await User.findOne({ where: { email } });
    
    const mockUsers = [
      {
        id: 'user_001',
        email: 'demo@example.com',
        name: 'Demo User',
        passwordHash: '$2a$10$YourHashedPasswordHere', // bcrypt hash of "password123"
        createdAt: new Date().toISOString()
      }
    ];
    
    const user = mockUsers.find(u => u.email === email);
    logger.debug(`Auth service: findUserByEmail(${email}) => ${user ? 'found' : 'not found'}`);
    
    return user || null;
  } catch (error) {
    logger.error(`Error in findUserByEmail: ${error.message}`);
    throw new Error('Database error while finding user');
  }
};

/**
 * Find user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User object or null
 */
const findUserById = async (userId) => {
  try {
    // PLACEHOLDER: Replace with actual database query
    // Example: return await User.findByPk(userId);
    
    const mockUsers = [
      {
        id: 'user_001',
        email: 'demo@example.com',
        name: 'Demo User',
        passwordHash: '$2a$10$YourHashedPasswordHere',
        createdAt: new Date().toISOString()
      }
    ];
    
    const user = mockUsers.find(u => u.id === userId);
    logger.debug(`Auth service: findUserById(${userId}) => ${user ? 'found' : 'not found'}`);
    
    return user || null;
  } catch (error) {
    logger.error(`Error in findUserById: ${error.message}`);
    throw new Error('Database error while finding user by ID');
  }
};

/**
 * Create new user
 * @param {Object} userData - User data
 * @param {string} userData.name - User's name
 * @param {string} userData.email - User's email
 * @param {string} userData.password - Plain text password
 * @returns {Promise<Object>} Created user (without password)
 */
const createUser = async (userData) => {
  try {
    const { name, email, password } = userData;
    
    // PLACEHOLDER: Hash password properly
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // PLACEHOLDER: Replace with actual database creation
    // Example: return await User.create({ name, email, passwordHash });
    
    const newUser = {
      id: `user_${Date.now()}`,
      name,
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    logger.info(`Auth service: Created new user: ${email}`);
    
    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  } catch (error) {
    logger.error(`Error in createUser: ${error.message}`);
    
    if (error.code === 11000 || error.message.includes('duplicate')) {
      throw new Error('Email already registered');
    }
    
    throw new Error('Failed to create user');
  }
};

/**
 * Validate user credentials
 * @param {string} email - User's email
 * @param {string} password - Plain text password
 * @returns {Promise<Object|null>} User object if valid, null otherwise
 */
const validateCredentials = async (email, password) => {
  try {
    // PLACEHOLDER: Find user by email
    const user = await findUserByEmail(email);
    
    if (!user) {
      logger.warn(`Auth service: Login attempt for non-existent user: ${email}`);
      return null;
    }
    
    // PLACEHOLDER: Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      logger.warn(`Auth service: Invalid password for user: ${email}`);
      return null;
    }
    
    logger.info(`Auth service: Successful login for user: ${email}`);
    
    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    logger.error(`Error in validateCredentials: ${error.message}`);
    throw new Error('Authentication service error');
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user
 */
const updateUserProfile = async (userId, updates) => {
  try {
    // PLACEHOLDER: Replace with actual database update
    // Example: return await User.update(updates, { where: { id: userId }, returning: true });
    
    logger.debug(`Auth service: updateUserProfile(${userId}, ${JSON.stringify(updates)})`);
    
    // Simulate update
    const user = await findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    return updatedUser;
  } catch (error) {
    logger.error(`Error in updateUserProfile: ${error.message}`);
    throw new Error('Failed to update user profile');
  }
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success status
 */
const changePassword = async (userId, oldPassword, newPassword) => {
  try {
    // PLACEHOLDER: Replace with actual database operations
    // 1. Find user
    const user = await findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // 2. Verify old password
    const isValidOldPassword = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValidOldPassword) {
      throw new Error('Current password is incorrect');
    }
    
    // 3. Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    
    // 4. Update in database
    // Example: await User.update({ passwordHash: newPasswordHash }, { where: { id: userId } });
    
    logger.info(`Auth service: Password changed for user: ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Error in changePassword: ${error.message}`);
    throw error;
  }
};

/**
 * Delete user account
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Success status
 */
const deleteUser = async (userId) => {
  try {
    // PLACEHOLDER: Replace with actual database deletion
    // Example: await User.destroy({ where: { id: userId } });
    
    logger.info(`Auth service: User deleted: ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Error in deleteUser: ${error.message}`);
    throw new Error('Failed to delete user account');
  }
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  validateCredentials,
  updateUserProfile,
  changePassword,
  deleteUser
};