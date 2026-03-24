const axios = require('axios');

/**
 * Paystack Service
 * Handles NIN verification and other Paystack-related operations
 */

const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/**
 * Verify a Nigerian NIN using Paystack
 * @param {string} nin - The NIN to verify
 * @returns {Object} - Verification result
 */
async function verifyNIN(nin) {
    try {
        if (!PAYSTACK_SECRET_KEY) {
            throw new Error('Paystack secret key not configured');
        }

        // Paystack's BVN/NIN verification endpoint
        const response = await axios.post(
            `${PAYSTACK_BASE_URL}/identityverification/bvn/match`,
            {
                bvn: nin, // Paystack uses BVN, but for NIN we use their dedicated endpoint
                nin: nin  // Send NIN as well
            },
            {
                headers: {
                    'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
        };
    } catch (error) {
        console.error('Paystack NIN verification error:', error.response?.data || error.message);
        
        // Return a structured error response
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
}

/**
 * Alternative NIN verification using Paystack's dedicated endpoint
 * @param {string} nin - The NIN to verify
 * @param {string} firstName - User's first name (optional, for matching)
 * @param {string} lastName - User's last name (optional, for matching)
 * @returns {Object} - Verification result
 */
async function verifyNINWithDetails(nin, firstName, lastName) {
    try {
        if (!PAYSTACK_SECRET_KEY) {
            throw new Error('Paystack secret key not configured');
        }

        const requestData = {
            nin: nin
        };

        // Add name for verification if provided
        if (firstName) requestData.first_name = firstName;
        if (lastName) requestData.last_name = lastName;

        const response = await axios.post(
            `${PAYSTACK_BASE_URL}/identityverification/nin`,
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return {
            success: true,
            data: response.data.data,
            message: response.data.message
        };
    } catch (error) {
        console.error('Paystack NIN verification error:', error.response?.data || error.message);
        
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
}

/**
 * Validate NIN format (basic validation)
 * Nigerian NIN is 11 digits
 * @param {string} nin - The NIN to validate
 * @returns {boolean} - Whether the format is valid
 */
function validateNINFormat(nin) {
    if (!nin) return false;
    
    // Remove any spaces or dashes
    const cleanedNIN = nin.replace(/[\s-]/g, '');
    
    // Check if it's exactly 11 digits
    return /^\d{11}$/.test(cleanedNIN);
}

module.exports = {
    verifyNIN,
    verifyNINWithDetails,
    validateNINFormat
};
