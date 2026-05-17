const express = require('express');
const router = express.Router();
const { 
    getDomainController,
    createDomainController, 
    verifyDomainController,
    deleteDomainController
} = require('../controller/domain.controller');
const { userAuth } = require('../middleware/userAuth.middleware');

router.get("/", userAuth, getDomainController);
router.post("/", userAuth, createDomainController);
router.post("/verify", userAuth, verifyDomainController);
router.delete("/:domainId", userAuth, deleteDomainController);

module.exports = router;