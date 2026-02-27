/**
 * @swagger
 * components:
 *   schemas:
 *     CreateAdminUser:
 *       type: object
 *       required:
 *         - username
 *         - password
 *         - firstName
 *         - lastname
 *       properties:
 *         firstname:
 *           type: string
 *           example: John
 *         lastname:
 *           type: string
 *           example: Doe
 *         email:
 *           type: string
 *           format: email
 *           example: john@example.com
 *         password:
 *           type: string
 *           format: password
 *     
 */