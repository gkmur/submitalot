#!/usr/bin/env node

const BASE_URL = process.env.SMOKE_BASE_URL?.trim() || "http://127.0.0.1:3000";
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 90_000);

function authHeader() {
  const username = process.env.SMOKE_BASIC_AUTH_USERNAME?.trim();
  const password = process.env.SMOKE_BASIC_AUTH_PASSWORD?.trim();
  if (!username || !password) return {};
  const encoded = Buffer.from(`${username}:${password}`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

async function waitForServerReady() {
  const started = Date.now();
  while (Date.now() - started < TIMEOUT_MS) {
    try {
      const res = await fetch(`${BASE_URL}/`, {
        headers: authHeader(),
      });
      if (res.ok || res.status === 401) return;
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server did not become ready within ${TIMEOUT_MS}ms`);
}

async function parseJsonOrThrow(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON response (${res.status}), got: ${text.slice(0, 240)}`);
  }
}

async function uploadFixtureFile() {
  const formData = new FormData();
  const csv = "sku,quantity,price\nSMOKE-001,12,100\n";
  const file = new File([csv], "smoke-upload.csv", {
    type: "text/csv",
  });
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: "POST",
    headers: authHeader(),
    body: formData,
  });
  const body = await parseJsonOrThrow(res);
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}): ${body.error || "unknown error"}`);
  }
  if (!body.file?.url) {
    throw new Error("Upload response did not include file url");
  }
  return body.file;
}

async function submitEnvelope(uploadedFile) {
  const payload = {
    formData: {
      brandPartner: "recSmokeBrand001",
      seller: "recSmokeSeller001",
      inventoryFile: [
        {
          name: uploadedFile.name,
          url: uploadedFile.url,
          size: uploadedFile.size,
          type: uploadedFile.type || "text/csv",
        },
      ],
      inventoryType: "Discount",
      productAssortment: "5: Hero SKUs and bestselling items",
      inventoryCondition: "5: Brand new with hang tags",
      overallListingRating: 4,
      categoryGroups: ["Apparel"],
      inventoryExclusivity: "Exclusive",
      paperwork: "Release",
      region: "United States",
      minimumOrder: "100 units",
      packagingType: "Retail Ready",
      inventoryAvailability: "ATS",
      fobOrExw: "FOB",
      leadTimeNumber: 4,
      leadTimeInterval: "Day(s)",
      currencyType: "USD $",
      inlandFreight: "No",
      marginTakeRate: 12,
      priceColumns: "Seller Price",
      maxPercentOffAsking: 16,
      listingDisaggregation: "One listing",
      stealth: false,
      p0FireListing: false,
    },
    linkedRecords: {
      brandPartner: [{ id: "recSmokeBrand001", name: "Smoke Brand" }],
      seller: [{ id: "recSmokeSeller001", name: "Smoke Seller" }],
      restrictionsCompany: [],
    },
  };

  const res = await fetch(`${BASE_URL}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": `smoke-${Date.now()}`,
      ...authHeader(),
    },
    body: JSON.stringify(payload),
  });
  const body = await parseJsonOrThrow(res);
  if (!res.ok) {
    throw new Error(`Submit failed (${res.status}): ${body.error || "unknown error"}`);
  }
  if (!body.success || typeof body.recordId !== "string") {
    throw new Error(`Unexpected submit response: ${JSON.stringify(body)}`);
  }
  return body;
}

async function main() {
  console.log(`[smoke] waiting for app at ${BASE_URL}`);
  await waitForServerReady();

  console.log("[smoke] uploading fixture file");
  const uploaded = await uploadFixtureFile();
  console.log(`[smoke] uploaded: ${uploaded.name}`);

  console.log("[smoke] submitting payload");
  const result = await submitEnvelope(uploaded);
  console.log(`[smoke] submit ok, recordId=${result.recordId}`);
}

main().catch((err) => {
  console.error(`[smoke] failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
