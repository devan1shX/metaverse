const { Config } = require('../config/config');

// =============================================  //
// ValidationService – pure input validation, no req/res
// =============================================  //

/**
 * Validate login input.
 * @param {{ user_level?: any, email?: any, password?: any }} body
 * @returns {{ valid: boolean, errors: string[], sanitized?: { user_level: string, email: string, password: string } }}
 */
function validateLogin(body) {
    const { user_level, email, password } = body || {};
    const errors = [];

    // Validate user_level
    if (!user_level) {
        errors.push('User level is required');
    } else if (typeof user_level !== 'string') {
        errors.push('User level must be a string');
    } else {
        const validUserLevels = Object.values(Config.USER_LEVELS);
        if (!validUserLevels.includes(user_level.toLowerCase())) {
            errors.push(`User level must be one of: ${validUserLevels.join(', ')}`);
        }
    }

    // Validate email
    if (!email) {
        errors.push('Email is required');
    } else if (typeof email !== 'string') {
        errors.push('Email must be a string');
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            errors.push('Please provide a valid email address');
        } else if (email.trim().length > 254) {
            errors.push('Email address is too long');
        }
    }

    // Validate password
    if (!password) {
        errors.push('Password is required');
    } else if (typeof password !== 'string') {
        errors.push('Password must be a string');
    } else if (password.length < 1) {
        errors.push('Password cannot be empty');
    } else if (password.length > 128) {
        errors.push('Password is too long (max 128 characters)');
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        errors: [],
        sanitized: {
            user_level: user_level.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            password, // Don't trim password as it might be intentional
        },
    };
}

/**
 * Validate signup input.
 * @param {{ user_name?: any, email?: any, password?: any, confirmPassword?: any }} body
 * @returns {{ valid: boolean, errors: string[], sanitized?: { user_name: string, email: string, password: string } }}
 */
function validateSignup(body) {
    const { user_name, email, password, confirmPassword } = body || {};
    const errors = [];

    // Validate username
    if (!user_name) {
        errors.push('Username is required');
    } else if (typeof user_name !== 'string') {
        errors.push('Username must be a string');
    } else {
        const trimmedUsername = user_name.trim();
        if (trimmedUsername.length < 3) {
            errors.push('Username must be at least 3 characters long');
        } else if (trimmedUsername.length > 30) {
            errors.push('Username must be less than 30 characters');
        } else if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
            errors.push('Username can only contain letters, numbers, underscores, and hyphens');
        }
    }

    // Validate email
    if (!email) {
        errors.push('Email is required');
    } else if (typeof email !== 'string') {
        errors.push('Email must be a string');
    } else {
        const trimmedEmail = email.trim();
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(trimmedEmail)) {
            errors.push('Please provide a valid email address');
        } else if (trimmedEmail.length > 254) {
            errors.push('Email address is too long');
        }
    }

    // Validate password
    if (!password) {
        errors.push('Password is required');
    } else if (typeof password !== 'string') {
        errors.push('Password must be a string');
    } else {
        if (password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        } else if (password.length > 128) {
            errors.push('Password is too long (max 128 characters)');
        }

        // Password strength validation
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

        if (strengthScore < 2) {
            errors.push('Password must contain at least 2 of the following: uppercase letters, lowercase letters, numbers, special characters');
        }

        // Check for common weak passwords
        const commonPasswords = ['password', '123456', 'password123', 'admin', 'qwerty', 'letmein'];
        if (commonPasswords.includes(password.toLowerCase())) {
            errors.push('Please choose a stronger password');
        }
    }

    // Validate password confirmation if provided
    if (confirmPassword !== undefined) {
        if (confirmPassword !== password) {
            errors.push('Password confirmation does not match');
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        errors: [],
        sanitized: {
            user_name: user_name.trim(),
            email: email.trim().toLowerCase(),
            password, // Don't modify password as it might affect hashing
        },
    };
}

/**
 * Get the list of allowed body fields for a given route type.
 * @param {'login' | 'signup'} routeType
 * @returns {string[]}
 */
function getAllowedFields(routeType) {
    const fields = {
        login: ['user_level', 'email', 'password'],
        signup: ['user_name', 'email', 'password', 'confirmPassword'],
    };
    return fields[routeType] || [];
}

module.exports = {
    validateLogin,
    validateSignup,
    getAllowedFields,
};
