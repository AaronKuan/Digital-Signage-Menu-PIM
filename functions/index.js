const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");

initializeApp();

const db = getFirestore();
const region = "asia-east1";

db.settings({ ignoreUndefinedProperties: true });

exports.resetDailySoldOutStatuses = onSchedule(
  {
    region,
    schedule: "0 4 * * *",
    timeZone: "Asia/Taipei"
  },
  async () => {
    const snapshot = await db
      .collection("storeLiveStatuses")
      .where("isSoldOut", "==", true)
      .get();

    await commitInChunks(
      snapshot.docs.map((statusDoc) => ({
        ref: statusDoc.ref,
        data: {
          isSoldOut: false,
          resetAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }
      }))
    );

    return { resetCount: snapshot.size };
  }
);

exports.syncSignageCatalog = onCall({ region }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Please sign in before syncing signage data.");
  }

  const baseUrl = cleanBaseUrl(
    process.env.SIGNAGE_API_BASE_URL || "https://ultrontest.ddns.net/api/v1"
  );
  const email = process.env.SIGNAGE_API_EMAIL;
  const password = process.env.SIGNAGE_API_PASSWORD;
  const branchLimit = Number(process.env.SIGNAGE_SYNC_BRANCH_LIMIT || 100);
  const deviceLimit = Number(process.env.SIGNAGE_SYNC_DEVICE_LIMIT || 100);

  if (!email || !password) {
    throw new HttpsError(
      "failed-precondition",
      "Missing SIGNAGE_API_EMAIL or SIGNAGE_API_PASSWORD."
    );
  }

  const token = await loginToSignage(baseUrl, email, password);
  const [branches, devices] = await Promise.all([
    fetchPaged(`${baseUrl}/branches`, token, branchLimit),
    fetchPaged(`${baseUrl}/devices`, token, deviceLimit)
  ]);

  await saveBranches(branches);
  await saveDevices(devices);

  return {
    branches: branches.length,
    devices: devices.length,
    syncedAt: new Date().toISOString()
  };
});

exports.scheduledSignageCatalogSync = onSchedule(
  {
    region,
    schedule: "15 3 * * *",
    timeZone: "Asia/Taipei"
  },
  async () => {
    const baseUrl = cleanBaseUrl(
      process.env.SIGNAGE_API_BASE_URL || "https://ultrontest.ddns.net/api/v1"
    );
    const email = process.env.SIGNAGE_API_EMAIL;
    const password = process.env.SIGNAGE_API_PASSWORD;

    if (!email || !password) {
      console.warn("Skipping signage sync because credentials are not configured.");
      return null;
    }

    const token = await loginToSignage(baseUrl, email, password);
    const [branches, devices] = await Promise.all([
      fetchPaged(`${baseUrl}/branches`, token, Number(process.env.SIGNAGE_SYNC_BRANCH_LIMIT || 100)),
      fetchPaged(`${baseUrl}/devices`, token, Number(process.env.SIGNAGE_SYNC_DEVICE_LIMIT || 100))
    ]);

    await saveBranches(branches);
    await saveDevices(devices);
    return { branches: branches.length, devices: devices.length };
  }
);

async function loginToSignage(baseUrl, email, password) {
  const response = await fetch(`${baseUrl}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new HttpsError("unauthenticated", `Signage login failed with ${response.status}.`);
  }

  const payload = await response.json();
  const token = payload && payload.data && payload.data.token;
  if (!token) {
    throw new HttpsError("unauthenticated", "Signage login did not return data.token.");
  }
  return token;
}

async function fetchPaged(url, token, limit) {
  const results = [];
  let skip = 0;
  let totalCount = null;

  do {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("skip", String(skip));
    pageUrl.searchParams.set("limit", String(limit));

    const response = await fetch(pageUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new HttpsError("internal", `Signage fetch failed with ${response.status}.`);
    }

    const payload = await response.json();
    const data = Array.isArray(payload.data) ? payload.data : [];
    results.push(...data);
    totalCount = typeof payload.totalCount === "number" ? payload.totalCount : results.length;
    skip += data.length;

    if (data.length === 0) break;
  } while (results.length < totalCount);

  return results;
}

async function saveBranches(branches) {
  const writes = [];
  branches.forEach((branch) => {
    const externalBranchId = String(branch.id);
    const tags = Array.isArray(branch.tags)
      ? branch.tags.map((tag) => ({ id: String(tag.id), name: String(tag.name || tag.id) }))
      : [];

    writes.push({
      ref: db.collection("branches").doc(externalBranchId),
      data: {
        id: externalBranchId,
        externalBranchId,
        name: branch.name || `Branch ${externalBranchId}`,
        status: Boolean(branch.status),
        brandId: branch.brandId || null,
        tags,
        tagIds: tags.map((tag) => tag.id),
        rawData: branch,
        syncedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }
    });

    tags.forEach((tag) => {
      writes.push({
        ref: db.collection("tags").doc(tag.id),
        data: {
          ...tag,
          updatedAt: FieldValue.serverTimestamp()
        }
      });
    });
  });

  await commitInChunks(writes);
}

async function saveDevices(devices) {
  const writes = devices
    .filter((device) => device.id && device.branchId)
    .map((device) => {
      const externalDeviceId = String(device.id);
      return {
        ref: db.collection("devices").doc(externalDeviceId),
        data: {
          id: externalDeviceId,
          externalDeviceId,
          externalBranchId: String(device.branchId),
          name: device.name || `Device ${externalDeviceId}`,
          status: Boolean(device.status),
          rawData: device,
          syncedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }
      };
    });

  await commitInChunks(writes);
}

async function commitInChunks(writes) {
  const chunkSize = 450;
  for (let index = 0; index < writes.length; index += chunkSize) {
    const batch = db.batch();
    writes.slice(index, index + chunkSize).forEach(({ ref, data }) => {
      batch.set(ref, data, { merge: true });
    });
    await batch.commit();
  }
}

function cleanBaseUrl(value) {
  return String(value).replace(/\/$/, "");
}
