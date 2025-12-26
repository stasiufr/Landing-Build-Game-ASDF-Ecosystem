/**
 * Development Startup Script
 * Checks prerequisites and starts the server
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     🎮 ASDF Games - Development Setup                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Check .env file
const envPath = join(rootDir, '.env');
if (!existsSync(envPath)) {
    console.error('❌ .env file not found!');
    console.log('   Copy .env.example to .env and configure it.');
    process.exit(1);
}

console.log('✅ .env file found');

// Check node_modules
const nodeModulesPath = join(rootDir, 'node_modules');
if (!existsSync(nodeModulesPath)) {
    console.log('📦 Installing dependencies...');
    const install = spawn('npm', ['install'], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: true
    });
    install.on('close', (code) => {
        if (code !== 0) {
            console.error('❌ npm install failed');
            process.exit(1);
        }
        startServer();
    });
} else {
    console.log('✅ Dependencies installed');
    startServer();
}

function startServer() {
    console.log(`
📋 Checklist before testing:
   [ ] PostgreSQL running (docker or local)
   [ ] Database 'asdf_games' created
   [ ] Run migrations: npm run migrate
   [ ] Phantom wallet installed in browser
   [ ] Have some $ASDFASDFA tokens for betting tests

🚀 Starting server...
`);

    const server = spawn('node', ['src/index.js'], {
        cwd: rootDir,
        stdio: 'inherit',
        shell: true,
        env: { ...process.env }
    });

    server.on('error', (err) => {
        console.error('❌ Failed to start server:', err.message);
    });

    server.on('close', (code) => {
        console.log(`Server exited with code ${code}`);
    });
}
