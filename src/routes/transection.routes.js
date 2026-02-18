const {Router} = require('express');
const authMiddleware = require("../middleware/auth.middlware")
const transectionController = require("../controller/transection.controller");  

const router = Router();
/**
 * - POST /api/transection
 * - Crrate a new transection
 */
router.post('/',authMiddleware.authMiddleware,transectionController.createTransection)

/**
 * - POST /api/transection/system/initial-funds
 * - Crrate a new transection for initial funds
 */
router.post("/system/initial-funds",authMiddleware.authMiddlewareSystemUser,transectionController.createInitialFunds)




module.exports = router;