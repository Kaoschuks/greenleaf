const ApiActivity = require('../models/ApiActivity');

/**
 * Middleware to track API activities
 * This middleware logs all API requests to the database
 */
function activityTracker(req, res, next) {
    // Store original send function
    const originalSend = res.send;
    
    // Capture response data
    res.send = function(body) {
        // Log activity after response is sent
        const logActivity = async () => {
            try {
                const apiActivity = new ApiActivity(req.db);
                
                let userId = null;
                let adminUserId = null;
                
                // Get user ID from token if available
                if (req.user) {
                    if (req.user.type === 'user') {
                        userId = req.user.id;
                    } else if (req.user.type === 'admin') {
                        adminUserId = req.user.id;
                    }
                }

                await apiActivity.create({
                    user_id: userId,
                    admin_user_id: adminUserId,
                    action: `${req.method} ${req.path}`,
                    method: req.method,
                    endpoint: req.originalUrl,
                    request_body: JSON.stringify(req.body).substring(0, 1000), // Limit size
                    response_status: res.statusCode,
                    response_body: typeof body === 'string' ? body.substring(0, 500) : JSON.stringify(body).substring(0, 500),
                    ip_address: req.ip || req.connection.remoteAddress,
                    user_agent: req.get('user-agent')
                });
            } catch (error) {
                // Don't block the request if logging fails
                console.error('Failed to log API activity:', error.message);
            }
        };

        // Execute logging asynchronously
        logActivity();
        
        // Call original send function
        return originalSend.call(this, body);
    };

    next();
}

module.exports = activityTracker;
