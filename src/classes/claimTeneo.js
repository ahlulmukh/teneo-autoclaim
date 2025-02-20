const { logMessage } = require("../utils/logger");
const UserAgent = require("user-agents");
const { getProxyAgent } = require("./proxy");
const userAgent = new UserAgent().toString();
const axios = require("axios");

module.exports = class claimTeneo {
  constructor(token, proxy = null, currentNum, total) {
    this.token = token;
    this.proxy = proxy;
    this.currentNum = currentNum;
    this.total = total;
    this.userAgent = userAgent;
    this.axiosConfig = {
      ...(this.proxy && { httpsAgent: getProxyAgent(this.proxy) }),
      timeout: 60000,
    };
  }

  async makeRequest(method, url, config = {}, retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        const userAgent = new UserAgent().toString();
        const headers = {
          "User-Agent": userAgent,
          "Content-Type": "application/json",
          ...config.headers,
        };
        const response = await axios({
          method,
          url,
          ...this.axiosConfig,
          ...config,
          headers,
        });
        return response;
      } catch (error) {
        if (error.response) {
          logMessage(
            this.currentNum,
            this.total,
            `Error ${error.response.status}: ${JSON.stringify(
              error.response.data
            )}`,
            "error"
          );
        } else {
          logMessage(
            this.currentNum,
            this.total,
            `Request failed: ${error.message}`,
            "error"
          );
        }

        logMessage(
          this.currentNum,
          this.total,
          `Retrying request...`,
          "process"
        );
        await new Promise((resolve) => setTimeout(resolve, 12000));
      }
    }
    return null;
  }

  async getDataReferral(token) {
    logMessage(
      this.currentNum,
      this.total,
      "Trying to get referral data...",
      "process"
    );

    const headers = {
      Authorization: `Bearer ${token}`,
    };

    try {
      const response = await this.makeRequest(
        "GET",
        "https://api.teneo.pro/api/users/referrals",
        { headers: headers }
      );

      if (response && response.data.success === true) {
        const referralData = response.data.unfiltered?.referrals || [];
        logMessage(
          this.currentNum,
          this.total,
          `Success get referral data. Total referrals: ${referralData.length}`,
          "success"
        );
        return referralData;
      }

      logMessage(
        this.currentNum,
        this.total,
        "Failed to get referral data.",
        "error"
      );
      return null;
    } catch (error) {
      logMessage(
        this.currentNum,
        this.total,
        `Error get referral data, message : ${error.message}`,
        "error"
      );
      return null;
    }
  }

  async claimReferral(token, idereferral) {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    try {
      const response = await this.makeRequest(
        "POST",
        "https://api.teneo.pro/api/users/referrals/claim",
        { headers: headers, data: { referralId: idereferral } }
      );
      if (response && response.data.success === true) {
        logMessage(
          this.currentNum,
          this.total,
          response.data.message,
          "success"
        );
      }
    } catch (error) {
      logMessage(
        this.currentNum,
        this.total,
        `Error claim referral, message : ${error.message}`,
        "error"
      );
      return null;
    }
  }

  countReferrals(referralData, currentNum, total) {
    const totalReferrals = referralData.length;
    const pending = referralData.filter(
      (ref) => ref.status === "Pending"
    ).length;
    const success = referralData.filter(
      (ref) => ref.status === "Success"
    ).length;
    const claimable = referralData.filter(
      (ref) => ref.status === "Claimable"
    ).length;
    const canClaim = referralData.filter((ref) => ref.canClaim === true).length;

    logMessage(currentNum, total, `==== Referral Statistics ====`, "info");
    logMessage(currentNum, total, `Total Referrals: ${totalReferrals}`, "info");
    logMessage(currentNum, total, `Pending: ${pending}`, "info");
    logMessage(currentNum, total, `Success: ${success}`, "success");
    logMessage(currentNum, total, `Claimable: ${claimable}`, "info");
    logMessage(currentNum, total, `Can be Claimed: ${canClaim}`, "success");
    logMessage(currentNum, total, `=============================`, "info");
  }

  async singleProses() {
    const referralData = await this.getDataReferral(this.token);

    if (!referralData || referralData.length === 0) {
      logMessage(
        this.currentNum,
        this.total,
        "No referral data found.",
        "error"
      );
      return;
    }

    this.countReferrals(referralData, this.currentNum, this.total);

    const claimableReferrals = referralData.filter(
      (ref) => ref.canClaim === true
    );
    const totalClaims = claimableReferrals.length;

    if (totalClaims === 0) {
      logMessage(
        this.currentNum,
        this.total,
        "No claimable referrals.",
        "info"
      );
      return;
    }

    for (let i = 0; i < totalClaims; i++) {
      const referral = claimableReferrals[i];
      logMessage(
        this.currentNum,
        this.total,
        `Trying to claim referral ${i + 1}/${totalClaims}`,
        "process"
      );
      await this.claimReferral(this.token, referral.id);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    logMessage(
      this.currentNum,
      this.total,
      "All claimable referrals processed.",
      "success"
    );
  }
};
