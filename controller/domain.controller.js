const crypto = require("crypto");
const dns = require("dns").promises;
const axios = require("axios");
const Domain = require("../model/domain.schema");
const User = require("../model/user.schema");

// Helper to clean domain inputs
const cleanDomainInput = (domainStr) => {
  if (!domainStr) return "";
  return domainStr
    .replace(/^(https?:\/\/)?(www\.)?/, "") // remove http://, https://, www.
    .replace(/\/$/, "") // remove trailing slash
    .toLowerCase();
};

// Automation helper to add a custom domain to Vercel dynamically
const addDomainToVercel = async (domainName) => {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    console.log("Vercel automation skipped: VERCEL_TOKEN or VERCEL_PROJECT_ID is not configured in .env");
    return;
  }

  try {
    const url = `https://api.vercel.com/v9/projects/${projectId}/domains${teamId ? `?teamId=${teamId}` : ""}`;
    const response = await axios.post(
      url,
      { name: domainName },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Successfully added domain ${domainName} to Vercel project:`, response.data);
  } catch (error) {
    console.error(`Error adding domain ${domainName} to Vercel:`, error.response?.data || error.message);
    const apiErrorMsg = error.response?.data?.error?.message;
    throw new Error(apiErrorMsg || "Failed to register domain with hosting provider");
  }
};

// Automation helper to delete a custom domain from Vercel dynamically
const deleteDomainFromVercel = async (domainName) => {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    console.log("Vercel automation skipped: VERCEL_TOKEN or VERCEL_PROJECT_ID is not configured in .env");
    return;
  }

  try {
    const url = `https://api.vercel.com/v9/projects/${projectId}/domains/${domainName}${teamId ? `?teamId=${teamId}` : ""}`;
    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(`Successfully deleted domain ${domainName} from Vercel project:`, response.data);
  } catch (error) {
    console.error(`Error deleting domain ${domainName} from Vercel:`, error.response?.data || error.message);
  }
};

const getDomainController = async (req, res) => {
  try {
    const userId = req.user.id;
    const domainRecord = await Domain.findOne({ userId });
    if (!domainRecord) {
      return res.status(200).json({ success: true, domain: null });
    }
    return res.status(200).json({ success: true, domain: domainRecord });
  } catch (error) {
    console.error("Error fetching domain:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const createDomainController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { domain } = req.body;

    if (!domain) {
      return res
        .status(400)
        .json({ success: false, message: "Domain name is required" });
    }

    const cleanedDomain = cleanDomainInput(domain);

    // Check if domain is already registered by anyone
    const existingDomain = await Domain.findOne({ domain: cleanedDomain });
    if (existingDomain) {
      if (existingDomain.userId.toString() === userId.toString()) {
        return res
          .status(200)
          .json({
            success: true,
            domain: existingDomain,
            message: "Domain already registered by you.",
          });
      } else {
        return res
          .status(400)
          .json({
            success: false,
            message: "Domain is already registered by another user.",
          });
      }
    }

   

    // Generate a random token
    const verificationToken =
      "shorty-verify-" + crypto.randomBytes(16).toString("hex");

    const newDomain = await Domain.create({
      userId,
      domain: cleanedDomain,
      verificationToken,
      isValid: false,
      isDefault: false,
    });

    return res.status(201).json({
      success: true,
      domain: newDomain,
      message: "Domain registered and added to Vercel hosting automatically. Please configure your DNS settings.",
    });
  } catch (error) {
    console.error("Error creating domain:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

const verifyDomainController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { domainId } = req.body;

    if (!domainId) {
      return res
        .status(400)
        .json({ success: false, message: "Domain ID is required" });
    }

    const domainRecord = await Domain.findOne({ _id: domainId, userId });
    if (!domainRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Domain not found or unauthorized." });
    }

    if (domainRecord.isValid) {
      return res
        .status(200)
        .json({
          success: true,
          domain: domainRecord,
          message: "Domain is already verified.",
        });
    }

    const hostToQuery = `_shorty_host.${domainRecord.domain}`;
    let txtRecords = [];
    try {
      // Use public DNS resolvers (Cloudflare/Google) to bypass local ISP caching
      const { Resolver } = require("dns").promises;
      const resolver = new Resolver();
      resolver.setServers(["1.1.1.1", "8.8.8.8"]);
      txtRecords = await resolver.resolveTxt(hostToQuery);
    } catch (dnsErr) {
      console.warn(`DNS lookup failed for ${hostToQuery}:`, dnsErr.message);
      return res.status(400).json({
        success: false,
        message: `DNS verification failed. Could not resolve TXT record for ${hostToQuery}. Make sure you added it and wait a few minutes for propagation.`,
      });
    }

    // txtRecords is an array of arrays, e.g. [ [ 'shorty-verify-...' ] ]
    // Flatten it to strings
    const flatTxtRecords = txtRecords.flat();
    const isVerified = flatTxtRecords.includes(domainRecord.verificationToken);

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: `DNS verification failed. The TXT record value on ${hostToQuery} did not match your verification token. Expected: "${
          domainRecord.verificationToken
        }". Found: "${flatTxtRecords.join(", ")}".`,
      });
    }

    // Call Vercel dynamic Domain Management API to automatically bind custom domain
    await addDomainToVercel(domainRecord.domain);

    // Successfully verified!
    domainRecord.isValid = true;
    domainRecord.isDefault = true;
    await domainRecord.save();

    // Also save this domain in user schema
    await User.findByIdAndUpdate(userId, { domain: domainRecord.domain });

    return res.status(200).json({
      success: true,
      domain: domainRecord,
      message: "Domain successfully verified and added to your profile!",
    });
  } catch (error) {
    console.error("Error verifying domain:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error during verification" });
  }
};

const deleteDomainController = async (req, res) => {
  try {
    const userId = req.user.id;
    const { domainId } = req.params;

    const domainRecord = await Domain.findOneAndDelete({
      _id: domainId,
      userId,
    });
    if (!domainRecord) {
      return res
        .status(404)
        .json({ success: false, message: "Domain not found or unauthorized." });
    }

    // Call Vercel dynamic Domain Management API to automatically remove custom domain
    await deleteDomainFromVercel(domainRecord.domain);

    // Also remove from User schema if active
    const user = await User.findById(userId);
    if (user && user.domain === domainRecord.domain) {
      user.domain = null;
      await user.save();
    }

    return res
      .status(200)
      .json({ success: true, message: "Domain deleted successfully." });
  } catch (error) {
    console.error("Error deleting domain:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getDomainController,
  createDomainController,
  verifyDomainController,
  deleteDomainController,
};
