import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const BACKUP_DIR = "/secure_backup_safepoint";
const FILES_TO_BACKUP = [
  "src",
  "public",
  "server.ts",
  "package.json",
  "package-lock.json",
  "vite.config.ts",
  "tsconfig.json",
  "index.html",
  "metadata.json",
  "firestore.rules",
  "firebase-applet-config.json",
  "firebase-blueprint.json",
  "copy-logo.js",
  ".env.example",
  ".gitignore",
  "README.md"
];

function printBanner(title: string) {
  console.log("\n=======================================================");
  console.log(`🛡️  ${title}`);
  console.log("=======================================================");
}

function runGitBackup() {
  printBanner("GIT VERSION CONTROL SAFEPOINT");
  try {
    // 1. Check if git repo exists, if not initialize it
    if (!fs.existsSync(".git")) {
      console.log("Initializing local git repository...");
      execSync("git init", { stdio: "inherit" });
      execSync('git config user.name "AI Secure Agent"', { stdio: "inherit" });
      execSync('git config user.email "security-agent@aistudio.build"', { stdio: "inherit" });
    }

    // 2. Add files
    console.log("Staging current files in Git...");
    execSync("git add .", { stdio: "inherit" });

    // 3. Create commit
    console.log("Creating secure commit point...");
    const commitMsg = "Safepoint: Secure Error Masking and Arabic Shield Badge (2026-05-24)";
    execSync(`git commit -m "${commitMsg}" --allow-empty`, { stdio: "inherit" });
    
    console.log("✅ Git commit created successfully!");
    const logOutput = execSync("git log -1 --oneline").toString().trim();
    console.log(`Current revision: ${logOutput}`);
  } catch (err: any) {
    console.warn("⚠️ Git backup warning (continuing with physical clone):", err.message || err);
  }
}

function runPhysicalBackup() {
  printBanner("PHYSICAL FILE SYSTEM BACKUP");
  try {
    // Clean backup directory
    if (fs.existsSync(BACKUP_DIR)) {
      console.log(`Cleaning previous physical backup directory: ${BACKUP_DIR}`);
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    // Copy selected files/folders
    for (const fileOrFolder of FILES_TO_BACKUP) {
      const srcPath = path.join(process.cwd(), fileOrFolder);
      const destPath = path.join(BACKUP_DIR, fileOrFolder);

      if (fs.existsSync(srcPath)) {
        console.log(`Backing up: ${fileOrFolder} -> ${destPath}`);
        fs.cpSync(srcPath, destPath, { recursive: true });
      } else {
        console.log(`Skipping (not present): ${fileOrFolder}`);
      }
    }
    console.log("\n✅ Done backing up files physically!");
    console.log(`Safepoint securely saved to: ${BACKUP_DIR}`);
  } catch (err: any) {
    console.error("❌ Physical backup failed:", err.message || err);
    process.exit(1);
  }
}

function restoreFromBackup() {
  printBanner("RESTORING SYSTEM TO SECURE SAFEPOINT");
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.error(`❌ Error: Backup directory not found at ${BACKUP_DIR}. Please run backup first.`);
      process.exit(1);
    }

    console.log("⚠️ Restoring will overwrite existing codebase files. Proceeding...");

    // Copy every backed up item back to project directory
    for (const fileOrFolder of FILES_TO_BACKUP) {
      const srcPath = path.join(BACKUP_DIR, fileOrFolder);
      const destPath = path.join(process.cwd(), fileOrFolder);

      if (fs.existsSync(srcPath)) {
        // Clean target path if it exists to avoid merging files
        if (fs.existsSync(destPath)) {
          console.log(`Cleaning existing target: ${destPath}`);
          fs.rmSync(destPath, { recursive: true, force: true });
        }
        
        console.log(`Restoring: ${fileOrFolder} to ${destPath}`);
        fs.cpSync(srcPath, destPath, { recursive: true });
      }
    }

    console.log("\n🎉 RESTORE COMPLETE!");
    console.log("System has been fully rolled back to the secure safepoint state successfully.");
  } catch (err: any) {
    console.error("❌ Restore failed:", err.message || err);
    process.exit(1);
  }
}

// Check command-line arguments
const action = process.argv[2] || "backup";

if (action === "backup") {
  runGitBackup();
  runPhysicalBackup();
} else if (action === "restore") {
  restoreFromBackup();
} else {
  console.log("Usage: npx tsx /manage_safepoint.ts [backup|restore]");
}
