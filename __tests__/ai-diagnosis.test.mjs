import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

// Helper to create a valid minimal 1x1 JPEG in Base64
const VALID_JPEG_BASE64 =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

// Helper to create a valid minimal 1x1 PNG in Base64
const VALID_PNG_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

// Corrupted image data
const CORRUPT_BASE64 = "data:image/jpeg;base64,INVALID_CORRUPT_BYTES_XYZ_123456789";

test("AI Diagnosis & Vision Pipeline Test Suite", async (t) => {
  // Test 1: Valid smartphone image matches Smartphone category
  await t.test("1. Valid smartphone image matches smartphone category", async () => {
    const res = await fetch(`${BASE_URL}/api/ai-diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Smartphones",
        brand: "Samsung",
        model: "Galaxy S21",
        issue_description: "Display glass cracked after drop",
        images: [
          {
            filename: "samsung_phone_cracked_screen.jpg",
            type: "image/jpeg",
            size: 50000,
            data: VALID_JPEG_BASE64,
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.selected_category, "Smartphones");
    assert.equal(data.has_blocking_mismatch, false);
    assert.equal(data.image_evaluations.length, 1);
    assert.equal(data.image_evaluations[0].status, "valid_match");
    assert.ok(data.defects.length > 0);
    assert.ok(data.repair_estimate.cost_range.includes("₹"));
    // Ensure no fake percentages in defect findings
    data.defects.forEach((d) => {
      assert.ok(["Confirmed by Image", "Probable Cause", "Possible Cause", "Requires Physical Test"].includes(d.status_label));
    });
  });

  // Test 2: Washing-machine image under Laptop category is flagged as mismatch
  await t.test("2. Washing machine image under Laptop category flagged as mismatch", async () => {
    const res = await fetch(`${BASE_URL}/api/ai-diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Laptops & PCs",
        brand: "Dell",
        model: "XPS 15",
        issue_description: "Screen cracked",
        images: [
          {
            filename: "front_load_washing_machine_drum.jpg",
            type: "image/jpeg",
            size: 80000,
            data: VALID_JPEG_BASE64,
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.has_blocking_mismatch, true);
    assert.equal(data.image_evaluations[0].status, "wrong_category");
    assert.ok(data.blocking_reason.toLowerCase().includes("mismatch") || data.blocking_reason.toLowerCase().includes("does not appear"));
    assert.ok(data.image_evaluations[0].apparent_category.includes("Washing"));
  });

  // Test 3: Unrelated image (pet/food/scenery) is not used for repair diagnosis
  await t.test("3. Unrelated image is flagged as unrelated_image and blocked", async () => {
    const res = await fetch(`${BASE_URL}/api/ai-diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Televisions",
        brand: "Sony",
        model: "Bravia",
        issue_description: "Lines on screen",
        images: [
          {
            filename: "cute_puppy_dog_photo.jpg",
            type: "image/jpeg",
            size: 60000,
            data: VALID_JPEG_BASE64,
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.has_blocking_mismatch, true);
    assert.equal(data.image_evaluations[0].status, "unrelated_image");
    assert.equal(data.overall_status, "mismatch_detected");
  });

  // Test 4: Blurry or corrupted image triggers unreadable/insufficient evidence state
  await t.test("4. Corrupted or unreadable image triggers proper error status", async () => {
    const res = await fetch(`${BASE_URL}/api/ai-diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Smartphones",
        brand: "Apple",
        model: "iPhone 13",
        issue_description: "Screen flicker",
        images: [
          {
            filename: "corrupted_file.jpg",
            type: "image/jpeg",
            size: 50,
            data: CORRUPT_BASE64,
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.image_evaluations[0].status, "unreadable_image");
    assert.ok(data.image_evaluations[0].explanation.includes("corrupted") || data.image_evaluations[0].explanation.includes("unreadable"));
  });

  // Test 5: Correct device with non-visual defect does not invent physical damage
  await t.test("5. Correct device with functional fault distinguishes non-visual symptoms", async () => {
    const res = await fetch(`${BASE_URL}/api/ai-diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Smartphones",
        brand: "OnePlus",
        model: "10 Pro",
        issue_description: "Phone will not charge when plugged in",
        images: [
          {
            filename: "phone_back_cover_clean.jpg",
            type: "image/jpeg",
            size: 55000,
            data: VALID_JPEG_BASE64,
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.has_blocking_mismatch, false);
    // Fault cannot be verified visually from back cover photo
    assert.equal(data.image_evaluations[0].is_fault_visually_verifiable, false);
    assert.ok(data.image_evaluations[0].recommendation.toLowerCase().includes("physical") || data.image_evaluations[0].recommendation.toLowerCase().includes("test"));
  });

  // Test 6: Multiple uploads validated independently
  await t.test("6. Multiple uploads validated independently with individual status", async () => {
    const res = await fetch(`${BASE_URL}/api/ai-diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Laptops & PCs",
        brand: "Lenovo",
        model: "ThinkPad",
        issue_description: "Keyboard keys not registering",
        images: [
          {
            filename: "laptop_keyboard_photo.jpg",
            type: "image/jpeg",
            size: 70000,
            data: VALID_JPEG_BASE64,
          },
          {
            filename: "washing_machine_inlet.jpg",
            type: "image/jpeg",
            size: 65000,
            data: VALID_JPEG_BASE64,
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.image_evaluations.length, 2);
    // Image 1 is valid laptop photo
    assert.equal(data.image_evaluations[0].status, "valid_match");
    // Image 2 is wrong category washing machine
    assert.equal(data.image_evaluations[1].status, "wrong_category");
    // Overall blocking mismatch should be true because of image 2
    assert.equal(data.has_blocking_mismatch, true);
  });

  // Test 7: Video attachment handled explicitly without fake vision analysis
  await t.test("7. Video attachment recognized and noted without fabricated analysis", async () => {
    const res = await fetch(`${BASE_URL}/api/ai-diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Air Conditioners",
        brand: "Daikin",
        model: "Inverter 1.5T",
        issue_description: "Water leaking from indoor unit",
        videos_attached_count: 1,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.selected_category, "Air Conditioners");
    assert.ok(data.summary.includes("video") || data.summary.includes("technician"));
    assert.equal(data.has_blocking_mismatch, false);
    assert.ok(data.repair_estimate.cost_range.includes("₹"));
  });

  // Test 8: All major categories resolve specific taxonomies and calibrated costs
  const categoriesToTest = [
    { cat: "Smartphones", issue: "Battery draining fast" },
    { cat: "Laptops & PCs", issue: "Blue screen of death on startup" },
    { cat: "Washing Machines", issue: "Drum not spinning during rinse cycle" },
    { cat: "Refrigerators", issue: "Freezer cold but fridge compartment warm" },
    { cat: "Air Conditioners", issue: "Not cooling room sufficiently" },
    { cat: "Televisions", issue: "Horizontal colored lines across display" },
    { cat: "Microwave Ovens", issue: "Plate turns but food does not heat" },
    { cat: "Cameras", issue: "Lens autofocus mechanism making grinding sound" },
    { cat: "Audio Equipment", issue: "Left channel audio has static distortion" },
    { cat: "Water Purifiers", issue: "RO membrane leaking water continuously" },
    { cat: "Gaming Devices", issue: "Console overheating and shutting down" },
    { cat: "Electrical & Wiring", issue: "MCB tripping whenever AC is switched on" },
  ];

  for (const item of categoriesToTest) {
    await t.test(`8. Category diagnosis: ${item.cat}`, async () => {
      const res = await fetch(`${BASE_URL}/api/ai-diagnosis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: item.cat,
          issue_description: item.issue,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.defects.length > 0, `No defects returned for category ${item.cat}`);
      assert.ok(data.repair_estimate.cost_range.includes("₹"), `No INR cost range for ${item.cat}`);
      assert.ok(data.pre_service_tips.length > 0, `No pre-service tips for ${item.cat}`);
      assert.ok(data.follow_up_questions.length > 0, `No follow up questions for ${item.cat}`);
    });
  }

  // Test 9: Unknown category without pricing data returns pending quotation
  await t.test("9. Unconfigured category returns pending quotation without fabricated numbers", async () => {
    const res = await fetch(`${BASE_URL}/api/ai-diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Industrial Laser Cutter",
        issue_description: "Alignment mirror drifted off axis",
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.repair_estimate.is_quote_pending, true);
    assert.ok(data.repair_estimate.cost_range.toLowerCase().includes("pending"));
  });

  // Test 10: Malformed input gracefully handled without server crash
  await t.test("10. Malformed payload handled gracefully with valid fallback structure", async () => {
    const res = await fetch(`${BASE_URL}/api/ai-diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "",
        issue_description: "",
        images: [{ filename: "test.txt", type: "text/plain", size: 10, data: "Hello World" }],
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.overall_status);
    assert.ok(Array.isArray(data.image_evaluations));
  });

  // Test 11: Legacy backwards compatibility fields are present
  await t.test("11. Legacy compatibility fields are populated correctly", async () => {
    const res = await fetch(`${BASE_URL}/api/ai-diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "Smartphones",
        brand: "Google",
        model: "Pixel 7",
        issue_description: "Battery swollen and pushing display up",
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    // Verify legacy fields exist for existing integrations
    assert.ok(Array.isArray(data.issue_labels));
    assert.ok(Array.isArray(data.confidence_scores));
    assert.ok(typeof data.estimated_cost_range === "string");
    assert.ok(typeof data.recommended_action === "string");
    assert.ok(typeof data.turnaround_estimate === "string");
  });
});
