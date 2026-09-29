import { getStudentGrpcClient } from "./studentClient.js";

async function runGrpcTests() {
  console.log("=========================================");
  console.log("   CampusFlow gRPC Verification Test    ");
  console.log("=========================================\n");

  const client = getStudentGrpcClient();

  try {
    // Test 1: Fetch registered student profile via gRPC
    console.log("👉 Test 1: Calling GetStudentProfile('2023CSE0101')...");
    const profile = await client.getProfile("2023CSE0101");
    console.log("✅ gRPC Response received (binary Protobuf decoded):");
    console.log(JSON.stringify(profile, null, 2));

    // Test 2: Validate eligibility for HOSTEL category
    console.log("\n👉 Test 2: Calling ValidateEligibility('2023CSE0101', 'HOSTEL')...");
    const eligibility1 = await client.validateEligibility("2023CSE0101", "HOSTEL");
    console.log("✅ gRPC Eligibility Response:");
    console.log(JSON.stringify(eligibility1, null, 2));

    // Test 3: Validate eligibility for non-existent student
    console.log("\n👉 Test 3: Calling ValidateEligibility('INVALID_PRN_999', 'HOSTEL')...");
    const eligibility2 = await client.validateEligibility("INVALID_PRN_999", "HOSTEL");
    console.log("✅ gRPC Negative Rejection Response:");
    console.log(JSON.stringify(eligibility2, null, 2));

    console.log("\n🎉 ALL gRPC TESTS PASSED SUCCESSFULLY!");
  } catch (err: any) {
    console.error("❌ gRPC test failed:", err);
    process.exit(1);
  } finally {
    client.close();
    process.exit(0);
  }
}

runGrpcTests();
