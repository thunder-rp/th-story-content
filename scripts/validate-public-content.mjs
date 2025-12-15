
import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';
import matter from 'gray-matter';
import { z } from 'zod';

// Définition des schémas (copiés de content.config.ts pour l'indépendance)
const schemas = {
  personnages: z.object({
    name: z.string(),
    alias: z.string().optional(),
    status: z.enum(['vivant', 'décédé', 'disparu', 'inconnu']).default('vivant'),
    faction: z.string().optional(),
    job: z.string().optional(),
    image: z.string().optional(),
    birthdate: z.string().optional(),
    nationality: z.string().optional(),
    gender: z.string().optional(),
    career: z.array(z.object({
      title: z.string(),
      start: z.string(),
      end: z.string().optional(),
    })).optional(),
    hrp: z.object({
      twitch: z.string().optional(),
      twitter: z.string().optional(),
    }).optional(),
    relations: z.array(z.object({
      name: z.string(),
      type: z.string(),
    })).optional(),
  }),
  entreprises: z.object({
    name: z.string(),
    type: z.enum(['légale', 'illégale', 'mixte']).default('légale'),
    status: z.enum(['active', 'fermée', 'en faillite']).default('active'),
    owner: z.string().optional(),
    location: z.string().optional(),
    image: z.string().optional(),
    employees: z.array(z.string()).optional(),
    founded: z.string().optional(),
  }),
  factions: z.object({
    name: z.string(),
    type: z.enum(['gang', 'mafia', 'organisation', 'gouvernement', 'autre']).default('autre'),
    status: z.enum(['active', 'dissoute', 'en guerre']).default('active'),
    leader: z.string().optional(),
    territory: z.string().optional(),
    image: z.string().optional(),
    members: z.array(z.string()).optional(),
    allies: z.array(z.string()).optional(),
    enemies: z.array(z.string()).optional(),
  }),
  services: z.object({
    name: z.string(),
    type: z.enum(['police', 'médical', 'pompiers', 'justice', 'gouvernement', 'autre']).default('autre'),
    status: z.enum(['actif', 'inactif']).default('actif'),
    director: z.string().optional(),
    directorLabel: z.string().optional(),
    location: z.string().optional(),
    mapLink: z.string().optional(),
    image: z.string().optional(),
    employees: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
  evenements: z.object({
    name: z.string(),
    date: z.string().optional(),
    participants: z.array(z.string()).optional(),
    location: z.string().optional(),
    image: z.string().optional(),
    importance: z.enum(['mineure', 'moyenne', 'majeure', 'historique']).default('moyenne'),
  })
};

async function validateFile(filePath, collection) {
  try {
    const content = await readFile(filePath, 'utf8');
    const { data } = matter(content);
    
    const schema = schemas[collection];
    if (!schema) {
      console.warn(`⚠️ Pas de schéma pour la collection: ${collection}`);
      return true;
    }

    const result = schema.safeParse(data);
    if (!result.success) {
      console.error(`❌ Erreur dans ${filePath}:`);
      console.error(result.error.issues);
      return false;
    }
    
    console.log(`✅ ${filePath} est valide.`);
    return true;
  } catch (err) {
    console.error(`❌ Erreur de lecture/parsing pour ${filePath}:`, err);
    return false;
  }
}

async function scanDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  let isValid = true;

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Le nom du dossier correspond souvent à la collection (ex: content/services)
      // Si on est dans content/services, les fichiers dedans sont des services
      const collectionName = entry.name;
      const subEntries = await readdir(fullPath, { withFileTypes: true });
      
      for (const sub of subEntries) {
        if (sub.isFile() && extname(sub.name) === '.md' && !sub.name.startsWith('_')) {
           const fileValid = await validateFile(join(fullPath, sub.name), collectionName);
           if (!fileValid) isValid = false;
        }
      }
    }
  }
  return isValid;
}

// Point d'entrée
const contentDir = process.argv[2] || './content';
console.log(`🔍 Vérification du contenu dans : ${contentDir}`);

scanDirectory(contentDir).then(valid => {
  if (!valid) {
    console.error('FAILED: Des erreurs de validation ont été trouvées.');
    process.exit(1);
  } else {
    console.log('SUCCESS: Tous les fichiers sont valides.');
    process.exit(0);
  }
});
