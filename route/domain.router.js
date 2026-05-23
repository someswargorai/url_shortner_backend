const express = require('express');
const router = express.Router();
const { 
    getDomainController,
    createDomainController, 
    verifyDomainController,
    deleteDomainController
} = require('../controller/domain.controller');
const { userAuth } = require('../middleware/userAuth.middleware');
const planLimiter = require('../middleware/subscritption.middleware');
const rateLimit = require('../middleware/rateLimit.middleware');

router.get("/", userAuth, rateLimit, getDomainController);
router.post("/", userAuth, planLimiter("domains"), rateLimit, createDomainController);
router.post("/verify", userAuth, rateLimit, verifyDomainController);
router.delete("/:domainId", userAuth, rateLimit, deleteDomainController);

module.exports = router;