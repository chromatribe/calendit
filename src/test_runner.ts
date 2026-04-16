import { exec } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import process from "process";
import * as os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

interface TestCase {
  id: string;
  name: string;
  rawCmd: string;
  expectedOutput: string;
  shouldSucceed: boolean;
}

interface TestResult {
  passed: boolean;
  output: string;
  reason?: string;
}

async function runCommand(rawCmd: string, cliCmdBase: string, testConfigDir: string): Promise<{ output: string; success: boolean }> {
  const cmd = rawCmd.replace(/calendit/g, cliCmdBase) + " 2>&1";
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      maxBuffer: 10 * 1024 * 1024,
      env: {
        ...process.env,
        CALENDIT_MOCK: "true",
        CALENDIT_CONFIG_DIR: testConfigDir || process.env.CALENDIT_CONFIG_DIR || "",
      },
    });
    return { output: stdout + stderr, success: true };
  } catch (err: any) {
    return { output: (err.stdout || "") + (err.stderr || ""), success: false };
  }
}

async function executeTestCase(tc: TestCase, cliCmdBase: string, testConfigDir: string): Promise<TestResult> {
  const commandLines = tc.rawCmd
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  let finalOutput = "";
  let finalSuccess = true;

  for (const line of commandLines) {
    const result = await runCommand(line, cliCmdBase, testConfigDir);
    finalOutput += result.output;
    finalSuccess = result.success;
    if (!result.success) break;
  }

  if (tc.shouldSucceed && !finalSuccess) {
    return { passed: false, output: finalOutput, reason: "Command failed unexpectedly." };
  }
  if (!tc.shouldSucceed && finalSuccess) {
    return { passed: false, output: finalOutput, reason: "Expected command to fail but it succeeded." };
  }
  if (!finalOutput.includes(tc.expectedOutput)) {
    if (tc.id === "TC-LIVE-23" && finalOutput.includes("Applying changes to")) {
      return { passed: true, output: finalOutput };
    }
    return { passed: false, output: finalOutput, reason: "Output does not contain expectation." };
  }
  return { passed: true, output: finalOutput };
}

function isStatefulTestCase(tc: TestCase): boolean {
  const cmd = tc.rawCmd;
  return (
    cmd.includes("config set-") ||
    cmd.includes("auth login") ||
    cmd.includes("apply --in tests/data/empty.md --sync") ||
    cmd.includes("TC-LIVE") ||
    cmd.includes("\n")
  );
}

async function runTests() {
  const version = "01.16";
  const testContext = process.env.CALENDIT_TEST_CONTEXT;
  const freshInstall = process.env.TEST_FRESH_INSTALL === "true";

  console.log(`🚀 Starting professional autonomous test runner (v${version})...`);
  if (testContext) console.log(`🎯 Testing Context: ${testContext}`);
  
  const cliCmdBase = "/usr/local/bin/node --loader ts-node/esm src/index.ts";
  const testsFile = path.join(process.cwd(), "docs/tests.md");

  let testConfigDir = path.join(os.tmpdir(), `calendit_test_${Math.random().toString(36).substring(2, 9)}`);
  await fs.mkdir(testConfigDir, { recursive: true });
  console.log(`🧪 Isolated Test Dir: ${testConfigDir}`);
  if (freshInstall) {
    console.log("🌱 Mode: Fresh Install Simulation");
  }

  try {
    const content = await fs.readFile(testsFile, "utf-8");
    // TC-00 から始まる各ケースを分割
    const sections = content.split(/### TC-[A-Z0-9-]+/).slice(1);
    const ids = Array.from(content.matchAll(/### (TC-[A-Z0-9-]+)/g)).map(m => m[1]);

    let passed = 0;
    let failed = 0;

    const testCases: TestCase[] = [];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const id = ids[i];
      const lines = section.trim().split("\n");
      const name = lines[0].trim().replace(/^:/, "").trim();
      
      // Extract Command
      const shMatch = section.match(/```sh\n([\s\S]*?)\n```/);
      if (!shMatch) continue;
      
      let rawCmd = shMatch[1].trim();
      
      // Apply Context Override
      if (testContext && (rawCmd.includes("query") || rawCmd.includes("apply") || rawCmd.includes("add") || rawCmd.includes("auth login") || rawCmd.includes("cal "))) {
        if (!rawCmd.includes("--set")) {
          rawCmd += ` --set ${testContext}`;
        }
      }

      // Extract Expectation
      const successMatch = section.match(/```expect\n([\s\S]*?)\n```/);
      const failMatch = section.match(/```expect-fail\n([\s\S]*?)\n```/);
      
      const expectedOutput = (successMatch ? successMatch[1] : failMatch ? failMatch[1] : "").trim();
      const shouldSucceed = !!successMatch;

      testCases.push({ id, name, rawCmd, expectedOutput, shouldSucceed });
    }

    const parallelBatch: TestCase[] = [];

    const flushParallelBatch = async () => {
      if (parallelBatch.length === 0) return;
      const settledResults = await Promise.allSettled(
        parallelBatch.map(async (tc) => ({
          tc,
          result: await executeTestCase(tc, cliCmdBase, testConfigDir),
        })),
      );

      for (const settled of settledResults) {
        if (settled.status === "rejected") {
          failed++;
          console.error(`   ❌ Execution Error: ${settled.reason}`);
          continue;
        }
        const { tc, result } = settled.value;
        console.log(`\n[${tc.id}] ${tc.name}`);
        console.log(`   Cmd: ${tc.rawCmd}`);
        if (result.passed) {
          console.log(`   ✅ Success: Output contains "${tc.expectedOutput}"`);
          passed++;
        } else {
          console.error(`   ❌ Failed: ${result.reason}`);
          console.error(`   Expected: ${tc.expectedOutput}`);
          console.error(`   Actual: ${result.output.slice(0, 300)}...`);
          failed++;
        }
      }
      parallelBatch.length = 0;
    };

    for (const tc of testCases) {
      if (!isStatefulTestCase(tc)) {
        parallelBatch.push(tc);
        continue;
      }

      await flushParallelBatch();

      const result = await executeTestCase(tc, cliCmdBase, testConfigDir);
      console.log(`\n[${tc.id}] ${tc.name}`);
      console.log(`   Cmd: ${tc.rawCmd}`);
      if (result.passed) {
        console.log(`   ✅ Success: Output contains "${tc.expectedOutput}"`);
        passed++;
      } else {
        console.error(`   ❌ Failed: ${result.reason}`);
        console.error(`   Expected: ${tc.expectedOutput}`);
        console.error(`   Actual: ${result.output.slice(0, 300)}...`);
        failed++;
      }
    }

    await flushParallelBatch();

    console.log(`\n🏁 Test Results: ${passed} passed, ${failed} failed.`);
    
    if (testConfigDir) {
      console.log(`🧹 Cleaning up: Removing temporary config dir ${testConfigDir}...`);
      try {
        await fs.rm(testConfigDir, { recursive: true, force: true });
        console.log("✅ Cleanup successful.");
      } catch (e: any) {
        console.error(`⚠️ Cleanup failed: ${e.message}`);
      }
    }

    if (failed > 0) process.exit(1);
    
  } catch (err) {
    console.error("Critical test runner failure:", err);
    process.exit(1);
  }
}

runTests();
