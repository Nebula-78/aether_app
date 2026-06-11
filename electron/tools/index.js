const { exec } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const path = require('path');
const { shell, safeStorage } = require('electron');

const tools = [
  { type: "function", function: { name: "run_command", description: "Exécute une commande shell sur le système. Utilisable pour la gestion de fichiers avancée, la navigation, etc.", parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } } },
  { type: "function", function: { name: "read_file", description: "Lit le contenu textuel d'un fichier spécifié.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
  { type: "function", function: { name: "write_file", description: "Crée ou écrase un fichier avec du contenu texte.", parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } } },
  { type: "function", function: { name: "create_directory", description: "Crée un nouveau répertoire.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
  { type: "function", function: { name: "list_directory", description: "Liste les fichiers et dossiers dans un répertoire.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
  { type: "function", function: { name: "tavily_search", description: "Effectue une recherche approfondie sur le web via Tavily pour obtenir des résultats précis et synthétisés.", parameters: { type: "object", properties: { query: { type: "string", description: "La requête de recherche." }, search_depth: { type: "string", enum: ["basic", "advanced"], default: "basic", description: "La profondeur de la recherche." } }, required: ["query"] } } },
  { type: "function", function: { name: "google_search", description: "Obsolète : utilisez tavily_search pour de meilleurs résultats. Effectue une recherche web.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "open_file", description: "Ouvre un fichier avec l'application système par défaut.", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
  { type: "function", function: { name: "open_url", description: "Ouvre une URL dans le navigateur par défaut.", parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } },
  { type: "function", function: { name: "copy_to_clipboard", description: "Copie le texte spécifié dans le presse-papier.", parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] } } },
  { type: "function", function: { name: "read_clipboard", description: "Lit le texte du presse-papier.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "take_screenshot", description: "Prend une capture d'écran.", parameters: { type: "object", properties: { directory: { type: "string" } } } } },
  { type: "function", function: { name: "get_system_info", description: "Récupère des informations système.", parameters: { type: "object", properties: {} } } }
];

function getSafePath(filePath) {
  const homeDir = os.homedir();
  const desktopDir = path.join(homeDir, 'Desktop');
  
  let resolved = path.resolve(filePath);
  if (!path.isAbsolute(filePath)) {
    resolved = path.join(homeDir, filePath);
  }
  
  // Autoriser le dossier personnel ET le Bureau
  if (!resolved.startsWith(homeDir) && !resolved.startsWith(desktopDir)) {
    throw new Error("Accès refusé : Le chemin doit être dans votre dossier personnel ou sur le Bureau.");
  }
  return resolved;
}

const StoreModule = require('electron-store');
const Store = StoreModule.default || StoreModule;
const globalStore = new Store();

async function executeTool(name, args, win, askConfirmationCallback) {
  try {
    switch (name) {
      case 'tavily_search':
      case 'google_search': {
        const { query, search_depth = 'basic' } = args;
        console.log(`[Tool:Tavily] Recherche pour: "${query}" (depth: ${search_depth})`);
        
        const profileId = globalStore.get('activeProfileId');
        const profile = globalStore.get(`profiles.${profileId}`);
        let apiKeyEnc = profile?.tavilyApiKey;

        if (!apiKeyEnc) {
          console.error("[Tool:Tavily] Erreur: Clé API manquante dans le store.");
          return { error: "Clé API Tavily manquante. Veuillez la configurer dans les paramètres." };
        }

        let apiKey;
        try {
          apiKey = safeStorage.decryptString(Buffer.from(apiKeyEnc, 'base64'));
          console.log("[Tool:Tavily] Clé déchiffrée avec succès.");
        } catch (e) {
          console.error("[Tool:Tavily] Erreur de déchiffrement:", e);
          return { error: "Erreur lors du déchiffrement de la clé Tavily." };
        }

        try {
          const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: apiKey,
              query,
              search_depth,
              include_answer: true,
              max_results: 5
            })
          });

          if (!response.ok) {
            const err = await response.text();
            console.error(`[Tool:Tavily] API Error ${response.status}:`, err);
            return { error: `Erreur Tavily (${response.status}): ${err}` };
          }

          const data = await response.json();
          console.log(`[Tool:Tavily] Succès: ${data.results?.length || 0} résultats trouvés.`);
          
          return {
            answer: data.answer,
            results: data.results.map(r => ({
              title: r.title,
              url: r.url,
              content: r.content,
              score: r.score
            }))
          };
        } catch (fetchErr) {
          console.error("[Tool:Tavily] Fetch Error:", fetchErr);
          return { error: `Erreur de connexion à Tavily: ${fetchErr.message}` };
        }
      }
      case 'run_command': {
        const { command } = args;
        const confirmed = await askConfirmationCallback({ name, command }, win);
        if (!confirmed) return { error: "Action annulée par l'utilisateur." };
        return new Promise((resolve) => {
          exec(command, { cwd: os.homedir() }, (error, stdout, stderr) => {
            resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: error ? error.code : 0 });
          });
        });
      }
      case 'read_file': {
        const safePath = getSafePath(args.path);
        const content = await fs.readFile(safePath, 'utf8');
        return { content };
      }
      case 'write_file': {
        const safePath = getSafePath(args.path);
        if (fsSync.existsSync(safePath)) {
          const confirmed = await askConfirmationCallback({ name, path: args.path, exists: true }, win);
          if (!confirmed) return { error: "Écriture annulée." };
        }
        await fs.writeFile(safePath, args.content, 'utf8');
        return { success: true, message: `Fichier écrit dans ${args.path}` };
      }
      case 'create_directory': {
        const safePath = getSafePath(args.path);
        await fs.mkdir(safePath, { recursive: true });
        return { success: true, message: `Répertoire créé : ${args.path}` };
      }
      case 'list_directory': {
        const safePath = getSafePath(args.path || '.');
        const files = await fs.readdir(safePath, { withFileTypes: true });
        return { files: files.map(f => ({ name: f.name, isDirectory: f.isDirectory(), isFile: f.isFile() })) };
      }
      case 'open_file': {
        await shell.openPath(getSafePath(args.path));
        return { success: true };
      }
      case 'open_url': {
        const urlStr = args.url;
        if (!urlStr.startsWith('http')) throw new Error("URL invalide.");
        await shell.openExternal(urlStr);
        return { success: true };
      }
      case 'copy_to_clipboard': {
        const { clipboard } = require('electron');
        clipboard.writeText(args.text);
        return { success: true };
      }
      case 'read_clipboard': {
        const { clipboard } = require('electron');
        return { text: clipboard.readText() };
      }
      case 'take_screenshot': {
        const { desktopCapturer, screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.size;
        const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: width * 2, height: height * 2 } });
        if (sources.length > 0) {
          const png = sources[0].thumbnail.toPNG();
          const filename = `screenshot_${Date.now()}.png`;
          let targetDir = os.homedir();
          if (args.directory) {
            try {
              const potentialPath = getSafePath(args.directory);
              if (fsSync.existsSync(potentialPath)) targetDir = potentialPath;
            } catch (e) {}
          }
          const screenshotPath = path.join(targetDir, filename);
          await fs.writeFile(screenshotPath, png);
          return { success: true, path: screenshotPath };
        }
        throw new Error("Aucun écran détecté.");
      }
      case 'get_system_info': {
        return { platform: os.platform(), release: os.release(), arch: os.arch(), totalMemGB: (os.totalmem() / 1e9).toFixed(2), freeMemGB: (os.freemem() / 1e9).toFixed(2), uptimeHours: (os.uptime() / 3600).toFixed(2), cpus: os.cpus().map(c => c.model).filter((v, i, a) => a.indexOf(v) === i) };
      }
      default:
        throw new Error(`Outil inconnu : ${name}`);
    }
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { tools, executeTool };
