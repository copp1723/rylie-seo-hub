const { execSync } = require('child_process');
const path = require('path');

// Change to project directory
process.chdir(__dirname);

console.log("🚀 Starting deployment process...\n");

function runCommand(command, description) {
  try {
    console.log(`📌 ${description}...`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    if (result.trim()) {
      console.log(result);
    }
    return { success: true, output: result };
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    if (error.stdout) console.log(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    return { success: false, error };
  }
}

// Check current status
const statusResult = runCommand('git status --porcelain', 'Checking git status');
if (statusResult.success) {
  const changes = statusResult.output.trim().split('\n').filter(line => line.trim()).length;
  console.log(`📊 Found ${changes} files with changes\n`);
}

// Add all changes
runCommand('git add .', 'Staging all changes');

// Commit
const commitMsg = "fix: hardcode requests terminology, add chat page, and GA4 UI improvements";
const commitResult = runCommand(`git commit -m "${commitMsg}"`, 'Creating commit');

if (commitResult.success) {
  // Get commit SHA
  const shaResult = runCommand('git rev-parse --short HEAD', 'Getting commit SHA');
  if (shaResult.success) {
    const newSHA = shaResult.output.trim();
    console.log(`\n✅ New commit created: ${newSHA}\n`);
    
    // Push to origin
    console.log("📤 Pushing to GitHub (this may take a moment)...");
    const pushResult = runCommand('git push origin main', 'Pushing to GitHub');
    
    if (pushResult.success) {
      console.log("\n✅ Successfully pushed to GitHub!");
      console.log("\n🎯 Next steps:");
      console.log("1. Go to: https://dashboard.render.com");
      console.log("2. Find your service: rylie-seo-hub");
      console.log("3. Click 'Deploys' tab");
      console.log("4. Click 'Manual Deploy'");
      console.log("5. (Optional) Clear build cache");
      console.log(`\n📍 Watch for commit: ${newSHA} in build logs!`);
    }
  }
} else if (commitResult.error && commitResult.error.message.includes('nothing to commit')) {
  console.log("\n⚠️  No changes to commit. Your working tree is clean.");
  console.log("This might mean changes were already committed but not pushed.");
  
  // Try to push anyway
  console.log("\n📤 Attempting to push any unpushed commits...");
  const pushResult = runCommand('git push origin main', 'Pushing to GitHub');
  
  if (pushResult.success) {
    console.log("\n✅ Push successful!");
  } else if (pushResult.error && pushResult.error.message.includes('Everything up-to-date')) {
    console.log("\n✅ Already up to date! Your code is already on GitHub.");
    console.log("\n💡 If Render isn't showing your changes:");
    console.log("   - Make sure Render is connected to the right branch (main)");
    console.log("   - Try a manual deploy with cache cleared");
  }
}
