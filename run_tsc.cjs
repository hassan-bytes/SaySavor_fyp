const { execSync } = require('child_process');
try { 
  execSync('npx tsc src/2_partner/dashboard/pages/MenuManager.tsx --noEmit --jsx react-jsx', { stdio: 'pipe' }); 
  console.log('SUCCESS!'); 
} catch(e) { 
  console.log(e.stdout.toString());
  console.log(e.stderr.toString());
}
