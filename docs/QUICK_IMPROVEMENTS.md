# 🚀 Améliorations UX - Instructions Rapides

**Statut**: Les dashboards sont créés, mais les améliorations dans UnifiedQueryAnalyzer nécessitent une intégration manuelle.

---

## ✅ Ce qui fonctionne déjà

### 1. **Dashboards Séparés** (Prêts à utiliser)

#### Plan Stability Dashboard
- **URL**: `http://localhost:3000/dashboard/plan-stability`
- **Fichier**: `frontend/src/app/dashboard/plan-stability/page.tsx`
- **Features**: Liste baselines, delete, refresh

#### Database Branching Dashboard  
- **URL**: `http://localhost:3000/dashboard/branching`
- **Fichier**: `frontend/src/app/dashboard/branching/page.tsx`
- **Features**: Liste branches, create, delete

### 2. **Tooltip Component** (Installé)
- Dépendance: `@radix-ui/react-tooltip` ✅
- Component: `frontend/src/components/ui/tooltip.tsx` ✅

---

## ⏳ À Intégrer Manuellement

Le fichier `UnifiedQueryAnalyzer.tsx` a été restauré à sa version propre. Voici les 3 modifications à faire:

### Modification 1: Ajouter les imports (ligne ~27)

```tsx
import {
    // ... imports existants
    Lightbulb,
    Maximize2,      // ← AJOUTER
    Minimize2       // ← AJOUTER
} from "lucide-react"
```

### Modification 2: Ajouter localStorage et fonctions (après ligne ~183)

```tsx
// Accordion states for Step 2 (with localStorage persistence)
const [sectionsExpanded, setSectionsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('unifiedAnalyzerSections')
        if (saved) {
            try {
                return JSON.parse(saved)
            } catch {
                // Si erreur de parsing, utiliser valeurs par défaut
            }
        }
    }
    return {
        cost: true,
        waitEvents: false,
        resourceGroup: false,
        similarIssues: false
    }
})

// Save preferences to localStorage
useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('unifiedAnalyzerSections', JSON.stringify(sectionsExpanded))
    }
}, [sectionsExpanded])

const toggleSection = (section: keyof typeof sectionsExpanded) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: !prev[section] }))
}

// NOUVELLES FONCTIONS
const expandAll = () => {
    setSectionsExpanded({
        cost: true,
        waitEvents: true,
        resourceGroup: true,
        similarIssues: true
    })
}

const collapseAll = () => {
    setSectionsExpanded({
        cost: false,
        waitEvents: false,
        resourceGroup: false,
        similarIssues: false
    })
}
```

### Modification 3: Ajouter boutons dans CardHeader (ligne ~600)

**REMPLACER**:
```tsx
<CardHeader className="pb-3">
    <CardTitle className="flex items-center gap-2 text-sm font-medium">
        <Activity className="w-4 h-4 text-primary" />
        Risk Analysis
    </CardTitle>
</CardHeader>
```

**PAR**:
```tsx
<CardHeader className="pb-3">
    <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="w-4 h-4 text-primary" />
            Risk Analysis
        </CardTitle>
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={expandAll}
                className="text-xs h-7 gap-1.5"
            >
                <Maximize2 className="w-3 h-3" />
                Expand All
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                className="text-xs h-7 gap-1.5"
            >
                <Minimize2 className="w-3 h-3" />
                Collapse All
            </Button>
        </div>
    </div>
</CardHeader>
```

---

## 🎯 Résultat Attendu

Après ces 3 modifications:

1. **Boutons visibles**: "Expand All" et "Collapse All" dans le header Risk Analysis
2. **localStorage fonctionne**: Les préférences d'expansion sont sauvegardées
3. **Expand All**: Ouvre toutes les sections (Cost, Wait Events, Resource Groups, Similar Issues)
4. **Collapse All**: Ferme toutes les sections

---

## 🧪 Test

1. Démarrer le frontend: `npm run dev`
2. Aller sur `http://localhost:3000`
3. Coller une requête SQL et cliquer "Analyze Query"
4. Vérifier que les boutons "Expand All" / "Collapse All" apparaissent
5. Cliquer "Expand All" → toutes les sections s'ouvrent
6. Cliquer "Collapse All" → toutes les sections se ferment
7. Rafraîchir la page → les préférences sont conservées

---

## 📊 Dashboards à Tester

### Plan Stability
```bash
# Démarrer backend
python backend/main.py

# Accéder au dashboard
http://localhost:3000/dashboard/plan-stability
```

### Database Branching
```bash
# Accéder au dashboard
http://localhost:3000/dashboard/branching
```

---

## ✅ Checklist Finale

- [x] @radix-ui/react-tooltip installé
- [x] Tooltip component créé
- [x] Dashboard Plan Stability créé
- [x] Dashboard Branching créé
- [ ] localStorage intégré dans UnifiedQueryAnalyzer
- [ ] Boutons Expand All / Collapse All intégrés
- [ ] Tests effectués

**Temps estimé pour finaliser**: 10-15 minutes
